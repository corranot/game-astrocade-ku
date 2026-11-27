# Snowy Snapshot, round 4 visual scorecard (27 Nov)

Scored with `.claude/skills/threejs-aaa-graphics-builder/references/visual-scorecard.md` (0-3 per category,
calibrated on the packaged anchors). "Before" is the round 3 build (main at 6c96594), "after" is this round. A /10
figure is the category average x 10 / 3, the scale the review asked for.

## Measured (feed bundle test, phone view after the first tap)

| | Before | After |
|---|---|---|
| colorEntropyBits | 3.35 | 4.32 |
| dominantColorShare | 0.538 (white on white) | 0.25 |
| edgeDensity | 0.200 | 0.205 |
| luminance mean / contrast | 132.8 / 127.3 | 123.5 / 117.7 |
| draw calls / triangles (feed tier) | 124 / 126k | 182 / 227k (shadows at tier 1+) |
| 4G first frame, same session (`load-time.js`) | 1.79-2.26 s | 1.84-2.03 s |

## Categories

| Category | Before | After | Evidence |
|---|---|---|---|
| Art direction | 1.5 | 2 | one palette now: white snow, blue-teal shadows, warm lamps and parka; was beige-grey |
| Hero (Pip) | 2 | 2 | authored parka hero, readable at every distance (r4-15/16/17) |
| Obstacles (ice gates, shy animals) | 1.5 | 2 | gate reads as one ice wall; shards burst away and settle (r4-13) |
| Interactables (viewfinder, photo, treats) | 2 | 2.5 | brackets inside the HUD, subject stays bright, card develops (r4-02/03/12) |
| World | 1.5 | 2 | whole pines fade instead of a dotted screen-door; open fields still sparse |
| Materials | 1.5 | 1.5 | flat vertex colours; pale fur now keeps an edge. **Below 2** |
| Lighting/render | 1 | 2 | contrast curve, deeper blue shadows, less fog, neutral tone map at tier 0 |
| VFX | 1.5 | 2 | burst, ring, flakes and puff in time with the gate; no white cloud |
| UI/HUD | 2 | 2.5 | one top row, equal gaps, checked at 360/390/430/768 (r4-21) |
| Performance evidence | 2.5 | 2.5 | load and frame numbers above; tier 0 keeps no shadows to hold the load |
| **Average** | **1.65 (5.5/10)** | **2.1 (7.0/10)** | |

Automatic failures still standing: none of the listed ones. Below the premium bar (every category >= 2, average >= 2.3):
Materials at 1.5.

## Per screen (/10, after)

| Screen | Score | Weakest point |
|---|---|---|
| 01 first frame (FTUE walk) | 7 | spotlight dims the scene by design |
| 02 viewfinder | 7.5 | snow ground plain |
| 03 photo develops | 8 | |
| 04 new friend | 7 | dimmed by the tutorial step |
| 05 FTUE book | 7 | same |
| 06 book | 8 | |
| 07 shop | 8 | |
| 08 today | 7.5 | lower half empty |
| 09/10 treat | 6 | camera high, hero small, empty snow field |
| 11 pose cue | 7.5 | |
| 12 pose photo | 8 | |
| 13 gate | 7 | crystals fill the frame for a moment |
| 13 unlock | 6.5 | foreground snow still empty |
| 14 after cinematic | 7 | |
| 15-17 corners | 7 | large flat shadow shapes |
| 18 aurora | 8 | |
| 19 night | 6.5 | dark animal on dark blue |
| 20 feed handover | 7.5 | |
| 21 HUD x4 | 8 | |
| 22 Arabic tier 0 | 7 | no shadows at tier 0 |

## Next pass (to reach >= 8 everywhere)

1. Materials: a snow surface with sparkle and soft drift normals, fur gradients and bark and rock patterns
   (procedural, no new downloads).
2. World: foreground clusters (drifts, grass tufts, twigs, small rocks) along the paths and in the open fields;
   midground props in the treat and lake areas.
3. Night: a warm key light from the hero's lantern so night animals read; tier 0 blob contact shadows.
4. Treat moments: a closer camera while a shy animal is near.
