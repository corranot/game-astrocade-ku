<!-- PROTOTYPE - NOT FOR PRODUCTION -->
# Pinata Maker: Smash Party

A step-by-step maker game for kids with a smash at the end, built for Astrocade (portrait, 720 x 1280, touch first).
The yard, the pinata, the candy and the stick are 3D (Three.js 0.187.0); the HUD is a 2D canvas on top.

## How it plays

1. Pick a shape (llama, unicorn, dino; star, donut and rocket unlock later).
2. Stick paper: drag or tap on the pinata. A tap next to it covers the nearest bare patch.
3. Decorate: the pinata gets its eyes, then tap to stick stickers.
4. Fill: tap candy. What goes in is what rains out.
5. Smash: tap to hit. Each hit holds for a frame, knocks paper out of line and makes the fringe flutter; the pinata
   cracks (paper falls, candy leaks) and bursts in slow motion with a shockwave.
6. Grab the candy (each is a coin), then open the surprise capsule for a toy.

There is no fail state. Candy not grabbed in time is picked up for the player, and the capsule opens by itself.

Reasons to make another one:

- **Orders.** A guest asks for a shape in a colour; filling it pays 20 extra coins.
- **Toy album.** 16 toys in four rarities. A duplicate pays a star; three stars make the next pinata golden
  (rare or better); three duplicates in a row guarantee a missing toy. A full album switches to a gold set.
- **Reward bar.** The HUD always shows the next unlock and how close it is; after the last one, a coin gift every third pinata.
- **Stick shop.** Coins buy four more sticks (squeaky hammer, wand, foam sword, giant lollipop); each shakes out more candy.
- **Golden pinata for coins.** 200 coins in the album make the next pinata golden (a missing rare-or-better toy), so coins always have a use.
- **Party round.** Every third pinata swings; a hit in the middle counts double and leaks candy, and the rain is doubled.
- **Surprises.** Golden pinata, mega candy rain.
- **Party themes.** Beach, snow and candy land unlock at pinatas 12, 14 and 16 and rotate.
- **Smash only.** After two pinatas, each pinata made banks one bonus smash of a ready-made pinata.
- **Daily gift.** The first pinata of a day pays 10 coins times the streak of days played (up to 7).
- **Top collectors.** The third tab of the album lists the players who grabbed the most candy.

## First minutes

- No menu. A new player starts with a ready-made pinata already hanging: three taps and it bursts, candy rains and
  the first toy arrives. Only then comes "make your own".
- The first pinata to make starts at the paper step, already mostly covered: four patches, two stickers,
  three candy taps, five hits. The yard moves (confetti, guests, balloons) before the first touch.
- A spotlight with a ghost hand shows the gesture on the real thing until the player acts, and again after four idle seconds.
- The first pinata shows only the step bar and the sound button. Coins, the reward bar, the album button and
  the first order appear on the second pinata; the order is introduced by a spotlight that waits for one tap (six seconds at most).

## Layout

The HUD is cut into fixed lanes (`LANE` in `game.js`): HUD, step bar, progress bar, instruction, toast, order,
choice row, action button. The pinata lives between the order and the choice row. In debug the game records
the box of every HUD element; `playtest.js` fails when two boxes overlap or one leaves the screen, on 10 screens in each of the seven languages.

## Languages and devices

The game reads the device language (`navigator.languages`) and uses it when `strings` in `game_config.json`
has it: English, Arabic, Spanish, Vietnamese, Hindi, Bengali, Indonesian; anything else falls back to English.
Arabic is right-to-left: HUD, rows, bars and buttons are mirrored. Text wider than its space is drawn smaller.
The album has a globe button that steps through the languages; the choice is saved.
Translations were written without a native review.

Input is pointer events, so touch and mouse both work without a setting. When the frame rate stays under
40 FPS for `lowFpsSeconds`, the 3D canvas renders at three-quarter resolution and confetti and candy are halved.

## Files

- `index.html`: two stacked canvases (`gl` for 3D, `game` for the HUD), loads `game.js`.
- `game.js`: rules, input, HUD, sound, save. `run(mode)` is the entry point. Edit mode shows a live picture, no gameplay.
- `scene.js`: the 3D yard. Shapes are lists of boxes, cylinders, cones and torus arcs; every band is one paper patch.
- `game_config.json`: tunable numbers, all player-facing text, the leaderboard declaration.
- `asset_map.json`: art and sound from Astrocade's generators: `toy_*` (16), `guest_*` (6), `stk_*` (5),
  `candy_*` (5), `bat_*` (5), `sfx_*` (11), `music`. A missing id falls back to emoji or a synthesized sound.

## Design source

`ASTROCADE.md`: step-by-step maker games and smash sandboxes were the two fastest types on the feed on 2026-11-18;
no pinata game was in the 1,887 games sampled.

## Local preview

Serve this folder and open `index.html?local` (`&noassets` for the emoji fallback, `&edit` for edit mode).
`playtest.js` (not part of the upload) runs twelve checks in a phone-sized browser: whole loop, order and smash-only,
button mashing, toy and unlock rules, golden + mega + party, no assets, edit mode, 600 seeded random inputs,
device language for ten locales, the layout check, the first minutes, and safety (failed save read, failed 3D load,
hidden buttons, edit after play).

`soak.js` plays fourteen pinatas in one page (with bonus smashes, the shop and the golden pinata) and fails on a page
error, a broken save, a silent candy grab, or GPU objects that keep growing.

## Safety

- The save is never written before the player's own save has been read; a failed read is retried.
- If the 3D library does not load, the loading screen stays alive and retries by itself and on every tap.
- Sounds skip their measured leading silence (`SOUND_FIX` in `game.js`), so a tap is heard at once.
- HUD text and emoji are drawn once to small sprites and copied each frame.

## Known limits

- Sound, hit feel and frame rate were never checked on a real phone.
- Translations were written without a native review.
