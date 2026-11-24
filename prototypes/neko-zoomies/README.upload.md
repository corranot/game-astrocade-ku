# NEKO ZOOMIES: The Great Toyroom Caper

Genre: 3D toyroom sandbox / pet adventure. Ages 5–12. Play Mochi, a calico kitten alone in a giant sunlit playroom.

Pounce and swipe toys off the desk and shelves for combos (x2, x3, x5), collect glowing yarn orbs, and fill the
Purr-Meter for 12 seconds of MEGA ZOOMIES: double speed, double jump, a rainbow tail ribbon and orbs that fly to
you. Climb from the rug over the cushions, toy chest, drum, desk and bookshelves to the cloud mobiles under the
ceiling, where giant golden fish wait. A giant floor piano plays a real note for every key Mochi steps on. A red
laser dot and a bubble-blowing toy whale visit in turn. There is no game over: falls end in a soft bounce.

## How to play
- Move: joystick (bottom left) or WASD / arrow keys. The camera follows; drag anywhere to turn it.
- Super Pounce: Space, the paw button, or tap. Tap a toy to leap at it.
- Paw Swipe: Shift or E, the swipe button, or double tap.
- Top right: camera reset and sound on/off.

Yarn stars unlock costumes that Mochi puts on at once: shark fin hat (100), wizard hat (250), butterfly wings
(450), golden crown (700), rocket jetpack (1000). The bar under the star counter shows the next one as a silhouette.
Progress is saved. 7 languages (English, Arabic, Spanish, Vietnamese, Hindi, Bengali, Indonesian) follow the device.

## Code
- `index.html` — page, HUD styles, Three.js r187 from the CDN.
- `game.js` — everything else: sound made in code (meows, purr, marimba clacks, piano, music), particles, the room,
  toy physics, the kitten rig and costumes, camera, yarn orbs, book dominoes, events, HUD, save and quality steps
  for slower devices.
- `game_config.json` — tuning values, costume thresholds and all player text in 7 languages; leaderboard of yarn
  stars.
