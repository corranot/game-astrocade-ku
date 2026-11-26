<!-- PROTOTYPE - NOT FOR PRODUCTION -->
# Meteor Gem Works

A crystal meteor has crashed next to a little frontier town. Kids play the miner: drag to walk, swing at the meteor
for crystal chunks, carry the stack to the polisher, bring the cut gems to the glass stand, and tourists buy them.
Scoop the coins and pay a price pad to build a drill rig that mines on its own. A sparkle on the meteor is a
Perfect Strike when tapped. An egg falls out of the meteor and hatches a crystal pup that follows you (+5 carry).

Plan: [plan.md](plan.md) (v2, approved by the owner on 2026-11-25).

## Post-launch drops (built, switched off)

The day-3 and day-9 updates from `updates.md` are in the code behind `drops` in `game_config.json` (`night`,
`festival`, both `false`), so the game plays exactly as chapter 1 until a switch is flipped.

- **Night Critters (`drops.night`):** 6 more critters (18 in all), 3 hats (miner lamp at 15 critters, star antenna
  at 25 orders, bandana at 1,000 gems sold), the album in a 6-wide grid, and a parade capped at `critter.show` (12,
  the newest plus Nova).
- **Desert Festival (`drops.festival`):** a flower arch and paper lantern strings over the front of the deck,
  fireworks at dusk and night, and the welcome-back gift (after 8 h away: 30 + 12 coins per pad, max 240, and a
  sooner egg once a day).
- **Check:** `node --test logic.test.mjs` (20 tests) and `node drops.js <outDir>` (both drops on, from a late save:
  gift, hatch, parade cap, fireworks, album fit, draw calls tier 0 151/160 and tier 2 204/260). Evidence in
  `production/qa/evidence/meteor-gem-works/drops/`. Locally, `?drops=night,festival` turns them on.

## Smooth frames and free walking (2026-11-26)

- **No hitch on quality steps:** a step only rebuilds shaders when shadows switch on or off, and tier 0 keeps a 512
  shadow map, so no step does. Both shader sets (glow target and straight to screen) are built at start, the second
  `quality.warmLaterMs` after the first frame. Hidden unlocks and effects are compiled up front too.
- Shadows refresh every other frame below tier `quality.shadowEvery1`; no per-frame allocations in the glow toggle
  and crowd sync.
- **Never stuck:** the hero walks through stations, props, critters and people; only the deck edge stops them.
- **Check:** `node perf.js <gameDir> <out.json> 4` (long-session frame times) and `node tierstep.js <gameDir>`
  (quality-step hitches). Numbers: `production/qa/evidence/meteor-gem-works/perf/smooth-fps-2026-11-26.md`.

## Clarity and phone performance pass (2026-11-26)

After the owner's first play of the draft (confusing flow, not smooth):
- **Station badges:** a round icon over every working stop says what it is for (pickaxe, rock, rock to gem, gem,
  stand, coins); the guide's next stop gets a big bouncing badge, and a gold chevron trail on the floor leads to it.
  One atlas texture and one instanced draw, plus one for the trail.
- **Tall phones fill the screen** (up to 9:20, no dark bars); the HUD scales by the tighter side (`--u`).
- **Lighter start:** `quality.start` 1 (no glow pass), climbs to `quality.max` 2 only after 8 s of fast frames;
  drops sooner (`dropMs` 19); a pixel budget per tier (`quality.maxPx`) caps the resolution on big screens.
- **Meteor always lands**: when the feed preview hands over to play, the first frame could step time backwards and
  strand the meteor in the sky; the loop never steps backwards now and the intro always ends with the meteor in its
  crater (`production/qa/evidence/meteor-gem-works/clarity/meteor-missing-2026-11-26.md`).
- **Meteor on phone GPUs**: the rock's carve depth now comes from a per-vertex attribute filled on the CPU
  instead of a texture read in the vertex shader (not available on every phone GPU, which left the crater empty).
  If a shader still fails to build, the meteor switches to a plain lit material so it is never missing.
- **Less at once**: the parade shows at most 6 critters (`critter.show`) and the fence crowd is
  `quality.crowd` = [10, 16, 24, 30] per tier.
- **Fast first load**: the import map points cdnjs's `./three.core.js` import at the minified core, both library
  files are preloaded, shaders compile in parallel before the first frame (`quality.warmMs` cap), and a warm sky
  with the glowing meteor shows while the 3D world loads. Numbers: `production/qa/evidence/meteor-gem-works/clarity/load-2026-11-26.md`
  (`node tools/load-time.js prototypes/meteor-gem-works`).

## Milestone 5: chapter 2, the Frost Comet (built, switched off)

Chapter 2 is in the code behind `drops.ch2` (`false`), so the shipped build stays chapter 1 plus whichever drops are on.
Plan: `plan.md` §16.

- **Travel:** after the chapter 1 finale a cable car pad opens on the deck (`travel` in the config). Standing on it
  for a moment shows a short ride card and rebuilds the scene for the other place. Wallet, hat and the critter
  parade come along; the place left behind keeps earning (`away`, capped) and pays out on the way back.
- **The valley:** the same loop and station ids with frost names (`f_` strings), prices x3 (`ch2.scale`), its own
  eggs (8 frost critters, Polaris the legendary), three hats (earmuffs, beanie, ice crown), three stars and a finale
  whose comet glows red (chapter 3 teaser).
- **Look (`theme: 'frost'`):** snow tinted lavender, pale blue and pink (never white; the brightest snow is about
  `#cdd0e8`), snow caps on every painted prop (`M.frostify`), icy meteor and crystals, pines, snowballs, a penguin
  shopkeeper, a cocoa stand, snow globes for rings, a snowflake neon and an aurora in the night sky, GPU snowfall in
  one draw (`ch2.snow`), a cooler grade (`ch2.look`).
- **Save:** one save holds both places (`ch2` and `area`); `save.version` is unchanged, so old saves load as before.
- **Check:** `node --test logic.test.mjs` (24 tests) and `node ch2.js <outDir>` (screenshots 49-58 in
  `production/qa/evidence/meteor-gem-works/m5/`). Locally, `?drops=night,festival,ch2` turns everything on.

## Milestone 3: chapter 1 complete

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
- M3: `production/qa/evidence/meteor-gem-works/m3/` (shots 29-43, from `playtest.js`): the ghost town goal card and
  a house lighting up, unlocks 8-14, a crown riding to the cable car, neon at night, the share button, the finale
  (heart, legendary hatch, comet, chapter 1 complete), the album, and tier 0 at night with chapter 1 complete.
  `soak.json` holds the 16-minute soak, one row per game minute.
- M3 budgets: with chapter 1 complete and twelve critters on screen, tier 0 is 141 draw calls (budget 160) and
  tier 2 is 190 (budget 260). With unlocks 1-7 built, tier 0 is 118 and tier 2 is 134.
- M3 soak, 16 game minutes on tier 1: textures hold at 10. Geometries rise as unlocks are built, then hold at 168
  from minute 11. The JS heap holds at 47 MB. Forced 34 ms frames drop tier 2 to tier 0 within 20 s. All 104
  playtest checks pass, and the bundle test passes.
- Frame times come from swiftshader (CPU raster), so the 60 FPS check on a real phone is still open.
