# Soap Carving: full audit and Players' Choice plan (2026-11-27)

Read only: nothing was edited, saved, published or thumbnailed on Astrocade. Asked by Larisha: get Soap Carving
into Players' Choice; check the whole game first. Rules from `docs/astrocade-distribution-playbook.md` §11.2.
Game id `01M7XNBZ4G6HXCWJ8QW902Q4ES`. Same method as the Draw It Alive audit
(`production/market/2026-11-27T0530-draw-it-alive-audit/`).

## Sources

| What | Where | When (UTC) |
|---|---|---|
| Plays, versions, draft files | Astrocade MCP `list_my_games`, `list_versions`, `pull_game` (sync_token `26685a077265a9fe93faffc9493b20be`) | 27 Nov 05:41 |
| Owner analytics (30 days) | Studio > Analytics, Larisha's signed-in Chrome, JSON the page loaded: `analytics-30d.json`, `analytics-30d.jpg` | 27 Nov 05:50 |
| Shares, publish date, served version | public game page (guest) | 27 Nov 05:52 |
| Home rows and Players' Choice pool | `node tools/row-crawl.js` (guest, US): `rows-2026-11-27.json` | 27 Nov 05:45 |
| Playtest | `audit-capture.js`: published build (= repo `prototypes/soap-carving/`, confirmed by opening the live page, `shots/live-game-page.jpg`) and the pulled draft; 720×1280 plus 360×640, 390×844, 430×932, 768×1024; feed handover `run('edit')` then `run('play')`; load at 4× CPU + 1.6 Mbps/150 ms | 27 Nov 06:00 |
| Screenshots | `shots/` here (`sheet-*.jpg` are contact sheets) and `/mnt/project-files/soap-carving/audit/` | |

## 1. Where the game stands

**Two builds exist.** Live is the 22 Nov publish (served version `01M7XRFM…`, a thumbnail-only wish on the
20 Nov build). The 25 Nov Astra wish (one-tap Share from the star reveal and the shelf photo, 4 winter shapes
after soap 6, 2 winter marbles, NEW badges, `winter.js` + test) is **saved as the draft but not published**.
All numbers below come from the live build.

| Metric (30 days) | Soap Carving | Draw It Alive | Rub It Away | Pool / note |
|---|---|---|---|---|
| Plays (all time) | 17,965 | 26,921 | 79,070 | gate 50,000 |
| Plays per day | 114-289 (22-25 Nov), **15,217 on 26 Nov**, 2,169 on 27 Nov by ~05:45 | 18,357 on 26 Nov | ~10K | 26 Nov spike hit both games the same day |
| Significant (>30 s) | 82% (14.9K) | 81% | 80% | |
| p50 session | 91 s | 94 s | 95.5 s | |
| p75 session | 160 s | 200 s | 188 s | |
| Sessions over 5 min | **8.7%** (1,656 / 18,999) | 13.5% | 11.6% | |
| Sessions under 30 s | 21.4% (0 s 894 · 0-10 s 860 · 10-30 s 2,311) | 22.1% | 23% | |
| Time to first interaction | **7.7 s median** (only 29% under 5 s) | 2.8 s | 2.0 s | |
| CTR | **66.7%** | 62.0% | 55.8% | |
| FPS 40+ | 91% | 94% | 85% | |
| Likes per 1,000 | 9.9 (177) | 7.4 | 17.8 | pool 18.5 |
| Shares per 1,000 | **30.9** (555, public page) | 1.2 | 17.4 | pool 7.3 |
| Retention | not shown | not shown | not shown | formula weight 15 |

The dashboard says "Shares 0"; the public page says 555. The dashboard counter is broken (same as Rub It Away).

**Home rows (guest, 27 Nov 05:45):** Soap Carving is in none of the 24 rows, Players' Choice included (21 games
shown, all 70K-1.75M plays). The 26 Nov spike therefore came from the swipe feed or Recommended for an
individual viewer, not a curated row (INFERRED).

**Players' Choice score estimate** (INFERRED; retention set to the 18% platform prior, as for Draw It Alive):
15 × 0.18 + 10 × 0.087 + 0.033 × 91 + 0.01 × 160 = 2.7 + 0.87 + 3.0 + 1.6 = **8.2**. That is below Draw It Alive
(9.15) and Rub It Away (8.9), and Rub It Away is past 50K and still not in the pool. Soap Carving also needs
~32K more plays to reach the 50K floor: about 2 weeks at 2-3K a day, or 2 days with another spike like 26 Nov.
The score terms we can move: the 5-minute share (8.7%, lowest of the three) and retention.

## 2. What we saw in play

Contact sheets: `shots/sheet-pub-1.jpg`, `shots/sheet-pub-2.jpg`, `shots/sheet-draft-2.jpg`, `shots/sheet-draft-hud.jpg`.

**Strong, keep:**
- Order 1 opens straight on the carve: pink marbled bar, dotted heart, knife and moving hand, "Carve outside the
  line!" (`pub-01-boot-done.jpg`). Feed handover works (order 1, carve step after edit then play). No errors in
  either build.
- Carving feels good: curly shavings pile up, cut pieces drop with a thud, "Almost there!" (`pub-03-order1-1-carved.jpg`).
  Bath reveal with foam ring, gems and customer "I love it!" (`pub-03-order1-3/4`).
- **Shares are the best of our games (30.9 per 1,000, 4× the pool)** and CTR is the highest (66.7%): the cover
  and the fantasy work. Frame time p50 16.7 ms at 4× CPU.
- The draft's share card is clean: soap, stars and a laughing customer (`draft-08-share-card.jpg`). Winter
  snowman reads well (`draft-07-order7-carve.jpg`).

**Problems, by cost to the score:**

1. **From order 2 on, carving waits behind 7 making steps.** Every soap after the first starts "Tap to chop!" and
   goes chop → colour → stir → scent → pour → cool → pop before the carve (`pub-04-order2-make-*.jpg`,
   `numbers-pub.json` makeSteps). The cover and title promise carving; order 1 delivers it, then the player spends
   most of order 2 on pot chores. p50 91 s ends inside that stretch (order 1 takes ~45-75 s by hand), and the
   1-2 min bucket is the largest (5,182). A returning player also lands on the chop step, not the knife
   (`shots/live-game-page.jpg`). INFERRED link, high confidence.
2. **Slow first picture and slow first touch.** On the throttled phone profile the first frame comes at 2.4-2.6 s
   but it is a flat pastel screen; the table, tools and art appear at 4.8-5.0 s (`pub-00` vs `pub-01`). Field data:
   13 image assets with a 0.3-0.9 s median download each, all requested at start; three web-font stylesheets
   load from cdn.jsdelivr.net (an outside request, against the offline rule). Median time to first interaction
   is 7.7 s, 3× Draw It Alive. The project rule is a playable first frame in about 2 s.
3. **No visible goal past minute 5 and no visible reason to come back.** Unlocks (marbles, glitters, gems at 50
   coins), the charm album and the shelf exist, but nothing on the play screen says "3/8 shapes" or what comes
   next. The daily gift (first soap of a new day) and the every-3-soaps gift exist but only show as three small
   dots; a player never learns that tomorrow pays. Over-5-min is 8.7%, lowest of the three games.
4. **The payoff fades out instead of peaking.** At the end of the reveal the whole screen washes to pale white
   while the stars and "WOW! Perfect!" are shown (`pub-03-order1-5-bath-stars.jpg`, `draft-03-order1-5-bath-stars.jpg`).
   No camera beat, hit-stop or close-up on the finished soap; project rules ask for a cinematic beat on key
   moments (first soap, perfect, new shape, gift). Likes 9.9 per 1,000, about half the pool.
5. **The draft's share breaks two rules.** It sends a 720×1080 image (`lib.share({ image, … })`); our rule is no
   image so the host card shows the live thumbnail. And if an image is kept, the customer's face sits at y 870-1040,
   inside the band `lib.share` reserves for its PLAY button (y 940-1041), so it would be covered. Also the draft
   (update boost waiting) has sat unpublished for 2 days while the game is only 5 days old (boost half-life 3 days,
   first 30 days).
6. **HUD and screen fit.** The canvas is locked to 9:16, so tall phones get empty bands (≈60-80 px top and
   bottom at 390×844 and 430×932) and the tablet gets wide side bars (`sheet-draft-hud.jpg`); the HUD sits inside
   the canvas, not on the safe-area edges. Top-row pills and buttons use different heights; the customer card
   crowds the step track. FTUE is the helper hand only: no spotlight, and the making steps, gift dots, shelf and
   free carve are never introduced.
7. **Metadata vs playbook.** Description is clean and game-only. "ASMR" plus "craft" puts it near Creative / Zen
   rows, but it was in neither on 27 Nov. Effect of a description change INFERRED, low confidence.

## 3. The plan, ranked (whole team)

Effort: S under half a day, M about a day, L two days or more. Each item changes the existing game in the repo
(`prototypes/soap-carving/`, synced to the 25 Nov draft first) and ships with `astrocade-ship` as a draft;
Larisha publishes.

| # | Change | Why (formula term) | Effort | Expected impact | Confidence |
|---|---|---|---|---|---|
| 0 | **Sync the repo to the draft** (share, winter shapes, `winter.js`) | prerequisite | S | none alone | high |
| 1 | **Fix and ship the pending update fast**: share without an image (live thumbnail), Share also on the shelf photo; reveal ends on bright stars and the soap, no white wash | update boost now; shares already strong | S | one more boost; likes up a little | medium |
| 2 | **Carve sooner on every soap**: keep the making steps but make them short and optional: after order 1 most orders arrive as a ready bar (straight to the knife); "make it from scratch" becomes a choice or every 3rd order, with chop/stir/cool auto-played in ~1 s each; a returning player always lands on the knife | p50, p75, 5-min share | M | p50 91 → 110+ s; over-5-min up | medium |
| 3 | **Fast first picture**: paint a tiny inline table/bar first, load `studio_bg` + `soap_cube` + tools first, defer customers, charms, gems, gift, bath and music until after the first stroke, use the system rounded font until Baloo is cached (or ship it in the bundle) | under-30 s share, TTFI, first-30-s strangers | S-M | TTFI 7.7 → ~3 s; first painted frame < 2 s throttled | medium-high |
| 4 | **Visible long goal + daily reason**: a shape board ("5/12 shapes", next shape silhouette), gift box with a countdown, "today's soap" (one special shape or marble per day, no streak) shown at the end of a session and on the next visit | 15 × retention, 10 × 5-min share | M | over-5-min 8.7% → 13%+ | medium |
| 5 | **Cinematic payoff**: on the bath drop a short camera push to the soap, 0.15 s hit-stop, glossy shine sweep, customer close-up, sting; also on first perfect, new shape, gift; priority queue with cooldown | likes, p50 | M | likes 9.9 → 15+/1K | medium |
| 6 | **Spotlight FTUE + HUD grid**: spotlight for carve, sponge, sparkle and the first making step; fill tall screens (extend the table art, HUD on safe-area edges), one pill/button height, 8 px grid; checked at 360×640, 390×844, 430×932, 768×1024 | first 30 s, polish level | S-M | small | low-medium |
| 7 | **New shape set every 3 days** while the update boost lasts (game 5 days old, window to ~22 Dec) | p75, retention, update boost | M each | keeps feed traffic | medium |

**Order:** 0 + 1 now (one update, about half a day), then 2 + 3 + 5 together (the second update, the one that
moves p50, the first 30 s and likes), then 4 + 6, then 7 every 3 days. Item 2 changes the loop's pacing, so it gets
the full playtest before publish.

**What we will not do:** no 3D rewrite (2D painted look works and the 2D toys carry the account), no removal of the
making steps (they stay, only shorter and optional), no timers, energy or fail states, no streak, no thumbnail work.

## 4. Open questions and what we could not see

- Retention is not shown anywhere; we can only watch p50, p75 and the over-5-minute share move.
- Item 2 shortens a part of the loop players have now; it keeps every step but changes how often it appears. It is
  the coordinator's call under the standing delegation.
- Whether to publish the 25 Nov draft as is today (boost now, but share sends an image) or wait half a day for
  item 1. Team call: wait for item 1.
- What drove the 26 Nov spike for both Soap Carving and Draw It Alive is unknown (not a curated row on 27 Nov).
