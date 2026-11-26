# Meteor Gems: audit playtest on the real draft page (2026-11-26)

Draft version `01M8CWSD8CYQGR41EYW4R4H0KQ` (sync_token `c028e603…`), PRs 242 and 249.
Played in the owner's signed-in ChromeOS Chrome on the real draft page (Claude in Chrome), plus the same build
locally in a 390x844 phone viewport for the long run.

## How it was played

- **Real page (Chrome):** host Play overlay, CONTINUE on her existing save, then walked with the keyboard. The
  Chrome tool's drag is press-move-release in one instant, so the hold-to-walk joystick never moves; repeated
  `W/A/S/D` presses (100 per call) do walk. Taps on the sparkle, album and cheer toy work. The game iframe is
  sandboxed: its console and JS are not reachable from the extension, so console errors and FPS on the real page
  are not observable.
- **Same build, local:** `pull_game` files compared with `tools/astrocade-upload-set.sh` output of main
  (`4b66277`): game.js, scene.js, logic.js, models.js identical; game_config.json identical to the repo file.
  Runs: feed handover (`run('edit')` then `run('play')`, intro on), bot fast-forward through all 14 unlocks with a
  shot at each beat, held-stick walks to the corners, `tools/astrocade-bundle-test.js`, `tools/load-time.js`.

## Pass / fail

| Check | Result | Evidence |
|---|---|---|
| Meteor visible after intro, real page | PASS | `02-after-continue-meteor-visible.jpg` |
| Meteor lands after feed handover (edit then play, intro on) | PASS | `l01-feed-handover-meteor-landed.jpg` |
| Bundle test (host rules) | PASS: started, 0 errors, 0 console.error, tap reaches host | `bundle.txt` numbers below |
| Load time on phone profile | FAIL vs 2 s target (see numbers; software GL inflates) | below |
| Perfect strike + sparkle clears, real page | PASS | `09-perfect-strike.jpg`, `10-sparkle-cleared.jpg` |
| Egg hatch + cinematic beat, real page | PASS (Shiny, banner, camera back after) | `11-hatch-shiny-cine.jpg`, `12-after-hatch-camera-back.jpg` |
| Polish, sell, coins, builds, cinematics (all 14 unlocks) | PASS, every unlock fires its banner beat | `l04`, `l05`, `l06` |
| FTUE spotlight steps (pick up, polish, sell) | PASS on a fresh local save | `l02`, `l03` |
| Camera follows hero to all 4 corners, real page | PASS, hero stays framed (x 37-62%, y ~57%) | `05`-`08` |
| Camera follows at corners, late game local | PASS | `l09`, `l10`, `l11` |
| Guide trail starts at hero, points to goal | PASS in every corner shot | `05`-`08` |
| HUD top row grid (coin plaque, NEXT card + gold bar, button column) | PASS, aligned; NEXT bar fills (56/60) | `16-hud-top-row.jpg` |
| Album and cheer toy buttons | PASS | real page taps |
| Dusk/night look, "come back tomorrow" banner | NOT VERIFIED this round (my fast-forward clashed with time-of-day easing and a beat; shots inconclusive) | - |
| Console errors / FPS on real page | NOT OBSERVABLE from the extension (sandboxed iframe) | - |

Numbers: `load-time.js` (390x844, 4x CPU, software GL), first drawn frame 4G 4.1 / 5.0 s, slow 4G 5.7 / 5.1 s;
three.js ready 0.4 s on 4G; game `done` 2.0-2.5 s; 292 kB transferred. Bundle test: 319 kB bundle, feed start
7.3 s in headless software GL. Software GL makes these slower than a real phone; compare with earlier runs, not a device.

## Bugs, by severity

1. **Medium: the hero disappears inside stations.** Standing at the polisher (and at a busy stand) the hero is fully
   hidden by the station model and the tourist crowd; only the guide trail start shows where they are. A child
   loses their character exactly while working. Seen on the real page:
   `13-bug-hero-hidden-at-polisher.jpg`, `14-hero-reappears.jpg`, `15-bug-hero-hidden-at-stand.jpg`.
   Fix idea: an always-on-top hero silhouette/outline when occluded, or move the work spot in front of the station.
2. **Medium: "TAP THE SPARKLE!" hint sits under the carry count.** The tap hint and the `2/25` carry label share a
   spot, so it reads "2/25 THE SPARKLE!" (the word TAP is covered). Real page, twice:
   `03-bug-hint-under-carry-count.jpg`. Fix: offset the hint above the carry label, or hide the label while it shows.
3. **Low-medium: front shops render as big flat slabs at the bottom of the frame.** When the camera follows the hero
   to the front of the deck, the roofs of the front-row shops fill the bottom band as plain dark-grey (early game)
   or red (late game) boxes, seen from above. They look primitive and sit where the bottom hint band is.
   `08-corner-se-gray-block.jpg`, `l02-ftue-sell-gray-roof-slabs.jpg`, `l07-gray-roof-slabs-closeup.jpg`,
   `l11-late-corner-s-red-roof.jpg`. Fix idea: fade or cut front shops near the camera (like the earlier
   "front fence no roofs" fix), or give the roofs detail.
4. **Low: title card shows 0 coins.** Behind the CONTINUE/NEW GAME card the coin plaque says 0; it jumps to the
   saved value (7) only after CONTINUE. `01-title-continue.jpg`.
5. **Low: egg hatch spot is tighter than it looks.** On the real page the hero stood visually on the egg for
   several seconds without hatching; a few more steps were needed (`egg.r` 1 m). Kids may think it is broken.
6. **Low: the carry label overlaps world bubbles at the stand** (`1/25` over the stand's gem bubble).

## Polish gaps

- Late game is busy: many station bubbles, coin pads, critter parade and pops overlap around the stands
  (`l08-late-game-bubble-clutter.jpg`). Consider showing only the next-goal bubble plus nearby ones.
- The sparkle can appear while the hero is far away and the meteor is off-frame; nothing tells the player.
- Polisher badge clips at the left screen edge when the target is just off-frame (`12-after-hatch-camera-back.jpg`).
- Load: first frame is ~4-5 s on the software-GL phone profile vs the 2 s rule; needs a real-phone check.

## Not verifiable here

Real-phone FPS and touch feel, console errors inside the real page's iframe, dusk/night and the "come back
tomorrow" banner in this round, audio.

Screenshots: `production/qa/evidence/meteor-gem-works/chrome-audit-2026-11-26/` (also in project files
`meteor-gem-works-world/chrome-audit/`). Files 01-16 are from the real draft page; `l01`-`l11` from the same build
locally.
