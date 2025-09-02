#!/usr/bin/env bash
set -euo pipefail

cd /home/site/wwwroot

# If Oryx produced node_modules.tar.gz and node_modules doesn't exist yet, extract it.
if [ -f "node_modules.tar.gz" ] && [ ! -d "node_modules" ]; then
  echo "[startup] extracting node_modules.tar.gz into /home/site/wwwroot/node_modules ..."
  tar -xzf node_modules.tar.gz -C /home/site/wwwroot
  echo "[startup] extraction complete."
fi

# Fall back to plain start if tarball isn't present
echo "[startup] launching app ..."
exec node server.js
