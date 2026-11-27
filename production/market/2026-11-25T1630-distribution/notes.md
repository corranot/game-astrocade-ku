# Guest capture for the distribution playbook, 2026-11-25 16:36 UTC

Read-only, as a guest, Playwright at Pixel 7 size on astrocade.com (home, feed, search). Nothing was
published, liked or set. Used by `docs/astrocade-distribution-playbook.md`.

Files:
- `feed-stats.json`: 63 unique games from `/v4/feed?filter=gallery` and `/v4/feed?filter=feed`, one row
  each: plays per day since first publish (`v`), age in days, title and description length, likes,
  shares and comments per 1,000 plays, remix, leaderboard, cover host (`up` = creator upload host),
  cover extension, owner lifetime plays, source pool.
- `theme-taxonomy.json`: the Statsig config holding the theme list and definitions used by the
  `game_taxonomy` LLM job, plus `dead_game_config {plays_threshold 200, min_p50_secs 40}`.

Observations (SEEN in these files; sample is small):
- Feed meta unchanged: `algorithm feed-v0-d0-f1`, `featureSource databricks`, `expName beam-web`,
  `experiment_data {realtime_gameplay_trigger false, hide_play_count true}`.
- Fastest quarter (15 games) against the rest (48): median title 14 vs 19 characters; median
  description 128 vs 154 characters; remix share 33% vs 67%; creator-uploaded cover 47% vs 15%;
  shares 5.7 vs 4.8 per 1,000 plays; likes 15.3 vs 15.5 per 1,000; owner lifetime plays 6.2M vs 0.9M.
- `lastUpdatedAt` is within a day of now for every game, so it is not a content-update date.
- 1 of 63 covers is a `.gif` ("Dress To Impress", under `/assets/images/`).
- Feed items carry no tag or theme field.
- Gallery configs (dated May 2026) score on the cohort "D0, non-iOS, first D0 play" with outcomes
  `p_sig` (over 90 s), `p_2nd`, `p_ret`.
- The raw flag list (`/api/exp-flags/sdk/v2/flags`) lists 160 flags but resolves values on the server;
  it cannot be diffed against `flags.json` from the 12:44 snapshot, so no flag change is claimed.
