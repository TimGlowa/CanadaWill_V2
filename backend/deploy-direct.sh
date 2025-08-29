#!/usr/bin/env bash
set -euo pipefail

# === Direct Kudu ZIP deploy (no GitHub Actions) ===
# What you need once: the *Publish Profile* for **canadawill-ingest**.
# In Azure Portal: canadawill-ingest → Get publish profile → copy XML.
# When prompted below, paste it between the EOF markers.

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

# 0) Capture publish profile XML once (skip if already exists)
mkdir -p tmp
if [ ! -f tmp/publishProfile.xml ]; then
  cat > tmp/publishProfile.xml <<'EOF'
<!-- paste the FULL publish profile XML for canadawill-ingest here, then press Enter, then Ctrl-D -->
EOF
fi

# 1) Parse creds + URLs from publish profile (no secrets printed)
# Use a more compatible approach than readarray
eval $(python3 - << 'PY'
import xml.etree.ElementTree as ET
pp = ET.parse("tmp/publishProfile.xml").getroot()
# find the web deploy profile (contains scm host)
prof = next(p for p in pp.findall(".//publishProfile") if "scm" in p.attrib.get("publishUrl",""))
user = prof.attrib["userName"]
pwd  = prof.attrib["userPWD"]
scm  = prof.attrib["publishUrl"].split(":")[0]  # e.g. canadawill-ingest-XXXX.scm.azurewebsites.net
dest = prof.attrib.get("destinationAppUrl","https://canadawill-ingest.azurewebsites.net")
# Escape $ in user name to prevent shell interpretation
user_escaped = user.replace("$", "\\$")
print(f'KUDU_USER="{user_escaped}"')
print(f'KUDU_PWD="{pwd}"')
print(f'SCM_HOST="{scm}"')
print(f'APP_URL="{dest}"')
PY
)

# Debug: show what variables were set
echo "DEBUG: Variables set:"
echo "KUDU_USER=$KUDU_USER"
echo "KUDU_PWD=$KUDU_PWD"
echo "SCM_HOST=$SCM_HOST"
echo "APP_URL=$APP_URL"

# 2) Ensure node_modules exist for express-ingest (prod deps only)
pushd express-ingest >/dev/null
if [ ! -d node_modules ]; then
  echo "Installing express-ingest deps..."
  npm ci --omit=dev
fi
popd >/dev/null

# 3) Write a build stamp (so /buildinfo can prove what's running)
STAMP_TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
STAMP_SHA="$(git rev-parse --short HEAD || echo local)"
cat > buildinfo.json <<JSON
{ "builtAt":"$STAMP_TS", "commit":"$STAMP_SHA", "notes":"direct-kudu-zipdeploy" }
JSON

# 4) Build the exact ZIP we want live
ZIP=ingest-direct.zip
rm -f "$ZIP"
# Expect these to already exist in repo root from earlier steps:
#   package.json (root, with "start": "node express-ingest/standalone.js")
if [ ! -f package.json ]; then
  echo "ERROR: Missing root package.json. Stop here and tell me."
  exit 1
fi

echo "Creating $ZIP ..."
zip -q -r "$ZIP" \
  package.json buildinfo.json \
  express-ingest/standalone.js express-ingest/package.json express-ingest/data \
  express-ingest/node_modules

echo "ZIP CONTENTS:"
unzip -l "$ZIP" | sed -n '1,10p;$p'

# 5) Push to Kudu ZIPDEPLOY (no build on GitHub, no Oryx here)
echo "Deploying to https://$SCM_HOST/api/zipdeploy ..."
curl -sS -u "$KUDU_USER:$KUDU_PWD" \
  -X POST -H "Content-Type: application/zip" \
  --data-binary @"$ZIP" \
  "https://$SCM_HOST/api/zipdeploy?isAsync=true" >/dev/null

# 6) Optional: brief wait + quick sanity pings
echo "Waiting ~8s for site warmup..."
sleep 8

echo "--- /api/health"
curl -fsS "$APP_URL/api/health" || true
echo
echo "--- /routes"
curl -s "$APP_URL/routes" || true
echo
echo "--- /buildinfo"
curl -s "$APP_URL/buildinfo" || true
echo

echo "Done."
