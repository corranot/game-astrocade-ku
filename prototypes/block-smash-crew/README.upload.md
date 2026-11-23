<!-- PROTOTYPE - NOT FOR PRODUCTION -->
# Block Smash Crew: Smash & Destroy Buildings

Theme: action (smashing, exploding, destruction). Genre: first-person demolition action with toy buildings, bombs
and ragdoll toy robots. Ages 5–12. 3D, portrait, phone and computer.

You are a demolition kid with a giant hammer, seen through your own eyes. Every level is a cheerful block building — a
cottage, a candy shop, a castle, a lighthouse, a toy factory, an ice palace, a jungle temple and a space base —
and each one hides 3 stars: one in the treasure chest inside a steel vault, one high up on the roof or a tower, and
one deep inside behind the rooms.

## How to play
First person: you see your hands and your tool. The game finds your device by itself. The first times, a bright spotlight shows each
control (walk, look, smash, bomb) until you have used it.
- Phone or tablet: the stick (lower left) walks, swipe anywhere else to look around, hold the 💥 button to smash what
  the crosshair shows. Or tap a block close to you to smash it; hold on it to keep smashing.
- Computer: WASD or the arrow keys walk (Shift runs), the mouse looks around, click or Space smashes, 1–6 or the
  wheel pick a tool.
- Steel is too hard for the hammer: pick the 💣 bomb and throw it at the steel.
- Anything left without support falls down and shatters — knock out the bottom of a tower and watch it crash!
- Find all 3 stars for SMASH TIME: every tool unlocked, no waiting, double coins.
- Trophies for wrecking 50% and 80% of the building. Keep smashing as long as you like, then press NEXT.

- Tap a shining star to throw a free star bomb at it. If the hammer bounces off steel a few times, SUPER HAMMER breaks it.
- Red boom barrels blow up and set off the ones next to them; tall towers tip over — TIMBER! Special barrels throw
  six bombs, open a black hole or call a meteor, and the BOOM box in the yard sets off every barrel in a chain.
- Waves of little toy BONK-BOTs march at you, holding funny cardboard signs ("CAN'T TOPPLE OUR TOWER!") and wearing
  party hats, chef hats, pirate hats and more. Hit them (hammer, bombs, boom barrels, falling pieces, even another flying robot)
  and they fly — BONK! — then reboot with a smile, beep and walk away. A new wave comes every half minute; knock over a
  whole wave for bonus coins. They are toys: they never break for good.

Every 5th building is a BOSS (the biggest, double coins). Levels change between day, sunset and snow. Tap your coins to
open the shop (a red "!" says you can buy something): unlock tools and upgrade each one up to level 30, and see your
album of buildings and trophies. Big moments (SMASH TIME, a flattened building, a cleared wave, a new record blast) get
confetti, and the result card tells how many blocks you smashed — show a friend with ✈️. A daily
challenge (double coins) waits on the result card.

Tools: hammer, bomb, rocket, wrecking ball, black hole and meteor. Coins unlock tools; every locked tool has one
free try per level. Daily gift, endless levels (the buildings grow), a leaderboard of blocks smashed. No timer, no
losing. 7 languages (English, Arabic, Spanish, Vietnamese, Hindi, Bengali, Indonesian) follow the device; change it
under ⚙️.

## Code
- `index.html` — page, HUD styles, Three.js r187 from the CDN.
- `game.js` — game flow, device detection, stick / mouse / keys input, HUD, sound (made in code), save, tools shop, result card.
- `world.js` — the level's rules: hero movement and smashing, tools, falling pieces, chest, stars, smash time.
- `voxels.js` — block grid, ray cast, smashing, collapse check, mesh builder with corner shading.
- `ui.js` — the game's own icons and the shared panel and button pieces of the HUD.
- `levels.js` — the eight building generators.
- `logic.js` — coins, combo, trophies, unlocks, daily gift.
- `bots.js` — the BONK-BOT toy robots: waves, marching, signs and costumes, the floppy ragdoll, rebooting, leaving.
- `scene.js` — the 3D look: blocks, first-person camera, hands and tools, robots with faces, signs and costumes, flying pieces, dust, coins, explosions.
- `game_config.json` — tuning values, sounds and all player text in 7 languages; leaderboard of blocks smashed.
- `asset_map.json` — the recorded sound effects and music.
