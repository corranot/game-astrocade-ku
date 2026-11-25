<!-- PROTOTYPE - NOT FOR PRODUCTION -->
# +1 Mega Hammer: Smash and Grow

Tap to slam a giant hammer. Every object it breaks adds to the hammer's size, so it grows on screen and can then
break the bigger, numbered things it bounced off before. Plan (hybrid, approved by the owner on 2026-11-25): Claude
Doc "+1 Mega Hammer — Plan Game".

## Milestone 1: core feel (merged)

- One input: tap slams where the finger is (snaps to the nearest object), holding keeps slamming. Space on desktop.
- 8 evolution looks for the hammer (wood, bronze, jade, gold, amethyst, magma, starlight, rainbow).
- Effects: debris per material, dust puffs, shockwave ring, crack marks that fade, hit-stop, trauma shake, +N
  numbers that fly to the counter, zone-clear confetti, label pop when a numbered object opens.
- Sound made in code: thud that deepens with hammer size (140 to 48 Hz), material hits, pentatonic combo dings,
  fanfares, a toy-funk loop.
- Attract mode before the first touch (demo swing, counts nothing), 7 languages, save through `lib`, quality tiers.

## Milestone 2: the whole run (merged)

- Six zones: fruit stand, market, street (cones, mailboxes 380, cars 750), park (flowerpots, benches 1500, trees
  2500, fountains 3500), city (houses 5000, water towers 8000, buildings 11000), and the cake vault finale (needs
  19000, takes 6 hits, its label counts the hits left). A zone clears at 80% of its numbered objects broken (60% in
  the vault zone, plus the vault itself).
- Growth `L += value x mult`: small objects give their own value, a numbered one gives 8% of its number (at least 2).
  Display scale `1 + 0.55 ln(1 + L)`, so a 30 000 hammer still fits the screen; reach grows with it.
- Small objects grow back after 2.5 s in the zone being played, so a zone never runs dry.
- The run ends with the vault. If the session is 60 s or longer, a results card shows the hammer size, the best, a
  "Smash again x2" button and a share button (`lib.share`); a shorter session goes straight on into the x2 run.
  The leaderboard gets the best size at the end of every run.
- A run at two taps a second takes about 50 to 70 s.

## Milestone 3: polish (merged)

- Glow and grade pass on tier 2 and up (`look` in the config): the scene is drawn to a half-float target, what is
  brighter than the threshold (gems, shockwave rings, the glowing hammer tiers) is blurred at 1/4 and 1/8 size and
  added back, then ACES tone mapping, a warm lift, saturation, contrast and a vignette. Tiers 0 and 1 draw direct,
  so the adaptive quality drop removes the pass first.
- Contact shadows: a soft dark disc under every breakable (a cheap stand-in for ambient occlusion).
- Magnet gems: each numbered object throws out 1 to 6 jewels (the vault 40); they hang a moment, then home in on the
  hammer head with a rising tick. The results card counts them.

## Milestone 4: Astrocade draft (this slice)

- Music: a 36 s toy-funk loop from the Astrocade generator (`music_main` in `asset_map.json`, volume in `music`),
  started on the first touch; the code-made loop plays until it arrives or if it never does.
- Never a dead end: a retry button with a reason code (LIB: the 3D library did not arrive in 12 s, GL: no WebGL,
  ERR: a script error) instead of a blank screen.
- Fixes from the bug hunt: the mute icon keeps its state across `run()`, the song stops when the game is destroyed,
  debris colours land on the right chunk, two `run()` calls before three.js arrives start one game.
- Saved as an unpublished draft only; no thumbnail (the owner makes it), no publish.

## How to run

Serve this folder and open `index.html?local`. Options: `&tier=0..3` forces a quality tier, `&speed=N` runs N
steps per frame, `&mode=edit` the host's edit mode.

- `node --test logic.test.mjs`: rules, layout, the vault, regrowth and the timeline at two taps a second (14 tests).
- `node playtest.js <out folder>`: plays a whole run with real clicks (six zones, the vault, the results card) and saves screenshots. Where the CDN is blocked,
  set `THREE_DIR` to a local `three/build` folder (three@0.187.0 from npm).

Tuning lives in `game_config.json`.
