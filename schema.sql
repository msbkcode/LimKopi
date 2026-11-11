-- Lim Kopi SQLite schema v2 (spec-aligned with 48_User_Stories_V2.pdf).
-- INFORMATIONAL: server.py creates and migrates these tables automatically (PRAGMA user_version = 2).
-- A v1 database (accounts.role, per-account profiles, companies.contact, idps.imageUrl) is upgraded
-- in place on first start; old per-account public profiles are kept in legacy_member_profiles.
PRAGMA foreign_keys = ON;
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

-- Seed role templates (User Profiles)
INSERT OR IGNORE INTO user_profiles VALUES ('up-admin','User Admin','Administers user accounts and user profiles.','["MANAGE_ACCOUNTS", "MANAGE_PROFILES"]','Active',datetime('now'),datetime('now'));
INSERT OR IGNORE INTO user_profiles VALUES ('up-designer','Interior Designer','Design firms that publish company information and IDP portfolios.','["MANAGE_COMPANY", "MANAGE_IDP"]','Active',datetime('now'),datetime('now'));
INSERT OR IGNORE INTO user_profiles VALUES ('up-customer','Customer','Homeowners who explore and shortlist IDPs.','["BROWSE_IDP", "MANAGE_FAVOURITES"]','Active',datetime('now'),datetime('now'));
INSERT OR IGNORE INTO user_profiles VALUES ('up-platform','Platform Management','Curates IDP categories and generates activity reports.','["MANAGE_CATEGORIES", "GENERATE_REPORTS"]','Active',datetime('now'),datetime('now'));
