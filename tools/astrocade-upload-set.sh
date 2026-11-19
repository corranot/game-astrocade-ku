#!/usr/bin/env bash
# Builds the set of files to upload to Astrocade from a game folder: source files only, no README,
# no repo header, and nothing about how the game was made. Fails if such a word is still in the code.
# Usage: tools/astrocade-upload-set.sh <game folder> <output folder>
set -euo pipefail
src=$1 out=$2
mkdir -p "$out"
for p in "$src"/index.html "$src"/*.js; do # every module the game loads; test scripts stay home
  f=$(basename "$p")
  case "$f" in playtest.js|soak.js|look.js) continue ;; esac
  grep -v 'PROTOTYPE - NOT FOR PRODUCTION' "$p" > "$out/$f"
done
banned='prototype|playtest|soak|audit|astrocade\.md|claude|anthropic|subagent|\bagent\b|\bAI\b|leanrea|caveman|ponytail|crazyharibo|cashflow|\bfeed\b|trend|research'
if grep -nEi "$banned" "$out"/*; then echo "FAIL: workflow words left in the upload set" >&2; exit 1; fi
for f in "$out"/*.js; do node --check "$f"; done
echo "upload set ready: $(ls "$out" | tr '\n' ' ')"
