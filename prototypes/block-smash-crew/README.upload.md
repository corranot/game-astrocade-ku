<!-- PROTOTYPE - NOT FOR PRODUCTION -->
# Block Smash Crew: Voxel Demolition

Genre: voxel destruction / demolition action. Ages 5–12. 3D, one finger, portrait.

You are a demolition kid in a yellow hard hat with a giant hammer. Every level is a cheerful block building — a
cottage, a candy shop, a castle, a lighthouse, a toy factory, an ice palace, a jungle temple and a space base —
and each one hides 3 stars: one in the treasure chest inside a steel vault, one high up on the roof or a tower, and
one deep inside behind the rooms.

## How to play
- Tap or hold anywhere: the hero runs there and smashes everything in the way.
- Drag left or right to turn the camera. Inside a building the roof peels away so you can see every room.
- Steel is too hard for the hammer: tap the 💣 bomb, then tap the steel.
- Anything left without support falls down and shatters — knock out the bottom of a tower and watch it crash!
- Find all 3 stars for SMASH TIME: every tool unlocked, no waiting, double coins.
- Trophies for wrecking 50% and 80% of the building. Keep smashing as long as you like, then press NEXT.

Tools: hammer, bomb, rocket, wrecking ball, black hole and meteor. Coins unlock tools; every locked tool has one
free try per level. Daily gift, endless levels (the buildings grow), a leaderboard of blocks smashed. No timer, no
losing. 7 languages (English, Arabic, Spanish, Vietnamese, Hindi, Bengali, Indonesian) follow the device; change it
under ⚙️.

## Code
- `index.html` — page, HUD styles, Three.js r187 from the CDN.
- `game.js` — game flow, touch input, HUD, sound (made in code), save, tools shop, result card.
- `world.js` — the level's rules: hero movement and smashing, tools, falling pieces, chest, stars, smash time.
- `voxels.js` — block grid, ray cast, smashing, collapse check, mesh builder with corner shading.
- `levels.js` — the eight building generators.
- `logic.js` — coins, combo, trophies, unlocks, daily gift.
- `scene.js` — the 3D look: blocks, hero, flying pieces, dust, coins, explosions, camera.
- `game_config.json` — tuning values and all player text in 7 languages; leaderboard of blocks smashed.
