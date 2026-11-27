# usage: prep.sh <game_id> - extract latest pull, apply heavy_fix + amap, run the game's own tests, list files+sizes
set -e; cd /tmp/claude-0/hv; G=$1; D=fb2/$G; mkdir -p $D
python3 tools/extract_pull.py $G $D/src $2 >/dev/null; rm -rf $D/fixed; cp -r $D/src $D/fixed
python3 tools/heavy_fix.py $D/fixed/index.html; python3 tools/amap.py $D/fixed | tail -c 160; echo
cd $D/fixed; for t in tests/*.mjs tests/*.js; do [ -f "$t" ] && node "$t" 2>&1 | tail -1; done; find . -type f ! -name .sync_token -printf '%P %s\n'
