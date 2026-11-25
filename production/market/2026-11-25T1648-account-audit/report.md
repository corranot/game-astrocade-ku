# Account audit: every game on Larisha's Astrocade account (2026-11-25 16:48 UTC)

Asked by Larisha: which games have no hope left, should we delete them, and what is the best move for
every game. Written by a simulated studio team (live-ops lead, data scientist, game director, UA/ASO,
art director), read-only: nothing was deleted, unpublished, edited or published.

**Bottom line:** delete nothing. 18 public games are dead (they failed the first-day test and get 0 to 6
plays a day), but a dead game is already not served, so it costs us nothing to leave it. Deleting cannot
be undone, and it removes plays from the account total. The plays are in 7 living games, and 6 of them are
still inside their 30-day boost window. Put every hour into those.

## Sources

- `my-games.json` here: `list_my_games` (MCP) at 16:48 UTC, joined with each public game page
  (`astrocade.com/games/x/<id>`, guest; fields `firstPublishedTimestamp`, `lastPublishedTimestamp`,
  `shares`, `hasLeaderboard`, `servedVersionId`).
- Plays per day from our own earlier snapshots: `../2026-11-20T0749/`, `../2026-11-24T1035/`,
  `../2026-11-25T1244/my-games.json`. "Last 4 h" = 12:50 to 16:48 UTC today, scaled to a day.
- Rules: `docs/astrocade-distribution-playbook.md` (dead gate, boosts, dedup, search) and
  `docs/game-history.md` §11 (the only session-length data we have: owner analytics screenshots, 18 Nov).

**Not available:** median session, likes and theme per game. Owner analytics returns 401 to guests,
and the public page has no like count. Where this report says a game "failed the gate", the evidence is
the plays curve (it stopped at 150 to 580 plays within days, which is the dead-game signature), not a
measured p50. Mark: SEEN = in data; INFERRED = our reading.

## What deleting actually changes

| Question | Answer | Evidence |
|---|---|---|
| Does a dead game take traffic from our good games? | No. A game under p50 40 s at ~200 plays is marked dead and not served. It fills no feed slot and no gallery row. | SEEN `dead_game_config`; INFERRED no slot use |
| Does it trigger creator dedup? | Dedup (`creator`, same creator within 3 slots; ×0.25 for a second game in beta) only acts between games that are both being ranked in one row. Dead games are not in rows. | SEEN dedup config; INFERRED |
| Does it show in search? | No. Search hides every game under 500 plays. All 18 dead games are under 500 except Aurora Heist (473, also under). | SEEN |
| Can a dead game come back with an update? | Very unlikely. On 22 Nov all 45 older games got a new version, and it is now the served version (`servedVersionId` = 22 Nov version, SEEN). Fizzy Bath Bomb's 22 Nov version holds the full 21 Nov upgrade, yet it went 316 to 317 plays since. No dead game moved. Grab and Park's revival (~8 Nov) is the only counter-case. | SEEN |
| What does deleting cost? | Lost forever: plays, shares, comments, leaderboard, player saves and share links. The 18 dead games hold ~4,900 plays. Owner lifetime plays (`ownerTotalPlays`, `own` in feed items) is a field the feed carries; whether it feeds ranking is UNKNOWN. Monetization opens at 100K lifetime significant plays across all games, so lost plays push that back slightly. | SEEN fields; effect UNKNOWN |
| Does deleting hurt or help account standing? | No evidence either way. Account tiers are `free`, `internal`, `shadowbanned`; nothing links them to deletes. | SEEN tiers; UNKNOWN link |
| How can it be undone? | It cannot. The MCP has no delete tool; the web app uses `DELETE /v3/games`. Unpublishing (`PUT visibility {isPublic:false}`) is the reversible option. | SEEN |

**Team verdict:** deleting has no measurable upside and a permanent, small downside. Leave dead games as
they are. If Larisha wants a cleaner profile, pin the winners (`PUT pin`, reversible) instead of deleting
the losers.

## Every game

Plays per day: first number = last 30 h, second = last 4 h (scaled).
Age = days since first publish. Share = shares per 1,000 plays (platform median ~6.7).

### A. Living, inside the 30-day window: update every ~3 days (highest upside)

| Game | Plays | Age | /day | Share | Verdict | Why, and the risk |
|---|---|---|---|---|---|---|
| Rub It Away | 62,991 | 10.3 | 9,531 / 15,755 | 20.1 | **Update/boost** | Our engine right now. 19.7 days of update boost left. A named content update (new level pack) every 3 days until ~15 Dec. Risk: the 22 Nov version dropped auto-next, streak and leaderboard by Larisha's choice; do not reverse that without asking. |
| Draw It Alive | 4,655 | 5.4 | 1,311 / 2,196 | 0.4 | **Update/boost** | Rising fast, but shares are 0.4 per 1,000 (Rub It Away 20). No leaderboard (SEEN `hasLeaderboard:false`). Add a share card of the player's drawing and new scenes. |
| Pin & Bloom | 2,446 | 8.4 | 837 / 1,901 | 31.1 | **Update/boost** | Rising, shares strong. New levels every 3 days. |
| Reel & Hatch | 36,518 | 17.2 | 1,454 / 1,961 | 27.5 | **Update/boost** | Second wave. 12.8 days of window left. Update now. |
| Ice Cream Roll Art | 536 | 2.5 | 193 / 573 | 5.6 | **Update/boost** | Passed the gate (accelerating past 500). Low share: add a share card of the finished roll. |
| Soap Carving | 578 | 3.3 | 147 / 241 | 5.2 | **Update/boost** | Passed the gate, slower. Same fix: share card + a new soap shape set. |

### B. In the first-day test now: do not touch

| Game | Plays | Age | /day | Verdict | Why |
|---|---|---|---|---|---|
| Snip It: Cut to Fix | 59 | 0.4 | – / 66 | **Keep, wait** | Published 06:16 UTC today; the test runs ~1 day. Changing it now spends the window. |
| NEKO ZOOMIES | 61 | 0.4 | 48 / 115 | **Keep, wait** | Same. Same family as Paws & Chaos: watch that it does not fail the same way. |
| Block Smash Crew | 70 | 1.4 | 34 / 54 | **Keep, wait 24 h** | Very slow test traffic; it has not reached 200 plays, so it is not judged yet. |
| Paws & Chaos | 178 | 1.4 | 105 / 48 | **Revive (now)** | Near 200 plays and slowing: likely failing. A fix draft (bounce + window light, `01M86GY4HNNY0QF6B5C2KPHJ96`) is waiting. Publishing it is the only cheap shot while it is still in test. Risk: low; the draft was tested. |

### C. Mature, still earning: keep as is

These are past 30 days (no update boost) or plateaued. They earn residual plays and add to lifetime
totals. Update only for retention, or use them as sequel seeds.

| Game | Plays | Age | /day | Share | Verdict | Note |
|---|---|---|---|---|---|---|
| Splash Master #1 | 217,444 | 107.9 | 340 / 555 | 32.8 | Keep | Sequel seed (#2 got 71% of #1) |
| Splash Master #2 | 152,871 | 98.7 | 101 / 115 | 50.8 | Keep | |
| Blueprint Builder | 122,091 | 116.8 | 59 / 54 | 41.0 | Keep | |
| RUN! Pet Thief 3D | 113,107 | 106.7 | 28 / 42 | 22.0 | Keep | "Steal" genre is hot platform-wide: sequel seed |
| Paint Peekaboo | 100,017 | 32.2 | 68 / 84 | 34.0 | Keep | Just past 100K |
| Hero Bridge Royale | 97,338 | 49.7 | 21 / 18 | 75.4 | Keep | Best share rate on the account |
| Tiptoe & Hatch | 86,498 | 57.5 | 97 / 91 | 31.7 | Keep | |
| Bus Telolet | 72,864 | 61.7 | 30 / 24 | 11.1 | Keep | |
| 3D Date Stylist | 69,989 | 43.2 | 54 / 66 | 36.8 | Keep | |
| Dum Biryani | 51,816 | 48.3 | 35 / 54 | 26.3 | Keep | |
| Martabak Master | 44,719 | 63.7 | 51 / 42 | 33.3 | Keep | |
| Bicep Clash | 36,166 | 108.8 | 54 / 60 | 21.2 | Keep | |
| Cozy Room Designer | 33,020 | 80.7 | 428 / 477 | 29.9 | Keep | Steady at day 80: sequel seed |
| Ambulance Rush | 32,484 | 66.7 | 17 / 18 | 8.9 | Keep | |
| Toybox Town | 26,657 | 49.7 | 136 / 199 | 31.8 | Keep | Title shares "Toybox"/"Mayhem" with Tiny Town Mayhem (bigram dedup risk, both small) |
| Grab and Park | 24,983 | 33.5 | 705 / 712 | 34.3 | Keep | Window just closed; still 700/day. Sequel seed |
| Megalodon.io | 21,640 | 47.1 | 20 / 0 | 41.0 | Keep | |
| Tiny Town Mayhem | 9,973 | 34.5 | 16 / 24 | 50.6 | Keep | |
| Spooky Squad 3v3 | 8,356 | 52.2 | 33 / 12 | 5.7 | Keep | |
| Sprint Past the Tsunami | 5,184 | 60.6 | 10 / 12 | 12.0 | Keep | |
| Tame a Dragon | 3,016 | 52.1 | 38 / 109 | 26.9 | Keep | Small uptick today |
| Candy Mine Vacuum | 2,168 | 33.3 | 17 / 18 | 37.8 | Keep | |
| Prop Heist | 1,783 | 43.0 | 4 / 0 | 10.7 | Keep | |
| DIY Squishy Studio | 1,078 | 32.3 | 6 / 6 | 22.3 | Keep | |
| Miawdoku | 881 | 47.7 | 2 / 0 | 14.8 | Keep | |

### D. Dead (failed the first-day test): leave alone

All 18 stopped between 156 and 473 plays and now get 0 to 8 plays a day. None is served, so none hurts
the account. Verdict for all: **Keep as is (archive)**. Do not spend build time on them; the 200-play test
does not repeat (22 Nov evidence above).

| Game | Plays | Age | /day | Family | Note |
|---|---|---|---|---|---|
| Toy City Stomp | 156 | 4.3 | 30 / 42 | Smash | Still a trickle; inside window. Only revive candidate here, and only if a smash game is planned anyway |
| Pinata Maker | 192 | 6.3 | 0 / 0 | DIY maker | Family passed with Ice Cream and Soap: reuse its parts there, not a revive |
| Fizzy Bath Bomb Maker | 317 | 7.4 | 8 / 6 | DIY maker | Full upgrade served since 22 Nov, no change |
| Pet Smile Clinic | 240 | 10.3 | 2 / 0 | ASMR care | Measured 18 Nov: 66% significant, p50 0:51 |
| Winter Toy-Box: Snowball Arena | 223 | 11.3 | 1 / 0 | Snow arena | Shares "Snowball" with Giant Snowball Smash |
| Aurora Heist: Egg Snatcher | 473 | 11.3 | 2 / 0 | Heist | Same day, same idea as Frosty Heist |
| Frosty Heist | 217 | 12.2 | 3 / 0 | Heist | Near-duplicate of Aurora Heist |
| Punch Tower | 411 | 12.3 | 4 / 6 | Arcade | |
| Pixel Blast | 217 | 14.2 | 2 / 0 | Arcade | Generic arcade, off our kid identity |
| Asteroid Wars | 174 | 15.1 | 0 / 0 | Arcade | Same |
| FLOW STATE | 161 | 15.1 | 1 / 0 | Arcade | Same |
| Turbo Splash: Water Slide Racer | 265 | 16.3 | 0 / 0 | Water slide | Shares "Splash" with our winners |
| Kebab Street Tycoon | 270 | 16.3 | 1 / 0 | Cooking | |
| Escape the Hippo Warden | 297 | 18.2 | 2 / 0 | Chase | |
| Titan Gates: Army Merge Run | 311 | 19.2 | 1 / 6 | Runner | |
| Giant Snowball Smash | 289 | 21.3 | 1 / 0 | Snow | |
| Juice Face Slice | 312 | 21.9 | 0 / 0 | Slice | |
| Mega Aura: Kubo's Schoolyard | 394 | 30.3 | 0 / 0 | Adventure | |

### E. Private drafts (never published, 0 to 1 plays)

| Draft | Verdict | Why |
|---|---|---|
| +1 Mega Hammer: Smash and Grow | **Merge/replace** with Mega Hammer Royale | Two drafts of one family. Launch one, keep the other private. Launching both close together triggers `creator` dedup and a `bigram` title clash ("Mega Hammer"). The better first-40-s build wins. |
| Mega Hammer Royale: Sky Forge | **Merge/replace** (see above) | |
| Voxel Wonderland: Sky Island Builder | **Keep, finish and launch** | Free until published. Launch only after the 40 s timeline test. |
| Jelly Bump Party | **Keep private** | Couch multiplayer on one phone fits the feed's solo stranger poorly. Launch only as a slot filler on a quiet day. |

## Delete or unpublish candidates

None recommended. If Larisha still wants a cleanup, use **unpublish (reversible)**, never delete, and only
for these, in order:

1. **Frosty Heist**: a near-duplicate of Aurora Heist, published the same day. Two look-alike games from
   one creator are the exact case dedup targets. Lowest loss (217 plays).
2. **Pixel Blast, Asteroid Wars, FLOW STATE**: generic arcade games outside our kid identity. Profile
   visitors see games that do not match the rest. Loss: 552 plays.

Expected play gain from either: about zero (INFERRED; dead games are not served). It only tidies the profile.

## Top 3 actions by play upside

1. **Rub It Away: a named content update every 3 days until ~15 Dec** (end of its 30-day window). It makes
   ~10 to 16K plays a day now, and the update boost (α 0.12, half-life 3 days) multiplies whatever base it
   has. At 62K plays it is also past the 50K Players' Choice floor, where retention (×15) and 5-minute
   sessions (×10) decide. So each update should add a reason to come back.
2. **Draw It Alive and Pin & Bloom: updates every 3 days, plus a share card for Draw It Alive.** Both make
   ~2K a day at days 5 and 8, so the window is almost fully ahead. Draw It Alive's share rate (0.4 per
   1,000) is 50× below Rub It Away's; a share card of the player's drawing is the cheapest lever we have.
3. **Reel & Hatch, Ice Cream Roll Art and Soap Carving: one meaningful update each this week.** Reel &
   Hatch has a ~2K a day second wave with 12.8 days of window left. Ice Cream and Soap just passed the gate,
   and an update in the first days compounds the play boost.

Also do now (cheap, time-critical): publish the Paws & Chaos fix draft while it is still in its test.

## Lessons for memory

- A dead game is not revived by a new version: the 22 Nov versions are served (SEEN), and 18 dead games
  did not move, including Fizzy's full upgrade. Spend effort on living games and on sequels.
- Public game pages carry `firstPublishedTimestamp`, `shares`, `hasLeaderboard` and `servedVersionId`
  for guests. Like counts and session length are owner-only.
