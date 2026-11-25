# +1 Mega Hammer: Smash and Grow

Tap to slam a giant hammer. Every object it breaks adds to the hammer's size, so it grows on screen and can then
break the bigger, numbered things it bounced off before. A run crosses six zones (fruit stand, market, street, park,
city, and a boss finale), ends with a results card and a "Smash again" run at a higher multiplier, and moves to a new
world each time. Gems from numbered objects unlock hammer skins; a daily goal pays bonus gems.

## Controls

- Touch: tap where to slam (snaps to the nearest object); hold to keep slamming.
- Keyboard: Space slams at the best spot. The bottom-left button opens the hammer collection.

## Modes

- `play`: the full game. Progress (best size, gems, owned hammers, tier, worlds) saves through
  `lib.saveUserGameState`; the best size goes to the leaderboard at the end of each run.
- `edit`: a live picture of the world with no input and no saving. The settings panel (`lib.showGameParameters`)
  edits feel values (swing, reach, shake, hit pause, rewards, cutscenes) and writes them to `window.gameConfig`.

## Code structure

- `index.html`: page, HUD and screen styles; loads Three.js from cdnjs and `game.js`.
- `game.js`: entry point. `run(mode)`, the game loop, input, HUD, sound made in code plus the music asset,
  cutscene director, settings panel, fonts from the asset map, haptics. Ends with `window.run = run`.
- `logic.js`: pure rules: growth, hit checks, zone clears, best slam spot, daily goals.
- `scene.js`: Three.js world: zones, objects, debris and effects, camera, glow pass, adaptive quality.
- `models.js`: the hammer skins and every breakable object, built from shared geometry and materials.
- `game_config.json`: all tuning values, 7-language strings, cutscene tracks, leaderboard declaration.
- `asset_map.json`: the music loop and the Baloo font files (SIL Open Font License 1.1).
