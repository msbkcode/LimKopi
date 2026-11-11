"""Test harness: runs server.py in-process on a random port against a fresh copy of a
seeded SQLite database for every test, and provides a tiny HTTP client with cookie + CSRF."""
from __future__ import annotations

import http.client
import json
import os
import shutil
import sys
import tempfile
import threading
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
os.environ.setdefault("LIM_KOPI_FAST_SEED", "1")
os.environ.setdefault("LIM_KOPI_QUIET", "1")

import server  # noqa: E402

_TEMPLATE = None
PASSWORD = "Demo1234!"


def template_db():
    """Seed once per test run, then copy the file for each test (fast, isolated)."""
    global _TEMPLATE
    if _TEMPLATE is None:
        folder = Path(tempfile.mkdtemp(prefix="limkopi-tpl-"))
        server.DB_PATH = folder / "template.db"
        server.initialize()
        _TEMPLATE = server.DB_PATH
    return _TEMPLATE


class Client:
    def __init__(self, port):
        self.port, self.cookie, self.csrf = port, None, ""

    def request(self, method, path, body=None):
        conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=20)
        headers = {"Accept": "application/json"}
        payload = None
        if method != "GET":
            payload = json.dumps(body if body is not None else {}).encode()
            headers["Content-Type"] = "application/json"
            if self.csrf:
                headers["X-CSRF-Token"] = self.csrf
        if self.cookie:
            headers["Cookie"] = self.cookie
        conn.request(method, path, body=payload, headers=headers)
        resp = conn.getresponse()
        raw = resp.read()
        set_cookie = resp.getheader("Set-Cookie")
        if set_cookie and set_cookie.startswith("lk_session="):
            value = set_cookie.split(";", 1)[0]
            self.cookie = None if value == "lk_session=" else value
        conn.close()
        ctype = resp.getheader("Content-Type", "")
        data = json.loads(raw) if "json" in ctype and raw else raw
        return resp.status, data

    get = lambda self, path: self.request("GET", path)
    post = lambda self, path, body=None: self.request("POST", path, body)
    put = lambda self, path, body=None: self.request("PUT", path, body)

    def login(self, username, password=PASSWORD):
        status, data = self.post("/api/login", {"username": username, "password": password})
        if status == 200:
            self.csrf = data["csrfToken"]
        return status, data


class ServerTestCase(unittest.TestCase):
    """Each test gets its own database copy and HTTP server."""

    def setUp(self):
        tpl = template_db()
        self.tmp = Path(tempfile.mkdtemp(prefix="limkopi-test-"))
        server.DB_PATH = self.tmp / "test.db"
        shutil.copy(tpl, server.DB_PATH)
        self.httpd = server.ThreadingHTTPServer(("127.0.0.1", 0), server.Handler)
        self.port = self.httpd.server_address[1]
        self.thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.httpd.shutdown()
        self.httpd.server_close()
        shutil.rmtree(self.tmp, ignore_errors=True)

    def client(self, username=None):
        c = Client(self.port)
        if username:
            status, _ = c.login(username)
            self.assertEqual(status, 200, f"login failed for {username}")
        return c

    def db(self, sql, args=()):
        con = server.connect()
        try:
            result = [dict(r) for r in con.execute(sql, args).fetchall()]
            con.commit()
            return result
        finally:
            con.close()
