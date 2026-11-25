<!-- PROTOTYPE - NOT FOR PRODUCTION -->
# Meteor Gem Works

A crystal meteor has crashed next to a little frontier town. Kids play the miner: drag to walk, swing at the meteor
for crystal chunks, carry the stack to the polisher, bring the cut gems to the glass stand, and tourists buy them.
Scoop the coins and pay a price pad to build a drill rig that mines on its own. A sparkle on the meteor is a
Perfect Strike when tapped. An egg falls out of the meteor and hatches a crystal pup that follows you (+5 carry).

Plan: [plan.md](plan.md) (v2, approved by the owner on 2026-11-25).

## Milestone 3: chapter 1 complete (this build)

- Unlocks 8-14, in order: ghost town + mine cart 190, drill rig 2 220, cable car 250, stargazer deck 265 (golden
  hour), crown jeweler 300, neon signs 350 (night), the heart of the meteor 420 (the finale). The laser is now 170.
- The ghost town goal: a goal card shows three dark houses. Each full mine cart of gems lights one house up: colour
  floods in, the boards fall off and the windows glow. Later carts pay out.
- The crown jeweler turns spare rings into crowns that ride away on the cable car. Rig 2 mines on its own.
- Twelve critters. Eggs are common, shiny or rare, with a pity counter. Nova, the legendary one, comes only from the
  finale. Three town stars (orders, critters, a lit town) unlock hats: cowboy, flower crown, bunny ears, astronaut
  helmet, top hat and crown.
- Finale: Crystal Rush, the heart rises out of the meteor, bursts, and Nova hatches wearing a crown. Then a comet
  streaks over the mesas (chapter 2, Frost Comet, is "soon") and fireworks go off.
- A goal is always on screen. Before the last unlock it is the NEXT card. After it, the NEXT card shows album
  progress (stickers out of 21). The album (book button) shows critters as silhouettes until hatched, hats (tap to
  wear), stars and the chapter map. Game time stops while it is open.
- Share: a "show a friend" button appears for 7 s at a new critter, the laser, the legendary hatch, the end of
  chapter 1 and each star. It sends `lib.share` a JPEG of the town and a brag line. It only shows when the host
  has `lib.share`.
- The sky eases toward the time of day that the town has reached: golden hour, then night with stars and
  fireflies.
- Draw calls: unmoving set dressing is baked into one mesh per material. Each critter is down to 3 draws.
- The bot finishes chapter 1 in about 9:30-11:00 over 12 seeds, with a reward at least every 33 s.
- Perf guard: adaptive quality measures the mean frame time every 2 s. Slow frames lower the render scale to 0.7 in
  steps, then drop a tier. Steady fast frames climb back, but never to a tier that failed twice. The playtest checks
  this with forced 34 ms frames.

## Milestone 2: core loop, unlocks 1-7

- Unlocks in order, one price pad that moves on: drill rig 25, conveyor + polisher 2 60, stand 2 + lanterns 80,
  armadillo shopkeeper 105, road + tour bus 125, ring workshop 155, mining laser 180 (170 since M3).
- Orders (a kid wants a gem or a ring, no timer), 6 critters from eggs, Crystal Rush (loose gems rain down),
  tour bus waves, the guide arrow, and save/continue.
- Onboarding: a 3 s cold open (the meteor falls in) that any touch or key skips and hands over control at once,
  the NEXT card (icon, fill bar, coins left), a "drag to move" hint and a tapping finger on the first glint.
- Returning players get a CONTINUE / NEW GAME card; NEW GAME needs a second tap. Save every 4 s, on hide, on unlock
  and on hatch; writes are chained and only start after the first read succeeded.
- Look: fresnel rim light on characters and critters, bloom capped so gems stay readable, the camera frames the
  meteor closer while mining and punches in on a Perfect Strike.
- The bot reaches the laser in about 3:35 (3:27 to 4:12 over 12 seeds) with a reward at least every 45 s.

Distribution notes (theme row, first 40 s, update plan, listing text) are in [plan.md](plan.md) §15.

## Milestone 1: visual sample

M1 showed the look before M2 (plan.md §12): the crater square at three times of day, the meteor with its cut map,
mining, polishing, selling, one pad, one egg and one critter. Its evidence is in
`production/qa/evidence/meteor-gem-works/`.

## Controls

- Touch: drag anywhere to walk (a joystick ring appears under the finger). Tap the sparkle on the meteor.
- Keyboard: WASD or arrows to walk, Space taps the sparkle.

## Run it

- `?local` serves as the host (stub `lib`, reads `game_config.json`). Other parameters: `tier=0..3`,
  `tod=0..1` (0 noon, 0.5 golden hour, 1 dusk), `bot` (the guide plays, no cold open), `nointro`, `lang=en|ar|es|vi|hi|bn|id`.
- `node --test logic.test.mjs`: rules (polish, carry with a critter, the guide is never stuck, unlock order and pacing, save round trip, quality, tod).
- `node playtest.js <out>`: plays with the bot and real input, saves the M2 and M3 screenshots, checks the cold open skip,
  save/continue, every unlock and moment, the finale, share and album, draw-call budgets, glare per shot, the perf
  guard, a 16-minute soak, and that no module touches THREE on import. It takes about 45 minutes on swiftshader.

## Code structure

- `index.html`: page, HUD styles, loads Three.js r187 from cdnjs, then `game.js`.
- `game.js`: `run(mode)`, loop, input, HUD, sound made in code, event to effect wiring, debug hooks (`__game`).
- `logic.js`: pure rules (no THREE, no DOM), the guide bot, adaptive quality, time-of-day blend.
- `scene.js`: the 3D world, meteor shader and cut map, items (instanced), pooled effects, camera, glow pass, tiers.
- `models.js`: every prop and character, built in code from rounded, vertex-coloured parts.
- `game_config.json`: all tuning values and the 7-language strings.
- `asset_map.json`: the Baloo font files (SIL Open Font License 1.1), shared with the studio's other games.

## Evidence

- M1: `production/qa/evidence/meteor-gem-works/`.
- M2: `production/qa/evidence/meteor-gem-works/m2/`, from `playtest.js` (405 x 720 at 2x, tier 2 unless named):
  cold open, NEXT card, first-glint finger, continue card, every unlock, keeper, bus, order, rings, laser, Rush,
  critter parade, busy noon, golden hour, dusk, tier 0, Arabic HUD. Every shot is under 0.2% near-white pixels.
- Budgets with everything built: tier 0 about 139 draw calls and 141k triangles (budget 160), tier 2 about 211 calls
  and 277k triangles (budget 260). Live textures stay at 15 after a long run.
- Frame times come from swiftshader (CPU raster), so the 60 FPS check on a real phone is still open.
