# Rub It Away

A child-friendly, one-touch visual puzzle: look at the scene, find the thing spoiling it, rub it away, and watch the scene become happy. The original 60 hand-authored levels and their ten worlds remain in order; six cozy Snow World levels (61–66) extend the campaign to 66 levels across eleven worlds. Optional decoy reactions are playful discoveries; they never take stars away. A solved level earns all three completion stars, and the player chooses when to continue.

## Player experience
- Portrait canvas: 720×1280; touch-first drag/rub controls, with oversized buttons.
- Permanent level map, collected funny decoy reactions, free hints, saved progress, and a non-timed hint for completing each world.
- Snow World unlocks at level 61. A small NEW badge stays on its map island until the first Snow World level is started.
- Every sixth-level world finale includes an optional one-tap Share button. It sends a 720×1080 picture of the happy scene, world name, and three stars through Astrocade's built-in `lib.share` feature; Next remains visible.
- Snow World uses falling snow, reduced-motion-aware snow puffs, warm reveal glows, subtle frosty breath, a soft snow-rub loop, and a happy bell. Existing music/settings and all prior world effects remain in place.
- No date-based streaks, limited-time rewards, surprise reward timers, competitive leaderboard, or automatic result-card advance.
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
- `modules/levels.js` – authored scene, target, decoy and reaction data for levels 1–66.
- `modules/rules.js` – pure rules: bounded editor overrides, safe save-array migration, star award, preference normalization, and level-data validation.
- `modules/level.js`, `thing.js`, `fx.js` – rub logic, rendering, object behavior, feedback and optional reduced motion.
- `modules/ui.js` – menu, map, settings, HUD, share card, result and completion screens.
- `modules/audio.js` – optional Web Audio effects/music, including Snow World audio.
- `modules/save.js` – backward-compatible player progress and accessibility preferences; old 60-level arrays are extended with zeroed new entries without changing existing values.
- `modules/strings.js` – all player-facing text for eight languages.
- `tests/core.test.mjs` – unit tests, 66-level/data/asset checks, locale coverage, and save migration defaults.
- `UPGRADE_META_PROMPT.md` – explicit upgrade brief and acceptance criteria.

## Validation
Run `node --experimental-default-type=module tests/core.test.mjs` for the data/rules checks. Run `node --experimental-default-type=module --check` on `game.js` and the modules for syntax validation. Automated checks cover all 66 level definitions, all required art assets, the six Snow World decoys/targets, translations, and old-save array extension. Human playtesting and professional translation review remain valuable follow-up QA.
