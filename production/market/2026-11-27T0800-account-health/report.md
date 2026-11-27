# Account health: every other game (2026-11-27 08:00 UTC)

Asked by Larisha: how are all my other games doing, and what is wrong with them? Skipped on purpose (handled
today in their own threads): Draw It Alive, Soap Carving, Rub It Away, Meteor Gems. Read-only on Astrocade:
nothing was published, saved, or changed, and no thumbnail was touched.

**Bottom line:** every live game loads and runs on a phone with no game errors. The biggest problem is not a
bug. Six games have a finished content update from 25 Nov sitting as an **unpublished draft** while two of
them fade inside their 30-day window: Pin & Bloom fell from 690 to 242 plays a day, Reel & Hatch from 1,694
to 589. Every one of those drafts also shares a picture, which breaks our live-thumbnail share rule, so each
needs a one-line fix before it goes out.

## Sources

| What | Where | When (UTC) |
|---|---|---|
| Game list, lifetime plays, draft flag | Astrocade MCP `list_my_games`: `now.json`; deltas vs `../2026-11-25T1648-account-audit/my-games.json` | 27 Nov 07:46 |
| Owner analytics per game (30-day p50/p75, >5 min, TTFI, CTR, likes, daily plays) | Studio > Analytics in Larisha's Chrome, `/v3/analytics` replayed per game: `analytics-raw.txt` | 27 Nov 07:50 |
| Shares, served version, publish dates | public game pages (guest): `public-pages.json` | 27 Nov 07:52 |
| Version history, what each draft is | MCP `list_versions` (Paws, Ice Cream, Reel & Hatch, Pin & Bloom, NEKO, Grab and Park) | 27 Nov 07:55 |
| Live smoke test | `live.js`: guest, 390×844 phone, public page, 12 s load, one tap; 15 games; `live-smoke.json`, `shots/*-live-tap.jpg`, `shots/sheet1.jpg`, `shots/sheet2.jpg` | 27 Nov 07:52–08:00 |
| Draft smoke test | owner draft URLs in Larisha's Chrome: Paws, Pin & Bloom, Reel & Hatch, Ice Cream (`shots/*-draft-*.jpg`) | 27 Nov 07:56–08:00 |
| Home rows | `node tools/row-crawl.js`: `rows-2026-11-27.json` (guest) | 27 Nov 07:47 |

Day columns come from the analytics graph (the account's day buckets); 27 Nov is partial and left out.
Note: 26 Nov lifted many old games at once (Hero Bridge 11 to 189, Splash Master #2 80 to 161). That is the
day Draw It Alive and Soap Carving spiked, so visitors likely browsed the profile. Don't read it as a trend.

## Every game with traffic

"PC score w/o retention" = the Players' Choice formula minus its retention term
(10 × share >5 min + 0.033 × p50 + 0.01 × p75). Retention is owner-hidden per game, so the real score is this
plus 15 × retention (about +2.7 at 18% retention). Floor to enter the pool: 50,000 plays.

| Game | Plays | /day 25 / 26 Nov | p50 / p75 s | >5 min % | TTFI s | CTR | Likes/1K | Shares/1K | PC score w/o retention |
|---|---|---|---|---|---|---|---|---|---|
| Paws & Chaos | 1,195 | 37 / 815 | 67 / 134 | 6.5 | 2.1 | 58% | 6.7 | 39.3 | 4.20 |
| Reel & Hatch | 37,488 | 1131 / 589 | 119 / 301 | 22.9 | 5.7 | 37% | 17.0 | 27.1 | 9.23 |
| Ice Cream Roll Art | 1,266 | 232 / 514 | 120 / 250 | 18.3 | 4.4 | 53% | 11.8 | 17.4 | 8.29 |
| Grab and Park | 25,683 | 460 / 479 | 71 / 151 | 9.7 | 3 | 59% | 12.9 | 34.0 | 4.82 |
| Cozy Room Designer | 33,687 | 313 / 439 | 70 / 130 | 5.5 | 5.1 | 58% | 15.0 | 30.0 | 4.16 |
| NEKO ZOOMIES | 653 | 62 / 430 | 75 / 152 | 8.2 | 2.7 | 51% | 7.7 | 9.2 | 4.81 |
| Splash Master #1 | 218,021 | 282 / 407 | 70 / 125 | 4.1 | 4.3 | 59% | 16.9 | 32.7 | 3.97 |
| Pin & Bloom | 2,899 | 690 / 242 | 83 / 160 | 9.0 | 2.7 | 48% | 11.7 | 30.4 | 5.24 |
| Hero Bridge Royale | 97,537 | 11 / 189 | 103 / 172 | 6.8 | 5.9 | 31% | 20.4 | 75.3 | 5.80 |
| Splash Master #2 | 153,078 | 80 / 161 | 88 / 151 | 6.3 | 7.9 | 45% | 16.6 | 50.8 | 5.04 |
| Blueprint Builder | 122,281 | 41 / 143 | 90 / 182 | 11.9 | 6.3 | 50% | 15.5 | 40.9 | 5.98 |
| 3D Date Stylist | 70,138 | 39 / 119 | 89 / 150 | 6.5 | 7.2 | 49% | 36.1 | 36.8 | 5.09 |
| Paint Peekaboo | 100,170 | 56 / 93 | 117 / 240 | 17.0 | 6.2 | 44% | 15.5 | 34.0 | 7.96 |
| Tiptoe & Hatch | 86,631 | 89 / 77 | 119 / 263 | 18.9 | 5.6 | 38% | 17.8 | 31.7 | 8.45 |
| Martabak Master | 44,825 | 40 / 72 | 92 / 173 | 10.8 | 4 | 43% | 21.2 | 33.2 | 5.85 |
| Dum Biryani | 51,906 | 28 / 72 | 87 / 124 | 2.1 | 7.5 | 46% | 13.1 | 26.3 | 4.32 |
| Snip It | 159 | 66 / 66 | 55 / 96 | 1.9 | 2.4 | 46% | 6.3 | 12.6 | 2.97 |
| Bus Telolet | 72,934 | 21 / 48 | 59 / 115 | 4.7 | 5.8 | 60% | 13.2 | 11.1 | 3.57 |
| Block Smash Crew | 142 | 28 / 47 | 101 / 184 | 14.4 | 2.8 | 33% | 7.0 | 7.0 | 6.61 |
| Bicep Clash | 36,237 | 53 / 43 | 90 / 152 | 7.7 | 7.3 | 45% | 17.7 | 21.3 | 5.26 |
| Toybox Town | 26,737 | 124 / 38 | 95 / 226 | 16.7 | 6.4 | 47% | 17.5 | 31.8 | 7.06 |
| RUN! Pet Thief 3D | 113,161 | 20 / 38 | 86 / 179 | 9.9 | 5.9 | 33% | 17.2 | 22.0 | 5.62 |
| Tame a Dragon | 3,073 | 38 / 36 | 86 / 195 | 14.3 | 6.1 | 43% | 21.2 | 26.4 | 6.22 |
| +1 Mega Hammer | 43 | 0 / 31 | 33 / 53 | 2.4 | 3.8 | 22% | 46.5 | 0.0 | 1.86 |
| Fizzy Bath Bomb | 353 | 13 / 23 | 49 / 96 | 7.8 | 3 | 54% | 11.3 | 25.5 | 3.36 |
| Megalodon.io | 21,671 | 13 / 22 | 97 / 232 | 16.9 | 6 | 42% | 11.6 | 41.0 | 7.21 |
| Ambulance Rush | 32,513 | 13 / 20 | 64 / 131 | 4.4 | 4.5 | 60% | 10.5 | 8.9 | 3.86 |
| Voxel Wonderland | 33 | 0 / 19 | 64 / 105 | 0.0 | 1.2 | 24% | 60.6 | 0.0 | 3.16 |
| DIY Squishy Studio | 1,103 | 4 / 19 | 74 / 150 | 7.6 | 6.8 | 67% | 22.7 | 21.8 | 4.70 |
| Tiny Town Mayhem | 9,992 | 15 / 16 | 108 / 209 | 12.4 | 7.4 | 44% | 23.7 | 50.5 | 6.89 |
| Toy City Stomp | 167 | 20 / 9 | 55 / 93 | 3.0 | 2.4 | 37% | 12.0 | 0.0 | 3.05 |
| Spooky Squad 3v3 | 8,369 | 37 / 9 | 87 / 208 | 16.7 | 7 | 41% | 17.4 | 5.7 | 6.62 |
| Sprint Past the Tsunami | 5,192 | 3 / 7 | 70 / 125 | 6.1 | 5.5 | 37% | 12.5 | 11.9 | 4.17 |
| Prop Heist | 1,792 | 3 / 5 | 82 / 177 | 9.0 | 6.3 | 38% | 26.2 | 10.6 | 5.38 |
| Miawdoku | 891 | 1 / 5 | 38 / 66 | 3.5 | 5 | 69% | 16.8 | 14.6 | 2.26 |
| Candy Mine Vacuum | 2,177 | 13 / 3 | 72 / 121 | 5.9 | 6.5 | 44% | 10.6 | 38.1 | 4.18 |

The 17 dead games from the 25 Nov audit (Pinata Maker, Pet Smile Clinic, Winter Toy-Box, Aurora Heist, Frosty
Heist, Punch Tower, Pixel Blast, Asteroid Wars, FLOW STATE, Turbo Splash, Kebab Street, Hippo Warden, Titan
Gates, Giant Snowball Smash, Juice Face Slice, Mega Aura, Toy City Stomp) still get 1–7 plays a day. No change:
leave them. Private: Mega Hammer Royale (0), Jelly Bump Party (1).

## Live vs draft

Almost every game shows `unpublished_edits: true`. For the six games that matter, the draft is a 25 Nov
content wish Larisha sent to Astra (18:27–18:44 UTC) that was never published:

| Game | Live (served) version | Draft waiting | Draft runs? | Share in draft |
|---|---|---|---|---|
| Reel & Hatch | 22 Nov | New sea + limited event + rare-catch share (26 Nov "continue") | Yes, title and beach (`shots/REEL-draft-*`) | sends `image: canvas` |
| Pin & Bloom | 22 Nov | Snow Garden, levels 41–60, snow melts to water (26 Nov "continue") | Yes, opens at Level 41 (`shots/PIN-draft-*`) | sends `image` (`src/app.js`; first search missed it) |
| Paws & Chaos | 25 Nov 17:01 (bounce fix) | Funny first 5 s, first golden fish in 30 s | Yes (`shots/PAWS-draft-play.jpg`) | sends `image` |
| Ice Cream Roll Art | 21 Nov | One-tap share of the finished cup + winter flavours | Yes (`shots/ICE-draft-play.jpg`) | sends `image` |
| NEKO ZOOMIES | 24 Nov | First MEGA ZOOMIES within 30 s | not opened | sends `image` |
| Grab and Park | 22 Nov | Extra effects, sounds and a share moment | not opened | sends `image` (`share_card.js`) |

Our standing rule: in-game share passes a title and text only, so the share card shows the live thumbnail.
All six shares above pass `image`. Fix: drop the `image` field (one line each) before publishing.

## Problems, ranked

1. **Finished updates not published while games fade (high).** Pin & Bloom (day 10) lost 65% of daily plays
   in a day; Reel & Hatch (day 19) lost 65% in two days. Both are inside the 30-day update window, and the
   update to win it back is already built. Every day unpublished costs window days.
2. **Every pending share sends a picture (medium, blocks publishing).** Five drafts, see the table above.
3. **Two new launches are failing their first-day test (medium).** Both went public on 26 Nov 04:58–04:59, one
   minute apart, so they also competed in creator dedup.
   - +1 Mega Hammer: 43 plays, p50 33 s, CTR 22%, 24% leave inside 10 s. The live build opens on a ~30 s
     map flyover with only a skip arrow (`shots/MH-live-tap.jpg`): players swipe away before they hit
     anything. Under the dead line (p50 40 s).
   - Voxel Wonderland: 33 plays, p50 64 s, CTR 24%, 0% past 5 min. In-game title says "Sky Realms", the
     listing says "Sky Island Builder" (`shots/VW-live-tap.jpg`).
   - Snip It (day 2): flat at 66 a day, p50 55 s, 159 plays. Failing. Block Smash Crew: slow test traffic,
     142 plays, but p50 101 s is healthy.
4. **Paws & Chaos came back (good news, and a lesson).** It was at 178 plays and slowing on 25 Nov. The bounce
   fix published at 17:10 that day, still inside its first-day test, took it to 815 a day. A fix published
   *during* the test works; a fix after a game is dead does not (25 Nov audit).
5. **Slow first interaction on older games (low).** TTFI 6–8 s on Splash Master #2 (7.9), Dum Biryani (7.5),
   Tiny Town Mayhem (7.4), Bicep Clash (7.3), 3D Date Stylist (7.2). Our new games are 1–3 s. Fix only when
   one of them gets an update anyway.
6. **Cozy Room Designer's first screen reads weak (low).** Still 440 a day at day 83, but the opening is a
   pale empty room with tiny low-contrast labels (`shots/COZY-live-tap.jpg`). Worth a HUD pass if updated.
7. **Several games put a second "tap to play" after the host's Play card** (Reel & Hatch, Pin & Bloom, NEKO,
   Hero Bridge, Splash Master #2, Date Stylist, Voxel). One extra tap before play. Low, but cheap to remove in
   any update.

No game errors in any live smoke run. The only console lines were the host page's own Google sign-in and
focus-policy messages (`live-smoke.json`). None of these games is in Trending or Players' Choice in today's
guest crawl. Theme rows: Reel & Hatch farm #18, Ice Cream Roll Art cooking #28, Tiptoe & Hatch adventure #81.

## Worth fixing next for Players' Choice

The pool needs 50,000 plays, then ranks by retention, share of sessions past 5 min, p50 and p75.

1. **Reel & Hatch: publish the new-sea update now (after the share fix).** The best session profile on the
   account: p50 119 s, p75 301 s, 23% past 5 min, score 9.2 before retention, above Tiptoe and Draw It Alive.
   It is 12,500 plays short of the 50K floor. An update inside the window is the fastest way to close that gap.
2. **Tiptoe & Hatch: add a reason to come back.** Already past 50K (86.6K) with score 8.45 before retention,
   yet not in the pool. Retention is the missing term: a daily egg or a "today's run" goal is the cheapest
   lever (same as the Rub It Away finding). Paint Peekaboo (100K, 7.96) is the backup for the same move.
3. **Pin & Bloom and Paws & Chaos: publish their drafts for plays, not Players' Choice yet.** Both are far
   below 50K. Pin & Bloom is fading and Snow Garden is ready. Paws & Chaos is the account's fastest riser
   after the three viral games; its draft improves the first 30 s, which is what a new game needs now.

Not recommended: reviving Mega Hammer or Voxel Wonderland by update after they fail (dead games don't come
back), deleting anything, or touching the 17 dead games.

Next step for whoever picks this up: pull each draft, remove `image` from `lib.share`, save the draft, test
the feed handover, then hand to Larisha to publish. Larisha publishes; nothing here was published.

## Fix round (27 Nov 08:05–08:25 UTC)

Saved as private drafts through the Astrocade MCP. Nothing was published and no thumbnail was touched.
Screenshots: `fixes/`. Checks: `fixes/verify.js` (draft folder served locally, host `lib` stubbed,
`run('edit')` then `run('play')`, a tap, at 390×844, 360×640 and 768×1024), the repo's
`tools/astrocade-bundle-test.js`, the game's own unit tests, and the saved draft opened on astrocade.com in
Larisha's signed-in Chrome.

| Game | Change | Draft version | Checked | Ready to publish |
|---|---|---|---|---|
| Reel & Hatch | rare-catch share sends title + text, no image (`js/88_event_ui.js` and built `game.js`) | `01M8E08YG6Q0PMNE747M58XV9D` | 22 unit test files pass; bundle test: started, no errors, tap reaches host; handover at 3 sizes, 0 errors | Yes |
| Pin & Bloom | garden share sends title + text, no image (`src/app.js`); the in-game garden card stays | `01M8E0FTE0EDX7Y5TBZXF2HTX9` | unit test (60 levels) pass; handover at 3 sizes, 0 errors | Yes |
| Paws & Chaos | share sends title + text, no image | `01M8E0GN1WH409YBEY4FW2JZV4` | diff against the pre-fix draft is that one line; syntax check; draft plays on astrocade.com | Yes |
| NEKO ZOOMIES | share sends title + text, no image | `01M8E0GPS902R1AAVC7Q7M3G4R` | draft plays on astrocade.com | Yes |
| Ice Cream Roll Art | share sends title + description, no image | `01M8E0GRE1NNF5MSBWXSBJSTTT` | draft plays on astrocade.com | Yes |
| Grab and Park | share sends title + text, no image (`share_card.js`) | `01M8E0GVGD5YW2MMHFH76CFFD6` | draft plays on astrocade.com | Yes |
| +1 Mega Hammer | opening fly-in runs on real time and the save wait drops from 1.2 to 0.8 s | `01M8E0RMWKPHENKPD2KYEH04J1` | see below; logic tests pass; draft plays on astrocade.com | Yes |
| Voxel Wonderland | title-screen subtitle "Sky Realms" changed to "Sky Island Builder" in all 7 languages, plus the page title | `01M8E0WT5YW2AP3PR9MTM2K9WB` | title fits at 360×640, 390×844 and 768×1024, English and Indonesian; 0 errors | Yes |

**Mega Hammer, what was wrong:** the intro was already tap-skippable after 0.25 s and 3.5 s long, but it
advanced on frame time capped at 0.05 s per frame. On a slow device the 3.5 s intro stretched: at about 6 fps
(headless renderer) it had covered only 2.9 s of intro after 18 s of real time (`fixes/MH-before-9.jpg`).
After the fix the same run reaches play about 5 s after `run('play')` even at 6 fps, and well under that at
normal phone frame rates (`fixes/MH-after-9.jpg`). Same change in the repo: `prototypes/plus-one-mega-hammer/game.js`.

## Final check (27 Nov 08:15–08:40 UTC)

Every share button was pressed in its saved draft, and every untested draft got the feed handover at 3 sizes.
Script: `final/sharetest.js` (draft served locally, host `lib` stubbed, `run('edit')` then `run('play')`, the
game's own share card opened, its real button clicked at 390×844). Test-only hooks are added in memory to open
the card; the saved drafts are unchanged by the test.

| Game | Share call seen by the host | Handover 360×640, 390×844, 768×1024 | Draft version | Ready to publish |
|---|---|---|---|---|
| Reel & Hatch | `title`, `text`; no image; inside the tap | 0 errors (earlier round) | `01M8E08YG6Q0PMNE747M58XV9D` | Yes |
| Pin & Bloom | `title`, `description`, `text`; no image; inside the tap | 0 errors (earlier round) | `01M8E0FTE0EDX7Y5TBZXF2HTX9` | Yes |
| Paws & Chaos | `title`, `text`; no image; inside the tap | 0 errors | `01M8E0GN1WH409YBEY4FW2JZV4` | Yes |
| NEKO ZOOMIES | `title`, `description`, `text`; no image; inside the tap | 0 errors | `01M8E0GPS902R1AAVC7Q7M3G4R` | Yes |
| Ice Cream Roll Art | `title`, `description`; no image; inside the tap | 0 errors | `01M8E0GRE1NNF5MSBWXSBJSTTT` | Yes |
| Grab and Park | `title`, `description`, `text`; no image; inside the tap | 0 errors | `01M8E160J0110A1ZYDQVRVRBXN` (new) | Yes |
| +1 Mega Hammer | no share | 0 errors (earlier round) | `01M8E0RMWKPHENKPD2KYEH04J1` | Yes |
| Voxel Wonderland | no share | 0 errors (earlier round) | `01M8E0WT5YW2AP3PR9MTM2K9WB` | Yes |

Grab and Park got one more draft: its share still waited for a picture it no longer sends before opening the
share sheet, which can lose the tap on a slow phone. That wait is removed, so the sheet opens straight from the
tap. Its draft is now `01M8E160J0110A1ZYDQVRVRBXN`; the earlier `01M8E0GVGD5YW2MMHFH76CFFD6` is superseded.

Screenshots: `final/share-sheet.jpg` (each share card before the press) and `final/handover-sheet.jpg`
(Paws, NEKO, Ice Cream, Grab after handover at 3 sizes).
