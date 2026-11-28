# Account traffic check, 28 Nov 2026 06:50 UTC

Asked by Larisha: check my account traffic. Read only: nothing on Astrocade was changed.

## Sources

| What | Source | Read at (UTC) | Kind |
|---|---|---|---|
| Lifetime plays, review status, draft flag, all 60 games | Astrocade MCP `list_my_games`: `my-games.json` | 28 Nov 06:50 | read directly |
| Daily plays per game and account, likes, p50/p75, CTR, TTFI | Studio > Analytics in the owner's Chrome, `/v3/analytics`: `analytics-daily.txt` | 28 Nov 06:55 | read directly |
| Home rows, all 24, US guest, seed 12345 | `node tools/row-crawl.js`: `rows-2026-11-28.json` | 28 Nov 06:52 | read directly |
| Players' Choice, 60 draws, fresh guest and random seed each | `pc-seeds.js`: `pc-60-draws.json` | 28 Nov 06:50 | read directly |
| Baselines | `../2026-11-27T0800-account-health/now.json` (27 Nov 07:46), `../2026-11-25T1648-account-audit/my-games.json` (25 Nov 16:48) | | read directly |
| Players' Choice score before retention | formula from the 26 Nov deep dig applied to 7-day analytics | | estimate |

## Account

- Lifetime plays: **1,596,308** (57 public games, 3 private drafts).
- Since 27 Nov 07:46: **+79,406 in 23.1 h**, about 82.6K per day.
- 25 Nov 16:48 to 27 Nov 07:46: +67,747 in 39 h, about 41.7K per day. The daily rate doubled.
- Daily plays from analytics: 24 Nov 16,427; 25 Nov 14,618; 26 Nov 50,364; **27 Nov 75,958** (the best day in the
  30-day window; the earlier peak was 25,836 on 30 Oct). 28 Nov so far 17,313 (partial).
- 27 Nov: 60,122 of 75,958 plays were significant (over 30 s), 79%.
- Three games made 88% of 27 Nov: Draw It Alive 29,812, Soap Carving 24,571, Rub It Away 12,419.

## Top 10 by plays per day (27 Nov, full day)

| # | Game | 25 Nov | 26 Nov | 27 Nov | 28 Nov partial | Lifetime |
|---|---|---|---|---|---|---|
| 1 | Draw It Alive | 1,818 | 18,367 | 29,812 | 7,982 | 61,178 |
| 2 | Soap Carving | 289 | 15,223 | 24,571 | 4,270 | 44,562 |
| 3 | Rub It Away | 8,411 | 11,371 | 12,419 | 2,652 | 91,814 |
| 4 | Ice Cream Roll Art | 232 | 515 | 1,762 | 288 | 3,111 |
| 5 | Paws & Chaos | 37 | 815 | 1,239 | 333 | 2,542 |
| 6 | Reel & Hatch | 1,131 | 589 | 829 | 440 | 38,575 |
| 7 | Splash Master #1 | 282 | 407 | 648 | 201 | 218,750 |
| 8 | Cozy Room Designer | 313 | 439 | 627 | 136 | 34,295 |
| 9 | NEKO ZOOMIES | 62 | 430 | 598 | 166 | 1,251 |
| 10 | Grab and Park | 460 | 480 | 597 | 141 | 26,294 |

Risers, 26 to 27 Nov: Draw It Alive +11,445, Soap Carving +9,348, Ice Cream Roll Art +1,247 (3.4 times),
Rub It Away +1,048, Paws & Chaos +424, Pin & Bloom +251 (242 to 493), Reel & Hatch +240.

Fallers: only Hero Bridge Royale (189 to 53, the 26 Nov bump was a one-off) and the new launches, which never
started: Meteor Gems 49 per day, Mega Hammer Royale 36, +1 Mega Hammer 27, Voxel Wonderland 25, Snip It 52.

At the same hour yesterday (27 Nov 07:50 partials, from the account-health report) the small games were lower:
Paws 235 then, 333 now; Ice Cream 211 then, 288 now; Reel 173 then, 440 now; NEKO 110 then, 166 now. There is
no same-hour figure for the three big games, so whether 28 Nov beats 27 Nov is not known yet.

## The 27 Nov publishes

All ten (Draw It Alive, Soap Carving, Reel & Hatch, Pin & Bloom, Paws & Chaos, NEKO ZOOMIES, Ice Cream Roll Art,
Grab and Park, +1 Mega Hammer, Voxel Wonderland) show `approved` and `unpublished_edits: false`. For Draw It Alive
`list_versions` shows the 27 Nov 07:42 save as `is_published: true`. No game on the account is pending review or
rejected. Meteor Gems and Mega Hammer Royale are now public and approved too.

Traffic after the publish, 26 Nov to 27 Nov: Ice Cream 515 to 1,762, Paws 815 to 1,239, NEKO 430 to 598,
Pin & Bloom 242 to 493, Reel 589 to 829, Grab 480 to 597. +1 Mega Hammer and Voxel Wonderland did not move.
Caution: old games that got no update rose 40 to 60% the same day (Splash Master #1 407 to 648, Cozy Room 439 to
627), which fits visitors of Draw It Alive and Soap Carving browsing the profile. So part of the lift is
spillover, and only Ice Cream's jump is clearly larger than that.

## Rows and Players' Choice

- Players' Choice: **none of the account's games** in 60 draws (106 different games seen, 19 to 28 per draw).
- Recommended, Trending, Top Picks (guest): none.
- Theme rows: Reel & Hatch farm #16 (was #18), Ice Cream Roll Art cooking #40 (was #28), Rub It Away puzzle #59
  (was #31), Tiptoe & Hatch incremental #63 (was adventure #81).
- Draw It Alive and Soap Carving are in no guest row at all, yet make 54K plays a day. Their traffic comes from a
  surface a guest crawl cannot see (the play feed or logged-in rows). Which one is unknown.

Players' Choice score before the hidden retention term (10 x share over 5 min + 0.033 x p50 + 0.01 x p75), 7-day data:

| Game | Plays | p50 / p75 s | Over 5 min | TTFI s | CTR 7 d | Score before retention |
|---|---|---|---|---|---|---|
| Draw It Alive | 61,178 (past the 50K floor) | 90 / 195 | 13.4% | 2.8 | 61%, daily 68 to 56 | 6.3 |
| Rub It Away | 91,814 (past the floor) | 91 / 182 | 11.0% | 1.9 | 55% | 5.9 |
| Soap Carving | 44,562 (passes 50K today) | 75 / 146 | 7.7% | 7.5 | 64% | 4.7 |
| Reel & Hatch (27 Nov, 30 d) | 38,575 | 119 / 301 | 22.9% | 5.7 | 37% | 9.2 |

## Actions, ranked by expected plays

1. **Soap Carving: cut time to first interaction.** Median 7.5 s against 1.9 to 2.8 s for the other two leaders,
   on a game doing 24.6K a day. The 7-day figure mixes builds from before and after the 27 and 28 Nov updates, so
   first check the 28 Nov figure alone; if it is still over 4 s, make the first carve possible at once. Bundle it
   with longer sessions (7.7% past 5 min is the weakest of the three) in one publish.
2. **Draw It Alive: more levels and a reason to stay past 5 minutes, within 3 days.** It is the account's biggest
   game (29.8K a day) and already past the Players' Choice floor, but its score (6.3) is far under Reel & Hatch
   (9.2). CTR fell from 68% to 56% as the audience widened, which is normal but worth watching.
3. **Rub It Away: ship the planned Snow World update.** Stable at 12.4K a day but it dropped from #31 to #59 in the
   puzzle row, and its 30-day window ends about 15 Dec.
4. **Ice Cream Roll Art, Paws & Chaos, NEKO ZOOMIES: one more fix round while they are still rising.** Ice Cream
   tripled in a day and had a Players' Choice score of 8.3 on 27 Nov; fixes land best while a game is young.
5. **Do not publish Wonder Sprout and Snowy Snapshot in the same minute.** +1 Mega Hammer and Voxel Wonderland went
   out one minute apart on 26 Nov and both stayed under 40 plays a day. The cause is inferred, not proven, so
   spacing the two publishes by a few hours costs nothing and removes the risk.

Not checked: where Draw It Alive and Soap Carving traffic comes from, retention (hidden per game), and the
day-bucket time zone of the analytics graph.
