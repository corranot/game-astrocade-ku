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

## First minutes

- The first bomb is short (one color, three presses, three toppings, two seconds of fizz): the first toy arrives
  after about ten seconds of play.
- A spotlight dims the screen except the thing to touch, with a ghost hand showing the gesture on it. It shows
  during the first bomb until the player acts on a step, and on any bomb after four idle seconds.
- Features arrive one at a time. The first bomb has only the step bar and the mute button. Coins, the reward bar,
  the book and the customer appear on the second bomb; the Luck meter on its decorate step; the shop when the
  first bathtub is affordable. The customer, the Luck meter and the shop are each introduced by a spotlight that
  waits for one tap (six seconds at most).
- An unlock arrives as a gift box on the prize screen; the replay button appears once it is opened.

## Look

Toys, toppings, customers, the jar and the background are generated art in one glossy style. The bowl, spoon,
mold, bathtub and the bomb are drawn on the canvas with gradients, highlights and table shadows; the bomb has
shading and powder specks. Water has a moving surface and foam that builds as the bomb fizzes. Each step slides
in, the prize opens with a white flash and the toy leaping up, and celebrations mix stars and hearts into the
particles.

## Layout

The 720 x 1280 screen is cut into fixed lanes: HUD, step bar, instruction, toast, customer order, play area
(430-915), choice row, action button. Every UI element lives in one lane. The prize screen and the book are full
panels of their own. In debug the game records the box of every element; `playtest.js` fails when two boxes
overlap or one leaves the screen, on 18 screens in each of the seven languages.

## Languages and devices

The game reads the player's device language (`navigator.languages`) and shows it when `strings` in
`game_config.json` has that language: English, Arabic, Spanish, Vietnamese, Hindi, Bengali, Indonesian. Any other
device language falls back to English. Arabic is right-to-left: the HUD, the choice rows and the progress bar are
mirrored. All player-facing text is in that string table; text wider than its space is drawn smaller. The book has
a 🌐 button (in the book) that steps through the languages, and the choice is saved. Toys, unlocks and locks use pictures and
numbers instead of words. Translations were written without a native review.

Input is pointer events, so touch and mouse both work without a setting. When the frame rate stays under 40 FPS
for `lowFpsSeconds`, particles and background bubbles are halved.

## Files

- `index.html`: one canvas, loads `game.js`.
- `game.js`: all game code. `run(mode)` is the entry point. `update` runs only in play mode;
  edit mode shows a live picture of step 1.
- `game_config.json`: tunable numbers (step lengths, rarity weights) and the leaderboard declaration.
- `asset_map.json`: art and sound made with Astrocade's generators. Ids `toy_<name>` (16 toys), `top_<name>` (5 toppings), `cust_<name>` (8 customers), `bg_bathroom`, `jar_powder`, `sfx_pour`, `sfx_drop`, `sfx_stir`,
  `sfx_press`, `sfx_pop`, `sfx_splash`, `sfx_fizz`, `sfx_win`, `sfx_squeak`, `music`. A missing id falls back to
  emoji or synthesized sound.

## Design source

`ASTROCADE.md`, section "Tren Backend Astrocade": the step-by-step maker pattern, soft refusal
instead of failure, a first screen that is alive before the first tap.

## Local preview

Serve this folder and open `index.html?local`. That flag stubs the Astrocade host.
`playtest.js` (kept outside this folder's upload set) runs thirteen checks in a phone-sized browser: the whole loop,
tap-only pouring, button mashing, mute, the rules (prizes, orders, recipes, rewards, shop), forced golden and double
bombs with a bubble round, album completion and the gold set, play with no assets, edit mode, 600 seeded random taps
and drags, device-language detection for ten locales, the layout check, and the first minutes (spotlight, short first bomb,
gift box, introductions, idle help). Add `&noassets` to preview the emoji
fallback.
