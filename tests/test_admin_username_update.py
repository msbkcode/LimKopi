"""US8 regression checks: only User Admin can edit usernames through User Accounts > Update."""
from helpers import ServerTestCase


class AdminUsernameUpdateTests(ServerTestCase):
    def test_admin_updates_username_and_new_username_logs_in(self):
        admin = self.client("shiyuan")
        status, updated = admin.put("/api/records/accounts/a6", {
            "username": "bryannew", "email": "bryan@limkopi.test", "profileId": "up-customer"
        })
        self.assertEqual(status, 200)
        self.assertEqual(updated["username"], "bryannew")
        self.assertEqual(self.db("SELECT username FROM accounts WHERE id='a6'")[0]["username"], "bryannew")
        self.assertEqual(self.client().login("bryannew")[0], 200)
        self.assertEqual(self.client().login("bryan")[0], 401)

    def test_duplicate_username_is_rejected_case_insensitively(self):
        admin = self.client("shiyuan")
        status, body = admin.put("/api/records/accounts/a6", {
            "username": "SHAFIQ", "email": "bryan@limkopi.test", "profileId": "up-customer"
        })
        self.assertEqual(status, 409)
        self.assertIn("already registered", body["error"])
        self.assertEqual(self.db("SELECT username FROM accounts WHERE id='a6'")[0]["username"], "bryan")

    def test_invalid_username_is_rejected(self):
        admin = self.client("shiyuan")
        for username in ("", "a", "bad username", "name@domain"):
            with self.subTest(username=username):
                status, body = admin.put("/api/records/accounts/a6", {
                    "username": username, "email": "bryan@limkopi.test", "profileId": "up-customer"
                })
                self.assertEqual(status, 400)
                self.assertIn("Username must", body["error"])
        self.assertEqual(self.db("SELECT username FROM accounts WHERE id='a6'")[0]["username"], "bryan")

    def test_non_admin_cannot_edit_own_or_another_username(self):
        customer = self.client("shafiq")
        for target in ("a3", "a6"):
            with self.subTest(target=target):
                status, body = customer.put(f"/api/records/accounts/{target}", {
                    "username": "customernew", "email": "shafiq@limkopi.test", "profileId": "up-customer"
                })
                self.assertEqual(status, 403)
                self.assertIn("permission", body["error"])
        self.assertEqual(self.db("SELECT username FROM accounts WHERE id='a3'")[0]["username"], "shafiq")

    def test_existing_account_updates_work_without_username_field(self):
        admin = self.client("shiyuan")
        status, body = admin.put("/api/records/accounts/a6", {
            "email": "bryan.new@example.com", "profileId": "up-customer"
        })
        self.assertEqual(status, 200)
        self.assertEqual(body["username"], "bryan")
        self.assertEqual(body["email"], "bryan.new@example.com")

    def test_admin_can_reuse_same_username(self):
        admin = self.client("shiyuan")
        status, body = admin.put("/api/records/accounts/a6", {
            "username": "BRYAN", "email": "bryan@limkopi.test", "profileId": "up-customer"
        })
        self.assertEqual(status, 200)
        self.assertEqual(body["username"], "BRYAN")
