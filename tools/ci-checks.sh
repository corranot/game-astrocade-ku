#!/usr/bin/env bash
# Fast checks for every game in prototypes/ (CI and local): JS syntax, JSON validity, modules that touch THREE
# when imported (Astrocade bundles them before three.js arrives), and a clean upload set where one is defined.
# Usage: bash tools/ci-checks.sh [game dir...]   Prints one line per finding; exits 1 if any check failed.
#        With game dirs (prototypes/<game>/) only those games are checked; tools are always checked.
#        GAMES=none checks the tools only (CI passes the games a change touches).
set -u
cd "$(dirname "$0")/.."
if [ $# -gt 0 ]; then GAMES="$*"; elif [ "${GAMES:-}" = none ]; then GAMES=""; else GAMES=$(ls -d prototypes/*/); fi
gfiles() { for d in $GAMES; do for f in "$d"$1; do [ -f "$f" ] && echo "$f"; done; done; } # files matching $1 in the chosen games
fail=0
note() { echo "$1"; [ "${1%% *}" = "FAIL" ] && fail=1; return 0; }

for f in $(gfiles "*.js") tools/*.js tools/kit/*.js tools/fixtures/*/*.js; do
  [ -f "$f" ] || continue # a glob with no match stays literal
  # an ES module is checked as one: `node --check file.js` passes a broken module (Node 22 module detection)
  if grep -qE '^[[:space:]]*(import|export)[[:space:]{*]' "$f"; then node --check --input-type=module < "$f" 2>/dev/null
  else node --check "$f" 2>/dev/null; fi || note "FAIL syntax $f"
done
# shared kit files are copied into games unchanged (like an engine copied verbatim); an edited copy drifts
for f in $(gfiles bake.js) tools/fixtures/*/bake.js; do
  [ -f "$f" ] || continue
  cmp -s "$f" tools/kit/bake.js || note "FAIL kit-copy $f differs from tools/kit/bake.js (copy it again)"
done
node --test tools/pipeline.test.mjs >/dev/null 2>&1 || note "FAIL pipeline tests (node --test tools/pipeline.test.mjs)"
for f in $(gfiles "*.json"); do
  node -e 'JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))' "$f" 2>/dev/null || note "FAIL json $f"
done
for d in $GAMES; do
  [ -d "$d" ] || continue
  # games built from ES modules that use the THREE global
  grep -lq "THREE\." "$d"*.js 2>/dev/null && grep -q "^import " "$d"game.js 2>/dev/null || continue
  node tools/no-three-import.mjs "$d" || note "FAIL three-at-import $d"
done
# game lint: mistakes that already happened twice (field shadows a method, dead button call, live host config)
node tools/lint-game.mjs --self-test >/dev/null || note "FAIL lint self-test (node tools/lint-game.mjs --self-test)"
for d in $GAMES; do
  [ -d "$d" ] || continue
  out=$(node tools/lint-game.mjs "$d") || note "FAIL lint $d"
  [ -n "$out" ] && echo "$out" | grep "^FAIL"
done
for d in $GAMES tools/fixtures/*/; do
  [ -f "$d/README.upload.md" ] || continue
  out=$(mktemp -d)
  bash tools/astrocade-upload-set.sh "$d" "$out" >/dev/null 2>&1 || note "FAIL upload-set $d"
done
# every committed screenshot version stays in history: new evidence goes through tools/evidence-shrink.py
# (the commit hook runs it); a file this big skipped it
for f in production/qa/evidence/*/* production/qa/evidence/*/*/*; do
  [ -f "$f" ] || continue
  [ "$(wc -c < "$f")" -le 256000 ] || note "FAIL evidence-size $f is over 250 KB (python3 tools/evidence-shrink.py $f)"
done
[ $fail = 0 ] && echo "ok: all checks passed"
exit $fail
