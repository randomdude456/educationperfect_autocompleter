#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
git remote set-url origin git@github.com:randomdude456/educationperfect_autocompleter.git 2>/dev/null || true
echo "Pushing update to GitHub..."
git push -u origin main
git push origin --tags
echo "Done: https://github.com/randomdude456/educationperfect_autocompleter"
