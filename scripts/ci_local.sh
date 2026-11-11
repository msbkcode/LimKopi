#!/usr/bin/env bash
# Reproduces the GitHub Actions "test" job locally (same commands, same order).
set -uo pipefail
cd "$(dirname "$0")/.."
step() { printf '\n==> %s\n' "$1"; }
start=$(date +%s)
step "Static checks"
python3 -m py_compile server.py predictor.py tests/*.py || exit 1
for f in js/*.js js/*/*.js; do node --check "$f" || exit 1; done
echo "compiled $(ls js/*.js js/*/*.js | wc -l) ES modules"
step "Automated tests"
LIM_KOPI_FAST_SEED=1 python3 tests/run_all.py 2>&1 | grep -E "^(FAIL|ERROR|AssertionError|Tests run|BUILD|Ran )" | cut -c1-200
status=${PIPESTATUS[0]}
echo "Duration: $(( $(date +%s) - start ))s  (exit $status)"
exit $status
