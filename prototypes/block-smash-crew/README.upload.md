<!-- PROTOTYPE - NOT FOR PRODUCTION -->
# Block Smash Crew: Voxel Demolition

Genre: first-person voxel destruction / demolition action. Ages 5–12. 3D, portrait, phone and computer.

You are a demolition kid with a giant hammer, seen through your own eyes. Every level is a cheerful block building — a
cottage, a candy shop, a castle, a lighthouse, a toy factory, an ice palace, a jungle temple and a space base —
and each one hides 3 stars: one in the treasure chest inside a steel vault, one high up on the roof or a tower, and
one deep inside behind the rooms.

## How to play
First person: you see your hands and your tool. The game finds your device by itself.
- Phone or tablet: the stick (lower left) walks, drag anywhere to look around, hold the 💥 button to smash what the
  crosshair shows. Or just tap a block: you run there and smash it; hold on a block to keep smashing.
- Computer: WASD or the arrow keys walk (Shift runs), the mouse looks around, click or Space smashes, 1–6 or the
  wheel pick a tool.
- Steel is too hard for the hammer: pick the 💣 bomb and throw it at the steel.
- Anything left without support falls down and shatters — knock out the bottom of a tower and watch it crash!
- Find all 3 stars for SMASH TIME: every tool unlocked, no waiting, double coins.
- Trophies for wrecking 50% and 80% of the building. Keep smashing as long as you like, then press NEXT.

- Tap a shining star to throw a free star bomb at it. If the hammer bounces off steel a few times, SUPER HAMMER breaks it.
- Red TNT barrels blow up and set off the ones next to them; tall towers tip over — TIMBER!

Every 5th building is a BOSS (the biggest, double coins). Levels change between day, sunset and snow. Tap your coins to
open the shop: unlock tools and upgrade each one 5 times, and see your album of buildings and trophies. A daily
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
- `levels.js` — the eight building generators.
- `logic.js` — coins, combo, trophies, unlocks, daily gift.
- `scene.js` — the 3D look: blocks, first-person camera, hands and tools, flying pieces, dust, coins, explosions.
- `game_config.json` — tuning values, sounds and all player text in 7 languages; leaderboard of blocks smashed.
- `asset_map.json` — the recorded sound effects and music.
