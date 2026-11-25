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

## Upgrade (owner-approved 2026-11-25, plan in `UPGRADE-PROMPT.md`)

### Stage 1: giant hammer, heavy hits

- The drawn hammer grows as `s ^ hammer.visExp` while its reach stays `hitR x s`. The camera pulls back more
  slowly (`camera.growK` 0.38) and leans towards the hammer (`camera.aimW`, `camera.aimX`), so the head stays in
  frame. The hammer's on-screen size grows about 2.7x over a run.
- Shockwave: small objects within `growth.splash` x the reach break too, popping outward in a ripple with one "+N".
  Numbered objects still need a direct hit.
- Tier-up moment: slow motion (`fx.tierSlowMo` s at `fx.tierSlowScale`), a camera punch-in, a ring three reaches
  wide, the overshoot and a "WHOOM".
- Swing: a wind-up (`hammer.windup`), a head squash on impact (`fx.squash`), an FOV kick on big hits, and a combo
  chip from `fx.comboShow` breaks in a row.

### Stage 2: gems become a hammer collection

- Gems are saved (`save.gems`) and shown in a chip under the mute button. The card shows the gems earned this run.
- `skins` in the config holds six hammers: classic (free), candy 200, dino 450, ice cream 700, robot 1100 and
  rainbow 1800. A run gives about 200 gems, so the first unlock comes after one run and the set takes about 20.
  Each skin has head, band, handle and grip colours and a head pattern drawn into a canvas texture. The dino adds
  spikes. Evolution tiers raise any skin's glow; the classic skin keeps the tier colours.
- The collection opens from the hammer button (start screen) or the card. Tap a card to buy or wear a hammer; one
  the player can't afford yet shakes. A dot on the buttons means a new hammer is affordable.

### Stage 3: a new place every run

- `worlds`: Toy Town, Sunny Beach, Candy Land and Snow Peak. Each world replaces the street, park and finale items
  (26 new models, three new bosses: giant sandcastle, gingerbread house, ice palace) and sets its sky, fog, ground
  and tree tint. Zone sizes and the req values stay the same, so the pacing holds (logic test per world).
- Run n plays world n mod 4. A returning player starts in the world after their last one. The x2 banner names the
  new world.

### Stage 4: the look of every zone, clean labels, exact layout

- Each zone has its own ground: boards, cobbles, asphalt with lane lines and zebra crossings, park grass with
  stepping stones, concrete slabs and icing. Worlds swap in sand, icing or snow paving.
- Fixed: the island's grass faced down and was never drawn (the cliff's flat green showed instead).
- Light moves from morning to dusk across the zones (`look.light`). Lamp bulbs glow towards the finale, and birds
  sit around the zone and scatter on heavy hits.
- Labels: numbers show only for targets within `labels.ahead` x the size. Breakable ones pulse green; further ones
  show a padlock.
- Layout: safe-area insets beyond the letterbox (`--st`, `--sb`), one margin `--m`. The start screen has one
  bottom row (hammer button and daily goal, equal heights). Checked in 7 languages for overlap and overflow.

### Stage 5: daily goal

- One goal a day (`daily.goals`: smash N numbered things, reach size S, collect G gems, break N bosses, make a
  combo), stepped from the local date by the seeded rng so it never repeats two days running. It shows on the start
  screen and the card, and pays `daily.reward` gems once.

## How to run

Serve this folder and open `index.html?local`. Options: `&tier=0..3` forces a quality tier, `&speed=N` runs N
steps per frame, `&mode=edit` the host's edit mode.

- `node --test logic.test.mjs`: rules, layout, the vault, regrowth and the timeline at two taps a second (14 tests).
- `node playtest.js <out folder>`: plays a whole run with real clicks (six zones, the vault, the results card) and saves screenshots. Where the CDN is blocked,
  set `THREE_DIR` to a local `three/build` folder (three@0.187.0 from npm).

Tuning lives in `game_config.json`.
