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
  sixth (`economy.goalGems`, `goalGrowth`, `goalEggEvery`). The pacing bot plays with goals on, so their
  rewards are inside the pacing windows.

- Golden Garden (`m4-kingdom-critters.js`): once all six landmarks stand, gems flow into gilding them gold one by
  one (`gildBase`, `gildGrowth`, `gildBonus`); each gold landmark raises the gem multiplier. Bot: a gild every 4 to
  6 minutes from about 12 to 40 minutes. A once-a-day "gift egg tomorrow" toast promises the daily gift egg.

## Pacing (bot, 3 seeds, goals on, 27 Nov r3 tuning)

Landmarks at about 0:35-1:50, 1:55-2:10, 3:00-3:30, 4:25-5:50, 7:30-8:40, 11:15-12:25; hero stage 2 at 2:20-2:35,
stage 3 at 6:15-7:40; 35-39 garden goals in 15 min.
