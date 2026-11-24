<!-- PROTOTYPE - NOT FOR PRODUCTION -->
# NEKO ZOOMIES: The Great Toyroom Caper — brief

**Player:** children 5–12, phone first (720×1280 portrait), also desktop keyboard.
**Promise:** you are a tiny kitten in a giant toyroom and everything you touch reacts.
**Session goal:** median 5+ minutes; no fail state, no menu, no end screen.

## Loops
| Loop | Every | What happens |
|---|---|---|
| Touch | 3–5 s | Pounce, swipe, topple. Toys fall, clack, burst into stars. Falls in a row: x2, x3, x5, 35 ms hit-stop. |
| Fever | 35 s for a perfect bot, about 60 s expected for a child | Yarn orbs and knocks fill the Purr-Meter. Full: 12 s of MEGA ZOOMIES (speed ×2, jump height ×2, orb magnet, rainbow ribbon, star eyes, faster music). |
| Events | first at 30 s, then every 90 s | Laser dot to catch, then the whale's bubble fountain, in turn. |
| Costumes | 100 / 250 / 450 / 700 / 1000 stars | Shark fin hat, wizard hat, butterfly wings, golden crown, rocket jetpack. Worn at once; the next one is a silhouette on the HUD bar. After the last: a star bonus every 500. |
| Climb | any time | Rug → cushions → toy chest / drum → desk → three bookshelves → three cloud mobiles. Each step is one normal pounce (1.1–1.3 m; a pounce reaches 1.5 m). Golden fish on the top three perches. |

## Pay table (stars)
Yarn orb 1 · batted toy 1 · knocked-off toy 1 (2 from high up) × combo · golden fish 40 · laser dot 30 · bubble 3 ·
piano key 1 (each key once per 3 s) · domino 1. All in `game_config.json` → `score`. A knock pays only for a toy
the kitten set moving (itself, through a stack, or with another toy).

Measured with a bot that always runs to the nearest floor orb and swipes near toys (no climbing): first reward at
0.6 s, first costume at 26 s, last at 244 s, a fever about every 35 s, longest wait for a reward 10 s. A child is
expected to take about twice as long; that is a guess until real session data exists.

## Where this differs from the request, and why
- Three.js r187 from unpkg instead of r160: the reused engine code is tuned to r187 lighting. `PCFShadowMap` is the
  soft filter there (`PCFSoftShadowMap` only warns).
- PLAY button floats over the live attract scene and a tap anywhere also starts and acts: the platform counts the
  first tap as the play, and a blocking menu loses the feed preview.
- The few words on screen (PLAY, MEGA ZOOMIES, costume names) come from a 7-language table.
- Camera lean in turns is at most 1.5° and off with `prefers-reduced-motion`: stronger roll made a player dizzy in
  an earlier game.

## Not proven here
Real phone FPS, how the sound feels, touch feel, real session length.
