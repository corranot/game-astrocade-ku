# Meteor Gems: final polish before publish (2026-11-26)

Fixes for the audit playtest on the real draft (`production/qa/evidence/meteor-gem-works/chrome-audit-2026-11-26/`).
Shots are a local 390x844 run of the same build (software GL).

| Audit item | Fix | Evidence |
|---|---|---|
| Hero hidden at the polisher and behind stands/crowds | The hero writes the stencil; a cyan silhouette (`look.silhouette`, `look.silhouetteAlpha`) draws wherever something hides the hero | `01-hero-polisher-before-after.jpg`, `07-hero-stand.jpg` |
| "TAP THE SPARKLE!" under the carry count | The carry count picks the first free slot (over the stack, right, left, under the feet) clear of badges, the order bubble and the sparkle tip; it keeps its slot while free, so it does not flicker | `03-sparkle-vs-carry-before-after.jpg` |
| Front houses as flat grey/red slabs | Every false-front building gets a pitched shingle roof (two-tone rows, ridge beam, chimney), so the ghost town and the shops read as roofs from the high camera | `02-front-roofs-before-after.jpg`, `08-front-corner.jpg` |
| Title card shows 0 coins | The coin plaque shows the saved wallet behind CONTINUE / NEW GAME and holds it while the card is up | - |
| Egg hatch spot tighter than it looks | `egg.r` 1 to 1.6 (ring 0.95 plus the hero's body) | - |
| Carry label over a stand badge | Same slot picker as above (badge positions come from the scene) | `07-hero-stand.jpg` |
| Late-game bubble clutter | Only the 4 nearest built stops within 8 m keep their small badge (`look.badgeMax`, `look.badgeNear`); the target keeps its big one | `04-dusk.jpg` |
| Sparkle while the meteor is off screen | A new sparkle waits until the meteor is on screen (real play only; the bot and tests are unchanged) | - |
| Dusk/night and "come back tomorrow" not verified | Shot after the beats settle | `04-dusk.jpg`, `05-night.jpg`, `06-come-back-tomorrow.jpg` |
| First frame 4-5 s | Before the first picture, only shaders for what is on screen compile; later unlocks and effects compile right after | numbers below |

Load (tools/load-time.js, 390x844, 4x CPU, 4G, software GL). Before (main): first frame 4.85 / 4.37 s.
After: 4.62 / 4.35 / 4.22 s. Our JavaScript is about 0.6 s of self time. three.js is ready at 0.4 s, and the game
builds by 2.5-2.7 s. The rest is native software-GL work (shader compile and raster, "(program)" ~5 s in the profile).
A phone GPU with parallel shader compile should cut most of that, but this is NOT MEASURED here.
The warm-sky loader frame shows from the first paint.

Note: some shots show the HUD dimmed because the first-time tutorial is active in these test sessions.
