# Mow Mow Meadow: milestone log

Evidence lives in `production/qa/evidence/mow-mow-meadow/` (copies in the shared project files under `new-sim/m<N>/`).
Scores use the 10-category visual scorecard (1 to 3) from `threejs-aaa-graphics-builder`.

## M0 (28 Nov 2026): the cut

Go. Mask texture plus tiled instanced blades cut cleanly; Nilo sits on Buzzy on the chibi base.

## M1 (28 Nov 2026): the whole loop in gardens 1 and 2

What works: drive, cut, bales, coins, finds (friend, toy, hat, coins), stars at 90/97/100%, gate, finale bloom,
lane with three upgrade pads, garden 2 with flower beds, receipt, album, shop, save, FTUE steps, guide trail,
cinematic beats, seven languages (Arabic mirrored).

Checks run:

| Check | Result |
|---|---|
| `node --test prototypes/mow-mow-meadow/logic.test.mjs` | 12 of 12 pass (layout, cutting, stars, save, economy, reachability of every grass cell, gate reachable in all 12 gardens, languages) |
| `node tools/lint-game.mjs` and `bash tools/ci-checks.sh` | pass |
| `node tools/astrocade-bundle-test.js` | no errors, no fails; bundle 266 KB; starts in the feed, moves before touch, tap reaches the game |
| Bot run (path-planning bot, stepped) | garden 1: first bale 4 s, first find under 5 s, star 1 at 20 s, finale 25 s; in garden 2 by 30 s; a child is expected to take two to three times as long |
| `node tools/load-time.js` (4G, CPU x4, software GL) | library ready 0.45 s; game script about 1.2 s; first frame 3.6 to 4.2 s, of which about 2.5 s is software-GL shader work that a phone GPU does not pay. Real-phone number still to be measured |
| Render budget (software GL counts) | garden 1: 84k to 94k triangles, 40 to 45 draw calls; two gardens loaded: about 140k, 50 calls |
| HUD grid | 360x640, 390x844, 430x932, 768x1024 and Arabic: equal margins (16 px at 360), one height for pills and buttons, 8 px gaps; pad price labels hide under the button column |

Scorecard (active play, 390x844):

| Category | Score | Evidence |
|---|---|---|
| Art direction | 2.5 | one storybook palette across grass, kart, cottage, HUD paper |
| Hero | 2.5 | Nilo on the anatomical chibi rig, Buzzy with eyes, hopper, bonnet riders |
| Obstacles | 2 | beds, rocks, bushes read clearly; little variety until garden 3 |
| Rewards | 2.5 | bales, coin flight, find beats, gift box, pads with fill rings |
| World | 2 | cottage, fence, lane plaza, trees and wild flowers; far layers still plain |
| Materials | 2 | shared kit with vertex gradients; grass shader with stripes and roots |
| Lighting | 2 | sun plus hemisphere, soft shadow, no post yet |
| VFX and motion | 2 | clippings, dust, sparkles, rings, confetti, bloom wave; flowers of the bloom are flat |
| UI | 2.5 | paper HUD on the 8 px grid, album, shop, receipt |
| Performance evidence | 2 | counts above; no real-device FPS yet |

Average 2.2. Weakest and next: far background layers, bloom flowers, post (M4), real-device FPS.

Changes from the plan, with reasons:

- Camera: fov 46, pitch 52, distance 15 to 20 (the planned framing showed fogged far ground at the top of a portrait frame).
- Grass: 0.5 m tall (0.8 extra tall), blades in 6 m tiles with 50/90/140 blades per m2 by quality tier, instead of one global cap that left large gardens sparse.
- Districts: Clover Lane is gardens 1 to 6, Windmill Hill 7 to 9, Lantern Lake 10 to 12 (the plan's tables disagree; this follows sections 6.3 and 8). Parties after gardens 6 and 12.
- The lane between gardens is a 7.4 m plaza, so the three pads sit beside the path, never on it.
- Three.js comes from the CDN through an importmap (Astrocade bundles plain modules); tuning lives in `game_config.json`.
- The mower's collider is a 0.8 m circle centred on the body; props keep a mower-width from fences so no grass is out of reach.
