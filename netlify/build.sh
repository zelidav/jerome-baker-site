#!/usr/bin/env bash
# Builds dist/ for Netlify. MODE=lander (default) or MODE=cutover. Run from the repo root.
#   MODE=lander  OLD_HOST=<where the old store lives>   -> the "Pick your Jerome" page + redirect everything else to the old store
#   MODE=cutover                                         -> the new site at / with Semi's 1,724 one-hop redirects
set -euo pipefail
MODE="${MODE:-lander}"
rm -rf dist && mkdir dist
if [ "$MODE" = "lander" ]; then
  : "${OLD_HOST:?set OLD_HOST to the host the old store answers on, e.g. shop.jeromebaker.com}"
  if [ "$OLD_HOST" = "jeromebaker.com" ]; then echo "WARNING: OLD_HOST=jeromebaker.com is for previews only. Once DNS points at Netlify this would redirect in a loop." >&2; fi
  cp -r netlify/lander/. dist/
  mkdir -p dist/js && cp js/analytics.js dist/js/analytics.js
  sed "s#__OLD_HOST__#${OLD_HOST}#g" netlify/_redirects.lander > dist/_redirects
  sed -i "s#\"https://jeromebaker.com/\"#\"https://${OLD_HOST}/\"#" dist/index.html
elif [ "$MODE" = "cutover" ]; then
  tar --exclude=./.git --exclude=./netlify --exclude=./dist --exclude=./node_modules --exclude=./dev --exclude=./tools -cf - . | tar -xf - -C dist
  cp netlify/_redirects.cutover dist/_redirects
  echo "ok: $(grep -vc '^#\|^$' dist/_redirects) redirect rules"
else
  echo "MODE must be lander or cutover" >&2; exit 1
fi
cp netlify/_headers dist/_headers
echo "built dist/ in $MODE mode"
