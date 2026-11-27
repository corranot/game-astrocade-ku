# Next game for Players' Choice: backend dig, 2026-11-27 14:20 to 14:40 UTC

Read-only guest capture of astrocade.com and astrocade-api-prod.com, about one request per second. Nothing was
liked, shared, published or set. Builds on `../2026-11-26T1700-deep-dig/` and playbook §11.
Labels: **SEEN** = in a response or config we captured; **INFERRED** = our reading of SEEN data; **UNKNOWN** = not found.

## Files

| File | What it holds |
|---|---|
| `games-2026-11-27.json` | 1,766 games from every home row (24 rows, `tools/row-crawl.js`, seed 12345): plays, age, likes/shares/comments per 1,000 plays, remix, leaderboard, owner plays, cover, rows, and `gain24` (daily-plays proxy, see below) |
| `players-choice-140-draws.json` | 140 Players' Choice draws, each from a fresh guest with a random seed (14:34 to 14:40), plus each game's share of draws |
| `players-choice-16-fixed-seed.json` | 16 draws from fresh guests with the crawler's fixed seed 12345, 40 s apart (14:22 to 14:33) |
| `pc-history.txt` | Every game seen in Players' Choice in our snapshots since 18 Nov, with its age when first seen |
| `statsig-dynamic-configs-2026-11-27.json` | All 77 Statsig dynamic configs served to a guest today (email templates and a relay key removed) |
| `amplitude-flags-2026-11-27.json` | The 162 Amplitude experiment flag definitions served at `/api/exp-flags/sdk/v2/flags` |
| `players-choice-covers-2026-11-27.jpg` | The 24 most-drawn Players' Choice covers (with draw share) and 8 big games that never appear (OUT) |
| `pc-seeds.js`, `gain-table.py`, `pc-history.py` | The scripts that produced the above |

**Daily plays are not exposed.** Proxy `gain24` = plays now minus plays in an earlier crawl, scaled to 24 h.
Baseline is 26 Nov 17:00 (21 h window) for 678 games, else 27 Nov 07:47 (6.6 h window) for 316 more. The 6.6 h
window overstates very young games (their first hours are their fastest). `perDayAge` = lifetime plays / age is
the fallback for the rest.

## 1. Players' Choice now: what changed since 26 Nov

| Item | 26 Nov | 27 Nov | Label |
|---|---|---|---|
| Config `3478718458` `top_picks` | min_plays 50,000, pool 60, temp 0.25, score 15×retention + 10×share>300 s + 0.033×p50 + 0.01×p75 | **Identical** (all 16 configs saved on 26 Nov are byte-identical) | SEEN |
| Draw size per visitor | 21 to 23 | 18 to 26 (mode 23) | SEEN |
| Who sees what | "pool re-drawn within minutes" | **The draw depends on the seed.** The server gives every home load a random 64-bit seed (`algorithm_metadata.seed` in the next-page token, 4 of 4 loads different). Same seed, fresh guests: identical 20 games in identical order for 11 minutes (16 of 16). Random seeds: a different draw every time | SEEN |
| Pool over hours | | Seed 12345 draws at 07:47, 12:15 and 14:22 share only 9 to 12 of ~21 games: the scored pool itself updates within hours (flag `top-picks-realtime-v2` is in its treatment arm for 95% of devices) | SEEN draws; cause INFERRED |
| How many games can appear | "pool ≤ 60" | **128 distinct games in 140 random-seed draws**, still rising slowly (107 at 60 draws, 123 at 120). 17 games appear in ≥50% of draws, 37 in 10 to 50%, 74 in under 10% | SEEN |

What it means (INFERRED): Players' Choice is not a list you are "in" or "out" of. It is a weighted lottery run
per visitor over 120+ eligible games, weighted by the score. A top-scoring game is in almost every visitor's row
(Parking City 100%, Demolition Derpy 100%, Throw Food for Animals 98%, Zoo Zen 97%); a game just over the line
is in 1 visitor's row out of 140. The goal is a high score, not merely entry. Past 26 Nov "churn" readings were
most likely seed variation plus hourly score updates.

Other backend notes (SEEN, 27 Nov):
- The feed response's `experiment_data` carries `hide_play_count: true` for Players' Choice (play counts hidden on those cards).
- `diversity` block: `spr_groups` with 120 s and 300 s thresholds, 20 candidates each; `num_score_pool 200`;
  `top_creator_min_p50 60`, `max_top_creator_candidates 20`. INFERRED: this is how 120+ games become drawable.
- Flags present now that our 25 Nov capture did not list: `recsys_cold_games_v2` (cold-beam / cold-insert for
  unmeasured games), `feed-not-interested`, `live-thumbnail-experiment`, `publish-requirements`,
  `tier-curation`, `game-preload`. Their segment defaults are `off`; the arm a real user gets is UNKNOWN.
  The 25 Nov file stored only served values for a filtered set, so "new" may mean "newly captured".
- No sign of manual curation: `manually_added` and `manually_removed` are still empty.

## 2. Fastest-moving games today (proxy `gain24`, SEEN)

| Game | gain24 | Age | Plays | Row now |
|---|---|---|---|---|
| 41 Ragdoll Executions | 47.7K | 41 d | 1.77M | Players' Choice (22% of draws) |
| Minecraft Sanbox TNT | 51.4K | 42 d | 985K | Creative |
| Pillar Wars! | 41.2K | 9 d | 249K | Recommended (3%) |
| Burger and Sandwich Runner | 36.7K | 7 d | 84K | Cooking |
| Kaiju City | 30.7K | 11 d | 412K | Discover More (never in PC) |
| Wildfang Park | 29.4K | 8 d | 180K | Action (1%) |
| Ben 10: Ultimate Aliens | 26.7K | 27 d | 569K | Adventure (14%) |
| Ice Cream Rolls Cooking | 25.6K | 9 d | 259K | Cooking (never in PC) |
| Zombies vs Humans with Guns | 24.1K | 17 d | 393K | PC (11%) |
| Sneaky Students Exam Snapshot | 22.7K | 8 d | 160K | Puzzle (never in PC) |
| Throw Food for Animals | 22.2K | 10 d | 161K | PC (98%) |
| Zoo Zen | 21.8K | 5 d | 83K | PC (97%) |

6.6 h-window games (overstated): Indonesia Flight Simulator 64K (1.2 d), Canvas Flow 63K, Who Made That? 52K
(0.8 d), +1 Lazer Break The Wall 48K (1.6 d).

## 3. Fast risers into Players' Choice (SEEN ages, plays from the draws)

| Game | Age now | Plays | Avg plays/day since publish | Share of draws | Loop (from its description) |
|---|---|---|---|---|---|
| **Zoo Zen** | 5.0 d | 83K | 16.7K | **97%** | Stroll a low-poly 3D zoo, photograph animals to complete an album; no fail, no leaderboard |
| Floor is Lava! | 4.2 d | 89K | 21.1K | 19% | Survival obby (owner: 22.7M lifetime plays) |
| Goal for Millions | 7.6 d | 88K | 11.6K | 14% | "+1" growth, voxel |
| Train To Gain | 7.7 d | 82K | 10.6K | 14% | Train, gain, pets |
| Slim to Fit | 7.8 d | 71K | 9.1K | 11% | "+1" body growth |
| FISHMART MASTER | 8.3 d | 74K | 9.0K | 49% | Shop tycoon |
| Titan Transformer | 8.4 d | 187K | 22.3K | 56% | Morph a giant mech into vehicles, roam, storm kingdoms |
| Fly & Steal a Dragon Egg | 8.6 d | 105K | 12.3K | 31% | Steal eggs, dragons |
| Throw Food for Animals | 10.3 d | 161K | 15.6K | 98% | Throw food, discover animals, pets that earn |
| Parking City: Prank Simulator | 11.0 d | 96K | 8.7K | **100%** | Open voxel city, poop/water/fake-spider pranks, NPC reactions, cars, fly as a bird, a dog |
| Mecha Clash | 11.1 d | 98K | 8.8K | 77% | Giant mechs, 3-lane push, shop upgrades |

History (`pc-history.txt`): the youngest first sightings in Players' Choice since 18 Nov are Zoo Zen (4.1 d),
Titan Transformer (6.3 d), Train To Gain (6.8 d), Throw Food for Animals (7.1 d), Goal for Millions (7.3 d),
FISHMART MASTER (7.4 d). Our snapshots are sparse, so true entry may be earlier.

INFERRED rule of thumb: the fastest entrants averaged **9K to 22K plays a day from day 0**, which puts them past
the 50,000 gate on day 3 to 6. After the gate, the share of draws depends on the score, not on traffic:
Parking City (8.7K/day) beats every bigger game; Sort a Cake (188 days old, 57K plays) is drawn 20% of the time.
Zoo Zen's owner has under 1M lifetime plays and 93 followers: a small creator can do it.

## 4. Who converts and who doesn't (SEEN counts, keyword clusters on title + description)

Eligible = in a row today with ≥ 50K plays. "Slots" = expected Players' Choice cards per visitor from that cluster.

| Cluster | Eligible | Of them ever drawn | Conversion | Slots per draw |
|---|---|---|---|---|
| io / multiplayer / arena | 30 | 13 | 43% | 3.5 |
| steal / heist | 37 | 16 | 43% | 4.0 |
| egg / pet / creature | 55 | 20 | 36% | 7.1 |
| smash / destroy / ragdoll | 65 | 20 | 31% | 6.2 |
| hero / transform / fight | 88 | 25 | 28% | 7.0 |
| tycoon / factory / shop | 47 | 13 | 28% | 4.8 |
| minecraft / voxel | 72 | 19 | 26% | 3.3 |
| +1 / grow / train | 61 | 13 | 21% | 3.7 |
| cooking / food | 36 | 7 | 19% | 2.8 |
| obby / lava | 27 | 5 | 19% | 1.4 |
| school / life / dating | 26 | 4 | 15% | 1.4 |
| puzzle / sort / merge | 35 | 2 | **6%** | 0.3 |

Big games that are **never drawn** in 140 draws: Crash Bot Lab 541K, Counter Arena 519K, Squishy Balloon Slime
470K, Color Quest 455K, Gym Masters 424K, Kaiju City 412K, Dress up Showdown 315K, Morph Race 273K, Ice Cream Rolls
259K, Pikachu Cozy Cabin 208K, plus most dress-up, salon, ASMR, cooking-sim and pull-the-pin games.
INFERRED: these have short sessions or weak return (the score's four terms), whatever their traffic. Kaiju City
(pure destruction, no long goal) is out while Titan Transformer (destruction plus a roam-and-conquer goal) is in.

Covers (`players-choice-covers-2026-11-27.jpg`, SEEN): every top-24 cover is a bright 3D render, a huge outlined
title in the top third, a chibi or blocky hero in front doing the core verb, blue sky. No top-24 game looks 2D.

## 5. Gaps: high conversion, low supply (SEEN supply, INFERRED opportunity)

| Niche | Games in rows | In Players' Choice | Reading |
|---|---|---|---|
| Prank sandbox | 4 (Parking City, Prank City, Prank Cola Bar, Door Bell Madness) | Parking City at **100%** | Thinnest supply of any proven niche. Prank City (1.07M plays, a single-screen prank) is not drawn: depth decides |
| Calm photo-collection | 1 real one (Zoo Zen) | Zoo Zen at **97%** at 5 days | One game owns it. Album completion lifts 5-minute sessions; no fail suits a broad audience |
| Giant mech / transform with progression | Titan Transformer, Mecha Clash | 56% and 77% | Proven; but 66 robot/mech/kaiju games compete, and the IP-led ones (Ben 10) take slots |
| Winter / holiday | 150 games | 10 drawn, Frost Harbor 85% | Seasonal now; winter theming helps a concept, it is not a niche by itself |
| Egg / pet collection | 55 eligible, many "Steal an Egg" clones | 20 | Crowded, and the description dedup drops near-clones. Wonder Sprout already covers hatch-and-collect for us |

## 6. Ranked concepts (whole team; speeds INFERRED from the analogues above)

All three are 3D: 0 of the 24 most-drawn games look 2D, and 2D-style categories (puzzle, dress-up, ASMR toys)
convert worst. Genres and mechanics only; settings, characters and names are ours.

### #1 Cozy winter wildlife photo safari (working title "Snowy Snapshot")
Walk a low-poly snowy valley (pine forest, frozen lake, aurora night), photograph 40+ cute animals in funny
poses to fill an album; album milestones open new areas (ice caves, hot springs, a northern-lights ridge);
rare and night-only animals plus a daily "rare visitor" give a reason to return tomorrow. No fail, one-finger
walk and a big shutter button.
- Evidence: Zoo Zen, the fastest entrant on record (first seen at 4.1 d, now 97% of draws) with almost no
  competition in the niche; winter theming is the season's hottest look (Frost Harbor 85%).
- Formula fit: album sets push sessions past 5 minutes; the daily rare visitor targets retention.
- Expected: Players' Choice in **5 to 8 days** if day-0 traffic matches Zoo Zen (≈15K/day). Build risk: low.
- Risk: the description dedup could pair it with Zoo Zen; the title, setting and description must stay clearly
  different (no "zoo", no "stroll").

### #2 Holiday prank village sandbox
A small open low-poly town in holiday season: sneak up on villagers with snowball, glitter-gift, fake-spider and
whoopee pranks; every NPC reacts with a comic chase; a prank checklist and prank-tool unlocks; ride a sled,
fly as a bird, adopt a dog. A clip-worthy moment every 30 seconds.
- Evidence: Parking City: Prank Simulator is drawn in **100%** of visitors' rows at 96K plays and 8.7K/day; only
  4 prank games exist. Prank City's 1.07M plays without a slot shows depth is required.
- Formula fit: the checklist and unlocks carry sessions past 5 minutes; NPC comedy drives likes (Parking City 21.3/1K).
- Expected: **8 to 12 days**. Build risk: medium (open world, NPC reactions, chase AI).
- Risk: keep pranks kind (no poop, no mean targets) for a kid audience; review the description for safety.

### #3 Morphing mech hero with a conquest map
Pilot a toy-like giant mech that morphs into a car, jet or drill; smash a cartoon fortress district, collect
parts, upgrade, and take over the next area of a world map.
- Evidence: Titan Transformer (first seen at 6.3 d, 56%, 22K/day), Mecha Clash (77%). Hero/transform is the
  cluster with the most slots per draw (7.0).
- Expected: **7 to 12 days**. Build risk: highest of the three (transform rigs, destruction, progression).
- Risk: crowded (66 mech/robot/kaiju games); pure smashing without a goal fails (Kaiju City never drawn).

## 7. What would change the ranking

- Day-0 traffic is the real clock: no concept reaches 50K in 5 days below ≈10K plays a day. That comes from
  the 40 s median gate and day-0 strangers (playbook §1.2, §1.3), not from the concept alone.
- Retention, p50, p75 and the 5-minute share of competitors are UNKNOWN to us; the cluster conversions stand
  in for them.
- The $100K contest starts 30 Nov; contest games will flood the feed from then (playbook §11.5).
