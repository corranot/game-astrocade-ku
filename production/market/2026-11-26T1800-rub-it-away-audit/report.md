# Rub It Away: full audit before any change (2026-11-26 18:00 UTC)

Read-only. Nothing on Astrocade was published, saved, discarded or overwritten. Larisha's pending draft
(`01M8B37D2NZTC9KCKHYZMWV81T`, 26 Nov 04:53 UTC) is untouched. Labels: **SEEN** = read in code, data or a
screenshot; **INFERRED** = reasoning from what was seen; **UNKNOWN** = not visible to us.

## 1. Sources

- `list_versions` (all 29 versions), `pull_game` (current draft, multi-file, sync token `d4bc0da3…`).
- Published build: the public game API (`/v3/games`, guest) names `servedVersionId 01M81CY89PH40KAJYRWX4ENRRJ`
  (22 Nov) and a `playContextCdnUrl` under the 21 Nov wish version `01M7YC3155…`. Its `full.json.gz` holds the
  workspace files and the Astra chat (`astra-chat-published-context.md`). The served code is therefore the
  21 Nov wish result (SEEN); the 22 Nov save added nothing we can see.
- Play audit: own Playwright harness (lib stubbed, real CDN assets, real pointer drags), phone 390×844 @2x,
  plus 360×640, 412×915 and 768×1024 for the map/menu. Screenshots: `production/qa/evidence/rub-it-away-audit-2026-11-26/`
  and `/mnt/project-files/rub-it-away/`.
- Traffic: guest `/v3/games` for all 55 public/private games now vs `../2026-11-25T1648-account-audit/my-games.json`
  (25.1 h window). 2D/3D from each served build's code (three.js / WebGL renderer present or not). Raw: `2d-vs-3d.json`.

## 2. What Larisha changed through Astra, and why

| When (UTC) | Wish / save | What it did | Status |
|---|---|---|---|
| 15 Nov 03:00 | "change this as the thumbnail…" | Her own GIF set as cover | live |
| 21 Nov 05:47 | Asked Astra for the best expert upgrade, "answer first, don't execute" | Astra proposed: fairer puzzles, room to experiment (a wrong rub cost a star, result auto-advanced after ~3.2 s), soften streak/weekly bonus so play is not an obligation, separate Edit from Play | – |
| 21 Nov 05:54 | "I agree with all of it, make it an explicit meta-prompt and execute it step by step… neat, precise, no bugs" | Wrong rubs no longer cost stars; NEXT waits for the player (auto-next removed); daily reward and leaderboard pressure removed; accessibility settings saved; Edit mode can move/resize objects. `UPGRADE_META_PROMPT.md` in the game files records it | **live** (served since 22 Nov) |
| 25 Nov 18:37 | Our Wish 1 (Snow World), pasted by her | Levels 61–66 Snow World, map island with NEW badge, world-end SHARE card (`lib.share` with an image), snow VFX/audio, save migration 60 to 66 | draft |
| 26 Nov 04:36 | "the text on the new Snow World button in the map panel is still messy" | Snow tab moved to a third row on its own | draft |
| 26 Nov 04:46 | "not like that, just wrap it to 2 lines" | Label forced to two lines | draft |
| 26 Nov 04:53 | "but why is the text still small?" | Label 38 px two lines; **level tiles shrunk 200 to 170 px for every world** | draft (current) |

Why the streak and auto-next went (SEEN in the chat): Astra framed them as pressure ("a duty to come back"),
and she agreed to the whole package. It was not a test result. The 21 Nov change is untested against her
session numbers (the 18 Nov p50 1:35 / p75 3:10 predate it). Her last three wishes show she was still
unhappy with the Snow tab text when she stopped; that is the likely reason the draft is not published (INFERRED).

## 3. Code review (draft vs live)

Structure: 20 files, 2D canvas 720×1280, ES modules loaded by `game.js`, bundled by Astrocade into one page
(560 KB `play.json`, of which `fontdata.js` 143 KB and `asset_map.json` 196 KB). 434 assets (372 images, 62 audio)
from the CDN. 66 levels in `levels.js`; pure rules in `rules.js`; tests `tests/core.test.mjs` pass on the draft.

Draft diff (SEEN): `save.js` LEVEL_COUNT 66 + safe `extendProgressArray` migration + `snowWorldSeen`; `ui.js` map,
share card, result card; `level.js` snow puffs, warm glow, frost breath, bell; `audio.js` snow rub/bell/wind.

| # | Finding | Where | Severity |
|---|---|---|---|
| 1 | Level tiles shrunk 200 to 170 px, numbers 84 to 70 px, stars 20 to 17, stickers 17 to 13, in **every** world. This is the "text is still small" she saw | `ui.js` drawMap `tile = 170` | High (her open complaint) |
| 2 | Snow tab is a one-off: hard-coded `wi === 10 ? 2`, alone in a third row, NEW badge sits on the label, label size differs from the other ten tabs; tab rows and tile grid have different side margins (16 vs 88 px at 390 wide) | `ui.js` drawMap | Medium (HUD grid rule) |
| 3 | World share passes `image: card` (a canvas element). Our standing rule is no image, so the host shows the live thumbnail. Errors are caught and logged, so no crash | `ui.js` shareWorld | Medium |
| 4 | Frame `dt` is only capped above (`Math.min(0.11, …)`), not at 0; a first frame can run with a small negative dt (fade, timers) | `boot.js` frame | Low |
| 5 | Map stickers show a labelled text placeholder ("snow pile", "butterfly") until that level's art has preloaded; all 66 levels preload one by one after the menu | `assets.js` placeholder, `boot.js` preload | Low |
| 6 | Snow art does not match the other 10 worlds: painterly textured penguin/seal and soft painted background vs the flat thick-outline stickers elsewhere; the snowman's "fixed" face looks worried | `asset_map` snow assets | Medium (look) |
| 7 | Public game record still says `hasLeaderboard: true`, but no code calls the leaderboard since 21 Nov | platform record | Info |

Perf/load (SEEN, local server, CDN art, 4G 9 Mbps + 4× CPU): menu ready in 2.2 s (draft) and about the same
live. Within the ~2 s goal. No console errors in 66 levels.

## 4. Play audit

Draft: all 66 levels solved by rubbing the target, 66 × 3 stars, 0 errors, 69 saves, median solve 3.2 s for a bot
that knows the answer (a person needs about 10–20 s: INFERRED). Live: same engine, 60 levels (run log in the thread).

What works (SEEN): clear one-line prompt per level; coach hand with "RUB" on level 1; decoys react with gags and a
sticker counter; result card with stars and a 6-dot world progress row; Settings, Map, Hints.

What holds sessions back, against the Players' Choice score
(`15×D1 + 10×share of sessions >5 min + 0.033×p50 + 0.01×p75`, playbook §11):

1. **Every level ends on a stop.** Since 21 Nov the result card waits for NEXT. Each of 66 levels is a decision
   point to leave. Sessions >5 min need about 20+ levels in a row (INFERRED from ~15 s/level).
2. **No goal past the current world.** The 6-dot row and the world sticker count are the only "keep going" pulls;
   nothing big waits at minute 5.
3. **No reason to return tomorrow** (streak removed by her choice). D1 has the largest weight (15) and is UNKNOWN.
4. **Snow World only helps veterans.** A new player meets it after level 60, so it barely moves p50/p75 for the
   bulk of traffic; its value is the update boost and giving finishers more to do.
5. FTUE is a coach hand, not the spotlight our rule asks for; level 1 is still easy to read (80% significant on
   18 Nov), so this is low risk.
6. Tall phones show beige bars above and below the 9:16 frame (about 76 px each at 390×844).

## 5. Are her 2D games doing better than her 3D games right now?

Yes, by a wide margin (SEEN, last 25.1 h):

| | Games | Plays/day (sum) | Median per game | Games ≥1K/day |
|---|---|---|---|---|
| 2D | 10 | 40,107 (91% of account) | 354 | 3 |
| 3D | 45 | 3,833 | 20 | 0 |
| 2D, ≤30 days old | 7 | 39,193 | 307 | 3 |
| 3D, ≤30 days old | 22 | 2,410 | 6 | 0 |

The top three of the whole account are 2D: Draw It Alive 15.3K/day, Soap Carving 12.3K, Rub It Away 11.2K.
The best 3D is Paws & Chaos at 0.7K. Caveat (INFERRED): the 2D winners are all one-finger "fix/carve/draw"
satisfying toys, so genre and mechanic explain part of it, not only 2D. Older 3D games did reach big lifetimes
(Splash Master #1 218K), so 3D is not barred; it is not what the feed rewards from her account today.
This conflicts with the repo rule that every new game is 3D; that is Larisha's call.

## 6. Prioritised plan (builds on her pending draft)

Wish = Astra wish on the existing game. Build = our own code. All keep her 21 Nov choices unless she decides otherwise.

| P | Change | Route | Lever | Confidence |
|---|---|---|---|---|
| 1 | Finish her draft: tiles back to 200 px; one consistent tab grid for 11 worlds (for example 4-4-3 or 6-5, same tab size and label size, NEW badge outside the text); share without `image` | Wish (one, small) | unblocks publish; HUD rule | High (SEEN causes) |
| 2 | Restyle Snow assets to the flat thick-outline style; happy snowman face | Wish | look consistency | Medium |
| 3 | Publish the finished draft as a named update ("Snow World") | Her action | update boost (half-life ~3 d) | High on boost (playbook), effect INFERRED |
| 4 | Lower the stop per level without auto-next: NEXT shows the next scene's thumbnail and pulses after ~1.5 s; a "big picture" world poster that fills one tile per level and pays a celebration at level 6 | Wish | share >5 min, p75 | Medium |
| 5 | A return reason that is not a streak: one "picture of the day" bonus scene (no penalty, no counter). Needs her decision first | Wish | D1 (weight 15) | Medium, needs decision |
| 6 | Content cadence: Candy World then Dino World about every 3 days (wishes 2 and 3 in `production/astra-wishes/rub-it-away.md`) | Wish | boost while window lasts (~15 Dec) | High on boost |
| 7 | Full-bleed background on tall phones; spotlight FTUE on level 1 | Wish | look, rule compliance | Low impact |

To turn the estimates into numbers: one screenshot of her analytics page for Rub It Away (median, P75,
significant share), before and after the next publish.
