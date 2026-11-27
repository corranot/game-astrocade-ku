# Snowy Snapshot, round 7 visual scorecard (27 Nov)

Scored with `.claude/skills/threejs-aaa-graphics-builder/references/visual-scorecard.md`:

- Each category is scored 0-3, calibrated on the packaged anchors.
- "Before" is round 6 (`../r6/scorecard.md`).
- The /10 figure is the category average x 10 / 3.
- All screens are on one sheet: `r7-sheet.jpg`.

## Measured

| | Round 6 | Round 7 |
|---|---|---|
| colorEntropyBits | 4.75 | 4.76 |
| dominantColorShare | 0.255 | 0.255 |
| edgeDensity | 0.217 | 0.218 |
| luminance mean / contrast | 118.4 / 110.4 | 118.4 / 110.6 |
| triangles (feed run) | 224k | 224k |
| 4G first frame (`load-time.js`, 6 runs each, interleaved) | median 1.91 s (1.66-2.07) | median 1.95 s (1.85-2.02) |
| full playtest | 75/75 | 75/75, tier-0 draws 73 |

There are no new draw calls, textures or shader programs:

- The parka and hat use the fur program.
- The gate and pine changes extend their existing materials.

## Categories

| Category | R6 | R7 | Evidence |
|---|---|---|---|
| Art direction | 2 | 2.5 | One hand-made winter grain on every surface: fur, knit, quilt, bark, needles, frosted ice and snow crust. The feedback is themed too: snow puffs, ice glints, hearts. |
| Hero (Pip) | 2 | 2.5 | Stitched quilt channels on the parka, a knit hat and a moonlit rim at night (shared with the animals), plus the lantern. |
| Obstacles (ice gates, shy animals) | 2 | 2.5 | The gate ice runs deep blue at the foot to frosted tips and edges, with a slow glint sweeping across the shards (r7-24). |
| Interactables | 2.5 | 2.5 | The snap ring and hearts mark the subject (r7-23). |
| World | 2.5 | 2.5 | Walking past an edge pine shakes a snow clump off its boughs. |
| Materials | 2 | 2.5 | Fur strands (r7-22, r7-25), parka quilting, bark streaks and needle clusters. All procedural, with no textures. |
| Lighting/render | 2.5 | 2.5 | unchanged |
| VFX | 2 | 2.5 | The snap flash adds a warm ring and a sparkle spray, plus a second ring on 3 stars. A treat landing adds a ring, crumbs and then hearts as the animal comes out. Pine snow falls in clumps and flakes. |
| UI/HUD | 2.5 | 2.5 | The "New friend!" toast no longer repeats the name already shown on the photo card. |
| Performance evidence | 2.5 | 2.5 | Interleaved load, no new programs, tier-0 budget held. |
| **Average** | **2.25 (7.5/10)** | **2.5 (8.3/10)** | |

The softest call is Art direction at 2.5. The anchor for 3 is "distinct identity in every surface", and the wide snow
corners (15-17) are still mostly white planes with shadows.

## Per screen (/10)

| Screen | R6 | R7 | Note |
|---|---|---|---|
| 01 first frame, 04/05 FTUE steps | 7 | 7 | The spotlight dims everything but the target, as the FTUE rule requires. |
| 02 viewfinder | 8 | 8.5 | The fox fur now has strands. |
| 03 photo develops | 8 | 8.5 | The ring and hearts frame the card. The duplicated name is fixed after this capture. |
| 06/07 book, shop | 8 | 8 | |
| 08 today | 8 | 8 | |
| 09/10 treat | 8 | 8.5 | The landing ring and hearts. |
| 11/12 pose | 8 | 8.5 | The owl's feather grain. |
| 13 gate, unlock | 8 | 8.5 | Frosted shards with a moving glint. |
| 14 after cinematic | 8 | 8 | |
| 15-17 corners | 8 | 8 | Snow off the pines while walking; still wide and white. |
| 18 aurora | 8 | 8 | |
| 19 night | 8.5 | 8.5 | |
| 20 feed handover | 8 | 8 | |
| 21 HUD x4 | 8 | 8 | |
| 22 Arabic tier 0 | 8 | 8.5 | The fur grain shows at tier 0 too. The title is still fading at capture. |

## Left for later

- The SwiftShader tree-shadow stripes at an early sun angle are unchanged and still need a real-phone check.
- The next art step: break up the wide corner meadows with mid-field silhouettes, such as a frozen stream or a
  fallen log line.
