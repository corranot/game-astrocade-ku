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
- Flatten a city to open the next one: Toy Town, Candy Town, Beach Town, Snow Town, Dino Valley, Robot City. Pick any open
  city on the map after a round; each round builds a new layout.
- Dress Bonbon up: hats and candy colours in the shop's LOOKS tab.
- Each city hides three special residents. Find one per round and fill the sticker book.
- Every city has its own robot boss (wind-up, gummy, rubber duck, snow, dino, mega).
- Come back each day: a daily gift that grows over a 7-day streak, and the Daily City (📅 on the map), the same
  city for everyone today, with a coin bonus the first time and today's best time.

## Features

- Full 3D cel-shaded toy diorama with very thin ink outlines, a sea horizon, buildings that turn see-through when they hide Bonbon.
- Combo ×10, dominoes, cracks and glass, dust, confetti, recorded sounds and music.
- 10 moves, 3 mission tiers, a boss with three phases, Rainbow Mode, 6 themed cities, 13 costumes, 18 stickers.
- Result screen: blocks smashed, all-time total, the next move to save for, and the top 3 by all-time blocks smashed.
- 7 languages (English, Arabic, Spanish, Vietnamese, Hindi, Bengali, Indonesian), picked from the device.
- Touch or mouse and keyboard, picked automatically; quality adjusts itself on slower phones.

## Code structure

- `index.html`: page, HUD styles, import map for Three.js; loads `game.js`.
- `game.js`: `run(mode)`, renderer, camera, input, rules, HUD, sound, languages, save, shop.
- `city.js`: the island and city in a theme's colours: buildings made of blocks, collapse and dominoes, cars, trees, lamps, effects.
- `bonbon.js`: the monster model, its animation, hats and skins.
- `toon.js`: the cel-shading material shared by everything lit (the thin outline is an edge pass in `game.js`).
- `movefx.js`: what the moves look like: shock rings, bubbles, sneeze puffs, the rainbow beam.
- `shapes.js`: detailed toy shapes merged per kind: cars, little people, trees, toy tanks and helicopters.
- `army.js`: toy army, wanted stars and the Wind-Up Robot boss.
- `moves.js`: the button moves and the shop rules.
- `missions.js`: missions and their rewards.
- `game_config.json`: every tunable number, the city themes, costumes and stickers, and all texts in 7 languages; declares the leaderboard.
- `asset_map.json`: music and sound effects.
