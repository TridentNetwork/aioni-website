#!/bin/bash
set -e

echo "Building production site..."
npm run build

echo ""
echo "Deploying to GitHub Pages..."

# Create temp directory
TEMP_DIR=$(mktemp -d)
cp -r dist/* "$TEMP_DIR/"

# Switch to gh-pages, update, push
cd "$TEMP_DIR"
git init
git checkout -b gh-pages
git add -A
git commit -m "Deploy $(date '+%Y-%m-%d %H:%M')"
git remote add origin git@github.com:TridentNetwork/aioni-website.git
git push origin gh-pages --force

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
echo "Deployed to https://tridentnetwork.github.io/aioni-website/"
