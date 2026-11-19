<!-- PROTOTYPE - NOT FOR PRODUCTION -->
# Draw It Alive: Draw the Missing Part

A drawing puzzle game for kids: each picture has one part missing, you draw it with your finger, and the
picture comes alive using the very line you drew. Genre: drawing, finish-the-picture puzzle, creative,
casual, relaxing. Ages: young children and up, no reading needed to start.

## How to play

1. A picture appears with a dashed outline where a part is missing (a bridge, a shell, water, a rainbow).
2. Put your finger on the pink dot and trace the missing part.
3. Your line becomes the part: the chick walks across your bridge, the snail wears your shell, the flower
   drinks your water, the rainbow you drew lights up the sky.
4. Earn up to 3 stars. A wrong line just fades and the hand shows the way again; nobody ever loses.

## What is inside

- 20 drawing puzzles in 4 chapters: a pond, a meadow, a garden, hills, a park, a road, the sea, a cosy room
  and a party, with cute chicks, a snail, a watering can, a flower and a happy cloud.
- Later levels have two parts to draw (a balloon and its string, a bike's two wheels, a boat's mast and sail).
- A wall of your own pictures at the end of each chapter; tap a picture to see it big and play it again.
  Tap the padlock to open the next chapter.
- Every star is a paint drop for the jar. A full jar opens a surprise box with a sticker.
- 24 stickers in 4 sets (friends, treats, sea animals, sky) in a sticker book.
- A daily gift of extra paint drops on the first win of a new day.
- Round two shows every picture mirrored, a fresh puzzle to draw.
- Short words in English, Arabic, Spanish, Vietnamese, Hindi, Bengali and Indonesian, chosen from the
  device language, with a globe button to change it.

## Code structure

- `index.html`: one canvas; loads `game.js`.
- `game.js`: the game: input, judging the drawn line against the hidden part, stars, the picture wall, the
  paint jar, surprise box and sticker book, daily gift, languages, sound, save and load through `lib`.
  `window.run(mode)` is the entry point (`play` and `edit`).
- `levels.js`: the 20 pictures; each has its hidden part path, a background drawn once and a live layer that
  animates the scene with the player's line.
- `art.js`: the sticker-style drawing kit (flat shapes with white borders, faces with moods), the 24
  stickers and path maths.
- `game_config.json`: tunable numbers (how close a line must be, celebration times, paint drops per box) and
  all on-screen text in the seven languages.
