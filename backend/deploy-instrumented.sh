#!/bin/bash

# Deploy instrumented version to debug SERPHouse loading issue
set -e

echo "=== Deploying Instrumented Version ==="
echo "This version has extensive logging to debug why SERPHouse routes aren't loading"

# Check if we're in the right directory
if [ ! -f "server.js" ] || [ ! -f "express-ingest/ingest.js" ]; then
  echo "ERROR: Missing required files. Make sure you're in the project root."
  exit 1
fi

# Create deployment ZIP
ZIP=ingest-instrumented.zip
rm -f "$ZIP"

echo "Creating $ZIP with instrumented files..."

zip -q -r "$ZIP" \
  server.js \
  package.json \
  buildinfo.json \
  express-ingest/ingest.js \
  express-ingest/app.js \
  express-ingest/package.json \
  express-ingest/data \
  express-ingest/node_modules \
  express-ingest/src

echo "✅ Created $ZIP"

# Deploy to Azure
echo "Deploying to Azure App Service..."
echo "URL: https://canadawill-ingest-ave2f8fjcxeuaehz.scm.canadacentral-01.azurewebsites.net/api/zipdeploy"

# Upload to Azure
curl -X POST \
  -H "Content-Type: application/zip" \
  --data-binary @"$ZIP" \
  "https://canadawill-ingest-ave2f8fjcxeuaehz.scm.canadacentral-01.azurewebsites.net/api/zipdeploy"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Check Azure Log Stream for [BOOT] and [INGEST] messages"
echo "2. Look for route dump showing all registered routes"
echo "3. Test /api/serp/ping endpoint"
echo "4. Check which candidate path successfully loaded the ingest module"
