<!-- PROTOTYPE - NOT FOR PRODUCTION -->
# +1 Mega Hammer: Smash and Grow

Tap to slam a giant hammer. Every object it breaks adds to the hammer's size, so it grows on screen and can then
break the bigger, numbered things it bounced off before. Plan (hybrid, approved by the owner on 2026-11-25): Claude
Doc "+1 Mega Hammer — Plan Game".

## Milestone 1: core feel (this slice)

- Two zones: the fruit stand (apples, oranges, melons 4, crates 8) and the market (crates 30, barrels 45, carts 70,
  stalls 100). A zone clears at 80% broken; clearing both starts again with every gain x2.
- One input: tap slams where the finger is (snaps to the nearest object), holding keeps slamming. Space on desktop.
- Growth `L += value x mult`, display scale `1 + 0.35 sqrt(L)`, reach grows with it; the camera pulls back and up.
- 8 evolution looks for the hammer (wood, bronze, jade, gold, amethyst, magma, starlight, rainbow).
- Effects: debris per material, dust puffs, shockwave ring, crack marks that fade, hit-stop, trauma shake, +N
  numbers that fly to the counter, zone-clear confetti, label pop when a numbered object opens.
- Sound made in code: thud that deepens with hammer size (140 to 48 Hz), material hits, pentatonic combo dings,
  fanfares, a toy-funk loop.
- Attract mode before the first touch (demo swing, counts nothing), 7 languages, save through `lib`, quality tiers.
- Not yet (milestone 2 and 3): zones 3 to 6, the cake vault finale, the results card at 60 s or later, gem magnet,
  post-processing (bloom, AO, grading), music from the Astrocade generator.

## How to run

Serve this folder and open `index.html?local`. Options: `&tier=0..3` forces a quality tier, `&speed=N` runs N
steps per frame, `&mode=edit` the host's edit mode.

- `node --test logic.test.mjs`: rules, layout, and the timeline at two taps a second (12 tests).
- `node playtest.js <out folder>`: plays the slice with real clicks and saves screenshots. Where the CDN is blocked,
  set `THREE_DIR` to a local `three/build` folder (three@0.187.0 from npm).

Tuning lives in `game_config.json`.
