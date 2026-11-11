"""TDD suite for authentication.

Test names match the TDD table in the report (Section 6): loginSuccess, loginWrongPassword,
loginUserNotFound, loginAccountSuspended, loginProfileSuspended, plus two refactoring guards.
"""
import unittest

from helpers import ServerTestCase


class LoginTDDTest(ServerTestCase):
    def test_loginSuccess(self):
        """Valid username + password -> 200, session cookie and CSRF token issued, role resolved from profile."""
        c = self.client()
        status, body = c.login("shiyuan")
        self.assertEqual(status, 200)
        self.assertIsNotNone(c.cookie)                         # assertNotNull(sessionToken)
        self.assertTrue(c.cookie.startswith("lk_session="))
        self.assertGreaterEqual(len(body["csrfToken"]), 32)
        self.assertEqual(body["user"]["role"], "User Admin")
        self.assertIn("MANAGE_PROFILES", body["user"]["permissions"])
        status, me = c.get("/api/session")
        self.assertEqual((status, me["user"]["username"]), (200, "shiyuan"))

    def test_loginWrongPassword(self):
        """Correct username, wrong password -> 401 with a generic message and no session."""
        c = self.client()
        status, body = c.login("shiyuan", "Wrong1234!")
        self.assertEqual(status, 401)
        self.assertEqual(body["error"], "Username or password is incorrect.")
        self.assertIsNone(c.cookie)                            # assertTrue(token.isEmpty())

    def test_loginUserNotFound(self):
        """Unknown username -> same 401 message as a wrong password (no user enumeration)."""
        c = self.client()
        status, body = c.login("ghost.user", "Demo1234!")
        self.assertEqual(status, 401)
        self.assertEqual(body["error"], "Username or password is incorrect.")
        self.assertIsNone(c.cookie)

    def test_loginAccountSuspended(self):
        """Suspended account with the correct password -> 403, access denied (Alt flow A2)."""
        admin = self.client("shiyuan")
        self.assertEqual(admin.post("/api/records/accounts/a3/suspend")[0], 200)
        c = self.client()
        status, body = c.login("shafiq")
        self.assertEqual(status, 403)
        self.assertIn("suspended", body["error"])
        self.assertIsNone(c.cookie)

    def test_loginProfileSuspended(self):
        """Active account whose User Profile is suspended -> 403 (role template disabled)."""
        admin = self.client("shiyuan")
        self.assertEqual(admin.post("/api/records/profiles/up-customer/suspend")[0], 200)
        c = self.client()
        status, body = c.login("bryan")
        self.assertEqual(status, 403)
        self.assertIn("user profile (Customer) is suspended", body["error"])
        self.assertIsNone(c.cookie)

    def test_passwordStoredAsSaltedPbkdf2(self):
        """Refactor guard: passwords are never stored in plain text; salts are unique per user."""
        rows = self.db("SELECT password_salt, password_hash, password_iterations FROM accounts")
        self.assertEqual(len({r["password_salt"] for r in rows}), len(rows))
        self.assertTrue(all(len(r["password_hash"]) == 64 and "Demo" not in r["password_hash"] for r in rows))
        self.assertTrue(all(r["password_iterations"] >= 50_000 for r in rows))

    def test_suspensionEndsLiveSession(self):
        """Refactor guard: suspending an account revokes sessions that were already open."""
        customer = self.client("shafiq")
        self.assertEqual(customer.get("/api/idps")[0], 200)
        self.client("shiyuan").post("/api/records/accounts/a3/suspend")
        self.assertEqual(customer.get("/api/idps")[0], 401)


if __name__ == "__main__":
    unittest.main()
