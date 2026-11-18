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

- Each finished bomb can unlock a new mold (heart, star, donut), color or topping (`unlocks` in the config).
- Decorating fills a Luck meter; a full meter triples the weight of rare, epic and legendary toys.
- From the second bomb on, a bomb can be golden (rare or better guaranteed); from the third, it can hold two toys.
- Before the first touch the jar pours by itself in a loop, so the first screen is alive.
- The revealed toy can be poked.

Toys go into a 16-slot album (8 common, 5 rare, 2 epic, 1 legendary). The album is saved per
player, and the number of toys owned is the leaderboard score. There is no fail state.

## Files

- `index.html`: one canvas, loads `game.js`.
- `game.js`: all game code. `run(mode)` is the entry point. `update` runs only in play mode;
  edit mode shows a live picture of step 1.
- `game_config.json`: tunable numbers (step lengths, rarity weights) and the leaderboard declaration.
- `asset_map.json`: optional art and sound. Ids `toy_<name>` (16 toys), `sfx_pour`, `sfx_drop`, `sfx_stir`,
  `sfx_press`, `sfx_pop`, `sfx_splash`, `sfx_fizz`, `sfx_win`, `sfx_squeak`, `music`. A missing id falls back to
  emoji or synthesized sound.

## Design source

`ASTROCADE.md`, section "Tren Backend Astrocade": the step-by-step maker pattern, soft refusal
instead of failure, a first screen that is alive before the first tap.

## Local preview

Serve this folder and open `index.html?local`. That flag stubs the Astrocade host.
`playtest.js` (kept outside this folder's upload set) plays the whole loop in a phone-sized browser.
