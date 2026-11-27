# Load-speed helper scripts (27 Nov)

Scratch helpers used for the heavy and font passes. Paths point at the
session work folder (`/tmp/claude-0/hv`) and session transcript; edit the
constants at the top before reuse.

- `inv.py`, `fontinv.py`: inventory inline wasm, GLB blobs and font subsets.
- `heavy_fix.py`, `blob_fix.py`: move inline physics data, model blobs and
  non-Latin font subsets to CDN files (fonts stay lazy via unicode-range).
- `amap.py`: add those CDN files to the game's `asset_map.json`.
- `extract_pull.py`, `prep.sh`, `put.py`: unpack a pull, apply the fix and
  run the game's tests, PUT staged uploads.

Measure with `tools/live-capture.js` + `tools/live-load.js`.
