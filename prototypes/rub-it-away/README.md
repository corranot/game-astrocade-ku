# Rub It Away

A child-friendly, one-touch visual puzzle: look at the scene, find the thing spoiling it, rub it away, and watch the scene become happy. The original 60 hand-authored levels and their ten worlds remain in order; six cozy Snow World levels (61–66) and six sweet Candy World levels (67–72) extend the campaign to 72 levels across twelve worlds. Optional decoy reactions are playful discoveries; they never take stars away. A solved level earns all three completion stars, and the player chooses when to continue.

## Player experience
- Portrait canvas: 720×1280; touch-first drag/rub controls, with oversized buttons.
- Permanent level map, collected funny decoy reactions, free hints, saved progress, and a non-timed hint for completing each world.
- Snow World unlocks at level 61. A small NEW badge stays on its map island until the first Snow World level is started.
- Every world ends with a payoff: a WORLD COMPLETE ribbon, fireworks, a full world poster and a bonus hint. The finale card has an optional one-tap Share button (`lib.share` with a title and text; the share card shows the game's own cover). Next remains visible.
- The result card shows the next scene's picture on NEXT and a six-frame world poster that fills one frame per level.
- Variety without changing the one-finger rub: the rub tool changes with the world (eraser, sponge with bubbles, scrub brush, ice scraper, icing spatula with sprinkles); about one level in eight is a golden picture that shimmers and pays a bonus hint (which levels shifts each day); a clean solve shows PERFECT!; a surprise gift box appears after every 10th level solved in one sitting.
- Personal bests: a NEW RECORD moment for the fastest rub (first touch to fix) and for the most pictures in one day; the share text carries the fastest rub. Rubbing very hard makes the thing wobble with a soft squeak (nothing is lost). The finished picture stays a toy: tapping a character makes it hop and squeak.
- Today's picture: one level a day, the same for everyone, playable from the menu for a bonus hint, with a peek at tomorrow's picture. Missing a day costs nothing.
- First-time tour on level 1: the screen dims around the cloud to rub, then around NEXT; it advances only on the real action, can be skipped, and never repeats. A dotted guide line runs from the finger to the target when a hint is shown.
- Snow World uses falling snow, reduced-motion-aware snow puffs, warm reveal glows, subtle frosty breath, a soft snow-rub loop, and a happy bell. Existing music/settings and all prior world effects remain in place.
- No streaks, nothing that is lost by missing a day, no timers, no competitive leaderboard, and no automatic result-card advance. Wrong rubs never cost stars.
- Settings are reachable from the menu, map, and active game: music, sound effects, haptics, and reduced decorative motion. Settings persist in player save data.
- Eight languages, including Arabic and Urdu right-to-left layout.

## Creator Edit mode
`run('edit')` starts a static visual editor, not gameplay. Creators can navigate all levels, select and drag objects, resize the selection, or reset a level. Position and size overrides are written to `window.gameConfig.levelEdits`; Play reads these values without mutating `gameConfig`. No scoring, save progress, rub input, or leaderboard call runs in Edit mode. The Home settings panel registers creator defaults through `lib.showGameParameters()`.

## Structure
- `index.html` – fixed 720×1280 canvas entry page.
- `game.js` – explicit `window.run(mode)` entry and creator settings registration.
- `asset_map.json` – original assets plus the Snow World illustrations and sound effects.
- `game_config.json` – serializable creator defaults and visual level edits.
- `modules/boot.js` – Play lifecycle, input, navigation, save hooks, and clean mode/reload teardown.
- `modules/editor.js` – static creator editor with select/drag/resize/reset.
- `modules/levels.js` – authored scene, target, decoy and reaction data for levels 1–72.
- `modules/rules.js` – pure rules: bounded editor overrides, safe save-array migration, star award, preference normalization, level-data validation, today's picture, golden pictures, the gift cadence and their tuning (`TUNE`).
- `modules/level.js`, `thing.js`, `fx.js` – rub logic, rendering, object behavior, feedback and optional reduced motion.
- `modules/ui.js` – menu, map, settings, HUD, share card, result and completion screens.
- `modules/audio.js` – optional Web Audio effects/music, including Snow World audio.
- `modules/save.js` – backward-compatible player progress and accessibility preferences; old 60-level arrays are extended with zeroed new entries without changing existing values.
- `modules/strings.js` – all player-facing text for eight languages.
- `tests/core.test.mjs` – unit tests, 72-level/data/asset checks, locale coverage, and save migration defaults.
- `UPGRADE_META_PROMPT.md` – explicit upgrade brief and acceptance criteria.

## Validation
Run `node --experimental-default-type=module tests/core.test.mjs` for the data/rules checks. Run `node --experimental-default-type=module --check` on `game.js` and the modules for syntax validation. Automated checks cover all 72 level definitions, all required art assets, the Snow World and Candy World decoys/targets, translations, and old-save array extension. Human playtesting and professional translation review remain valuable follow-up QA.
