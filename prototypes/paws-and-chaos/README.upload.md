# Paws & Chaos: Sunbeam Kingdom

Genre: 3D cozy sandbox / pet adventure. Ages 5–11. Play a fluffy kitten in a giant sunny house and garden.

Knock toys off tables, chase the red laser dot, push yarn balls into the basket, bounce on the sleeping dog's belly
and climb the bookshelf tower for golden fish. Fish buy new fur and silly hats at the magic mirror, and 15 fish open
the pet door to the sunlit garden with butterflies, a fountain with lily pads, giant daisies and a treehouse.
There is no game over: falls end in a soft bounce.

## How to play
- Move: joystick (bottom left) or WASD / arrow keys. The camera follows; drag anywhere to turn it.
- Jump: big paw button or Space.
- Meow / pounce: cat button, E, or tap a toy, the red dot or a butterfly to leap at it.
- Stand on the glowing purple circle in front of the mirror to dress up.

Rewards: mischief stars fill the star bar (a full bar gives fish), the red dot gives 3 fish, a yarn goal 2, golden
fish on the top perch 3. Six fur skins (ginger, tuxedo, calico, siamese, pastel pink, cosmic galaxy) and five
accessories (wizard hat, pirate hat, crown, propeller cap, butterfly wings). Progress is saved. 7 languages (English,
Arabic, Spanish, Vietnamese, Hindi, Bengali, Indonesian) follow the device; change it with the globe button.

## Code
- `index.html` — page, HUD styles, Three.js r187 from the CDN.
- `game.js` — everything else: sound made in code (meow, chimes, music), particles, the house and garden, toy
  physics, the kitten rig and controls, camera, activities (red dot, basket, fish, butterflies, door), HUD, wardrobe,
  save and quality steps for slower devices.
- `game_config.json` — tuning values, skins, hats and all player text in 7 languages; leaderboard of fish found.
