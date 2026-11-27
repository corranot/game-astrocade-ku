# Rub It Away: creator analytics, 26 Nov 2026

Source: Astrocade Studio > Analytics > Rub It Away (Larisha's signed-in Chrome), read 26 Nov 2026
~20:50 UTC; the page said "Last Updated: 3:49 AM" (browser local time). Numbers are copied from the
page and from the JSON the page itself loaded (`/v3/analytics?numDays=7|30&filter=...`). Read only:
nothing was changed. Anything marked INFERRED is our reading, not a shown number.

Screenshots: `01-plays-7d.jpg`, `02-plays-30d.jpg`, `03-duration-30d.jpg`,
`04-duration-benchmark.jpg` (benchmark overlay on).

## 1. Numbers as shown

All time: **75,941 plays** (75.9K), **1,352 likes** (1.4K), **19 comments**, **Shares 0**.
The dashboard's 0 shares conflicts with the public game page (1,269 shares on 25 Nov, account audit),
so the dashboard share counter looks broken (INFERRED).

| Metric | Past 7 days | Past 30 days |
|---|---|---|
| All plays | 51.1K | 76K |
| Significant plays (>30 s) | 41.1K (80%) | 61K (80%) |
| Median play duration (p50) | 95.6 s (1:35) | 95.5 s (1:35) |
| p75 play duration | 187 s | 188 s (3:08) |
| Median time to first interaction | 1.96 s | 2.01 s |
| Click-through rate (avg) | 57.1% | 55.8% |
| Median FPS | Optimal | Optimal |
| 0-interaction play rate | – | 4% |

Daily plays (all / significant), from the page's own data:

| Day | All | Significant |
|---|---|---|
| 11/15 | 1,330 | 1,080 |
| 11/16 | 1,311 | 1,082 |
| 11/17 | 3,457 | 2,884 |
| 11/18 | 13,134 | 10,284 |
| 11/19 | 5,731 | 4,621 |
| 11/20 | 4,498 | 3,618 |
| 11/21 | 4,758 | 3,887 |
| 11/22 | 5,583 | 4,607 |
| 11/23 | 7,405 | 5,983 |
| 11/24 | 9,889 | 7,873 |
| 11/25 | 8,411 | 6,683 |
| 11/26 | 10,521 | 8,402 |

Daily CTR: 54.1% (11/15), 49.1%, 48.0%, 53.8%, 56.8%, 59.3%, 60.1%, 57.6%, 58.5%, 58.2%, 59.0%,
53.2% (11/26).

Play duration distribution (30 days, sessions): 0 s 3,442 · 0-10 s 5,279 · 10-30 s 9,686 ·
30-60 s 10,493 · 1-2 m 18,990 · 2-5 m 22,290 · 5-10 m 8,095 · 10 m+ 1,137 (total 79,412).
The benchmark overlay peaks at 2-5 m; Rub It Away sits above it at 1-2 m and 2-5 m and below it at
5-10 m and 10 m+.

FPS (30 days): 40+ 63,095 · 20-40 6,482 · 0-20 4,391 (85.3% at 40+).
Time to first interaction (30 days): 0-5 s 55,937 (88.0%) · 5-10 s 5,783 · 10-15 s 1,074 ·
15-30 s 620 · 30-60 s 119 · 60 s+ 19.

Not shown on the dashboard: retention / returning players, funnel or level completion, traffic
sources, unique players.

## 2. Against Players' Choice (playbook §11.2)

Formula: `15 × retention + 10 × share of sessions over 300 s + 0.033 × p50 + 0.01 × p75`.

| Term | Rub It Away (30 d) | Points | Reference game in §11.2 |
|---|---|---|---|
| Sessions > 300 s | 11.6% (9,232 / 79,412) | 1.16 | 20% gives 2.0 |
| p50 | 95.5 s | 3.15 | 90 s gives 3.0 |
| p75 | 188 s | 1.88 | 200 s gives 2.0 |
| Retention | not shown | ? | 25% gives 3.75 |
| **Without retention** | | **6.19** | 7.0 |

INFERRED: p50 and p75 already match a pool-grade game. The two gaps are retention (unknown, and worth
the most) and the 5-minute share (11.6% vs about 20%). Matching the reference game's 10.75 needs about
30% retention at today's 5-minute share, or about 25% retention plus a 5-minute share near 20%.

Other bars from the playbook, all passed: p50 ≥ 40 s (95 s), significant ≥ 80% (80%, on the line),
TTFI < 5 s (2.0 s), CTR ≥ 40% (55.8%), likes 17.8 per 1,000 plays (pool median 18.5).

Trend: a one-day spike on 11/18 (13.1K), then a climb from 4.5K (11/20) to 10.5K (11/26). The game is
still rising on its 22 Nov version.

## 3. Biggest gaps (INFERRED)

1. **No reason to come back tomorrow in the live build.** Retention is the largest term and the live
   version has no daily hook. The draft's "today's picture" is that hook, but it is not published.
2. **Sessions stop just short of 5 minutes.** 2-5 m is the biggest bucket (28%); only 11.6% pass 300 s.
   Moving a quarter of the 2-5 m bucket past 300 s would add about 7 points (+0.7 score).
3. **Early exits: 23% of sessions end under 30 s** (0 s, 0-10 s, 10-30 s), about 18.4K sessions.
4. **14.7% of sessions run under 40 FPS** (5.9% under 20). Low-end phones lose time to stutter.

## 4. Recommendations for the update

1. **Publish the draft update soon.** It carries today's picture (daily return reason), the gift every
   10 solves and the new worlds. The game is in its update window and climbing; the retention term only
   moves once players see the hook.
2. **Aim the gift and world-end at minute 5.** A world of 6 levels plus the gift should land just past
   300 s for a median player: show progress toward the next gift on the result screen ("2 more") so the
   2-5 m group plays one or two more levels. Measure the 5-10 m bucket a week after publish.
3. **Make the first 10 seconds pay.** Level 1 should finish with the big fix-up payoff inside about
   10 s, with the FTUE spotlight on the right target, to cut the 23% under-30-second exits.
4. **Adaptive quality for low-end phones.** Drop particle counts and resolution when FPS falls under
   40 for a few seconds, to move part of the 14.7% into the 40+ band.
5. **Check retention after publish.** The dashboard does not show it; compare day-over-day plays from
   returning visitors via "today's picture" collection, if the game can log it, and re-read this page
   on 3 Dec with the same method.
