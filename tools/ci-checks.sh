#!/usr/bin/env bash
# Fast checks for every game in prototypes/ (CI and local): JS syntax, JSON validity, modules that touch THREE
# when imported (Astrocade bundles them before three.js arrives), and a clean upload set where one is defined.
# Usage: bash tools/ci-checks.sh        Prints one line per finding; exits 1 if any check failed.
set -u
cd "$(dirname "$0")/.."
fail=0
note() { echo "$1"; [ "${1%% *}" = "FAIL" ] && fail=1; return 0; }

for f in prototypes/*/*.js tools/*.js; do
  node --check "$f" 2>/dev/null || note "FAIL syntax $f"
done
for f in prototypes/*/*.json; do
  node -e 'JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))' "$f" 2>/dev/null || note "FAIL json $f"
done
for d in prototypes/*/; do
  # games built from ES modules that use the THREE global
  grep -lq "THREE\." "$d"*.js 2>/dev/null && grep -q "^import " "$d"game.js 2>/dev/null || continue
  node tools/no-three-import.mjs "$d" || note "FAIL three-at-import $d"
done
for d in prototypes/*/; do
  [ -f "$d/README.upload.md" ] || continue
  out=$(mktemp -d)
  bash tools/astrocade-upload-set.sh "$d" "$out" >/dev/null 2>&1 || note "FAIL upload-set $d"
done
[ $fail = 0 ] && echo "ok: all checks passed"
exit $fail
