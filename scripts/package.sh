#!/usr/bin/env bash
# Build a self-contained release zip: server, BCE frontend, trained model, schema and docs.
set -euo pipefail
VERSION="${1:-dev}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAGE="$(mktemp -d)/lim-kopi"
mkdir -p "$STAGE/ml" "$ROOT/dist"
cp "$ROOT"/{server.py,predictor.py,index.html,schema.sql,README.md,RUN_WINDOWS.bat} "$STAGE/"
cp -r "$ROOT/js" "$STAGE/js"
cp "$ROOT/ml/feasibility_model.json" "$STAGE/ml/"
echo "$VERSION" > "$STAGE/VERSION"
( cd "$(dirname "$STAGE")" && zip -qr "$ROOT/dist/lim-kopi-$VERSION.zip" lim-kopi )
echo "Packaged dist/lim-kopi-$VERSION.zip ($(find "$STAGE" -type f | wc -l) files)"
