#!/bin/bash
# Download Azure Kudu bundle and clone locally

set -euo pipefail

SITE="canadawill-ingest-ave2f8fjcxeuaehz"
DOMAIN="canadacentral-01.azurewebsites.net"
BUNDLE="wwwroot-20250824T133742Z.bundle"

echo "=== Download Azure Kudu Bundle ==="
echo "Site: ${SITE}.${DOMAIN}"
echo "Bundle: ${BUNDLE}"
echo ""

read -p "KUDU_USER: " KUDU_USER
read -s -p "KUDU_PASS: " KUDU_PASS; echo

echo "Downloading bundle..."
curl -fSL -u "$KUDU_USER:$KUDU_PASS" \
  "https://${SITE}.scm.${DOMAIN}/api/vfs/site/backups/${BUNDLE}" \
  -o "${BUNDLE}"

if [ -f "${BUNDLE}" ]; then
    echo "✅ Bundle downloaded successfully!"
    ls -lh "${BUNDLE}"
    
    echo ""
    echo "=== Cloning Bundle ==="
    SNAP_DIR="../canadawill-azure-snap-20250824"
    
    if [ -d "${SNAP_DIR}" ]; then
        echo "⚠️  Directory ${SNAP_DIR} already exists. Removing..."
        rm -rf "${SNAP_DIR}"
    fi
    
    echo "Cloning bundle to ${SNAP_DIR}..."
    git clone "${BUNDLE}" "${SNAP_DIR}"
    
    cd "${SNAP_DIR}"
    echo "✅ Snapshot cloned to: $(pwd)"
    echo ""
    echo "=== Git Status ==="
    git log --oneline --decorate -n 3
    echo ""
    git tag -l
    echo ""
    echo "=== Next Steps ==="
    echo "1. Review the cloned code: cd ${SNAP_DIR}"
    echo "2. Add GitHub remote: git remote add origin <your-github-repo-url>"
    echo "3. Push to GitHub: git push -u origin main"
    echo "4. Keep local backup in: $(pwd)"
    
else
    echo "❌ Bundle download failed!"
    exit 1
fi
