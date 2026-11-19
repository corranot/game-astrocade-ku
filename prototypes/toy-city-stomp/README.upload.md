<!-- PROTOTYPE - NOT FOR PRODUCTION -->
# Toy City Stomp: Giant Monster Smash

**Genre:** 3D giant-monster city smash · **Ages:** 6–12 · **Play time:** about 3 minutes a city

Bonbon, a giant gummy dinosaur, stomps through a colourful toy-block city on an island. Swipe with one finger
to walk; whatever Bonbon bumps breaks. Houses fall flat, towers topple onto their neighbours like dominoes, toy
cars squash and pop back, and the little toy residents float away happily on balloons. Nobody gets hurt.

## How to play

- Swipe anywhere to walk. Bonbon breaks what it touches by itself.
- Fill the grow bar to grow (8 sizes). Bigger Bonbon breaks bigger buildings; a building that is too big bounces.
- The more you smash, the more wanted stars: toy cars, foam tanks and bubble helicopters come. Their hits only
  make Bonbon dizzy for a moment. Squash them for points.
- At full size the Wind-Up Robot drops in. Beat it and flatten the city to finish.
- Tap the big button for your move. Earn coins and buy new moves in the shop.
- Missions give extra coins. Find the secret of the ice-cream trucks.

## Features

- Full 3D toy diorama with a sea horizon, a glossy candy monster, buildings that turn see-through when they hide Bonbon.
- Combo ×10, dominoes, cracks and glass, dust, confetti, recorded sounds and music.
- 10 moves, 3 mission tiers, a boss with three phases, Rainbow Mode.
- 7 languages (English, Arabic, Spanish, Vietnamese, Hindi, Bengali, Indonesian), picked from the device.
- Touch or mouse and keyboard, picked automatically; quality adjusts itself on slower phones.

## Code structure

- `index.html`: page, HUD styles, import map for Three.js; loads `game.js`.
- `game.js`: `run(mode)`, renderer, camera, input, rules, HUD, sound, languages, save, shop.
- `city.js`: the island and city: buildings made of blocks, collapse and dominoes, cars, trees, lamps, effects.
- `bonbon.js`: the monster model and its animation.
- `army.js`: toy army, wanted stars and the Wind-Up Robot boss.
- `moves.js`: the button moves and the shop rules.
- `missions.js`: missions and their rewards.
- `game_config.json`: every tunable number and all texts in 7 languages; declares the leaderboard.
- `asset_map.json`: music and sound effects.
