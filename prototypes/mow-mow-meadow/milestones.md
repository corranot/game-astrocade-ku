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

## M2 (28 Nov 2026): M1 review fixes, garden toys, parties, daily garden

Evidence: `production/qa/evidence/mow-mow-meadow/m2-*.jpg` (two contact sheets and 14 frames).

M1 review fixes:

- Mow reveal: the mask stores a stripe tone per cut (light going north, dark going south), a soft sheen on cut
  grass, and the finale grooms the lawn into tidy 2.6 m stripes with five-petal flowers.
- Lighting: warmer key (2.3) and brighter fill (1.25), softer shadows; Windmill and Lantern palettes brightened
  (Lantern is a pink-lilac sunset, not a night).
- World beyond the fence: cottage, hedges and trees outside, village cottages and far trees, a laundry line that
  sways, butterflies and two birds.
- HUD: pad price labels carry the upgrade's icon and hide under the top rows, the button column and the side
  margins, so nothing overlaps or clips at 360 px; Arabic mirrors exactly.
- Camera: three-quarter follow (yaw 22, pitch 45, distance 13 to 17.5), stick input rotated to match.
- First frame: quality starts low for 8 frames, Nilo, outside scenery and wildlife build one job per frame after
  the first picture. 4G profile, software GL: first frame 1.73 to 1.81 s (was 3.6 to 4.2 s).
- Upgrade pads show an icon badge.

New in M2:

- Garden toys (`toys.js`): duckling parade from the pond, molehills that pop a toy, orchard apples, sheep that
  munch the edge, sprinklers that wet the grass (wet pays more), mushroom rings, fountain spray.
- District party after gardens 6 and 12: the district's neighbours dance on the lane under bunting, confetti,
  a camera beat and a one-time coin gift.
- Daily garden: one seeded garden per day from garden 2 onward, with its own neighbour and a three-star gift.
- Mower fit: 1.0 m collider, the deck springs narrower near fences and rocks, blades are cut under the body.
- Grass detail by distance: far tiles draw fewer blades.

| Check | Result |
|---|---|
| `node --test logic.test.mjs` | 13 pass (adds: every grass cell reachable, every garden's promised feature present) |
| `node tools/lint-game.mjs`, `bash tools/ci-checks.sh` | pass |
| `node tools/astrocade-bundle-test.js` | 296 KB, no failures |
| `node tools/load-time.js` (4G) | first frame 1.73 and 1.81 s |
| Render budget (software GL counts, middle tier) | 171k to 193k triangles at the start of gardens 6 and 9 (was 256k); 280k with a party on the lane; 470k for the 1.8 s three-star pull-back |
| Bot | gardens 2, 3, 6 finished to three stars; party fired after garden 6; daily garden entered and mown; gardens 7, 9, 11, 12 mown 30 s each with no error |

Scorecard (0 to 10 per frame, from the retained frames):

| Frame | Score | Note |
|---|---|---|
| First frame with spotlight, 360x640 | 7.5 | hero reads; the lane takes the lower half of the frame |
| Ducklings, garden 3 | 8 | cottage, pads, pond, parade, three-quarter hero |
| Receipt and finale, garden 2 | 8 | stripes, flowers, confetti, neat receipt |
| Finished garden | 8.5 | the prettiest frame, as asked |
| District party | 8 | neighbours, bunting, confetti |
| Windmill Hill | 7.5 | chequer pattern reads; palette still a little acid |
| Lantern Lake | 7.5 | bright now; trees still dark, lanterns and fireflies come in M3 |
| Daily garden | 8 | |
| HUD at 360, 390, 430, 768 and Arabic | 8.5 | one grid, equal margins, mirrored |
| Album and shop | 8 | |

Open, carried to M3 and M4: Windmill and Lantern art pass (below 8 today), selective bloom on flowers (no post
pass yet), the three-star pull-back triangle spike, real-device FPS.
