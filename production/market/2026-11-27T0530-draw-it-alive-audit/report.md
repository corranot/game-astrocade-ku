# Draw It Alive: full audit and Players' Choice plan (2026-11-27)

Read only: nothing was edited, saved, published or thumbnailed on Astrocade. Asked by Larisha: how does Draw It
Alive get into Players' Choice; check the whole game first. Rules from `docs/astrocade-distribution-playbook.md`
§11.2. Game id `01M7S3R108GQ3T2VKX5P9412MT`.

## Sources

| What | Where | When (UTC) |
|---|---|---|
| Plays, versions, draft files | Astrocade MCP `list_my_games`, `list_versions`, `pull_game` | 27 Nov 05:31 |
| Owner analytics (30 days) | Studio > Analytics, Larisha's signed-in Chrome, JSON the page loaded | 27 Nov 05:35 (`analytics-30d.jpg`) |
| Playtest | `audit-capture.js`: published build (= repo `prototypes/draw-it-alive/`) and the pulled draft, 720×1280 iframe size, feed handover `run('edit')` then `run('play')`, load measured at 4× CPU + 1.6 Mbps/150 ms | 27 Nov 05:40 |
| Screenshots | `shots/` here and `/mnt/project-files/draw-it-alive/audit/` | |

## 1. Where the game stands

**Two builds exist.** The live game is still the 19 Nov version (20 levels, no share). The 25 Nov Astra wish
(Snowy Day chapter L21-25, Winter sticker set, Share button and share card) is **saved as a draft but not
published** (`list_versions`: `01M89ZE0…` is_current_draft, not is_published). Every number below comes from the
19 Nov build.

| Metric (30 days unless noted) | Draw It Alive | Rub It Away (26 Nov) | Pool median / note |
|---|---|---|---|
| Plays (all time) | 26,921 | 79,070 | gate 50,000 |
| Plays 26 Nov (one day) | 18,357 (significant 14,824) | 10,521 | spike from ~1-2K/day; 27 Nov 3,124 by 05:30 UTC |
| Significant (>30 s) | 81% | 80% | |
| p50 session | 94 s | 95.5 s | |
| p75 session | 200 s | 188 s | |
| Sessions over 5 min | 13.5% (3,788 / 27,983) | 11.6% | |
| Sessions under 30 s | 22.1% (0 s 1,104 · 0-10 s 1,764 · 10-30 s 3,389) | 23% | |
| Time to first interaction | 2.8 s median | 2.0 s | |
| CTR | 62.0% | 55.8% | |
| FPS 40+ | 94% | 85% | |
| Likes per 1,000 plays | 7.4 (200 likes) | 17.8 | pool 18.5 |
| Shares per 1,000 | 1.2 (26 Nov guest feed) | 17.4 | pool 7.3 |
| Retention | not shown anywhere | not shown | formula weight 15 |

**Players' Choice score estimate** (INFERRED; retention set to the 18% platform prior):
15 × 0.18 + 10 × 0.135 + 0.033 × 94 + 0.01 × 200 = 2.7 + 1.35 + 3.1 + 2.0 = **9.15**, a little above Rub It Away
(about 8.9 with today's numbers), which is past 50K and still not in the pool. So passing 50K (about 1.5 to 2
days at the current pace) is not enough on its own: the score has to rise, mainly through the 5-minute share and
retention, the two terms we can move most.

## 2. What we saw in play (published build unless marked)

Screens: `shots/sheet-published-1.jpg`, `shots/sheet-published-2.jpg`, `shots/sheet-draft.jpg`.

**Strong, keep:**
- First frame is the level itself, no menu: dashed gap, pulsing pink dot, ghost hand, "Draw the bridge!".
  Readable at a glance (`pub-00-first-frame-300ms.jpg`). Feed handover works (level 1 up after edit then play).
- The player's wobbly line becomes the part and the scene uses it (chick walks the bridge, flower drinks along
  the stream). Sticker art is clean and consistent. No losing; a miss fades and the hand returns.
- Load: first frame 1.5 to 1.7 s on the throttled profile; frame time p50 16.7 ms at 4× CPU. No errors in either
  build.
- Paint jar fills, a gift box opens at the end of chapter 1 with a sticker; picture wall per chapter.

**Problems, by cost to the score:**

1. **The session ends where the content gets repetitive, before minute 5.** p50 94 s is about 3 levels
   (each level is ~10 s of drawing plus a fixed 2.5 s celebration, 3.3 s on L1, then auto-next). Nothing on
   screen says how much is left or what is coming: no chapter map, no "pictures alive 3/25", the jar shows
   drops but not what they buy until it is full. Round two is a mirror of round one, so content past 25 levels
   is not new.
2. **No reason to come back tomorrow is visible.** The daily gift (+3 drops) only appears after the first win of
   a new day; the player never learns it exists before leaving. Retention carries the largest weight (15).
3. **The payoff is gentle, not a "wow".** The alive moment is a small walk or pour with confetti and three stars
   (`pub-L1-win-1.2s.jpg`). No music, no camera beat, no character close-up, the line itself does not glow when
   it comes alive. Likes at 7.4 per 1,000 are the lowest of our live games and well under the pool's 18.5.
   Project rules also ask for a cinematic beat on key moments (first win, new sticker, chapter unlock).
4. **Sharing is not in the live game, and the draft's version is weak.** In the draft:
   - The Share button lives only during the 2.5 s celebration before auto-next (`draft-L1-win-1.2s.jpg`), and on
     level 1 it covers the river under the bridge.
   - The share card puts "My Drawing" and the stars at y 949 to 1015, inside the band `lib.share` reserves for
     the preview's PLAY button (x 79-641, y 940-1041, dev guide): they will be hidden. The scene is cropped to
     its upper half and the player's line is faint (`draft-13-share-card.jpg`).
5. **Snowy Day (draft) is pale.** White snow on a very light blue sky: the snowman and the ice pond are low
   contrast against the backdrop, and the start dot sits on the duck's face (`draft-20-L21-start.jpg`,
   `draft-20-L25-start.jpg`). The 19 Nov colour fix ("nothing blends into the background") is not met here.
6. **Sticker book (draft) breaks its grid.** Four 2×2 sets, then the fifth set alone on the left with a tiny
   "Winter friends" label the other sets do not have (`draft-16-sticker-book.jpg`).
7. **FTUE is a ghost hand only.** It works for the draw gesture, but the project rule asks for a spotlight
   (dim + cutout, one step at a time) and the jar, the wall button and the sticker book are never introduced;
   a player who never taps the jar never sees the collection that should hold them past minute 5.
8. **HUD grid.** Jar 110 px at (24, 40) vs round buttons 96 px at y 1040; pips and prompt centred; top-right
   empty. Sizes and top/bottom margins differ (rule: one height, equal safe-area margins, 8 px grid).
9. **Theme row.** On 26 Nov the game sat in Puzzle (93-99 games). A drawing game for young children also fits
   Educational (46 games, median 786 plays/day) or Creative; the row is chosen by Astrocade's taxonomy from
   title, description and mechanics (playbook §3.1, §11.3). Effect INFERRED, low confidence.

## 3. The plan, ranked (whole team)

Effort: S under half a day, M about a day, L two days or more. Every item is a change to an existing game, built
in the repo (source in `prototypes/draw-it-alive/`, synced to the 25 Nov draft first) and shipped with
`astrocade-ship` as a draft; Larisha publishes.

| # | Change | Why (formula term) | Effort | Expected impact | Confidence |
|---|---|---|---|---|---|
| 0 | **Sync the repo to the draft** (Snowy Day, share, 30 stickers) so we build on what Larisha already approved | prerequisite | S | none alone | high |
| 1 | **Fix and ship the pending update fast**: share card layout clear of the PLAY band, whole scene, glowing player line; Share stays reachable (on the wall card and a held end card, never only for 2.5 s); Snowy Day contrast (deeper sky, outlined snow, dot off faces); sticker book 5 sets on one grid | Shares bring day-0 players; the update boost (half-life 3 days, first 30 days: game is 8 days old) | S-M | shares 1.2 → toward 5+/1K; one more update boost | medium |
| 2 | **Visible long goal past minute 5**: a chapter map / album strip ("pictures alive 7/25", next chapter teaser, sticker sets with completion rings), box every ~2 levels early on, a new sticker set reward for each finished chapter | 10 × share over 300 s, p75 | M | over-5-min 13.5% → 18-20% | medium |
| 3 | **Daily return reason**: "Today's picture" (one special scene per day with a gold frame on the wall) shown on the end of the session and on the next visit, plus the daily gift shown as a wrapped box with a countdown, never a streak (same choice Larisha made for Rub It Away) | 15 × retention | M | retention + a few points | medium (weight SEEN, effect INFERRED) |
| 4 | **Make the alive moment a wow**: short cinematic beat (camera ease-in on the character, 0.15 s hit-stop, the player's line sparkles as it turns real), character cheer, a soft synthesized music bed and a rising sting, bigger confetti burst; chapter unlock and new-sticker beats on a priority queue | likes (correlate with the pool), p50, first 30 s | M | likes 7.4 → 12+/1K; under-30 s share down | medium |
| 5 | **More new content instead of mirrors**: one new 5-level chapter every 3 days while the update boost lasts (Under the Sea is already written as Wish 2) | p75, retention, update boost | M each | keeps feed traffic until day 30 (about 19 Dec) | medium |
| 6 | **Spotlight FTUE** for level 1 (dot and gesture) and one-time spotlights for the jar/sticker book and the wall button the first time each matters; skippable, saved | first 30 s, minute-5 goal discovery | S | under-30 s share down a little | medium |
| 7 | **HUD on one grid**: jar, mute, wall and share at one 96 px height, equal 24 px safe margins top and bottom, checked at 360×640, 390×844, 430×932 and 768×1024 | polish level (taxonomy field) | S | small | low |
| 8 | **Optional row test**: description and README lead with "drawing game for kids, learn shapes" so the taxonomy may file it under Educational | smaller row, more impressions | S | unknown | low |

**Order:** 0 and 1 now (one update, ready in about a day), then 2 + 3 + 4 + 6 + 7 together as the second update
(about two days), then 5 every three days. Items 2 to 4 are the ones that move the score; 1 is the one that
moves traffic now.

**What we will not do:** no 3D rewrite (the 2D sticker look is working and the 2D toys carry the account), no
timers, energy, ads or anything before the first stroke, no leaderboard, no streak, no thumbnail work.

## 4. Open questions and what we could not see

- Retention is not shown anywhere on the dashboard; we can only watch p50, p75 and the over-5-minute share move.
- Whether Larisha wants to publish the 25 Nov draft as is today (it gives an update boost now but ships the share
  card bug and pale Snowy Day) or wait about a day for item 1. Team call: wait for item 1; the draft's bugs sit
  on the share path we want to grow.
- Plays per day after the 26 Nov spike: 27 Nov reads 3,124 by 05:30 UTC (about half a day), so the spike may be
  easing. Re-read the dashboard after the first update.
