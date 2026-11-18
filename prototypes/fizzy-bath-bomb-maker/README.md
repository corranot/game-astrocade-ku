<!-- PROTOTYPE - NOT FOR PRODUCTION -->
# Fizzy Bath Bomb Maker

A step-by-step maker game for kids, built for Astrocade (portrait, 720 × 1280, touch first).

## How it plays

1. Hold to pour powder into the bowl.
2. Tap color bottles to add drops (colors mix).
3. Stir in circles.
4. Tap to press the mix into a ball.
5. Pick a topping and tap or drag on the ball to decorate it.
6. Drop the ball in the bath. It fizzes away (tap to fizz faster) and a surprise toy pops out.

Reasons to make another one:

- Each finished bomb can unlock a mold (heart, star, donut, flower), color, topping or charm (`unlocks` in the
  config). A locked choice shows a padlock and the number of bombs to go.
- Decorating fills a Luck meter; a full meter triples the weight of rare, epic and legendary toys.
- A duplicate toy pays a star. Three stars buy a golden bomb (rare or better guaranteed). After three duplicates
  in a row the next toy is drawn only from the missing ones.
- From the third bomb on, a bomb can hold two toys.
- A full album (16/16) switches to a gold set of the same toys.

Made for small kids: a quick tap pours as well as a hold, any movement in the bowl stirs, the first screen pours
by itself before the first touch, the "MAKE ANOTHER" button waits 1.5 s so mashing cannot skip the prize, and
there is a mute button. The album is saved per player (a late load is merged, never overwrites), and toys owned
plus gold toys is the leaderboard score, shown as "Top Collectors" in the album. There is no fail state.

## Languages and devices

The game reads the player's device language (`navigator.languages`) and shows it when `strings` in
`game_config.json` has that language: English, Arabic, Spanish, Vietnamese, Hindi, Bengali, Indonesian. Any other
device language falls back to English. Arabic is right-to-left: the HUD, the choice rows and the progress bar are
mirrored. All player-facing text is in that string table; text wider than its space is drawn smaller. The album has
a 🌐 button that steps through the languages, and the choice is saved. Toys, unlocks and locks use pictures and
numbers instead of words. Translations were written without a native review.

Input is pointer events, so touch and mouse both work without a setting. When the frame rate stays under 40 FPS
for `lowFpsSeconds`, particles and background bubbles are halved.

## Files

- `index.html`: one canvas, loads `game.js`.
- `game.js`: all game code. `run(mode)` is the entry point. `update` runs only in play mode;
  edit mode shows a live picture of step 1.
- `game_config.json`: tunable numbers (step lengths, rarity weights) and the leaderboard declaration.
- `asset_map.json`: art and sound made with Astrocade's generators. Ids `toy_<name>` (16 toys), `top_<name>` (5 toppings), `bg_bathroom`, `jar_powder`, `sfx_pour`, `sfx_drop`, `sfx_stir`,
  `sfx_press`, `sfx_pop`, `sfx_splash`, `sfx_fizz`, `sfx_win`, `sfx_squeak`, `music`. A missing id falls back to
  emoji or synthesized sound.

## Design source

`ASTROCADE.md`, section "Tren Backend Astrocade": the step-by-step maker pattern, soft refusal
instead of failure, a first screen that is alive before the first tap.

## Local preview

Serve this folder and open `index.html?local`. That flag stubs the Astrocade host.
`playtest.js` (kept outside this folder's upload set) runs eleven checks in a phone-sized browser: the whole loop, tap-only
pouring, button mashing, mute, the prize rules, forced golden and double bombs, album completion and the gold set,
play with no assets, edit mode, 600 seeded random taps and drags, and device-language detection for ten locales
(set through the browser locale) with a screenshot set per language. Add `&noassets` to preview the emoji fallback.
