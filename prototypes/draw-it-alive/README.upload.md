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
5. Tap the **Share** button (top right) to send the game to a friend.

## What is inside

- 25 drawing puzzles in five chapters: the original four chapters and their 20 puzzles remain in order, followed
  by Snowy Day (a scarf for a snowman, a sled hill for a penguin, a chimney, lights between trees, and ice for a skating duck).
- Later levels have two parts to draw (a balloon and its string, a bike's two wheels, a boat's mast and sail).
- A wall of your own pictures at the end of each chapter; tap a picture to see it big and play it again.
  Tap the padlock to open the next chapter.
- Every star is a paint drop for the jar. A full jar opens a surprise box with a sticker.
- 30 stickers in five sets of six (friends, treats, sea animals, sky, Winter friends) in the sticker book.
- A daily gift of extra paint drops on the first win of a new day.
- Round two mirrors every scene, including Snowy Day. Existing saves keep their pictures, stars, stickers and settings; legacy round progress is mapped to the longer cycle.
- Short words in English, Arabic, Spanish, Vietnamese, Hindi, Bengali and Indonesian, chosen from the
  device language, with a globe button to change it.

## Code structure

- `index.html`: one canvas; loads `game.js`.
- `game.js`: the game: input, judging the drawn line against the hidden part, stars, sharing, the picture wall,
  paint jar, surprise box and sticker book, daily gift, languages, sound, save and load through `lib`.
  `window.run(mode)` is the entry point (`play` and `edit`).
- `levels.js`: the 25 pictures; each has its hidden part path, a background drawn once and a live layer that
  animates the scene with the player's line.
- `art.js`: the sticker-style drawing kit (flat shapes with white borders, faces with moods), the 30
  stickers and path maths.
- `progress.js`: pure legacy-level migration and sticker-set selection helpers.
- `game_config.json`: tunable numbers (how close a line must be, celebration times, paint drops per box) and
  all on-screen text in the seven languages.
