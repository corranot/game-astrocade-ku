# Snowy Snapshot, round 5 visual scorecard (27 Nov)

Scored with `.claude/skills/threejs-aaa-graphics-builder/references/visual-scorecard.md`:

- Each category is scored 0-3, calibrated on the packaged anchors.
- "Before" is round 4 (`../r4/scorecard.md`); "after" is this round.
- The /10 figure is the category average x 10 / 3.

## Measured

Taken from the feed bundle test (phone view after the first tap) and `load-time.js`.

| | Round 4 | Round 5 |
|---|---|---|
| colorEntropyBits | 4.32 | 4.78 |
| dominantColorShare | 0.25 | 0.247 |
| edgeDensity | 0.205 | 0.238 |
| luminance mean / contrast | 123.5 / 117.7 | 122.5 / 119 |
| draw calls / triangles (feed run) | 182 / 227k | 129 / 190k |
| 4G first frame (`load-time.js`) | 1.84-2.03 s | 1.99-2.06 s |

- The feed draw counts vary with the tier the run settles on.
- Ground cover adds 2 instanced draws and about 60k triangles at most.
- Tier 0 stays within budget: 74 draws in the playtest check.

## Categories

| Category | R4 | R5 | Evidence |
|---|---|---|---|
| Art direction | 2 | 2 | one palette held across day, night and the unlock beat |
| Hero (Pip) | 2 | 2 | adds a belt lantern that swings with the walk and glows after dusk |
| Obstacles (ice gates, shy animals) | 2 | 2 | unchanged |
| Interactables | 2.5 | 2.5 | the treat moment now frames Pip and the hare together (r5-10) |
| World | 2 | 2 | ground cover with drifts, dry grass, twigs and pebbles along paths and fields (r5-09/10); wide meadows still open |
| Materials | 1.5 | 2 | snow ripples with blue troughs and drift normals, crust grain, fur back-to-belly gradient, rock strata |
| Lighting/render | 2 | 2.5 | warm lantern key light at night plus a moonlit rim (r5-19); haze thinned during the unlock glide |
| VFX | 2 | 2 | unchanged |
| UI/HUD | 2.5 | 2.5 | grid checks pass at 360/390/430/768 |
| Performance evidence | 2.5 | 2.5 | load, draws and tier-0 budget above |
| **Average** | **2.1 (7.0/10)** | **2.2 (7.3/10)** | |

Every category is now at 2 or above. The premium bar asks for an average of 2.3 or more, and this round reaches 2.2.

## Per screen (/10, after)

| Screen | R4 | R5 | Weakest point |
|---|---|---|---|
| 01 first frame | 7 | 7 | spotlight dims the scene by design |
| 02 viewfinder | 7.5 | 8 | rippled snow behind the subject |
| 03 photo develops | 8 | 8 | |
| 04/05 FTUE steps | 7 | 7 | dimmed by the tutorial step |
| 06/07 book, shop | 8 | 8 | |
| 08 today | 7.5 | 7.5 | lower half of the sheet empty |
| 09/10 treat | 6 | 8 | |
| 11/12 pose | 7.5-8 | 8 | |
| 13 unlock | 6.5 | 7.5 | lower half of the portrait frame is plain foreground snow |
| 15-17 corners | 7 | 7 | large flat tree-shadow shapes |
| 19 night | 6.5 | 8 | |
| 21 HUD x4 | 8 | 8 | |
| 22 Arabic tier 0 | 7 | 7.5 | no shadows at tier 0 |

## Found and left as is

At an early-morning sun angle, SwiftShader draws fine stripes in tree shadows and on shadowed rock faces. Round 4 does the same, and raising the shadow bias did not change it. It looks like a software-GL artifact, so it needs checking on a real phone.

## Next pass (to reach >= 8 everywhere)

1. Corners: soften the large tree shadows with a lighter shadow colour, and add mid-field props to the open meadows.
2. Today sheet: size the sheet to its rows, or fill the lower half with today's picture.
3. Unlock: put a foreground drift or prop in the lower third of the glide.
