# Snip It: Cut to Fix

One-finger physics puzzle for kids (ages 5-11). Genre: cut-the-right-rope puzzle, casual, funny, sticker collecting.

## How to play
Each of the 50 levels is a small toy-box stage with three or four things hanging on ropes. Swipe across a rope (or tap right beside it)
to cut it. One rope fixes the scene: the kitten lands on the sofa, the muddy puppy gets its bath, the thirsty flower
gets water. The others end in a harmless, funny mess. Later worlds add balloons that carry things away and ropes
that must be cut in the right order. Nothing is lost by a wrong cut: every ending is a sticker,
and the right rope can still be cut afterwards. A level takes about ten seconds.

## Features
- 10 worlds of 5 levels: living room, bathroom, garden, kitchen, beach, party, farm, snow, space, toy shop
- 3D toy-box stages with ropes that swing, snap and spring back
- A level map and a sticker book with 168 stickers
- Stars for every fixed scene, one sticker for every ending
- Follows the device language: English, Indonesian, Spanish, Hindi, Arabic (right to left), Vietnamese, Bengali, Portuguese
- Sound made in code, vibration on phones that have it, progress saved, leaderboard of stars plus stickers
- Adapts picture quality to keep slow phones smooth

## Code
- `index.html` - 720 x 1280 frame, HUD styles, loads Three.js r187
- `game.js` - flow of a level, touch, save, leaderboard, creator settings, `window.run`
- `physics.js` - ropes and falling things (fixed 1/60 s steps)
- `levels.js` - the list of worlds and the level format; `w_*.js` - one world each: wall, scenery, five levels; `palette.js` - level-writing helpers
- `scene3d.js` - the stage; `models3d.js` - characters and props; `vfx.js` - bursts
- `slicer.js` - finger to cut; `audio.js` - sound; `i18n.js` - languages; `ui.js` - HUD
- `game_config.json` - settings, words in 8 languages, level edits, leaderboard

## Modes
Play: the game. Edit: a still view of the first stage; nothing can be cut and nothing is saved.
