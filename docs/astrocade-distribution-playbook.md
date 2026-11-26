# Astrocade distribution playbook

The goal of every Astrocade game is as many plays as possible, with no ceiling. This playbook says how
Astrocade decides who sees a game, and what we do about it at each step: concept, build, listing,
publish, update and growth. Read it before every concept, build, update and publish
(CLAUDE.md, Owner Preferences). Refresh it after each new backend dig.

Written 2026-11-25 by a simulated full studio team (game design, live-ops, data science, UA/growth,
ASO, art, engineering, QA), from these sources:

- `production/market/2026-11-20T0749/strategi.md`: the pipeline and the client signals.
- `production/market/2026-11-22-platform/bedah.md`: the full runtime, web app and Statsig dig.
- `production/market/2026-11-24T1035/bedah-backend.md`: the config diff, creator pay and feed fields.
- `production/market/2026-11-25T1244/`: animated covers, the top-24 covers, flags and traffic.
- `production/market/2026-11-26T1700-deep-dig/`: the deep dig of 26 Nov. Every home row read in full
  (1,800 games), the Players' Choice pool sampled 10 times, today's ranking configs and the $100K contest
  rules. Its findings are in §11, and they update §1.1, §3.1 and §10.
- `production/market/2026-11-25T1630-distribution/`: a fresh guest capture for this playbook. It holds
  63 feed games with full fields and the theme taxonomy config.

**SEEN** means it is in Astrocade's code, config or responses (the file is named). **INFERRED** means it
is our reasoning from SEEN facts. **UNKNOWN** means we cannot check it from outside. Config names are
hashed, so the values are SEEN but our reading of what each one does is sometimes INFERRED.

---

## 0. The one-paragraph model

A new game gets a small test audience from cold-start slots: about 150 to 450 impressions in its first
day (SEEN, 20 Nov). If the median session at about 200 plays is under 40 seconds, the game is marked
dead and stops being served (SEEN `dead_game_config`). If it passes, it enters the quality pool and the
"players of X also play Y" neighbour pool, and it gets a play boost that peaks at 5,000 plays. From
there, session length, the share of long sessions, coming back and sharing decide how far it goes.
Thumbnail CTR matters, but it weighs a fifth as much as session length in the gallery score. **Plays
are won by the first 40 seconds of gameplay, not by the listing.** The listing only decides how many
people get to those 40 seconds.

---

## 1. How ranking, recommendation and the feed work (data science)

### 1.1 The surfaces

| Surface | How games get there | Source |
|---|---|---|
| Swipe feed, guests (`feed-v0-d0-f1`, `dayN 0`) | Per 20 cards: neighbours of the game the user came in on (`d0_ranked_neighbors`), a seeded random quality pool (`stochastic_v0_quality`), and cold-start games (`cold_game_candidates`, about 3 of 20 slots) | SEEN 20 Nov and today: `algorithm feed-v0-d0-f1`, `featureSource databricks` |
| Swipe feed, logged in (`beam-web` stream) | Rank 2,000 then rerank 100; half item-to-item (`i2i_ratio 0.5`); history kept on the server | SEEN flags; the model itself is UNKNOWN |
| Gallery (home rows) | GBDT ranker (`gbdt-ranker`, 150 ms) over a score of p50 ×1 + significant-play rate ×1 + feed CTR ×0.2, minimum 150 plays, Gumbel shuffle per session | SEEN Statsig |
| Cold-start insert in the gallery | 5% of slots (25% in theme rows), not in the top 3, for games with at least 75 plays and p50 ≥ 40 s | SEEN |
| Theme rows (Action, Puzzle, Toys, Zen and more) | The game's theme comes from an LLM taxonomy run; the row needs p50 ≥ 40 s and p75 ≥ 75 s | SEEN `theme-taxonomy.json`, rows config |
| "New" and "Community Playtests" rows | At most 150 plays and at most 75 plays | SEEN |
| Players' Choice (top picks) | At least 50,000 plays; score = retention ×15 + share of sessions over 300 s ×10 + p50 ×0.033 + p75 ×0.01; a pool of up to 60, re-drawn often; each visitor gets 21 to 23 of it; near-duplicate descriptions are removed (`neighbor_model dedup-description`). Full detail in §11.2 | SEEN 26 Nov |
| "Start Here" (`fue_picks`) and the first-visit tag picker | New visitors can pick interest tags (Simulation, Sports, Creative, Arcade, Zen, Cooking...), stored in a cookie and sent as `fueTags`; up to 30 starter games | SEEN 26 Nov (experiment) |
| Shorts row (`shorts_jam_2026`) | A curated jam row in weighted mode: 144 game ids, each with a weight from 0.08 to 3.82 (`v3-score-2026-11-20a`); placed 5th ("gentle") or 3rd ("stepped up") for viewers with a short-form taste | SEEN 26 Nov |
| Search | Games under 500 plays never appear; name match 0.5, quality 0.7, plays 0.8 | SEEN |
| Jam rows ("Multiple Players", `shorts_jam_2026`) | Curated or contest entries | SEEN rows |
| Paid ads | Meta ad sets point at a few community games, which then get cold traffic | SEEN `adsets` |
| Home hero videos | 8 hard-coded game ids | SEEN, staff-picked only |

### 1.2 The gates and boosts, with numbers

| Rule | Value | What it means for us |
|---|---|---|
| Dead game | 200 plays with a median session under 40 s | The one gate that matters. 15 of our 17 games from 2 to 20 Nov stopped at 146 to 465 plays here |
| Gallery cold insert | p50 ≥ 40 s from 75 plays | The same 40 s, checked earlier |
| Play boost | Rises from 0, ×1.2 at 5,000 plays, ends at 10,000 plays or 30 days | The first 30 days and first 10K plays are the launch window. Do not waste them on a weak build |
| Update boost | α 0.12, half-life 3 days, only games up to 30 days old | An update brings a boost that halves every 3 days. It is for young games only |
| Theme row | p50 ≥ 40 s and p75 ≥ 75 s | The top quarter of players must play at least 75 s |
| Featured ("Recommended For You") | p50 ≥ 50 s | A higher bar than the gate |
| Gallery long session | 90 s counts as significant; priors p_sig 0.266, p_2nd 0.526, p_ret 0.177; shrinkage k=200 | Platform average: 27% of first plays pass 90 s, 53% play again, 18% come back. Beat these |
| Significant play (creator analytics, pay) | Over 30 s | Pay and the `game_play_30s` event use 30 s |
| Zero-interaction session | Not counted as a play | A play needs at least one gesture |
| Quota (free tier) | 2 new publishes and 5 republishes per day | Release plan limit |

### 1.3 What the gallery score actually measures (INFERRED from SEEN config)

The gallery configs score games on the cohort **"D0, non-iOS, first D0 play"**: brand-new users whose
first-ever game on Astrocade was this one. The three measured outcomes are a play over 90 s, a second
play and coming back (`p_sig`, `p_2nd`, `p_ret`). So the ranker rewards games that turn a stranger into
an Astrocade user. A game that is fun for 90 seconds and then makes the player want "one more" (of this
game or the next card) is exactly what it promotes. Two consequences:

1. The first 90 s are judged on players who know nothing: no tutorial text, no platform habits, often
   on Android web, often from an ad.
2. A natural "again" moment (replay, next level, a new item) inside the first 2 minutes feeds `p_2nd`.

### 1.4 Signals the client sends (training data)

SEEN in the web app's event stream (Kinesis via `edge.astrocade.com`, Amplitude). Whether each one
feeds the ranker is INFERRED, but the ranker can only learn from these:

- Impression with its source and position, and the game before it.
- Gesture counts and types (tap, drag, swipe, hold), time to first gesture, active milliseconds.
- Milestones at 30, 60, 300 and 600 s. `game_play_30s` is also sent to Meta and Google Ads as a conversion.
- FPS p50, p90 and p99 (measured from 5 s after `run`). Load times: context fetch, run, total.
- Swipe away, skip, like, bookmark, comment, follow, share, replay, "not interested" (flag exists).
- `GAME_ERROR` from `console.error`, window errors and rejections. External hosts the game calls.
- Statsig session recording runs for guests at rate 1, so staff can watch real sessions.

There are **no creator tags** on a game. Themes come from the LLM taxonomy (§3). Item-to-item
similarity most likely comes from co-play ("who played A also played B"), not from metadata (INFERRED).

### 1.5 Dedup: what gets a game dropped from curated rows

SEEN drop reasons and counts in one May run: `ip` 41 (brand IP), `creator` 33 (same creator within 3
slots), `bigram` 14 (look-alike titles), `concept_tag` 3, `language_locked` 2, `junk` 1, plus
`remix_family_dedup`. Theme rows hide `minecraft` and `chess`. In the beta row, remixes get ×0.9 and a
second game from the same creator ×0.25. **A brand name or a title that echoes another game costs reach
in the very rows that convert best.**

---

## 2. Winning the first seconds (art direction, UX, UA creative)

Thumbnails are Larisha's job. This section is guidance only. We never generate, propose or set one.

### 2.1 What the player sees, in order

1. **The card.** On the mobile web game page and in the feed, the cover sits as a card with a Play
   button. Behind it the game already runs, dimmed and muted (SEEN). The feed preview runs the real game.
2. **The first tap.** A tap inside the running preview counts as a play (`game_promoted`, SEEN). Tapping
   Play only unmutes (250 ms fade); the game is not restarted.
3. **The first 5 seconds.** Top games reach the first interaction in under 5 s (SEEN benchmark: 58% of
   sessions under 5 s). Platform target CTR is 40% of impressions.

### 2.2 Cover guidance (from the 24 fastest covers, 25 Nov)

- Title in huge, thick, outlined letters in the top 25 to 30%, often on 2 lines, with a short ribbon.
- One hero object or character in the centre, mid-action. Show the verb (smash, stretch, pour).
- Bright, saturated, high contrast. None of the top 24 had a dark cover.
- Promise variety with a small grid of items when the game has many ("20+ weapons").
- An "UPDATE" or "NEW" badge on a cover after a big update (the top game uses one).
- An animated cover is possible on the web card: a URL ending `.gif` animates; a `.webp` animates
  only outside `/assets/images/`. It moves only after the player rests on the card for 500 ms, so the
  first frame must work alone. 1 of 63 feed covers today is a GIF ("Dress To Impress"); a moving cover
  stands out. Upload route and limits: `production/market/2026-11-25T1244/bedah-backend.md` §1.
- New in today's sample: 47% of the fastest quarter use a cover uploaded by the creator, against 15% of
  the rest (SEEN in `feed-stats.json`, 63 games, small sample). A hand-made cover correlates with speed.
  It is not proven to cause it.

### 2.3 Title

- **Short.** The fastest quarter of today's feed has a median title of 14 characters, the rest 19.
  Examples: "Color Quest", "Robo-Crash", "Gym Giants", "Zoo Zen", "+1 Fish".
- **Verb or promise first, in plain English.** The feed filters by device language but most games are
  English; a 2 to 3 word English title reads in every market.
- **No brand words** (IP dedup, review risk) and **no echo** of a big game's title (bigram dedup).
  Signal the family with a pattern ("+1", "Steal a", "Smash") rather than a name.
- Title and description saved with `save_draft` show on the public game at once, without a publish
  (SEEN, MCP tool text). So titles can be tested without using publish quota. Change one thing at a
  time and give it at least a day of traffic.

### 2.4 The cover-to-gameplay promise

The live preview is the real "moving thumbnail". Its first 1 to 2 seconds must match the cover: the
same hero, the same action, readable with no sound. A cover that promises more than the game shows
raises CTR but lowers p50. The ranker weighs p50 five times more than CTR, so a misleading cover loses
twice.

---

## 3. Tags, category and description (ASO)

### 3.1 How a game gets its category

Creators set no tags. A taxonomy job (`game_taxonomy`, up to 40 parallel LLM calls) puts each game in
themes from a fixed list (SEEN `theme-taxonomy.json`): action, adventure, arcade, cooking, farm, horror,
meme, platformer, puzzle, rhythm, simulation, sports, survival, tactics, zen, incremental, creative,
chess, educational, merge, chat, toys, minecraft. The input the LLM reads is UNKNOWN. Our past evidence
says the platform AI reads the game code (lesson 10), so the inputs are most likely the title, the
description and the code (INFERRED).

**Design to land in the row you want.** The definitions are strict. Two examples:

- **toys**: "no winning or losing, no fail state, no levels, no currency or upgrade shops, no
  leaderboards ... if the game presents a score to beat, a leaderboard, levels to clear, or any way to
  fail or win, it is NOT toys." Smash/destroy and coloring sandboxes fit here. Adding a leaderboard
  moves the game out of Toys.
- **zen**: "without competition, combat or time pressure". **creative**: self-expression (draw, paint,
  decorate). **incremental**: "number goes up".

Pick the target theme in the plan (CLAUDE.md "Plan Before Building"), then make the title, description
and mechanics all say it. A game that sits between themes gets a weaker or wrong row.

**Since 26 Nov the taxonomy job fills 14 fields, not only themes** (SEEN config `2545188187`): themes,
genre, art_style, setting, tone, difficulty, main_activity, progression, loop_length, learning_curve,
primary_control, secondary_control, perspective and **polish_level**. polish_level is `low`, `standard`,
`high` or `exceptional`; the definition gives `high` only for "clear extra touches: tutorials, particle
effects, satisfying audio feedback, smooth animations". How the ranker uses these fields is UNKNOWN; the
dedup reason `concept_tag` and the theme rows show some of it is used (INFERRED). Our Game Quality
Standard plus an FTUE is exactly what earns `high`. `learning_curve: instant` ("self-evident in seconds,
no instruction needed") matches the day-0 stranger cohort the gallery is scored on.

### 3.2 Description

- One or two sentences, about 120 to 150 characters (today's feed median: 128 for the fastest quarter,
  154 for the rest).
- Lead with a chain of short verbs that is the core loop: "Knead, roll, fry & fill! ..." and
  "Pour glue, add activator, stir, pick your colour ...". It tells the player and the taxonomy LLM
  what the game is.
- Make it unique. Players' Choice drops near-duplicate descriptions (`dedup-description`). Never reuse
  a sibling game's description.
- No brand names, no workflow words, nothing about how the game was made (§7.1).

### 3.3 Language

The share UI ships 12 languages (en ar fr es vi id hi pt th fa ru tr). The feed filters by device
language once there are enough games, with English as the fallback (SEEN). Our rule stays: in-game
text in 7 languages from day one, with 2 to 4 word commands per action. Listing title stays English.

---

## 4. Publish timing and update cadence (live-ops)

### 4.1 Launch

- **Launch only a build that passes the 40-second gate in our own timeline test.** The first 200 plays
  are a single test that cannot be repeated. A dead game stops getting served.
- The 30-day window (play boost, update boost) starts at first publish. Have 2 or 3 updates ready
  before launch, so the boosts are used while they exist.
- At most 2 new games per day (quota). Do not release two games of the same family on the same day:
  the same creator within 3 slots is dropped, and they compete for the same neighbours.
- Time of day: UNKNOWN from config. Review takes hours to days and cold-start runs for about a day, so
  timing the minute of publish has little effect. Publish after checks, not on a clock (INFERRED).

### 4.2 Updates

- The update boost halves every 3 days and applies only to games up to 30 days old. **A meaningful
  update every 3 days during a game's first month** keeps it near the top of the boost.
- "Meaningful" means the player can notice it: new levels, new items, a new mode. An update also has
  to pass review before it is live; proof that it is live is `servedVersionId` (lesson 11).
- After 30 days, updates bring no boost. Then spend the effort on a sequel or a new game in the same
  family, and update the old game only for retention (daily reasons to come back).
- Note: `lastUpdatedAt` in today's feed is almost "now" for every game, so it is not a content-update
  date. Do not read update cadence of other games from it.

### 4.3 Series over one-offs

A sequel of our own winner got 71% of the original's traffic (Splash Master #2). Release the sequel
while the first game still grows, from the same kit, with a different mechanic so it is not a
duplicate.

---

## 5. Remix and virality loops (growth, community)

### 5.1 Sharing

- `lib.share({image, title, description, text})` opens the host share sheet with our own image (SEEN,
  undocumented). The image can be a canvas; text is cut to 60/120/140 characters. At most 10 per minute,
  only in play mode. Without `image` (or when the host cannot upload it) the share card shows the game's
  current `thumbnailUrl` at size "large" (SEEN in the `ShareDrawer` chunk, 2026-11-26). House rule: pass no
  image, so the card always follows the owner's latest thumbnail. Indonesia's share order is WhatsApp, Instagram, Telegram, Messenger, Twitter.
- Put a share button at the peak moment: a finished creation, a new best, a rare unlock. Share rates
  of top games: 24 to 39 per 1,000 plays. The feed median today is about 5 per 1,000.
- Leaderboard modal: "Challenge your friends to beat your score!" with the score drawn into the
  thumbnail (`share-to-compete-dynamic-thumbnail`, SEEN live for all users). It needs a game that
  submits a meaningful best score. Remember the trade-off with the Toys theme (§3.1).
- After 30 s of play, tapping Replay shows a share prompt once per game. A natural end-and-replay
  point after 30 s triggers it.
- Share links carry who shared and from where (`sharedByCreator`, `sharedByPlayer`). A creator share
  is tracked separately. Referral codes exist.

### 5.2 Remix

- Of 63 games in today's feed, the fastest quarter has 33% remixes, the rest 67%. Remixing a winner
  gets a game started but does not make it a top game (SEEN numbers, INFERRED meaning).
- Remix families are deduped in curated rows, and remixes get ×0.9 in the beta row.
- Allowing remixes of our games (`disableRemix: false`) spreads our mechanic. Each remix is another
  creator's game, in our remix family, linked back by `baseGameId`. Whether the base game gains traffic
  from its remixes is UNKNOWN. Default: allow remixes on games past 10K plays (they gained their own
  boost), keep them off during the launch window (INFERRED).

### 5.3 Social surface

Likes (feed median about 15 per 1,000 plays), comments (about 0.4 per 1,000) and follows are logged.
Their weight in ranking is UNKNOWN. `hide_play_count: true` hides play counts from guests, so social
proof comes from likes, shares and comments, not from a big number. Reply to comments on our games
about the game only (§7.1).

---

## 6. Cohorts the algorithm favours (UA, data science)

| Cohort | Evidence | What to do |
|---|---|---|
| Brand-new users on day 0, non-iOS, first play | The gallery is scored on this cohort (SEEN) | Zero-text start, instant toy, under 5 s to first gesture, Android web performance |
| Ad-acquired users | Meta ad sets land on community games; "Shorts" are made for them (SEEN) | Same as above; the preview must sell with no sound |
| Kids and families | Coloring (Color Quest 54K/day), tracing, slime, Zoo Zen in today's top quarter | Bright, safe, no fail state, big touch targets |
| Smash and destroy fans | Smash Everything, Robo-Crash, Crash Bot Lab, Kaiju City (SEEN traffic) | Physics toys with debris and big numbers |
| DIY, ASMR, beauty | Astro Slime Studio 52K/day, Lip Art, Nail Art | Multi-gesture recipe, reveal, gallery of results |
| Indonesian, Indian, SEA phone users | Share order per country, 12 UI languages, `user-country` header | 7-language text, WhatsApp-first share, light builds |
| Mobile web | Haptics, motion, camera and mic are off on web (SEEN) | Visual and audio feedback first; never mark a capability `required` |

---

## 7. Risks that can get a game penalized (QA, trust and safety)

### 7.1 What goes to Astrocade (standing rule)

Everything uploaded to Astrocade talks only about the game: files, comments in code, title,
description, wishes, chat with the Astrocade agent, comments and replies. Never mention our workflow,
repo, rules, agents, tools or process. The platform AI reads the code to classify games (lesson 10),
and staff can watch sessions. Build the upload set with `tools/astrocade-upload-set.sh` (it fails on
workflow words). Never upload README dev notes, test scripts or research.

### 7.2 Penalty table

| Risk | What happens | Evidence | Avoid it by |
|---|---|---|---|
| Median under 40 s at 200 plays | Marked dead, served no more | SEEN | Timeline test before publish; rewards at 10, 20, 30, 40 s |
| Zero-interaction sessions | Not counted | SEEN | Touch listeners must not call `stopPropagation` before `document` |
| Brand IP (Minecraft, Pokémon, Barbie...) | Dropped from curated rows; Minecraft rows hidden; review risk | SEEN | Use genres and mechanics, never names |
| Look-alike titles or descriptions | `bigram` and `dedup-description` drops | SEEN | Unique title and description per game |
| Two similar games close together | `creator` dedup, ×0.25 for the second in beta | SEEN | Space releases, vary families |
| On-demand review | Config with 5% trigger ratios at 24 h and 48 h for games over 1,000 plays, in shadow mode now | SEEN values, meaning INFERRED (likely reports or negative signals over plays) | Nothing that invites reports: no gore, no bait covers, no broken builds |
| Verdict enforcement | Review verdicts enforced since 2026-09-09; `retire` route in the review pipeline | SEEN | Pass review the first time; test on a phone |
| Account tiers | `free`, `internal`, `shadowbanned` (shadowbanned gets no edit budget) | SEEN | Stay within rules and quotas |
| Demonetized | `isDemonetized` status on Earn | SEEN | Same |
| `console.error` on normal paths | Reported as `GAME_ERROR` | SEEN | Use `console.warn` for expected states |
| Low FPS | FPS is measured and shown to creators (Optimal 40+) | SEEN | 60 FPS target, adaptive quality |
| `capabilities.needs: required` | Web players get a "download the app" wall | SEEN | Always optional |
| External network requests | Reported to the host (`GAME_EXTERNAL_REQUESTS`) | SEEN | Vendor everything; no requests while running |
| Writing to the host config object | Crash on the real host, not in the emulator | Lesson 52 | Copy config with `mergeCfg` |
| Bait cover | CTR up, p50 down | INFERRED from the score weights | Cover shows what the first 2 s show |

---

## 8. What you don't know you don't know (the whole team)

Non-obvious levers, each with its evidence level.

1. **The ranker grades you on strangers.** The gallery score uses day-0 users whose first Astrocade game
   was yours (SEEN cohort). Your fans and repeat players do not move that score. Design for someone who
   has never seen the platform.
2. **A "second play" is a scored outcome.** `p_2nd` (prior 53%) is in the score (SEEN). A Replay or
   Next button that appears at the high point, before boredom, feeds it.
3. **A tap in the muted preview is a counted play.** The first frame must invite a tap and react to it
   with something visible (SEEN).
4. **Your theme is decided by an LLM reading your game.** Wording in the title and description, and
   mechanics like a leaderboard or a fail state, move you between rows such as Toys and Arcade (SEEN
   definitions). Choose the row on purpose.
5. **A leaderboard is a trade-off.** It unlocks the challenge-share loop, but it disqualifies Toys
   (SEEN). Toys and creative games can still use `lib.share` with an image of the result.
6. **Updates only pay in the first 30 days.** After that the update boost is zero (SEEN `max_age_days 30`).
   Plan content drops before launch.
7. **The boost peaks at 5,000 plays.** Between 0 and 5,000 the multiplier rises to ×1.2, then fades to
   ×1.0 at 10,000 (SEEN). Retention fixes are worth most before 5,000.
8. **Search is closed below 500 plays** (SEEN). A searchable title only pays after that, so the early
   title is for the card, not for search.
9. **The listing text is live without a publish.** Title and description changes through `save_draft`
   show at once (SEEN tool text). That is free A/B testing, one change per day.
10. **Covers can move, but only from the user upload host.** A `.gif` cover animates on the web card
    once the player rests on it (SEEN). Almost nobody does it (1 of 63 today).
11. **Play counts are hidden from guests** (`hide_play_count`, SEEN). Social proof on the card is the
    cover and title only. Likes and shares are what other players see.
12. **The `game_play_30s` event is an ad conversion.** Games that convert ad clicks into 30-second plays
    help Astrocade's paid acquisition (SEEN event sent to Meta and Google). Ad sets point at such games,
    which then get paid traffic (SEEN `adsets`). We cannot apply for that, but it is the same metric.
13. **Your own release cadence can hurt you.** Same-creator games within 3 slots are deduped, and in the
    beta row the second game gets ×0.25 (SEEN). Two near-identical launches split one audience.
14. **Staff watch sessions.** Statsig session recording is on for guests (SEEN). A curator can see a
    broken first minute.
15. **Creator pay counts significant plays (over 30 s)**, $0.10 per 1,000 × 4 early bonus, after 100K
    lifetime significant plays (SEEN, 24 Nov). The 30 s design target is also the money target.
16. **Haptics do nothing on web** (SEEN). If the "feel" relies on vibration, most players never feel it.
17. **The feed language filter switches on with enough games per language** (SEEN `min_games_for_language_filter 50`).
    An Indonesian or Hindi player may see a small local pool where a localized game stands out (INFERRED).
18. **Contests and jams have their own rows.** "Game Competitions every other week" give "a week in the
    spotlight" (SEEN text). Entering is a distribution channel, not only a prize.
19. **Time to first interaction is a creator-facing metric.** Top games are under 5 s (SEEN). A
    loading screen or a start menu spends it.
20. **Unknowns that would change the plan if learned:** the GBDT features and labels, how cold-start
    games are picked, the inputs to the taxonomy LLM, the weight of likes and comments, whether
    remixes send traffic to their base game, the review-on-demand trigger metric. Each needs logged-in
    data or a controlled test of our own.

---

## 9. How to measure (data science)

- Per game, from creator analytics on astrocade.com (Larisha's account): significant-play share,
  median session, FPS band, TTFI, CTR, daily plays. Compare with: p50 ≥ 40 s, significant ≥ 80%,
  FPS 40+, TTFI < 5 s, CTR ≥ 40%.
- Platform traffic: `node tools/market-check.js` (astrotopper 7-day gain as the daily-plays proxy,
  plus guest feed rows and flags). Name the source and date in every concept.
- Before launch, our own timeline test: no result card, menu or loss before second 60; a reward at
  about 10, 20, 30 and 40 s; the first gesture possible in under 1 s.

---

## 10. Pre-publish checklist

Run it before every publish or republish. Every line must be a yes.

1. Does the game's first 40 s pass our timeline test (reward at 10/20/30/40 s, no end or menu before 60 s)?
2. Can the player act within 1 s of the first frame, with no text and no sound, and does the first tap
   in the preview do something visible?
3. Do all touch handlers let events reach `document` (no early `stopPropagation`)?
4. Does it hold 40+ FPS (target 60) on a mobile-sized viewport, with the evidence screenshot retained?
5. Is there a natural replay or next moment within 2 minutes, and a share moment at the peak?
6. Is the target theme row chosen, and do mechanics, title and description all match its definition?
7. Is the title short (about 2 to 3 words), free of brand names and unlike any big game's title?
8. Is the description 120 to 150 characters, verb-led, unique, and free of brand and workflow words?
9. Did the upload set come from `tools/astrocade-upload-set.sh` with no failures, and do all wishes and
   comments talk only about the game?
10. Are all capabilities optional, no external requests made, and `console.error` used only for real errors?
11. Is it the only game of its family we release today, and within the 2-per-day quota?
12. Are 2 or 3 updates planned for days 3, 6 and 9 after launch?
13. Has Larisha's thumbnail been set by her (we never make or set it), and do the preview's first 2 s
    match it?
14. After publish: report "sent, waiting for review", and confirm live only by `servedVersionId`.
15. Does the game give a reason to come back tomorrow and a path to a 5-minute session (§11.2)? Without
    both it can pass the gate but will not reach Players' Choice.
16. Is the target theme row one we can lead (§11.3), and does the polish match `polish_level: high`?

---

## 11. Deep dig, 26 Nov: rows, Players' Choice, the contest

Source: `production/market/2026-11-26T1700-deep-dig/` (guest, read-only, about one request per second).
Every home row was read to its end with `tools/row-crawl.js`: 24 rows, 1,800 unique games.

### 11.1 The home page, row by row (SEEN)

| Order | Row | Size | How it is filled |
|---|---|---|---|
| 1 | Recommended For You (`recommended_for_you`, large cards) | 30 | `stochastic_v0_quality` pool; median 4.3K plays/day |
| 2 | Discover More (`trending`) | 30 | Same pool type; median 5.2K plays/day |
| 3 | Players' Choice (`top_picks`) | 21 to 23 per visitor | `top_picks_score`, §11.2; median 15K plays/day |
| 4+ | Theme rows, repeating while the visitor scrolls | up to about 100 each | GBDT ranker, Gumbel 0.05, 25% cold-game insert after the first card |

- The guest home sends `user-country`, `user-day-n`, device language and connection type with every feed
  call. Changing the country from US to ID changed nothing for guests: 100% the same games in rows 1 to 3.
  Personalisation comes from history and the first-visit tags, not from country (INFERRED).
- Row ids that answer empty today: `featured`, `beta`, `new`, `local_multiplayer`, `because_you_played`,
  `chess`, `minecraft`. They need a logged-in history or are switched off.
- The row title "Players' Choice" is itself an experiment (`players-choice-label-web`: "Most Played" or
  "Popular").

### 11.2 Players' Choice, exactly (SEEN config, our sampling)

Config (`3478718458`, today): `min_plays 50000`, `pool_size 60`, `min_pool_size 20`,
`selection_temperature 0.25`, `deep_spr_threshold_sec 300`, and

`score = 15 × retention + 10 × (share of sessions over 300 s) + 0.033 × p50 seconds + 0.01 × p75 seconds`

then near-duplicate descriptions are removed and `manually_added` / `manually_removed` lists apply
(both empty today, so no hand-picking now).

What that means in numbers (INFERRED arithmetic): +30 s of median session (+1.0) is worth the same as
+6.7 points of retention or +10 points of 5-minute sessions. A game with p50 90 s, p75 200 s, 25%
returning and 20% past 5 minutes scores 3.0 + 2.0 + 3.75 + 2.0 = 10.75. All four terms matter about
equally, so a fast, shallow game cannot buy its way in with p50 alone.

What we observed (10 samples from fresh guests, 16:59 to 17:11 UTC):

- 34 different games in total. 23 appeared in 9 or 10 samples. The first sample had 11 games that never
  came back, and the next 9 had 13 new ones: **the pool was re-drawn between 17:00 and 17:09**. Past
  snapshots (18, 20, 24, 25 Nov) show the same churn. A game moves in and out of the pool many times a
  day; it does not "win a slot" once (SEEN churn, cadence UNKNOWN beyond "at least within 10 minutes").
- **Plays per day do not decide it.** "Slap and steal a car" (49K/day) and "Natural Disaster Survival"
  (27K/day) dropped out in the re-draw while "Mega Fun Obby" (5K/day) and "Tame a Dragon" (6.6K/day)
  came in. Age does not decide it either: "Era.io" is 175 days old.
- Pool members against the 1,779 other games in rows (medians): likes 18.5 vs 15.3 per 1,000 plays;
  shares 7.3 vs 4.8 per 1,000; remixes 14% vs 45%; creator-uploaded cover 43% vs 9%; leaderboard 67% vs
  55%; owner's lifetime plays 3.2M vs 0.6M; age 18 days.
- Genres in the pool: steal / heist / "+1" growth (Steal an Egg, Steal a Lucky Block, Mecha Arm +1,
  +1 rail for millions), tycoon and factory sims (Frost Harbor, Frozen Fish Grill, Meat Masters),
  physics destruction (Demolition Derpy, Smash Everything!), transformation and hero power fantasies
  (Titan Transformer, Ben 10, Astro Boy), animal care (Zoo Zen, Throw Food for Animals, Tame a Dragon).
  Almost all have an upgrade or collection loop that pays off after 5 minutes and a reason to come back.
- The diversity config gives top creators their own route: `top_creator_min_p50 60`,
  `max_top_creator_candidates 20` (SEEN; meaning INFERRED: a proven creator with p50 ≥ 60 s gets
  candidates considered more readily).

### 11.3 Theme rows: where we can lead (SEEN sizes, INFERRED strategy)

Rows hold about 100 games when the theme is crowded. Smaller rows mean each game gets a bigger share of
the row's impressions:

| Row | Games | Median plays/day in row | Note |
|---|---|---|---|
| Rhythm | 17 | 1,838 | Least crowded, highest median. The tag id is `tempo` |
| Educational | 46 | 786 | |
| Chat | 55 | 749 | LLM characters |
| Meme | 56 | 388 | |
| Farm | 59 | 332 | Includes "farming reskinned as other themes" |
| Toys | 63 | 320 | No score, levels, fail state or shop (§3.1) |
| Merge | 70 | 270 | |
| Simulation, Incremental, Creative, Puzzle, Action, Arcade... | 93 to 99 | 77 to 1,078 | Crowded |

**Each game shows in exactly one theme row** (SEEN: of 1,800 games, 1,719 sit in one theme row and 81
only in rows 1 to 3; none in two). The taxonomy may give a game several themes, but the gallery files it
under one. A game that fits a small row cleanly (title, description and mechanics all say it) competes
with 17 to 60 others instead of 100.

### 11.4 Our games in rows today (26 Nov, guest view)

| Game | Plays | Plays/day | Rows | Next step |
|---|---|---|---|---|
| Rub It Away | 73,924 | 6.5K | Recommended For You #11 | Past the 50K floor but not in the pool: add a daily return reason and a 5-minute goal now, while the update boost lasts |
| Tiptoe & Hatch | 86,567 | 1.5K | Adventure | Past the floor; past 30 days, so no update boost: retention only |
| Reel & Hatch | 37,173 | 2.0K | Farm #14 | About 6 days to 50K at this pace |
| Martabak Master | 44,783 | 0.7K | Zen | Close to 50K; retention work decides it |
| Draw It Alive | 19,487 | 3.1K | Puzzle | Weak likes (7.7/1K) and shares (1.2/1K) against the pool's 18.5 and 7.3 |
| Soap Carving | 13,037 | 3.0K | Creative | Strong shares (32/1K); low likes |
| Ice Cream Roll Art | 1,031 | 0.3K | Cooking | Too early |

### 11.5 The $100K Creator Contest (SEEN pages, 26 Nov)

- Pages: `astrocade.com/contests/100k-creator-contest-2026`, its `/rules` (updated 25 Nov) and the blog
  post `astrocade.com/blog/100k-creator-competition` (updated 21 Nov).
- Format: about 25 creators, chosen by Astrocade. Applications 5 to 20 Nov; selected creators announced
  25 Nov; contest 30 Nov to 20 Dec; plays and views keep counting until 27 Dec. Prizes $50K, $20K, $15K,
  $7.5K, $7.5K.
- Score: one point per validated play of a new, original game made during the contest, plus one point
  per qualified view of the creator's contest videos on TikTok, Instagram, YouTube or X. At least 3
  videos a week. Plays from Astrocade's own featuring and recommendation count. Remixes do not.
- Selection (rules §7.1 and the blog): sole discretion; may use automated screening, ranking, the
  pitch, the public social media presence, a live video interview and a background check. Factors:
  creativity, audience, content style, communication, reliability, availability and the mix of
  contestants. Astrocade may also invite people directly. "Your pitch matters most."
- **The list of the 25 is not public in any source we can read.** It is on no Astrocade page, API or
  config, and no press article names them. The announcement was most likely made on X or Discord, which
  this environment cannot read. Contestants must keep their selection confidential until Astrocade
  announces it (rules §7.7). From 30 Nov, contest games must be "identified as a Contest playable", so
  they should become visible in the feed and can be listed then.
- What it tells us about the platform (INFERRED): Astrocade wants "playable content" that travels on
  short-form video: jokes, trends, hot takes, quizzes, things to send a friend. It pays for off-platform
  reach that brings new players, which is the same day-0 cohort the gallery is scored on. A share-led
  game with a clip-worthy moment fits both the contest's goal and the ranker.

### 11.6 Strategy, ranked (whole team)

1. **Pass the 40 s gate and win day-0 strangers** (§1.2, §1.3). PROVEN by config. Without it nothing else
   is reached.
2. **Design for the Players' Choice formula from the plan stage**: a reason to return tomorrow (daily
   reward, growing collection, saved progress) and a loop that still pays at minute 5 (upgrades, a tycoon
   layer, a new area). PROVEN formula; pool behaviour SEEN.
3. **Reach 50K plays inside the first 30 days**, while the play boost (peak at 5K) and the update boost
   (half-life 3 days) still apply. Ship an update every 3 days in that window. PROVEN boosts; the link
   to Players' Choice is INFERRED.
4. **Target a small theme row on purpose** (Rhythm, Educational, Chat, Meme, Farm, Toys) and make the
   title, description and mechanics match its definition. SEEN row sizes; benefit INFERRED.
5. **Make sharing part of the peak moment**. Pool members are shared 1.5 times as often per play. Shares
   bring new players, the cohort that is scored. Correlation SEEN; cause INFERRED.
6. **Compound as a creator**: a series in one family, a high polish level, a hand-made cover (Larisha's
   job). Pool owners have a median 3.2M lifetime plays and the config has a top-creator route. SEEN
   correlation and config; effect INFERRED.
