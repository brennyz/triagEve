#!/bin/sh
# Verhoogt CACHE in sw.js als er app-bestanden in de commit zitten, zodat telefoons
# de nieuwe versie ophalen. Draait vanzelf via .githooks/pre-commit.
#   sh scripts/bump-sw.sh          alleen als er app-bestanden gestaged zijn
#   sh scripts/bump-sw.sh --force  altijd één hoger
set -e
cd "$(git rev-parse --show-toplevel)"

APP='^(index\.html|style\.css|config\.js|manifest\.webmanifest|js/|icons/|vendor/)'

if [ "$1" != "--force" ]; then
  git diff --cached --name-only | grep -qE "$APP" || exit 0
  git diff --cached -U0 -- sw.js | grep -qE "^\+const CACHE" && exit 0
fi

n=$(sed -n "s/^const CACHE = 'triageve-v\([0-9][0-9]*\)'.*/\1/p" sw.js)
if [ -z "$n" ]; then
  echo "sw.js: regel const CACHE = 'triageve-vN' niet gevonden" >&2
  exit 1
fi
next=$((n + 1))
sed -i "s/^const CACHE = 'triageve-v$n'/const CACHE = 'triageve-v$next'/" sw.js
git add sw.js
echo "sw.js: cache triageve-v$n -> triageve-v$next"
