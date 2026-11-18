<!-- PROTOTYPE - NOT FOR PRODUCTION -->
# Fizzy Bath Bomb Maker

A step-by-step maker game for kids, built for Astrocade (portrait, 720 × 1280, touch first).

## How it plays

1. Hold (or tap) to pour powder into the bowl.
2. Tap color bottles to add drops; the bomb keeps its last three colors as stripes.
3. Stir: any movement in the bowl counts.
4. Pick a mold, then tap to press.
5. Pick a topping and tap or drag on the bomb to decorate it.
6. Drop the bomb in the bath. It fizzes away and a surprise toy pops out.

There is no fail state. Reasons to make another one:

- **Orders.** A customer asks for a shape in a color. A bomb of that shape that contains that color pays 20 extra
  coins. Orders prefer recipes the player has not made yet.
- **Recipe book.** Every mold x color made is a page (25 recipes). A new recipe pays 10 coins.
- **Toy album.** 16 toys in four rarities. A duplicate pays a star; three stars buy a golden bomb (rare or better);
  three duplicates in a row guarantee a missing toy. A full album switches to a gold set of the same toys.
- **Reward bar.** The HUD always shows the next unlock (mold, color, topping, charm) and how close it is; after the
  last unlock it counts toward a coin gift every third bomb.
- **Shop.** Coins buy bathtubs. The newest four toys float in the bath.
- **Bubble round.** Every third bomb ends with eight seconds of bubble popping for coins.
- **Luck meter.** Decorating fills it; a full meter triples the weight of the rare tiers.
- Pouring and stirring get 40% faster from the fourth bomb.

## Layout

The 720 x 1280 screen is cut into fixed lanes: HUD, step bar, instruction, toast, customer order, play area
(430-915), choice row, action button. Every UI element lives in one lane. The prize screen and the book are full
panels of their own. In debug the game records the box of every element; `playtest.js` fails when two boxes
overlap or one leaves the screen, on 15 screens in each of the seven languages.

## Languages and devices

The game reads the player's device language (`navigator.languages`) and shows it when `strings` in
`game_config.json` has that language: English, Arabic, Spanish, Vietnamese, Hindi, Bengali, Indonesian. Any other
device language falls back to English. Arabic is right-to-left: the HUD, the choice rows and the progress bar are
mirrored. All player-facing text is in that string table; text wider than its space is drawn smaller. The book has
a 🌐 button (in the book) that steps through the languages, and the choice is saved. Toys, unlocks and locks use pictures and
numbers instead of words. Translations were written without a native review.

Input is pointer events, so touch and mouse both work without a setting. When the frame rate stays under 40 FPS
for `lowFpsSeconds`, particles and background bubbles are halved.

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
`playtest.js` (kept outside this folder's upload set) runs twelve checks in a phone-sized browser: the whole loop,
tap-only pouring, button mashing, mute, the rules (prizes, orders, recipes, rewards, shop), forced golden and double
bombs with a bubble round, album completion and the gold set, play with no assets, edit mode, 600 seeded random taps
and drags, device-language detection for ten locales, and the layout check. Add `&noassets` to preview the emoji
fallback.
