# Snowy Snapshot, round 6 visual scorecard (27 Nov)

Scored with `.claude/skills/threejs-aaa-graphics-builder/references/visual-scorecard.md`:

- Each category is scored 0-3, calibrated on the packaged anchors.
- "Before" is round 5 (`../r5/scorecard.md`).
- The /10 figure is the category average x 10 / 3.

## Measured

| | Round 5 | Round 6 |
|---|---|---|
| colorEntropyBits | 4.78 | 4.75 |
| dominantColorShare | 0.247 | 0.255 |
| edgeDensity | 0.238 | 0.217 |
| luminance mean / contrast | 122.5 / 119 | 118.4 / 110.4 |
| draw calls / triangles (feed run) | 129 / 190k | 132 / 224k |
| 4G first frame (`load-time.js`) | | median 1.91 s over 6 runs (1.79-2.29); interleaved with round 4: 1.95 vs 1.90 s |

How the load came back to about 1.95 s:

- **Lantern light.** Round 5 used a real point light, which put a light loop into every shader and slowed the first frame. It is now drawn in the terrain shader and the fur shader instead.
- **Deferred scenery.** Ground cover, fences, tracks and the gate dressing now build after the first frame, behind the animals.

## Categories

| Category | R5 | R6 | Evidence |
|---|---|---|---|
| Art direction | 2 | 2 | unchanged palette |
| Hero (Pip) | 2 | 2 | the lantern globe brightens at night; grounded by a blob shadow at tier 0 |
| Obstacles (ice gates, shy animals) | 2 | 2 | broken gates leave stumps lining the way through |
| Interactables | 2.5 | 2.5 | the focus pill is hidden during cinematic beats |
| World | 2 | 2.5 | fences mark the meadow edge, animal tracks, drifts at the rims and on the gate approach (r6-15/16) |
| Materials | 2 | 2 | stronger trodden path |
| Lighting/render | 2.5 | 2.5 | lighter tree shadows (shadow intensity 0.78), lantern pool on snow and animals (r6-19) |
| VFX | 2 | 2 | unchanged |
| UI/HUD | 2.5 | 2.5 | the Today sheet hugs its rows (r6-08); grid checks pass at 4 sizes |
| Performance evidence | 2.5 | 2.5 | interleaved load runs, deferred builds, tier-0 draws 74 |
| **Average** | **2.2 (7.3/10)** | **2.25 (7.5/10)** | |

## Per screen (/10)

| Screen | R5 | R6 | Note |
|---|---|---|---|
| 01 first frame, 04/05 FTUE steps | 7 | 7 | the spotlight dims everything but the target; the owner's FTUE rule requires it |
| 02 viewfinder | 8 | 8 | |
| 03 photo develops | 8 | 8 | |
| 06/07 book, shop | 8 | 8 | |
| 08 today | 7.5 | 8 | sheet sized to the list |
| 09/10 treat | 8 | 8 | |
| 11/12 pose | 8 | 8 | |
| 13 unlock, burst moment | 7.5 | 8 | lower camera: the burst and the lake fill the frame (r6-13-unlock-burst-lower-camera) |
| 13 unlock, glide end | 7.5 | 8 | settled shards and stumps fill the lower third (r6-13-unlock-glide-end) |
| 14 after cinematic | 7 | 8 | |
| 15-17 corners | 7 | 8 | fences, tracks, rim drifts, lighter shadows |
| 18 aurora | 8 | 8 | |
| 19 night | 8 | 8.5 | warm lantern light on the fox |
| 20 feed handover | 7.5 | 8 | |
| 21 HUD x4 | 8 | 8 | |
| 22 Arabic tier 0 | 7.5 | 8 | soft blob shadows ground Pip and the animals at tier 0 (r6-22-tier0-blob-shadow) |

Still under 8: only the FTUE steps (7). They dim everything but the target on purpose, because the owner's
mandatory spotlight tutorial requires it. Every other screen is at 8 or above.

## Left for later

- A shadow-map artifact on SwiftShader: fine stripes in tree shadows at an early sun angle. Round 4 shows it too.
  It needs checking on a real phone.
- The premium category bar (average >= 2.3) is not reached; the average is 2.25. The cheapest next gains are VFX and
  Materials: a fur or bark texture pass, and photo-flash and treat-landing effects.
