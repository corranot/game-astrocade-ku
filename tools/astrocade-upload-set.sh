#!/usr/bin/env bash
# Builds the set of files to upload to Astrocade from a game folder: source files only, no README,
# no repo header, and nothing about how the game was made. Fails if such a word is still in the code.
# Usage: tools/astrocade-upload-set.sh <game folder> <output folder>
set -euo pipefail
src=$1 out=$2
mkdir -p "$out"
for p in "$src"/index.html "$src"/*.js; do # every module the game loads; test scripts stay home
  f=$(basename "$p")
  grep -q "require('playwright')" "$p" && continue # test and check scripts drive a browser; they never ship
  grep -q "require('fs')" "$p" && continue # Node build tools (e.g. build-single.js) read files; they never ship
  # dev-only code (cheats, test hooks) sits between a line that is only "// dev:start" (or "<!-- dev:start -->")
  # and one that is only "// dev:end", and never ships. Any other use of the markers (same line, inside a string,
  # nested, reversed, left open) could cut real code, so it fails instead.
  grep -v 'PROTOTYPE - NOT FOR PRODUCTION' "$p" | awk -v f="$p" '
    /dev:(start|end)/ {
      if ($0 ~ /^[ \t]*(\/\/|<!--)[ \t]*dev:start[ \t]*(-->)?[ \t\r]*$/) { if (on) { bad = "nested dev:start"; exit } on = 1; next }
      if ($0 ~ /^[ \t]*(\/\/|<!--)[ \t]*dev:end[ \t]*(-->)?[ \t\r]*$/) { if (!on) { bad = "dev:end before any dev:start"; exit } on = 0; next }
      bad = "dev marker that is not a whole comment line: " $0; exit
    }
    !on { print }
    END { if (!bad && on) bad = "dev:start never closed"; if (bad) { print "FAIL: " bad " in " f > "/dev/stderr"; exit 1 } }' > "$out/$f"
done
# README.md is a required game file (overview + code structure); the game folder's own README holds dev notes,
# so a game-only one lives in README.upload.md
[ -f "$src/README.upload.md" ] && grep -v 'PROTOTYPE - NOT FOR PRODUCTION' "$src/README.upload.md" > "$out/README.md"
banned='prototype|playtest|soak|audit|astrocade\.md|claude|anthropic|subagent|\bagent\b|\bAI\b|leanrea|caveman|ponytail|crazyharibo|cashflow|\bfeed\b|\btrend|research'
if grep -nEi "$banned" "$out"/*; then echo "FAIL: workflow words left in the upload set" >&2; exit 1; fi
for f in "$out"/*.js; do node --check "$f"; done
echo "upload set ready: $(ls "$out" | tr '\n' ' ')"
