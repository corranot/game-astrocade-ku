# Mow Mow Meadow

Ride Buzzy the mower with Nilo through wild gardens. Cut the tall grass into stripes, find friends and toys
hiding in it, collect bales for coins, and tidy every garden for the animal neighbours of three districts:
Clover Lane, Windmill Hill and Lantern Lake. A new Garden of the Day arrives every day.

## How to play

- Drag anywhere to steer (or use the arrow keys / WASD). Buzzy cuts whatever it drives over.
- Bales pop out as you mow; drive over them for coins.
- 90% of a garden opens its gate; 97% and 100% earn more stars and a tip.
- Stop on a pad on the lane to buy a wider deck, a faster engine or a bigger baler.
- The book button holds the friends, toys, hats and neighbours you have found; the wrench holds upgrades and looks.

## Code structure

- `index.html`: page shell and module preloads.
- `game.js`: the game loop, input, gardens, rewards, tutorial spotlight, saving.
- `logic.js`: rules with no rendering (garden generator, cutting, stars, prices, collisions, save cleaning).
- `world.js`: renderer, camera, lighting, district scenery, fences and lanes.
- `lawn.js`: the grass (a cut mask per garden drives the blades, the stripes and the finale flowers).
- `buzzy.js`, `chibi.js`, `cast.js`: the mower, Nilo, neighbours and small friends.
- `toys.js`, `life.js`: garden toys (ducklings, molehills, apples, sheep, sprinklers, mushroom rings) and wildlife.
- `fx.js`, `audio.js`: particles, camera beats, music and sounds.
- `ui.js`, `sheets.js`: HUD, album, workshop, receipt.
- `kit.js`: small geometry helpers.
- `game_config.json`: every tuning value and all text in seven languages.
