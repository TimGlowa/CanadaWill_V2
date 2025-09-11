#!/bin/bash

# Download articles from Azure Storage for analysis
# This script downloads all JSON files from the news/raw/serp/ container

echo "Downloading articles from Azure Storage..."
echo "This will create a 'downloaded-articles' directory with all the JSON files."

# Create the download directory
mkdir -p downloaded-articles

# Download all blobs from the news container, specifically from raw/serp/
echo "Starting download..."
az storage blob download-batch \
    --source news \
    --destination ./downloaded-articles \
    --account-name canadawillfuncstore2 \
    --pattern "raw/serp/*" \
    --overwrite

if [ $? -eq 0 ]; then
    echo "Download completed successfully!"
    echo "You can now run: node analyze-publications-local.js"
else
    echo "Download failed. Please check your Azure CLI authentication and permissions."
    echo "Make sure you're logged in with: az login"
fi


