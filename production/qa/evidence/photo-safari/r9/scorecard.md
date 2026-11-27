# Snowy Snapshot, round 9 scorecard (28 Nov)

This round makes the art fixes from the review of round 8. "Before" is round 8 (`../r8/scorecard.md`). All screens
are on one sheet: `r9-sheet.jpg`. Gameplay is unchanged from round 8, so the round 8 bot results still hold:

- 67% of sessions run over 5 minutes.
- p50 is 612 s and p75 is 635 s.

## Fixes

| Review note | Fix |
|---|---|
| A big "Wait for night" toast covered the animal on many screens. | Every toast now sits in one fixed slot under the HUD: a smaller glass banner (44/28 px text). When a tutorial bubble sits near the top, the toast drops one row (r9-04). The night and flash tips show once per save (`S.hints`); after that, the moon button's glow carries the night tip. |
| The corners were flat white with hard diagonal shadows. | The shadows are lighter and softer: intensity 0.6 to 0.45, blur radius 4 to 6, and a higher sun (`sunUp` 0.95 to 1.25), so they are shorter. The day sun is warmer. There are 68 shrubs (was 44) and 6 more fallen logs in the meadow and lake corners. |
| The unlock was a chaotic spray of shards. | 6 big chunks (2.6x) now drop under stronger gravity, settle, and are gone by 1.8 s. The 6 stumps left behind are larger (was 12 small ones), and the flakes went from 14 to 6. |
| The owl was white on white. | The owl is now blue-grey (`#c3cfe0`) with a pale belly, so it reads against the snow and its stump (r9-11, r9-21). |
| A stray dark trunk showed in the pose shot. | Pines have a low skirt and a short trunk, so no bare stick shows against the snow (r9-12). |

## Measured

| | Round 8 | Round 9 |
|---|---|---|
| colorEntropyBits | 4.67 | 4.69 |
| dominantColorShare | 0.225 | 0.215 |
| edgeDensity | 0.224 | 0.230 |
| luminance mean / contrast | 122.4 / 123.3 | 123.6 / 126.3 |
| draw calls / triangles (feed run) | 134 / 251k | 136 / 269k |
| 4G first frame (7 runs each, interleaved with round 8) | median 1.82 s | median 1.90 s (1.80-2.04) |
| full playtest | 75/75 | 75/75 |

The first frame is about 80 ms slower and still under 2 s. The cost is within the noise of single runs
(±150 ms), and all the new scenery builds after the first frame.

## Categories

| Category | R8 | R9 | Evidence |
|---|---|---|---|
| Art direction | 2.5 | 2.75 | Warmer daylight snow, softer shadows, mid-field shrubs and logs, and an owl that reads. |
| Hero (Pip) | 2.5 | 2.5 | Unchanged. |
| Obstacles | 2.75 | 2.75 | The unlock settles fast and reads (r9-13). |
| Interactables | 2.75 | 2.75 | |
| World | 2.75 | 2.75 | More silhouettes in the corners. |
| Materials | 2.5 | 2.5 | |
| Lighting/render | 2.5 | 2.75 | No hard stripe shadows in the corners (r9-15/16/17). |
| VFX | 2.5 | 2.5 | |
| UI/HUD | 2.75 | 2.75 | One toast slot; the tutorial bubble and the toast never overlap. |
| Performance evidence | 2.75 | 2.75 | |
| **Average** | **2.63 (8.75/10)** | **2.68 (8.9/10)** | |

## Left for later

- A real-phone check of FPS and shadows.
- A second book chapter (U1) for players who finish the book in their first session.
