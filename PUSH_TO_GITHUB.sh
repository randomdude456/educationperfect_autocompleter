#!/bin/zsh
set -e
cd "$(dirname "$0")"

echo "Repository: https://github.com/benpopson96-cmd/educationperfect_autocompleter"
echo

if ! command -v git >/dev/null 2>&1; then
  echo "git is not installed. Install Xcode Command Line Tools with: xcode-select --install"
  exit 1
fi

# Prefer SSH automatically when the user's SSH auth works.
if ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new -T git@github.com 2>&1 | grep -qi "successfully authenticated"; then
  echo "GitHub SSH authentication detected."
  git remote set-url origin git@github.com:benpopson96-cmd/educationperfect_autocompleter.git
else
  echo "Using HTTPS remote. Git may ask you to authenticate with GitHub."
fi

echo
printf "Pushing main...\n"
git push -u origin main

echo
echo "Done: https://github.com/benpopson96-cmd/educationperfect_autocompleter"
