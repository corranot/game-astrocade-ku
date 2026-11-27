<!-- PROTOTYPE - NOT FOR PRODUCTION -->
# Wonder Sprout (one-shot)

2D canvas kids game for Astrocade. Plan and decisions: `plan.md`. Player-facing overview: `README.upload.md`
(uploaded as `README.md`).

- Status: in progress (M1-M4, v1 = World 1 and three critters).
- Run: serve the folder (`npx http-server prototypes/wonder-sprout`) and open `index.html`; a stub `lib` is
  enough because the game falls back to defaults when `lib` calls fail.
- Tuning: `game_config.json` (the game also carries a DEFAULTS copy in `game.js`; keep them equal).
- Tests: `node --test prototypes/wonder-sprout/tests/*.test.mjs` (pure functions + pacing bot);
  `node tests/sim.mjs 15 7` prints milestone times for one bot run.
- Screens: `node prototypes/wonder-sprout/tests/shots.js` (needs Playwright) writes phone-portrait JPGs.
  `tests/quick.js` writes six screens fast while iterating.
- Garden goals (`m7-garden-goals.js`): one icon-first goal at a time with gem rewards and a gift egg every
  fourth; `economy.goalGems` sets the base reward. The pacing bot does not model goal rewards yet.

## Pacing (bot, 3 seeds, 27 Nov tuning)

Landmarks at about 0:40-1:45, 1:40-2:45, 3:15-3:50, 5:00-6:20, 7:45-8:40, 10:50-12:05; hero stage 2 at 2:30-5:10,
stage 3 at 7:35-10:50.
