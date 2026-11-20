<!-- PROTOTYPE - NOT FOR PRODUCTION -->
# Soap Carving: Satisfying ASMR

Kids' soap carving craft game for Astrocade (portrait 720×1280, touch first, 7 languages). Design: `design/gdd/soap-carving.md`.

**Hypothesis:** a make/DIY game with a single satisfying gesture per step (carve → smooth → sparkle → bath) and a
real-looking soap block can hold 80%+ of players past 30 s, like Woodturner Workshop (the benchmark played side by side).

**Status:** in progress — playable end to end; real-phone FPS, sound and touch feel not yet checked by the owner.

## Run
- Local: serve this folder (`.js` as `text/javascript`) and open `index.html?local` (stubs the host `lib`).
- Tests: `node soap.test.mjs` (rules, §4 formulas), `node playtest.js <evidence dir>` (full flow, rules, save, 7 languages, layout, speed), `node soak.js 14`.

## Files
| File | What |
|---|---|
| `soap.js` | the bar as a cell mask: template signed distance, knife, sponge, islands, scores, compact save, per-pixel 2.5D paint with dirty rectangles |
| `fx.js` | curls, chunks, crumbs, glitter specks, foam, twinkles, confetti; landed pieces are painted into the table canvas |
| `game.js` | flow, input, HUD (cached layer), sound (synthesized), save merge, languages |
| `sprites.js`, `ui.js` | painted art loader (crop boxes in `game_config.json` → `sprites`), glossy UI pieces |
| `*.webp` | generated art (`asset_map.json`): table flat lay (turned a quarter at run time), 4 customer mood sheets, tools, gems, charms, bath bowl |

## Findings so far
- The soap reads as a solid block only once it has a side wall: top face lit per pixel from a box-blurred height field (bevel + gloss), wall extruded down under every edge, inner colour on cut walls. Full paint ≈ 90–130 ms once per soap; a stroke repaints only its rectangle (< 1 ms).
- A protect zone inside the line cost 5–7% of Shape on every soap (the knife ate 3 cells of the shape all around): the knife now stops exactly at the line.
- Headless frame time is bound by canvas raster, not JS (JS ≈ 7 ms a frame at CPU 4×): merging the shavings pile into the table canvas and caching the HUD into one layer took p75 from 50 to 33 ms.
