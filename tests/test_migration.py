"""Schema migration: the team's original v1 lim_kopi.db must upgrade to v2 without losing rows."""
import shutil
import sqlite3
import tempfile
import unittest
from pathlib import Path

from helpers import server

FIXTURE = Path(__file__).parent / "fixtures" / "lim_kopi_v1.db"


class MigrationTest(unittest.TestCase):
    def test_migrateV1DatabaseToV2(self):
        tmp = Path(tempfile.mkdtemp()) / "lim_kopi.db"
        shutil.copy(FIXTURE, tmp)
        before = sqlite3.connect(tmp)
        counts = {t: before.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
                  for t in ("accounts", "companies", "categories", "idps", "favourites", "views", "profiles")}
        before.close()
        server.DB_PATH = tmp
        server.initialize()
        con = sqlite3.connect(tmp)
        self.assertEqual(con.execute("PRAGMA user_version").fetchone()[0], 2)
        self.assertEqual(con.execute("SELECT COUNT(*) FROM accounts").fetchone()[0], counts["accounts"])
        self.assertEqual(con.execute("SELECT COUNT(*) FROM companies").fetchone()[0], counts["companies"])
        self.assertEqual(con.execute("SELECT COUNT(*) FROM idps").fetchone()[0], counts["idps"])
        self.assertEqual(con.execute("SELECT COUNT(*) FROM favourites").fetchone()[0], counts["favourites"])
        self.assertEqual(con.execute("SELECT COUNT(*) FROM view_events").fetchone()[0], counts["views"])
        self.assertEqual(con.execute("SELECT COUNT(*) FROM legacy_member_profiles").fetchone()[0], counts["profiles"])
        self.assertEqual(con.execute("SELECT COUNT(*) FROM user_profiles").fetchone()[0], 4)
        self.assertEqual(con.execute("PRAGMA foreign_key_check").fetchall(), [])
        # Counters were rebuilt from the v1 event tables
        total_views = con.execute("SELECT SUM(viewCount) FROM idps").fetchone()[0]
        self.assertEqual(total_views, counts["views"])
        # Existing password hashes still work after migration
        server.DB_PATH = tmp
        with server.connect() as c:
            row = c.execute("SELECT password_salt, password_hash, password_iterations FROM accounts WHERE username='shiyuan'").fetchone()
        _, digest, _ = server.pw_hash("Demo1234!", bytes.fromhex(row["password_salt"]), row["password_iterations"])
        self.assertEqual(digest, row["password_hash"])
        con.close()


if __name__ == "__main__":
    unittest.main()
