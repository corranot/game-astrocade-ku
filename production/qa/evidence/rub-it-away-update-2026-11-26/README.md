# Rub It Away: our own update (2026-11-26)

Source: `prototypes/rub-it-away/`, built on the owner's Snow World draft. Before shots: `../rub-it-away-audit-2026-11-26/`.
Compare images: `compare-map.jpg`, `compare-world-end.jpg`, `compare-snow-L62.jpg`, `compare-level1.jpg`.

## Checks run (local harness: lib stubbed, real CDN art, real pointer drags, 390x844 @2x)
- `tests/core.test.mjs` pass (rules, 66 levels and assets, 8 languages, today's picture cycle, gift cadence, golden spacing).
- `tools/ci-checks.sh` pass.
- Full play run: 66/66 levels solved, 0 errors, 0 console errors.
- Flows: first-time tour (spotlight, guide line after a miss, NEXT spotlight, saved), today's picture (no change to campaign stars or progress, +1 hint, collected state on the menu), gift box (+2 hints), golden picture (+1 hint once per level per day), PERFECT praise, rub tools per world, `run('edit')` then `run('play')` handover, Arabic and Indonesian menu and map, 4 viewports for the map.
- Load to menu, 4G 9 Mbps + 4x CPU: 2.2-2.3 s, same as the draft before (2.2-2.3 s, measured back to back).
- FPS, headless software rendering: 60 FPS unthrottled in play, rubbing and world end, same as before. At 4x CPU both builds sit at 30-40 FPS (software GL); real-phone FPS is not proven.
- Not assessed: `tools/astrocade-bundle-test.js` (it expects a module script tag; this game loads `game.js` as a classic script).

## Review fixes applied
Reduced-motion world banner, golden hint once per level per day, tour never returns after level 1 is solved, golden praise not over the world banner, RTL tick, per-frame work cached (today's picture, tab labels, thumbnails).
