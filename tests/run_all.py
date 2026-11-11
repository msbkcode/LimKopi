"""Run every automated test (Python API + JS Boundary/Control) and write tests/results/results.json.

Usage:  python tests/run_all.py          (exit code 0 = BUILD SUCCESS, 1 = BUILD FAILURE)
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
import time
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))
OUT = HERE / "results"


class Collector(unittest.TextTestResult):
    def __init__(self, *a, **k):
        super().__init__(*a, **k)
        self.records, self._t = [], {}

    def startTest(self, test):
        self._t[test.id()] = time.perf_counter()
        super().startTest(test)

    def _add(self, test, status, detail=""):
        name = test.id().split(".")[-1]
        tc = re.sub(r"^test_", "", name)
        self.records.append({"id": tc, "suite": "python", "status": status,
                             "ms": round((time.perf_counter() - self._t.get(test.id(), time.perf_counter())) * 1000, 1),
                             "detail": detail[-400:]})

    def addSuccess(self, test):
        super().addSuccess(test)
        self._add(test, "PASS")

    def addFailure(self, test, err):
        super().addFailure(test, err)
        self._add(test, "FAIL", self._exc_info_to_string(err, test))

    def addError(self, test, err):
        super().addError(test, err)
        self._add(test, "ERROR", self._exc_info_to_string(err, test))


def run_python():
    suite = unittest.defaultTestLoader.discover(str(HERE), pattern="test_*.py")
    runner = unittest.TextTestRunner(resultclass=Collector, verbosity=1, stream=sys.stdout)
    result = runner.run(suite)
    return result.records


def run_js():
    files = sorted(str(p) for p in (HERE / "js").glob("*.test.mjs"))
    proc = subprocess.run(["node", "--test", "--test-reporter=tap", *files], cwd=ROOT, capture_output=True, text=True)
    records = []
    for line in proc.stdout.splitlines():
        m = re.match(r"^(not ok|ok) \d+ - (.+)$", line)
        if m:
            name = m.group(2)
            tc = name.split(":")[0] if name.startswith("TC_") else name
            records.append({"id": tc, "suite": "javascript", "status": "PASS" if m.group(1) == "ok" else "FAIL", "ms": None, "detail": ""})
    print(proc.stdout[-600:] if proc.returncode else f"node --test: {len(records)} JS tests, exit {proc.returncode}")
    return records


def main():
    started = time.perf_counter()
    records = run_python() + run_js()
    OUT.mkdir(exist_ok=True)
    passed = sum(r["status"] == "PASS" for r in records)
    summary = {"total": len(records), "passed": passed, "failed": len(records) - passed,
               "seconds": round(time.perf_counter() - started, 1), "results": records}
    (OUT / "results.json").write_text(json.dumps(summary, indent=1))
    print("-" * 60)
    print(f"Tests run: {summary['total']}, Passed: {passed}, Failed: {summary['failed']}, Time: {summary['seconds']} s")
    print("BUILD SUCCESS" if summary["failed"] == 0 else "BUILD FAILURE")
    return 0 if summary["failed"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
