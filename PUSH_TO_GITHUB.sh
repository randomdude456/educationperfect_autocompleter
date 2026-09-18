#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/benpopson96-cmd/educationperfect_autocompleter.git"
SSH_URL="git@github.com:benpopson96-cmd/educationperfect_autocompleter.git"

cd "$(dirname "$0")"

echo "EP Auto Answer — GitHub push helper"
echo

if ssh -o BatchMode=yes -o ConnectTimeout=5 -T git@github.com 2>&1 | grep -qi "successfully authenticated"; then
  echo "Using GitHub SSH authentication."
  git remote set-url origin "$SSH_URL"
else
  echo "Using GitHub HTTPS authentication."
  git remote set-url origin "$REPO_URL"
fi

git push -u origin main
git push origin --tags

echo
echo "Pushed main + release tags."
echo "A GitHub Release will be created automatically for tags such as v4.2.0."
echo "Repository: https://github.com/benpopson96-cmd/educationperfect_autocompleter"
