<!-- PROTOTYPE - NOT FOR PRODUCTION -->
# Draw It Alive

Draw the one missing part with a finger; the scene comes alive using the line you drew.

## Question this slice answers

Does a child's own wobbly line look good, and stay reliable, once it becomes part of the scene and is animated?
Three levels cover the three stroke kinds: a short level line (bridge), a closed shape (snail shell), a curve that
joins two things (water to a flower).

## How to run

Serve this folder and open `index.html?local` (`&mode=edit` for edit mode). `node playtest.js <folder>` plays all
three levels, the miss and help rules, lift-and-continue, edit mode and a frame-time check with the processor
slowed four times, and saves screenshots.

## Status

In progress: 3 of a planned 20 launch levels. Waiting for the owner to try it on a phone.

## Findings so far

- The player's line, smoothed twice and drawn with the sticker border, reads as part of the scene in all three kinds.
- Payoffs that follow the line (walking it, drops running along it) work with any shape that passes the check.
- Frame time at 4x processor slowdown: median 16.7 ms in headless Chromium. Not yet measured on a real phone.
- Not built yet: sound mute button, save of more than the level number, languages (the slice has no words), the
  other 17 levels, chapters, stickers.

## Files

- `index.html`: one canvas, loads `game.js`.
- `game.js`: rules, input, stroke check, guide, particles, frame loop. `run(mode)` is the entry point.
- `art.js`: the sticker drawing kit (white-bordered flat shapes, faces with moods) and path maths.
- `levels.js`: the levels; each has a hidden target path, a back layer drawn once and a live layer drawn each frame.
- `game_config.json`: tunable numbers.
