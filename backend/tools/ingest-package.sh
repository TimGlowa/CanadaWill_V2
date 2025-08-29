#!/usr/bin/env bash
set -euo pipefail

echo "[pack] cwd=$(pwd)"

# sanity: required files
[ -f express-ingest/app.js ] || { echo "[pack] missing express-ingest/app.js"; exit 1; }

# ensure root launcher exists
[ -f server.js ] || { echo "[pack] missing server.js at repo root"; exit 1; }
[ -f package.json ] || { echo "[pack] missing root package.json"; exit 1; }

# install deps only inside express-ingest
pushd express-ingest >/dev/null
  npm ci --only=production
popd >/dev/null

# embed build info (at repo root)
COMMIT_SHA="$(git rev-parse HEAD || echo unknown)"
DATE_ISO="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
cat > buildinfo.json <<JSON
{
  "commit": "${COMMIT_SHA}",
  "builtAt": "${DATE_ISO}",
  "paths": [
    "server.js",
    "package.json",
    "express-ingest/app.js",
    "express-ingest/package.json",
    "express-ingest/node_modules/*"
  ]
}
JSON

rm -f ingest.zip
zip -r -9 ingest.zip \
  server.js package.json buildinfo.json \
  express-ingest/app.js express-ingest/package.json express-ingest/data \
  express-ingest/node_modules >/dev/null

echo "ZIP CONTENTS:"
unzip -l ingest.zip | sed -n '1,200p'
