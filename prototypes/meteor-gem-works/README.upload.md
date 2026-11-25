# Meteor Gems

A crystal meteor has crashed next to a little desert town. You are the miner: drag to walk, swing at the meteor for
crystal chunks, carry them to the polisher, bring the cut gems to the glass stands and the tourists buy them. Scoop
the coins and pay the price pads to grow the town: a drill rig, a conveyor, more stands, an armadillo shopkeeper, the
canyon road and its tour bus, a ring workshop, a laser cutter, a mine cart that lights up the ghost town, a second
rig, a cable car, a stargazer deck, a crown jeweler, neon signs and, last, the heart of the meteor.

Tap the sparkle on the meteor for a Perfect Strike. Eggs fall out of the meteor and hatch twelve crystal critters
(common, shiny, rare and one legendary) that follow you with a helpful perk each. Kids at the stall ask for a gem
or a ring now and then. Crystal Rush rains gems from the sky. Town stars unlock hats, and the sticker album keeps
every critter, hat and star. Chapter 1 ends with the heart of the meteor and a comet that points to chapter 2.

## Controls

- Touch: drag anywhere to walk. Tap the sparkle on the meteor.
- Keyboard: WASD or arrows to walk, Space taps the sparkle.

## Code structure

- `index.html`: page and HUD styles; loads Three.js, then `game.js`.
- `game.js`: `run(mode)`, the loop, input, HUD, sound made in code, effects for each game event, save and continue.
- `logic.js`: the rules (no 3D, no page): mining, polishing, selling, unlocks, critters, orders, the guide.
- `scene.js`: the 3D world, the meteor, items, effects, camera, glow pass and quality tiers.
- `models.js`: every prop and character, built in code from rounded, vertex-coloured parts.
- `game_config.json`: all tuning values and the strings in 7 languages.
- `asset_map.json`: the rounded Baloo font files (SIL Open Font License 1.1).
