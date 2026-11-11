"""Lim Kopi — CSIT314 Interior Design Project (IDP) Platform — REST API + static server.

Run:  python server.py          (Python 3.10+, standard library only)
Open: http://127.0.0.1:8000

Architecture
    Browser  : Boundary (js/boundaries) -> Control (js/controllers) -> Entity (js/entities)
    Entities : call this REST API with fetch(); every rule is re-checked here.
    Database : SQLite (lim_kopi.db). Schema version is tracked with PRAGMA user_version.

Security
    * PBKDF2-HMAC-SHA256 (600,000 iterations, 16-byte per-user salt) password hashes.
    * HttpOnly + SameSite=Lax session cookie; only the SHA-256 of the token is stored.
    * Per-session CSRF token required on every non-GET request; same-origin check.
    * Permission-based authorisation derived from the account's User Profile.
    * Parameterised SQL only; table/column names come from fixed whitelists.
"""
from __future__ import annotations

import csv
import hashlib
import hmac
import io
import json
import os
import re
import secrets
import sqlite3
import struct
import threading
import time
import zipfile
import zlib
from datetime import date, datetime, timedelta, timezone
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlsplit
from xml.sax.saxutils import escape as xml_escape

from predictor import FeasibilityPredictor

BASE = Path(__file__).resolve().parent
DB_PATH = Path(os.environ.get("LIM_KOPI_DB", BASE / "lim_kopi.db"))
HOST = os.environ.get("LIM_KOPI_HOST", "127.0.0.1")
PORT = int(os.environ.get("LIM_KOPI_PORT", "8000"))
ITERATIONS = int(os.environ.get("LIM_KOPI_PBKDF2_ITERATIONS", "600000"))  # OWASP 2023 guidance for PBKDF2-HMAC-SHA256
SESSION_SECONDS = 60 * 60 * 8
SCHEMA_VERSION = 2
SGT = timezone(timedelta(hours=8))
STATUSES = ("Active", "Suspended")

# --------------------------------------------------------------------------------------
# SECTION 1 — PERMISSIONS (a User Profile is a role template that grants these codes)
# --------------------------------------------------------------------------------------
PERMISSIONS = (
    "MANAGE_ACCOUNTS", "MANAGE_PROFILES",          # User Admin
    "MANAGE_COMPANY", "MANAGE_IDP",                # Interior Designer
    "BROWSE_IDP", "MANAGE_FAVOURITES",             # Customer
    "MANAGE_CATEGORIES", "GENERATE_REPORTS",       # Platform Management
)
SEED_PROFILES = (
    ("up-admin", "User Admin", "Administers user accounts and user profiles.", ["MANAGE_ACCOUNTS", "MANAGE_PROFILES"]),
    ("up-designer", "Interior Designer", "Design firms that publish company information and IDP portfolios.", ["MANAGE_COMPANY", "MANAGE_IDP"]),
    ("up-customer", "Customer", "Homeowners who explore and shortlist IDPs.", ["BROWSE_IDP", "MANAGE_FAVOURITES"]),
    ("up-platform", "Platform Management", "Curates IDP categories and generates activity reports.", ["MANAGE_CATEGORIES", "GENERATE_REPORTS"]),
)
SELF_REGISTER_PROFILES = ("Customer", "Interior Designer")

# Resource kind -> (table, permission required, owner-scoped?)
RESOURCES = {
    "profiles": ("user_profiles", "MANAGE_PROFILES", False),
    "accounts": ("accounts", "MANAGE_ACCOUNTS", False),
    "companies": ("companies", "MANAGE_COMPANY", True),
    "idps": ("idps", "MANAGE_IDP", True),
    "categories": ("categories", "MANAGE_CATEGORIES", False),
}
ACCOUNT_PUBLIC = "a.id, a.username, a.name, a.email, a.profileId, p.role AS profile, a.status, a.createdAt, a.updatedAt"


# --------------------------------------------------------------------------------------
# SECTION 2 — HELPERS
# --------------------------------------------------------------------------------------
class ApiError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status


def require(condition, message, status=400):
    if not condition:
        raise ApiError(status, message)


def timestamp(dt=None):
    return (dt or datetime.now(timezone.utc)).astimezone(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def today_sgt():
    return datetime.now(SGT).date()


def uid(prefix="rec"):
    return f"{prefix}-{secrets.token_hex(8)}"


def connect():
    con = sqlite3.connect(DB_PATH, timeout=15)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys = ON")
    con.execute("PRAGMA busy_timeout = 15000")
    return con


def rows(con, query, args=()):
    return [dict(r) for r in con.execute(query, args).fetchall()]


def one(con, query, args=()):
    r = con.execute(query, args).fetchone()
    return dict(r) if r else None


def insert(con, table, data):
    keys = tuple(data)
    con.execute(f"INSERT INTO {table} ({','.join(keys)}) VALUES ({','.join('?' * len(keys))})", tuple(data.values()))


def update(con, table, ident, data):
    keys = tuple(data)
    con.execute(f"UPDATE {table} SET {','.join(k + '=?' for k in keys)} WHERE id=?", tuple(data.values()) + (ident,))


def text(data, key):
    return " ".join(str(data.get(key) or "").split())


def pw_hash(password, salt=None, iterations=None):
    salt = salt or secrets.token_bytes(16)
    iterations = iterations or ITERATIONS
    return salt.hex(), hashlib.pbkdf2_hmac("sha256", password.encode(), salt, iterations).hex(), iterations


def valid_email(email):
    return 6 <= len(email) <= 254 and bool(re.fullmatch(
        r"[^\s@]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+", email))


def valid_password(pw):
    return (8 <= len(pw) <= 64 and any(c.isupper() for c in pw) and any(c.islower() for c in pw)
            and any(c.isdigit() for c in pw) and any(not c.isalnum() and not c.isspace() for c in pw))


USERNAME_RE = re.compile(r"[A-Za-z0-9][A-Za-z0-9._-]{2,29}")
UEN_RE = re.compile(r"\d{8}[A-Z]|\d{9}[A-Z]|[TSR]\d{2}[A-Z]{2}\d{4}[A-Z]")
PHONE_RE = re.compile(r"(?:\+65 ?)?[689]\d{7}")
ROLE_RE = re.compile(r"[A-Za-z][A-Za-z &/-]{1,49}")
PHOTO_DATA_RE = re.compile(r"data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+")


def parse_date(value, label):
    try:
        return date.fromisoformat(str(value))
    except (TypeError, ValueError):
        raise ApiError(400, f"{label} must be a valid date (YYYY-MM-DD).")


def clean_photos(value):
    if isinstance(value, str):
        value = [value] if value.strip() else []
    require(isinstance(value, list), "Photos must be a list of image URLs.")
    photos = []
    for item in value:
        item = str(item or "").strip()
        if not item:
            continue
        if item.startswith("data:"):
            require(PHOTO_DATA_RE.fullmatch(item) and len(item) <= 400_000,
                    "Uploaded photos must be PNG, JPEG or WebP and under 300 KB.")
        else:
            parts = urlsplit(item)
            require(parts.scheme in ("http", "https") and parts.netloc and len(item) <= 1500,
                    "Each photo must be an http(s) URL or an uploaded image.")
        photos.append(item)
    require(1 <= len(photos) <= 4, "Add between 1 and 4 project photos.")
    return photos


def placeholder_photo(seed_rgb, accent_rgb, w=240, h=150):
    """Generate a small gradient PNG (pure Python) so seed IDPs have real photos offline."""
    raw = bytearray()
    for y in range(h):
        raw.append(0)
        for x in range(w):
            t = (x / w + y / h) / 2
            raw += bytes(int(a + (b - a) * t) for a, b in zip(seed_rgb, accent_rgb))
    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)) \
        + chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + chunk(b"IEND", b"")
    import base64
    return "data:image/png;base64," + base64.b64encode(png).decode()


# --------------------------------------------------------------------------------------
# SECTION 3 — SCHEMA, MIGRATION FROM v1, SEED DATA
# --------------------------------------------------------------------------------------
SCHEMA_V2 = """
CREATE TABLE IF NOT EXISTS user_profiles(
    id TEXT PRIMARY KEY,
    role TEXT NOT NULL UNIQUE COLLATE NOCASE,
    description TEXT NOT NULL,
    permissions TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Suspended')),
    createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS accounts(
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    profileId TEXT NOT NULL REFERENCES user_profiles(id),
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Suspended')),
    password_salt TEXT NOT NULL, password_hash TEXT NOT NULL, password_iterations INTEGER NOT NULL,
    createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS companies(
    id TEXT PRIMARY KEY,
    ownerId TEXT NOT NULL REFERENCES accounts(id),
    companyName TEXT NOT NULL,
    uen TEXT NOT NULL UNIQUE COLLATE NOCASE,
    address TEXT NOT NULL, phone TEXT NOT NULL, email TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Suspended')),
    createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS categories(
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Suspended')),
    createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS idps(
    id TEXT PRIMARY KEY,
    ownerId TEXT NOT NULL REFERENCES accounts(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    categoryId TEXT NOT NULL REFERENCES categories(id),
    stage TEXT NOT NULL CHECK (stage IN ('Current','Past')),
    photos TEXT NOT NULL DEFAULT '[]',
    completionDate TEXT,
    style TEXT NOT NULL DEFAULT '', location TEXT NOT NULL DEFAULT '',
    budget INTEGER NOT NULL DEFAULT 0 CHECK (budget >= 0),
    floorArea INTEGER NOT NULL DEFAULT 0 CHECK (floorArea >= 0),
    viewCount INTEGER NOT NULL DEFAULT 0,
    shortlistCount INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Suspended')),
    createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL,
    CHECK ((stage = 'Past' AND completionDate IS NOT NULL) OR (stage = 'Current' AND completionDate IS NULL))
);
CREATE TABLE IF NOT EXISTS favourites(
    customerId TEXT NOT NULL REFERENCES accounts(id),
    idpId TEXT NOT NULL REFERENCES idps(id),
    savedAt TEXT NOT NULL,
    PRIMARY KEY(customerId, idpId)
);
CREATE TABLE IF NOT EXISTS view_events(
    id TEXT PRIMARY KEY, customerId TEXT NOT NULL REFERENCES accounts(id),
    idpId TEXT NOT NULL REFERENCES idps(id), at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS shortlist_events(
    id TEXT PRIMARY KEY, customerId TEXT NOT NULL REFERENCES accounts(id),
    idpId TEXT NOT NULL REFERENCES idps(id), at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS reports(
    id TEXT PRIMARY KEY,
    reportType TEXT NOT NULL CHECK (reportType IN ('Daily','Weekly','Monthly')),
    startDate TEXT NOT NULL, endDate TEXT NOT NULL,
    generatedAt TEXT NOT NULL, generatedBy TEXT NOT NULL REFERENCES accounts(id),
    newIDPs INTEGER NOT NULL, views INTEGER NOT NULL, shortlists INTEGER NOT NULL,
    newAccounts INTEGER NOT NULL, activeIDPs INTEGER NOT NULL, activeCategories INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS predictions(
    id TEXT PRIMARY KEY, accountId TEXT NOT NULL REFERENCES accounts(id),
    inputs TEXT NOT NULL, probability REAL NOT NULL, label INTEGER NOT NULL,
    modelVersion TEXT NOT NULL, at TEXT NOT NULL,
    actualOutcome INTEGER
);
CREATE TABLE IF NOT EXISTS sessions(
    token_hash TEXT PRIMARY KEY, accountId TEXT NOT NULL REFERENCES accounts(id),
    csrf_token TEXT NOT NULL, expiresAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_accounts_profile ON accounts(profileId);
CREATE INDEX IF NOT EXISTS idx_idps_owner ON idps(ownerId);
CREATE INDEX IF NOT EXISTS idx_idps_category ON idps(categoryId);
CREATE INDEX IF NOT EXISTS idx_view_events ON view_events(idpId, at);
CREATE INDEX IF NOT EXISTS idx_shortlist_events ON shortlist_events(idpId, at);
CREATE INDEX IF NOT EXISTS idx_fav_idp ON favourites(idpId);
"""


def table_columns(con, table):
    return {r["name"] for r in con.execute(f"PRAGMA table_info({table})")}


def seed_profiles(con):
    t = timestamp()
    for ident, role, desc, perms in SEED_PROFILES:
        con.execute("INSERT OR IGNORE INTO user_profiles VALUES (?,?,?,?,?,?,?)",
                    (ident, role, desc, json.dumps(perms), "Active", t, t))


def migrate_v1(con):
    """Upgrade a v1 database (accounts.role, per-account profiles, companies.contact,
    idps.imageUrl, period-only reports) to the spec-aligned v2 schema. No rows are lost:
    the old per-account public profiles are kept in legacy_member_profiles."""
    con.execute("PRAGMA foreign_keys = OFF")
    con.execute("PRAGMA legacy_alter_table = ON")   # keep FK text pointing at the new tables
    con.execute("BEGIN")
    for old in ("accounts", "companies", "idps", "favourites", "views", "reports", "sessions", "profiles", "categories"):
        if one(con, "SELECT name FROM sqlite_master WHERE type='table' AND name=?", (old,)):
            con.execute(f"ALTER TABLE {old} RENAME TO v1_{old}")
    for idx in rows(con, "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'"):
        con.execute(f"DROP INDEX IF EXISTS {idx['name']}")
    for stmt in [s for s in SCHEMA_V2.split(";") if s.strip()]:
        con.execute(stmt)
    seed_profiles(con)
    role_to_profile = {role: ident for ident, role, _, _ in SEED_PROFILES}
    used = set()
    for a in rows(con, "SELECT * FROM v1_accounts"):
        base = re.sub(r"[^A-Za-z0-9._-]", "", a["email"].split("@")[0]) or "user"
        base = (base if len(base) >= 3 else base + "usr")[:26]
        username, n = base, 1
        while username.lower() in used:
            n += 1
            username = f"{base}{n}"
        used.add(username.lower())
        status = "Active" if a["status"] == "Active" else "Suspended"
        insert(con, "accounts", {"id": a["id"], "username": username, "name": a["name"], "email": a["email"],
            "profileId": role_to_profile.get(a["role"], "up-customer"), "status": status,
            "password_salt": a["password_salt"], "password_hash": a["password_hash"],
            "password_iterations": a["password_iterations"], "createdAt": a["createdAt"], "updatedAt": a["updatedAt"]})
    for c in rows(con, "SELECT * FROM v1_categories"):
        insert(con, "categories", c)
    for i, c in enumerate(rows(con, "SELECT * FROM v1_companies"), start=1):
        insert(con, "companies", {"id": c["id"], "ownerId": c["ownerId"], "companyName": c["name"],
            "uen": f"T00LL{i:04d}A", "address": c["address"], "phone": "60000000", "email": c["contact"],
            "description": c["description"], "status": c["status"], "createdAt": c["createdAt"], "updatedAt": c["updatedAt"]})
    for p in rows(con, "SELECT * FROM v1_idps"):
        views = con.execute("SELECT COUNT(*) FROM v1_views WHERE idpId=?", (p["id"],)).fetchone()[0]
        saves = con.execute("SELECT COUNT(*) FROM v1_favourites WHERE idpId=?", (p["id"],)).fetchone()[0]
        photos = [p["imageUrl"]] if p.get("imageUrl") else [placeholder_photo((214, 205, 186), (150, 168, 140))]
        insert(con, "idps", {"id": p["id"], "ownerId": p["ownerId"], "title": p["title"], "description": p["description"],
            "categoryId": p["categoryId"], "stage": p["stage"], "photos": json.dumps(photos),
            "completionDate": p["updatedAt"][:10] if p["stage"] == "Past" else None,
            "style": p["style"], "location": p["location"], "budget": p["budget"], "floorArea": 0,
            "viewCount": views, "shortlistCount": saves, "status": p["status"],
            "createdAt": p["createdAt"], "updatedAt": p["updatedAt"]})
    for f in rows(con, "SELECT * FROM v1_favourites"):
        insert(con, "favourites", f)
        insert(con, "shortlist_events", {"id": uid("sl"), "customerId": f["customerId"], "idpId": f["idpId"], "at": f["savedAt"]})
    for v in rows(con, "SELECT * FROM v1_views"):
        insert(con, "view_events", v)
    admin = one(con, "SELECT id FROM accounts WHERE profileId='up-admin' LIMIT 1") or {"id": "a1"}
    for r in rows(con, "SELECT * FROM v1_reports"):
        d = r["generatedAt"][:10]
        insert(con, "reports", {"id": r["id"], "reportType": r["period"], "startDate": d, "endDate": d,
            "generatedAt": r["generatedAt"], "generatedBy": admin["id"], "newIDPs": r["newIDPs"], "views": r["views"],
            "shortlists": r["shortlists"], "newAccounts": 0, "activeIDPs": r["activeIDPs"],
            "activeCategories": r["activeCategories"]})
    if one(con, "SELECT name FROM sqlite_master WHERE name='v1_profiles'"):
        con.execute("ALTER TABLE v1_profiles RENAME TO legacy_member_profiles")
    for old in ("accounts", "companies", "idps", "favourites", "views", "reports", "sessions", "categories"):
        con.execute(f"DROP TABLE IF EXISTS v1_{old}")
    con.execute(f"PRAGMA user_version = {SCHEMA_VERSION}")
    con.execute("COMMIT")
    con.execute("PRAGMA legacy_alter_table = OFF")
    con.execute("PRAGMA foreign_keys = ON")
    problems = con.execute("PRAGMA foreign_key_check").fetchall()
    require(not problems, f"Migration left {len(problems)} foreign-key problems.", 500)


def create_account(con, username, name, email, password, profile_id, status="Active", ident=None, iterations=None):
    username, email = str(username or "").strip(), str(email or "").strip().lower()
    name = " ".join(str(name or "").split()) or username
    require(USERNAME_RE.fullmatch(username), "Username must be 3–30 letters, digits, dots, dashes or underscores.")
    require(valid_email(email), "Enter a valid email address.")
    require(1 <= len(name) <= 60, "Full name must be 1–60 characters.")
    require(valid_password(password), "Password must have 8–64 characters with uppercase, lowercase, a number and a symbol.")
    profile = one(con, "SELECT * FROM user_profiles WHERE id=?", (profile_id,))
    require(profile, "Select a valid user profile.")
    require(profile["status"] == "Active", "The selected user profile is suspended.")
    require(not one(con, "SELECT 1 FROM accounts WHERE username=? COLLATE NOCASE", (username,)), "This username is already registered.", 409)
    require(not one(con, "SELECT 1 FROM accounts WHERE email=? COLLATE NOCASE", (email,)), "This email address is already registered.", 409)
    salt, hashed, its = pw_hash(password, iterations=iterations)
    ident = ident or uid("acc")
    t = timestamp()
    insert(con, "accounts", {"id": ident, "username": username, "name": name, "email": email, "profileId": profile_id,
        "status": status, "password_salt": salt, "password_hash": hashed, "password_iterations": its,
        "createdAt": t, "updatedAt": t})
    return ident


def seed_demo(con):
    """First-run sample data — LOCAL TESTING ONLY. Group demo accounts, password Demo1234!"""
    seed_profiles(con)
    fast = 50_000 if os.environ.get("LIM_KOPI_FAST_SEED") else None
    for ident, username, name, email, profile in [
        ("a1", "shiyuan", "Shi Yuan", "shiyuan@limkopi.test", "up-admin"),
        ("a2", "yongjun", "Yong Jun", "yongjun@limkopi.test", "up-designer"),
        ("a3", "shafiq", "Shafiq", "shafiq@limkopi.test", "up-customer"),
        ("a4", "shaofeng", "Shao Feng", "shaofeng@limkopi.test", "up-platform"),
        ("a5", "lwin", "Lwin", "lwin@limkopi.test", "up-designer"),
        ("a6", "bryan", "Bryan Ng", "bryan@limkopi.test", "up-customer")]:
        create_account(con, username, name, email, "Demo1234!", profile, ident=ident, iterations=fast)
    now = datetime.now(timezone.utc)
    t = timestamp()
    for k, name, desc in [("cat1", "Residential", "HDB, condominium and landed homes."),
                          ("cat2", "Commercial", "Offices, retail and workplace interiors."),
                          ("cat3", "Hospitality", "Cafés, restaurants and leisure spaces.")]:
        insert(con, "categories", {"id": k, "name": name, "description": desc, "status": "Active", "createdAt": t, "updatedAt": t})
    for k, owner, name, uen, address, phone, email, desc in [
        ("co1", "a2", "Atelier Living Pte. Ltd.", "201912345K", "10 Tanjong Pagar Road, Singapore 088443", "62223333",
         "hello@atelierliving.test", "Residential interiors with clean lines and timeless materials."),
        ("co2", "a5", "Lwin Design Studio", "53312345D", "238 Thomson Road, Novena, Singapore 307683", "91234567",
         "studio@lwindesign.test", "Contemporary, practical interiors for homes and offices.")]:
        insert(con, "companies", {"id": k, "ownerId": owner, "companyName": name, "uen": uen, "address": address,
            "phone": phone, "email": email, "description": desc, "status": "Active", "createdAt": t, "updatedAt": t})
    palette = [((222, 211, 190), (151, 170, 140)), ((226, 205, 180), (176, 140, 110)),
               ((200, 210, 220), (110, 130, 150)), ((230, 225, 215), (120, 125, 110))]
    for i, (k, owner, title, cat, stage, done, style, place, budget, area, desc) in enumerate([
        ("idp1", "a2", "The Willow Residence", "cat1", "Past", -120, "Japandi", "Tiong Bahru", 65000, 1100,
         "A calm, light-filled 4-room HDB flat with natural oak and warm neutral finishes."),
        ("idp2", "a2", "Sage & Stone Café", "cat3", "Current", None, "Industrial", "Outram", 120000, 1600,
         "A neighbourhood café mixing earthy colours, exposed brick and textured concrete."),
        ("idp3", "a5", "Harbour View Apartment", "cat1", "Past", -45, "Modern", "HarbourFront", 88000, 1250,
         "A space-efficient condominium apartment overlooking the harbour."),
        ("idp4", "a2", "Orchard Road Studio", "cat2", "Current", None, "Minimalist", "Orchard", 90000, 900,
         "A practical and elegant compact design studio for a creative agency.")]):
        created = timestamp(now - timedelta(days=60 - i * 12))
        insert(con, "idps", {"id": k, "ownerId": owner, "title": title, "description": desc, "categoryId": cat,
            "stage": stage, "photos": json.dumps([placeholder_photo(*palette[i])]),
            "completionDate": (today_sgt() + timedelta(days=done)).isoformat() if stage == "Past" else None,
            "style": style, "location": place, "budget": budget, "floorArea": area,
            "viewCount": 0, "shortlistCount": 0, "status": "Active", "createdAt": created, "updatedAt": created})
    # Activity history spread over the last 30 days so reports have data.
    rng = __import__("random").Random(314)
    for day in range(30):
        for _ in range(rng.randint(1, 4)):
            idp, cust = rng.choice(["idp1", "idp2", "idp3", "idp4"]), rng.choice(["a3", "a6"])
            at = timestamp(now - timedelta(days=day, hours=rng.randint(0, 20)))
            insert(con, "view_events", {"id": uid("v"), "customerId": cust, "idpId": idp, "at": at})
            con.execute("UPDATE idps SET viewCount = viewCount + 1 WHERE id=?", (idp,))
    for cust, idp, days_ago in [("a3", "idp1", 20), ("a6", "idp1", 9), ("a3", "idp3", 3)]:
        at = timestamp(now - timedelta(days=days_ago))
        insert(con, "favourites", {"customerId": cust, "idpId": idp, "savedAt": at})
        insert(con, "shortlist_events", {"id": uid("sl"), "customerId": cust, "idpId": idp, "at": at})
        con.execute("UPDATE idps SET shortlistCount = shortlistCount + 1 WHERE id=?", (idp,))


def initialize():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    con = connect()
    try:
        version = con.execute("PRAGMA user_version").fetchone()[0]
        has_accounts = one(con, "SELECT name FROM sqlite_master WHERE type='table' AND name='accounts'")
        if has_accounts and version < 2 and "profileId" not in table_columns(con, "accounts"):
            print("Migrating lim_kopi.db from schema v1 to v2 ...")
            migrate_v1(con)
        with con:
            con.executescript(SCHEMA_V2)
            con.execute(f"PRAGMA user_version = {SCHEMA_VERSION}")
            if not con.execute("SELECT COUNT(*) FROM accounts").fetchone()[0]:
                seed_demo(con)
            else:
                seed_profiles(con)
            con.execute("DELETE FROM sessions WHERE expiresAt < ?", (int(time.time()),))
    finally:
        con.close()


# --------------------------------------------------------------------------------------
# SECTION 4 — AUTHORISATION & ROLE-SCOPED READS
# --------------------------------------------------------------------------------------
def can(actor, permission):
    return permission in actor["permissions"]


def check_kind(actor, kind, record=None):
    require(kind in RESOURCES, "Unknown resource.", 404)
    _, perm, owned = RESOURCES[kind]
    require(can(actor, perm), "You do not have permission for this action.", 403)
    if owned and record is not None:
        require(record["ownerId"] == actor["id"], "You can only manage your own records.", 403)


def shape(kind, rec):
    if rec is None:
        return None
    rec = dict(rec)
    if kind == "profiles":
        rec["permissions"] = json.loads(rec["permissions"])
    elif kind == "accounts":
        for k in ("password_salt", "password_hash", "password_iterations"):
            rec.pop(k, None)
    elif kind == "idps":
        rec["photos"] = json.loads(rec["photos"])
    return rec


def get_record(con, kind, ident):
    if kind == "accounts":
        return one(con, f"SELECT {ACCOUNT_PUBLIC} FROM accounts a JOIN user_profiles p ON p.id=a.profileId WHERE a.id=?", (ident,))
    return one(con, f"SELECT * FROM {RESOURCES[kind][0]} WHERE id=?", (ident,))


def list_records(con, actor, kind, stage=None):
    if kind == "accounts":
        return rows(con, f"SELECT {ACCOUNT_PUBLIC} FROM accounts a JOIN user_profiles p ON p.id=a.profileId ORDER BY a.username")
    table, _, owned = RESOURCES[kind]
    sql, args = f"SELECT * FROM {table}", []
    clauses = []
    if owned:
        clauses.append("ownerId=?"); args.append(actor["id"])
    if kind == "idps" and stage:
        clauses.append("stage=?"); args.append(stage)
    if clauses:
        sql += " WHERE " + " AND ".join(clauses)
    return rows(con, sql + " ORDER BY createdAt", args)


SEARCH_FIELDS = {
    "profiles": ("role", "description", "permissions"),
    "accounts": ("username", "email", "name", "profile"),
    "companies": ("companyName", "uen", "address", "phone", "email", "description"),
    "idps": ("title", "description", "style", "location"),
    "categories": ("name", "description"),
}


def keyword_match(rec, kind, keyword, extra=""):
    hay = " ".join(str(rec.get(f, "")) for f in SEARCH_FIELDS[kind]) + " " + extra
    return keyword.lower() in hay.lower()


def public_idps(con):
    return rows(con, """SELECT i.*, c.name AS categoryName, a.name AS designerName,
        (SELECT companyName FROM companies co WHERE co.ownerId=i.ownerId AND co.status='Active' LIMIT 1) AS companyName
        FROM idps i JOIN accounts a ON a.id=i.ownerId JOIN user_profiles p ON p.id=a.profileId
        JOIN categories c ON c.id=i.categoryId
        WHERE i.status='Active' AND a.status='Active' AND p.status='Active' AND c.status='Active'
          AND EXISTS (SELECT 1 FROM companies co WHERE co.ownerId=i.ownerId AND co.status='Active')
        ORDER BY i.createdAt DESC""")


def bootstrap(con, actor):
    """Initial data for the signed-in actor's pages (each page then uses its own Entity calls)."""
    data = {"categories": rows(con, "SELECT * FROM categories ORDER BY name")}
    if can(actor, "MANAGE_PROFILES"):
        data["profiles"] = [shape("profiles", r) for r in list_records(con, actor, "profiles")]
    if can(actor, "MANAGE_ACCOUNTS"):
        data["accounts"] = list_records(con, actor, "accounts")
        data.setdefault("profiles", [shape("profiles", r) for r in list_records(con, actor, "profiles")])
    if can(actor, "MANAGE_COMPANY"):
        data["companies"] = list_records(con, actor, "companies")
    if can(actor, "MANAGE_IDP"):
        data["idps"] = [shape("idps", r) for r in list_records(con, actor, "idps")]
    if can(actor, "BROWSE_IDP"):
        data["publicIdps"] = [shape("idps", r) for r in public_idps(con)]
    if can(actor, "MANAGE_FAVOURITES"):
        data["favourites"] = [r["idpId"] for r in rows(con, "SELECT idpId FROM favourites WHERE customerId=?", (actor["id"],))]
    if can(actor, "GENERATE_REPORTS"):
        data["reports"] = rows(con, "SELECT * FROM reports ORDER BY generatedAt DESC")
    return data


# --------------------------------------------------------------------------------------
# SECTION 5 — VALIDATION PER RESOURCE (Control rules are repeated server-side)
# --------------------------------------------------------------------------------------
def validate(con, actor, kind, data, old=None, stage=None):
    if kind == "profiles":
        role = text(data, "role")
        desc = text(data, "description")
        perms = data.get("permissions")
        if isinstance(perms, str):
            perms = [p.strip() for p in perms.split(",") if p.strip()]
        require(role and desc and perms, "Role, description and at least one permission are required.")
        require(ROLE_RE.fullmatch(role), "Role must be 2–50 letters, spaces, '&', '/' or '-'.")
        require(len(desc) <= 500, "Description must be at most 500 characters.")
        require(isinstance(perms, list) and all(p in PERMISSIONS for p in perms), "Unknown permission selected.")
        clash = one(con, "SELECT id FROM user_profiles WHERE role=? COLLATE NOCASE", (role,))
        require(not clash or (old and clash["id"] == old["id"]), "A user profile with this role already exists.", 409)
        if old and old["id"] == actor["profileId"]:
            require("MANAGE_PROFILES" in perms and "MANAGE_ACCOUNTS" in perms,
                    "You cannot remove admin permissions from your own profile.")
        return {"role": role, "description": desc, "permissions": json.dumps(sorted(set(perms), key=PERMISSIONS.index))}
    if kind == "accounts":
        email = str(data.get("email") or "").strip().lower()
        name = " ".join(str(data.get("name") or "").split())
        profile_id = str(data.get("profileId") or "")
        password = str(data.get("password") or "")
        confirm = str(data.get("confirmPassword") or "")
        require(email and profile_id, "Email and user profile are required.")
        require(valid_email(email), "Enter a valid email address.")
        profile = one(con, "SELECT * FROM user_profiles WHERE id=?", (profile_id,))
        require(profile, "Select a valid user profile.")
        require(profile["status"] == "Active", "The selected user profile is suspended.")
        if password or confirm:
            require(password == confirm, "Passwords do not match.")
            require(valid_password(password), "Password must have 8–64 characters with uppercase, lowercase, a number and a symbol.")
        clash = one(con, "SELECT id FROM accounts WHERE email=? COLLATE NOCASE", (email,))
        require(not clash or (old and clash["id"] == old["id"]), "This email address is already registered.", 409)
        if old and old["id"] == actor["id"]:
            perms = json.loads(profile["permissions"])
            require("MANAGE_ACCOUNTS" in perms, "You cannot remove account-management rights from your own account.")
        clean = {"email": email, "profileId": profile_id}
        if name:
            require(len(name) <= 60, "Full name must be at most 60 characters.")
            clean["name"] = name
        if password:
            salt, hashed, its = pw_hash(password)
            clean.update(password_salt=salt, password_hash=hashed, password_iterations=its)
        return clean
    if kind == "companies":
        fields = {k: text(data, k) for k in ("companyName", "address", "phone", "email", "description")}
        require(all(fields.values()) and (old or text(data, "uen")),
                "Company name, UEN, address, phone, email and description are required.")
        require(len(fields["companyName"]) <= 100, "Company name must be at most 100 characters.")
        require(len(fields["address"]) <= 200, "Address must be at most 200 characters.")
        require(len(fields["description"]) <= 2000, "Description must be at most 2000 characters.")
        require(PHONE_RE.fullmatch(fields["phone"]), "Phone must be a Singapore number, e.g. 62223333 or +65 91234567.")
        fields["email"] = fields["email"].lower()
        require(valid_email(fields["email"]), "Enter a valid company email address.")
        if not old:
            uen = text(data, "uen").upper()
            require(UEN_RE.fullmatch(uen), "UEN must be a valid Singapore UEN, e.g. 201912345K or 53312345D.")
            require(not one(con, "SELECT 1 FROM companies WHERE uen=? COLLATE NOCASE", (uen,)), "This UEN is already registered.", 409)
            fields["uen"] = uen
        return fields
    if kind == "categories":
        name, desc = text(data, "name"), text(data, "description")
        require(name and desc, "Category name and description are required.")
        require(len(name) <= 80 and len(desc) <= 500, "Name max 80 and description max 500 characters.")
        clash = one(con, "SELECT id FROM categories WHERE name=? COLLATE NOCASE", (name,))
        require(not clash or (old and clash["id"] == old["id"]), "An IDP category with this name already exists.", 409)
        return {"name": name, "description": desc}
    if kind == "idps":
        stage = old["stage"] if old else stage
        require(stage in ("Current", "Past"), "IDP stage must be Current or Past.")
        title, desc = text(data, "title"), str(data.get("description") or "").strip()
        require(title and desc and data.get("categoryId"), "Title, description, category and photos are required.")
        require(len(title) <= 150 and len(desc) <= 3000, "Title max 150 and description max 3000 characters.")
        cat = one(con, "SELECT * FROM categories WHERE id=?", (data.get("categoryId"),))
        require(cat, "Select a valid IDP category.")
        require(cat["status"] == "Active", "The selected IDP category is suspended.")
        clean = {"title": title, "description": desc, "categoryId": cat["id"],
                 "photos": json.dumps(clean_photos(data.get("photos")))}
        if stage == "Past":
            done = parse_date(data.get("completionDate"), "Completion date")
            require(done <= today_sgt(), "Completion date cannot be in the future.")
            require(done.year >= 1990, "Completion date must be after 1990.")
            clean["completionDate"] = done.isoformat()
        else:
            require(not data.get("completionDate"), "A current IDP cannot have a completion date.")
        for key, limit in (("style", 100), ("location", 140)):
            if key in data:
                value = text(data, key)
                require(len(value) <= limit, f"{key.title()} must be at most {limit} characters.")
                clean[key] = value
        for key in ("budget", "floorArea"):
            if key in data and str(data.get(key)).strip() != "":
                try:
                    value = int(str(data.get(key)).strip())
                except ValueError:
                    raise ApiError(400, f"{key} must be a whole number.")
                require(0 <= value <= 10_000_000, f"{key} must be between 0 and 10,000,000.")
                clean[key] = value
        if not old:
            clean["stage"] = stage
        return clean
    raise ApiError(404, "Unknown resource.")


def set_status(con, actor, kind, record, target):
    require(record["status"] != target, f"This record is already {target.lower()}.", 409)
    if target == "Suspended":
        if kind == "accounts":
            require(record["id"] != actor["id"], "You cannot suspend your own account.")
        if kind == "profiles":
            require(record["id"] != actor["profileId"], "You cannot suspend the user profile assigned to your own account.")
    update(con, RESOURCES[kind][0], record["id"], {"status": target, "updatedAt": timestamp()})
    if target == "Suspended" and kind in ("accounts", "profiles"):
        # End live sessions of affected users immediately.
        if kind == "accounts":
            con.execute("DELETE FROM sessions WHERE accountId=?", (record["id"],))
        else:
            con.execute("DELETE FROM sessions WHERE accountId IN (SELECT id FROM accounts WHERE profileId=?)", (record["id"],))


# --------------------------------------------------------------------------------------
# SECTION 6 — REPORTS (Daily = one date, Weekly/Monthly = start/end dates; SGT days)
# --------------------------------------------------------------------------------------
REPORT_SPAN = {"Daily": (1, 1), "Weekly": (1, 7), "Monthly": (1, 31)}


def build_report(con, actor, data):
    rtype = data.get("reportType")
    require(rtype in REPORT_SPAN, "Report type must be Daily, Weekly or Monthly.")
    if rtype == "Daily":
        require(data.get("date"), "Please select a report date.")
        start = end = parse_date(data.get("date"), "Report date")
    else:
        require(data.get("startDate") and data.get("endDate"), "Please select both a start date and an end date.")
        start, end = parse_date(data.get("startDate"), "Start date"), parse_date(data.get("endDate"), "End date")
    require(start <= end, "Start date must be on or before the end date.")
    require(end <= today_sgt(), "The report period cannot lie in the future.")
    days = (end - start).days + 1
    lo, hi = REPORT_SPAN[rtype]
    require(lo <= days <= hi, f"A {rtype.lower()} report covers at most {hi} day(s); you selected {days}.")
    if rtype == "Monthly":
        require(start.month == end.month and start.year == end.year, "A monthly report must stay within one calendar month.")
    lo_ts = timestamp(datetime.combine(start, datetime.min.time(), SGT))
    hi_ts = timestamp(datetime.combine(end + timedelta(days=1), datetime.min.time(), SGT))
    count = lambda sql: con.execute(sql, (lo_ts, hi_ts)).fetchone()[0]
    report = {"reportType": rtype, "startDate": start.isoformat(), "endDate": end.isoformat(),
        "newIDPs": count("SELECT COUNT(*) FROM idps WHERE createdAt>=? AND createdAt<?"),
        "views": count("SELECT COUNT(*) FROM view_events WHERE at>=? AND at<?"),
        "shortlists": count("SELECT COUNT(*) FROM shortlist_events WHERE at>=? AND at<?"),
        "newAccounts": count("SELECT COUNT(*) FROM accounts WHERE createdAt>=? AND createdAt<?"),
        "activeIDPs": len(public_idps(con)),
        "activeCategories": con.execute("SELECT COUNT(*) FROM categories WHERE status='Active'").fetchone()[0]}
    no_data = not any(report[k] for k in ("newIDPs", "views", "shortlists", "newAccounts"))
    # Persist even zero-activity snapshots so every generated report can be viewed later.
    report.update(id=uid("rep"), generatedAt=timestamp(), generatedBy=actor["id"])
    insert(con, "reports", report)
    return report, no_data


def generate_scheduled_reports():
    """Save completed SGT daily/weekly/monthly periods once. Safe to rerun after restart."""
    today = today_sgt()
    yesterday = today - timedelta(days=1)
    last_sunday = today - timedelta(days=today.weekday() + 1)
    last_monday = last_sunday - timedelta(days=6)
    last_month_end = today.replace(day=1) - timedelta(days=1)
    last_month_start = last_month_end.replace(day=1)
    jobs = (("Daily", yesterday, yesterday),
            ("Weekly", last_monday, last_sunday),
            ("Monthly", last_month_start, last_month_end))
    saved = 0
    with connect() as con:
        actor = one(con, """SELECT a.id FROM accounts a JOIN user_profiles p ON p.id=a.profileId
            WHERE p.role='Platform Management' AND p.status='Active' AND a.status='Active'
            ORDER BY a.id LIMIT 1""")
        if not actor:
            print("Report scheduler: no active Platform Management account; skipped.")
            return 0
        with con:
            # BEGIN IMMEDIATE serializes scheduler runs, preventing concurrent duplicate inserts.
            con.execute("BEGIN IMMEDIATE")
            for kind, start, end in jobs:
                # A completed-period snapshot (including a manual one) satisfies this job.
                completed_at = timestamp(datetime.combine(end + timedelta(days=1), datetime.min.time(), SGT))
                exists = one(con, """SELECT id FROM reports WHERE reportType=? AND startDate=? AND endDate=?
                    AND generatedAt>=? LIMIT 1""", (kind, start.isoformat(), end.isoformat(), completed_at))
                if exists:
                    continue
                data = {"reportType": kind, "date": start.isoformat(),
                        "startDate": start.isoformat(), "endDate": end.isoformat()}
                build_report(con, actor, data)
                saved += 1
    return saved


def report_scheduler(stop_event):
    """Runs server-side; never depends on somebody keeping a browser tab open."""
    try:
        generate_scheduled_reports()  # catch up the latest completed periods at startup
    except Exception as exc:
        print("Report scheduler startup error:", type(exc).__name__, exc)
    while not stop_event.is_set():
        now = datetime.now(SGT)
        next_run = datetime.combine(now.date() + timedelta(days=1), datetime.min.time(), SGT) + timedelta(minutes=5)
        if stop_event.wait(max(1, (next_run - now).total_seconds())):
            break
        try:
            generate_scheduled_reports()
        except Exception as exc:
            print("Report scheduler error:", type(exc).__name__, exc)


REPORT_COLUMNS = (("reportType", "Report Type"), ("startDate", "Start Date"), ("endDate", "End Date"),
    ("generatedAt", "Generated At (UTC)"), ("newIDPs", "New IDPs"), ("views", "Views"), ("shortlists", "Shortlists"),
    ("newAccounts", "New Accounts"), ("activeIDPs", "Visible IDPs"), ("activeCategories", "Active Categories"))


def col_name(n):
    s = ""
    while n:
        n, r = divmod(n - 1, 26)
        s = chr(65 + r) + s
    return s


def build_report_excel(report_rows):
    data = [[r.get(k, "") for k, _ in REPORT_COLUMNS] for r in report_rows]
    all_rows = [[h for _, h in REPORT_COLUMNS]] + data
    widths = [max(12, min(40, max(len(str(r[i])) for r in all_rows) + 3)) for i in range(len(REPORT_COLUMNS))]
    safe = lambda v: xml_escape("".join(c for c in str(v if v is not None else "") if ord(c) in (9, 10, 13) or ord(c) >= 32))
    xml_rows = []
    for rn, vals in enumerate(all_rows, 1):
        cells = []
        for cn, v in enumerate(vals, 1):
            ref, style = f"{col_name(cn)}{rn}", 1 if rn == 1 else 2
            if rn > 1 and cn >= 5:
                cells.append(f'<c r="{ref}" s="{style}"><v>{int(v or 0)}</v></c>')
            else:
                cells.append(f'<c r="{ref}" s="{style}" t="inlineStr"><is><t>{safe(v)}</t></is></c>')
        xml_rows.append(f'<row r="{rn}">{"".join(cells)}</row>')
    last = f"{col_name(len(REPORT_COLUMNS))}{len(all_rows)}"
    cols = "".join(f'<col min="{i}" max="{i}" width="{w}" customWidth="1"/>' for i, w in enumerate(widths, 1))
    sheet = (f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
             f'<dimension ref="A1:{last}"/><cols>{cols}</cols><sheetData>{"".join(xml_rows)}</sheetData><autoFilter ref="A1:{last}"/></worksheet>')
    styles = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
              '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>'
              '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>'
              '<fill><patternFill patternType="solid"><fgColor rgb="FF68745A"/><bgColor indexed="64"/></patternFill></fill></fills>'
              '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
              '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3">'
              '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
              '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center"/></xf>'
              '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center"/></xf>'
              '</cellXfs></styleSheet>')
    parts = {
        "[Content_Types].xml": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
        "_rels/.rels": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
        "xl/workbook.xml": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Activity Reports" sheetId="1" r:id="rId1"/></sheets></workbook>',
        "xl/_rels/workbook.xml.rels": '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
        "xl/styles.xml": styles, "xl/worksheets/sheet1.xml": sheet}
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        for path, content in parts.items():
            z.writestr(path, content)
    return buf.getvalue()


# --------------------------------------------------------------------------------------
# SECTION 7 — HTTP HANDLER
# --------------------------------------------------------------------------------------
PREDICTOR = FeasibilityPredictor(BASE / "ml" / "feasibility_model.json")
STATIC_TYPES = {".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8"}


class Handler(BaseHTTPRequestHandler):
    server_version = "LimKopi/2.0"

    def log_message(self, fmt, *args):
        if not os.environ.get("LIM_KOPI_QUIET"):
            super().log_message(fmt, *args)

    def send_bytes(self, status, payload, ctype="application/json; charset=utf-8", cookie=None, filename=None):
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(payload)))
        if filename:
            self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "same-origin")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
                         "img-src 'self' data: https:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'")
        if cookie:
            self.send_header("Set-Cookie", cookie)
        self.end_headers()
        self.wfile.write(payload)

    def reply(self, obj, status=200, cookie=None):
        self.send_bytes(status, json.dumps(obj, ensure_ascii=False).encode(), cookie=cookie)

    def fail(self, exc):
        if isinstance(exc, ApiError):
            self.reply({"error": str(exc)}, exc.status)
        elif isinstance(exc, sqlite3.IntegrityError):
            self.reply({"error": "This record conflicts with an existing record."}, 409)
        else:
            print("Unexpected error:", type(exc).__name__, exc)
            self.reply({"error": "Internal server error."}, 500)

    def token(self):
        c = SimpleCookie()
        try:
            c.load(self.headers.get("Cookie", ""))
        except Exception:
            return None
        return c["lk_session"].value if "lk_session" in c else None

    def session(self, con):
        tok = self.token()
        if not tok:
            return None
        found = one(con, """SELECT a.id, a.username, a.name, a.email, a.profileId, a.status, p.role, p.permissions,
            p.status AS profileStatus, s.csrf_token FROM sessions s JOIN accounts a ON a.id=s.accountId
            JOIN user_profiles p ON p.id=a.profileId WHERE s.token_hash=? AND s.expiresAt>?""",
                    (hashlib.sha256(tok.encode()).hexdigest(), int(time.time())))
        if not found or found["status"] != "Active" or found["profileStatus"] != "Active":
            return None
        found["permissions"] = json.loads(found["permissions"])
        return found

    def actor(self, con):
        a = self.session(con)
        require(a, "Please sign in.", 401)
        if self.command != "GET":
            require(hmac.compare_digest(str(self.headers.get("X-CSRF-Token", "")), a["csrf_token"]),
                    "Session verification failed. Refresh the page and sign in again.", 403)
        return a

    def same_origin(self):
        origin = self.headers.get("Origin")
        if origin:
            host = self.headers.get("Host", "")
            require(origin in (f"http://{host}", f"https://{host}"), "Cross-origin requests are not allowed.", 403)

    def cookie(self, tok, max_age=SESSION_SECONDS):
        parts = [f"lk_session={tok}", "HttpOnly", "SameSite=Lax", "Path=/", f"Max-Age={max_age}"]
        if self.headers.get("X-Forwarded-Proto") == "https":
            parts.append("Secure")
        return "; ".join(parts)

    @staticmethod
    def user_json(a):
        return {"id": a["id"], "username": a["username"], "name": a["name"], "email": a["email"],
                "role": a["role"], "permissions": a["permissions"]}

    # ---------------------------------- GET ----------------------------------
    def do_GET(self):
        try:
            parts = urlsplit(self.path)
            path, query = parts.path, parse_qs(parts.query, keep_blank_values=True)
            if path in ("/", "/index.html"):
                return self.send_bytes(200, (BASE / "index.html").read_bytes(), "text/html; charset=utf-8")
            if path.startswith("/js/"):
                target = (BASE / path.lstrip("/")).resolve()
                require(target.is_file() and (BASE / "js") in target.parents and target.suffix in STATIC_TYPES, "Not found.", 404)
                return self.send_bytes(200, target.read_bytes(), STATIC_TYPES[target.suffix])
            if path == "/favicon.ico":
                return self.send_bytes(204, b"", "image/x-icon")
            if path == "/api/health":
                return self.reply({"ok": True, "database": "SQLite", "schemaVersion": SCHEMA_VERSION,
                                   "model": PREDICTOR.version})
            with connect() as con:
                if path == "/api/session" and not self.session(con):
                    return self.reply({"user": None})          # not signed in (no console 401 noise)
                a = self.actor(con)
                seg = [s for s in path.strip("/").split("/") if s]
                q = (query.get("q") or [None])[0]
                if path == "/api/session":
                    return self.reply({"user": self.user_json(a), "csrfToken": a["csrf_token"]})
                if path == "/api/bootstrap":
                    return self.reply(bootstrap(con, a))
                if path == "/api/categories/active":     # category picker for IDP forms
                    return self.reply(rows(con, "SELECT id, name, description, status FROM categories WHERE status='Active' ORDER BY name"))
                if path == "/api/profiles/options":      # active profiles for account forms
                    require(can(a, "MANAGE_ACCOUNTS"), "You do not have permission for this action.", 403)
                    return self.reply([shape("profiles", r) for r in rows(con, "SELECT * FROM user_profiles ORDER BY role")])
                if path == "/api/idps":                  # gallery of publicly visible IDPs
                    require(can(a, "BROWSE_IDP"), "You do not have permission for this action.", 403)
                    return self.reply([shape("idps", r) for r in public_idps(con)])
                if path == "/api/idps/search":           # 4.1 Customer search new IDPs
                    require(can(a, "BROWSE_IDP"), "You do not have permission for this action.", 403)
                    require(q and q.strip(), "Please enter a search keyword.")
                    found = [shape("idps", r) for r in public_idps(con)
                             if keyword_match(r, "idps", q.strip(), f"{r['categoryName']} {r['designerName']} {r.get('companyName') or ''}")]
                    return self.reply(found)
                if path == "/api/favourites":            # 4.5 view / 4.4 search shortlist
                    require(can(a, "MANAGE_FAVOURITES"), "You do not have permission for this action.", 403)
                    saved = {r["idpId"]: r["savedAt"] for r in rows(con, "SELECT * FROM favourites WHERE customerId=?", (a["id"],))}
                    items = [dict(shape("idps", r), savedAt=saved[r["id"]]) for r in public_idps(con) if r["id"] in saved]
                    if "q" in query:
                        require(q and q.strip(), "Please enter a search keyword.")
                        items = [r for r in items if keyword_match(r, "idps", q.strip(), f"{r['categoryName']} {r['designerName']}")]
                    return self.reply(items)
                if len(seg) == 3 and seg[:2] == ["api", "idps"] and seg[2] != "search":   # 4.2 GetIDP (customer)
                    require(can(a, "BROWSE_IDP"), "You do not have permission for this action.", 403)
                    rec = next((r for r in public_idps(con) if r["id"] == seg[2]), None)
                    require(rec, "IDP not found or no longer available.", 404)
                    return self.reply(shape("idps", rec))
                if len(seg) == 4 and seg[:2] == ["api", "idps"] and seg[3] in ("view-count", "shortlist-count"):
                    require(can(a, "MANAGE_IDP"), "You do not have permission for this action.", 403)
                    rec = get_record(con, "idps", seg[2])
                    require(rec, "IDP not found.", 404)
                    check_kind(a, "idps", rec)
                    key = "viewCount" if seg[3] == "view-count" else "shortlistCount"
                    return self.reply({"idpId": rec["id"], "title": rec["title"], key: rec[key]})
                if len(seg) >= 3 and seg[:2] == ["api", "records"]:
                    kind = seg[2]
                    check_kind(a, kind)
                    if len(seg) == 4:                    # View
                        rec = get_record(con, kind, seg[3])
                        require(rec, "Record not found.", 404)
                        check_kind(a, kind, rec)
                        return self.reply(shape(kind, rec))
                    stage = (query.get("stage") or [None])[0]
                    items = list_records(con, a, kind, stage)
                    if "q" in query:                     # Search
                        require(q and q.strip(), "Please enter a search keyword.")
                        cat_names = {c["id"]: c["name"] for c in rows(con, "SELECT id,name FROM categories")}
                        items = [r for r in items if keyword_match(r, kind, q.strip(), cat_names.get(r.get("categoryId"), ""))]
                    return self.reply([shape(kind, r) for r in items])
                if path == "/api/reports":
                    require(can(a, "GENERATE_REPORTS"), "You do not have permission for this action.", 403)
                    return self.reply(rows(con, "SELECT * FROM reports ORDER BY generatedAt DESC"))
                if len(seg) == 3 and seg[:2] == ["api", "reports"]:
                    # Only one saved report is returned. The ID is resolved server-side.
                    require(can(a, "GENERATE_REPORTS"), "You do not have permission for this action.", 403)
                    report_id = seg[2]
                    export_format = None
                    if report_id.endswith(".xlsx") or report_id.endswith(".csv"):
                        report_id, export_format = report_id.rsplit(".", 1)
                    require(0 < len(report_id) <= 128, "Report not found.", 404)
                    report = one(con, "SELECT * FROM reports WHERE id=?", (report_id,))
                    require(report, "Report not found.", 404)
                    if not export_format:
                        return self.reply(report)
                    filename = f"lim-kopi-{report['reportType'].lower()}-{report['startDate']}-{report_id}.{export_format}"
                    if export_format == "xlsx":
                        return self.send_bytes(200, build_report_excel([report]),
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", filename=filename)
                    buf = io.StringIO()
                    w = csv.DictWriter(buf, [k for k, _ in REPORT_COLUMNS], extrasaction="ignore")
                    w.writeheader()
                    w.writerow({k: (f"'{v}" if isinstance(v, str) and v[:1] in "=+-@" else v)
                                for k, v in report.items()})
                    return self.send_bytes(200, buf.getvalue().encode("utf-8-sig"),
                        "text/csv; charset=utf-8", filename=filename)
                self.reply({"error": "Not found."}, 404)
        except Exception as exc:
            self.fail(exc)

    # ---------------------------------- POST / PUT ----------------------------------
    def do_POST(self):
        self.mutate()

    def do_PUT(self):
        self.mutate()

    def mutate(self):
        try:
            self.same_origin()
            path = urlsplit(self.path).path
            data = self.body()
            with connect() as con:
                if path == "/api/login" and self.command == "POST":
                    return self.login(con, data)
                if path == "/api/register" and self.command == "POST":
                    profile = one(con, "SELECT * FROM user_profiles WHERE role=? COLLATE NOCASE", (str(data.get("profile") or "Customer"),))
                    require(profile and profile["role"] in SELF_REGISTER_PROFILES, "Only Customer and Interior Designer accounts can self-register.", 403)
                    require(data.get("password") == data.get("confirmPassword"), "Passwords do not match.")
                    ident = create_account(con, data.get("username"), data.get("name"), data.get("email"),
                                           str(data.get("password") or ""), profile["id"])
                    return self.reply({"ok": True, "id": ident}, 201)
                if path == "/api/logout" and self.command == "POST":
                    tok = self.token()
                    ended = False
                    if tok:
                        ended = con.execute("DELETE FROM sessions WHERE token_hash=?", (hashlib.sha256(tok.encode()).hexdigest(),)).rowcount > 0
                    return self.reply({"ok": True, "sessionEnded": ended}, cookie=self.cookie("", 0))
                a = self.actor(con)
                seg = [s for s in path.strip("/").split("/") if s]
                if path == "/api/reports" and self.command == "POST":
                    require(can(a, "GENERATE_REPORTS"), "You do not have permission for this action.", 403)
                    report, empty = build_report(con, a, data)
                    return self.reply({"noData": empty, "report": report}, 200 if empty else 201)
                if path == "/api/idps/predict-feasibility" and self.command == "POST":
                    require(can(a, "MANAGE_IDP") or can(a, "BROWSE_IDP"), "You do not have permission for this action.", 403)
                    try:
                        result = PREDICTOR.predict(data)
                    except ValueError as err:
                        raise ApiError(400, str(err))
                    insert(con, "predictions", {"id": uid("pred"), "accountId": a["id"], "inputs": json.dumps(result["inputs"]),
                        "probability": result["probability"], "label": result["label"], "modelVersion": result["modelVersion"],
                        "at": timestamp()})
                    return self.reply(result)
                if len(seg) == 4 and seg[:2] == ["api", "idps"] and self.command == "POST":
                    return self.customer_action(con, a, seg[2], seg[3])
                if len(seg) >= 3 and seg[:2] == ["api", "records"]:
                    return self.record_action(con, a, seg)
                self.reply({"error": "Not found."}, 404)
        except Exception as exc:
            self.fail(exc)

    def login(self, con, data):
        ident = str(data.get("username") or "").strip()
        password = str(data.get("password") or "")
        require(ident and password, "Please enter your username and password.")
        found = one(con, """SELECT a.*, p.role, p.permissions, p.status AS profileStatus FROM accounts a
            JOIN user_profiles p ON p.id=a.profileId WHERE a.username=? COLLATE NOCASE OR a.email=? COLLATE NOCASE""",
                    (ident, ident))
        if found:
            digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(found["password_salt"]), found["password_iterations"]).hex()
            ok = hmac.compare_digest(digest, found["password_hash"])
        else:
            pw_hash(password)   # equalise timing for unknown usernames
            ok = False
        require(ok, "Username or password is incorrect.", 401)
        require(found["status"] == "Active", "This account is suspended. Contact the User Admin.", 403)
        require(found["profileStatus"] == "Active", f"Your user profile ({found['role']}) is suspended. Contact the User Admin.", 403)
        tok, csrf = secrets.token_urlsafe(40), secrets.token_urlsafe(32)
        insert(con, "sessions", {"token_hash": hashlib.sha256(tok.encode()).hexdigest(), "accountId": found["id"],
                                 "csrf_token": csrf, "expiresAt": int(time.time()) + SESSION_SECONDS})
        found["permissions"] = json.loads(found["permissions"])
        self.reply({"user": self.user_json(found), "csrfToken": csrf}, cookie=self.cookie(tok))

    def customer_action(self, con, a, ident, action):
        require(action in ("view", "favourite", "unfavourite"), "Invalid action.", 404)
        require(can(a, "BROWSE_IDP"), "Only customers may use this action.", 403)
        visible = {r["id"]: r for r in public_idps(con)}
        require(ident in visible, "IDP not found or no longer available.", 404)
        t = timestamp()
        if action == "view":                                      # 4.2 + IncrementViewCount()
            con.execute("UPDATE idps SET viewCount = viewCount + 1 WHERE id=?", (ident,))
            insert(con, "view_events", {"id": uid("v"), "customerId": a["id"], "idpId": ident, "at": t})
            rec = dict(visible[ident], viewCount=visible[ident]["viewCount"] + 1)
            return self.reply(shape("idps", rec))
        require(can(a, "MANAGE_FAVOURITES"), "You do not have permission for this action.", 403)
        exists = one(con, "SELECT 1 FROM favourites WHERE customerId=? AND idpId=?", (a["id"], ident))
        if action == "favourite":                                 # 4.3 + IncrementShortlistCount()
            require(not exists, "This IDP is already in your favourites.", 409)
            insert(con, "favourites", {"customerId": a["id"], "idpId": ident, "savedAt": t})
            insert(con, "shortlist_events", {"id": uid("sl"), "customerId": a["id"], "idpId": ident, "at": t})
            con.execute("UPDATE idps SET shortlistCount = shortlistCount + 1 WHERE id=?", (ident,))
            return self.reply({"saved": True, "idpId": ident}, 201)
        require(exists, "This IDP is not in your favourites.", 404)  # Ext #41 remove
        con.execute("DELETE FROM favourites WHERE customerId=? AND idpId=?", (a["id"], ident))
        return self.reply({"saved": False, "idpId": ident})

    def record_action(self, con, a, seg):
        kind = seg[2]
        check_kind(a, kind)
        table = RESOURCES[kind][0]
        if len(seg) == 5 and self.command == "POST" and seg[4] in ("suspend", "activate"):
            rec = get_record(con, kind, seg[3])
            require(rec, "Record not found.", 404)
            check_kind(a, kind, rec)
            set_status(con, a, kind, rec, "Suspended" if seg[4] == "suspend" else "Active")
            return self.reply({"ok": True, "id": rec["id"], "status": "Suspended" if seg[4] == "suspend" else "Active"})
        if len(seg) == 3 and self.command == "POST":              # Create
            data = self.data_cache
            if kind == "accounts":
                require(data.get("password") == data.get("confirmPassword"), "Passwords do not match.")
                profile = one(con, "SELECT * FROM user_profiles WHERE id=?", (str(data.get("profileId") or ""),))
                require(profile, "Select a valid user profile.")
                ident = create_account(con, data.get("username"), data.get("name"), data.get("email"),
                                       str(data.get("password") or ""), profile["id"])
            else:
                clean = validate(con, a, kind, data, stage=data.get("stage"))
                ident, t = uid(kind[:3]), timestamp()
                if RESOURCES[kind][2]:
                    clean["ownerId"] = a["id"]
                clean.update(id=ident, status="Active", createdAt=t, updatedAt=t)
                insert(con, table, clean)
            return self.reply(shape(kind, get_record(con, kind, ident)), 201)
        if len(seg) == 4 and self.command == "PUT":               # Update
            rec = get_record(con, kind, seg[3])
            require(rec, "Record not found.", 404)
            check_kind(a, kind, rec)
            clean = validate(con, a, kind, self.data_cache, old=rec)
            clean["updatedAt"] = timestamp()
            update(con, table, rec["id"], clean)
            return self.reply(shape(kind, get_record(con, kind, rec["id"])))
        raise ApiError(405, "Invalid record operation.")

    def body(self):
        require("application/json" in self.headers.get("Content-Type", ""), "Send JSON requests only.", 415)
        length = int(self.headers.get("Content-Length") or 0)
        require(0 < length <= 2_000_000, "Request is empty or too large.", 413)
        try:
            value = json.loads(self.rfile.read(length))
        except (UnicodeDecodeError, json.JSONDecodeError):
            raise ApiError(400, "Invalid JSON.")
        require(isinstance(value, dict), "Expected a JSON object.")
        self.data_cache = value
        return value


def make_server(host=HOST, port=PORT):
    initialize()
    return ThreadingHTTPServer((host, port), Handler)


def main():
    server = make_server()
    scheduler_stop = threading.Event()
    scheduler_thread = threading.Thread(target=report_scheduler, args=(scheduler_stop,), daemon=True,
                                        name="lim-kopi-report-scheduler")
    scheduler_thread.start()
    print(f"Lim Kopi IDP Platform: http://{HOST}:{server.server_address[1]}")
    print(f"SQLite database: {DB_PATH} (schema v{SCHEMA_VERSION})")
    print("Demo usernames: shiyuan, yongjun, shafiq, shaofeng, lwin, bryan | password Demo1234!")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        scheduler_stop.set()
        scheduler_thread.join(timeout=2)
        server.server_close()


if __name__ == "__main__":
    main()
