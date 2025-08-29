#!/usr/bin/env bash
set -euo pipefail

# --- sanity: ensure root launcher exists (idempotent) ---
if [ ! -f server.js ]; then
  cat > server.js <<'JS'
/**
 * Minimal root launcher so Azure uses a single entrypoint.
 * It simply requires the ingest app which already starts its own server.
 */
require('./express-ingest/app.js');
JS
  echo "Wrote server.js"
fi

if [ ! -f package.json ]; then
  cat > package.json <<'JSON'
{
  "name": "ingest-root",
  "private": true,
  "scripts": { "start": "node server.js" }
}
JSON
  echo "Wrote root package.json"
fi

# --- run the direct deploy (no Actions) ---
./deploy-direct.sh
