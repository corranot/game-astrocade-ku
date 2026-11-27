# Wonder Sprout: publish readiness (28 Nov, before the 15:00 WIB publish)

Verdict: **ready: yes**, with one open risk (FPS on a real phone, see QA).

## Retention audit

Method: the headless pacing bot (`tests/sim.mjs`) played 5 seeds for 20 minutes and 3 seeds for 40 minutes. It played with and without the "Fill it!" rush, and garden goals were on.

| Minute | Hook (bot median) |
|---|---|
| 0:40 | First landmark (Honey Bakery), first egg hatched |
| 2-3 | Landmarks 2 and 3; hero evolves to stage 2 (2:20-2:35) |
| 4-6 | Landmark 4 (Ferris Wheel: gems while away), sky pirates raid |
| 6-8 | Landmark 5, hero stage 3 (6:15-7:40) |
| 8 | "Gift egg tomorrow!" promise (once a day) |
| 11-12 | Sky Lighthouse, island complete, rainbow and fanfare, then "Make it golden!" |
| 12-40 | **New:** Golden Garden. Gild the six landmarks one at a time, one every 4-6 minutes. Each gild has a camera beat, fireworks, a gold shimmer sound and +10% gems. The garden is fully gold at about 35-40 minutes. |

**Gaps found:**
1. After the island was complete (about 12 minutes) nothing was left to build, so gaps between events reached 200 seconds.
2. Tomorrow's gift egg existed but was never promised, so players had no visible reason to return.

**Fixes:** the Golden Garden and the daily "gift egg tomorrow" toast. A pacing test now guards both the gild cadence and the earlier windows.

**Players' Choice levers:**

| Lever | How the game serves it |
|---|---|
| Retention (×15) | Gift egg each new day, promised in game. Ferris Wheel gems while away. Garden goals and the gold landmarks carry over. |
| Over-5-minute share (×10) | Four landmarks, one evolution, a raid and about 8 goals land inside the first 5 minutes. Nothing ends the session before 12 minutes. |
| p50 / p75 | Measurable only after launch. |

## Audio and juice pass

Added:
- A gold shimmer sound for each gild.
- Gem-arrival ticks on the counter, rate-limited.
- A soft landing thud and a wall bump.
- An egg whoosh followed by a pop.
- A sting on planting.
- Haptic taps on welcome, gift and goal.
- Rolling gem and wood counters.

## Bug hunt and QA

Bug fixed: the music-off setting was lost on reload, because it was not kept in the save. A regression test was watched failing before the fix and passing after it.

| Check | Result |
|---|---|
| Unit and pacing tests | 26 pass |
| `ci-checks.sh` | pass |
| Feed bundle test | 0 errors |
| Feed handover (edit, then play) | ok |
| Screens | 54, 0 errors: FTUE complete, 7 languages, Arabic mirrored, 360×640 / 390×844 / 430×932 / 768×1024 |
| First frame | 0.7-0.8 s on 4G, 1.0-1.3 s on slow 4G (60 kB gz) |

**Open risk:** FPS on a real phone is unproven. The container only has software rendering: 45-57 fps unthrottled, and 8-12 fps with the CPU slowed 4×. With the CPU slowed, the quality watchdog drops to tier 0. A real mid-range phone draws canvas on the GPU, so it should be far faster. A 30-second check on a real phone before publishing is advised.

## Distribution

| Field | Value |
|---|---|
| Title | **Wonder Sprout** (13 characters, unique, no brand words) |
| Description | **"Fling, bounce & smash for star-gems! Hatch eggs, evolve cute critters and grow a golden sky-garden on your floating island."** (123 characters, verb-led, unique) |
| Row | Creature collection (36% Players' Choice conversion) plus a long goal (landmarks, then the gold garden). |

Not toys: the game has a leaderboard.

Suggested updates after launch:
- Day 3: Amber-Owl and Star-Unicorn.
- Day 6: island 2.
- Day 9: rebirth.

## Expert-team verdict per discipline

| Discipline | Ready | Note |
|---|---|---|
| Creative | yes | Cozy sky-garden fantasy holds from the first fling to the gold garden. |
| Art | yes | Scorecard average 8.3/10, every screen ≥8, materials 8.0. |
| Retention | yes | Hooks every 1-5 minutes up to about 40 minutes; reason to return each day. |
| Audio | yes | Every interaction has a sound; music ducks under big moments. |
| UX | yes | Mandatory FTUE, fixed HUD grid, one badge, one toast spot. |
| QA | yes* | *Real-phone FPS not yet measured. |
