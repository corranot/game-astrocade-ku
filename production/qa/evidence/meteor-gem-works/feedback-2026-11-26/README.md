# Meteor Gems: owner feedback round (2026-11-26)

Feedback: camera POV too low, coin pads need a progress bar, a tapped sparkle lingers, the
"come back tomorrow" banner is untidy, plus a sweep for problems nobody named.

## Bugs found and fixed
| # | Bug | Root cause | Fix | Evidence |
|---|-----|-----------|-----|----------|
| 1 | Camera too low; crowd and props hide the plaza | pitch 0.32 / ahead 10 looked across the ground | `camera.pitch` 0.66, `camera.ahead` 5.5 (tested 0.55/7, 0.62/6, 0.66/5.5, 0.70/5) | `before-*.jpg` vs `after-*.jpg` |
| 2 | Coin pads show no progress | pad face had only icon + number | fill bar (gold, grows as coins drain in) + coins left; ring + confetti on completion | `padtex.jpg` (0%, done icon, 60%) |
| 3 | Sparkle stays after a tap / Perfect | Perfect Strike clears `S.glint` without a `glintGone` event, so the scene star never hid | scene syncs to logic each frame (`glintState.on && !S.glint` hides it) | smoke: after tap logic=false, scene=false |
| 4 | "Come back tomorrow" banner untidy | `left:50%` shrink-to-fit squeezed it to half width; it sat over the toy button; long titles overflowed | centred with `margin-inline:auto; width:max-content`, placed on the HUD grid below the button column, text wraps balanced | `tmrB-*` (before) vs `tmrA-*` (after), 4 sizes |
| 5 | HUD could stay invisible after a cinematic beat (found in sweep) | WAAPI fade kept opacity 0 and was never reversed | replaced by a CSS class fade on `#app.cinema` | after shots |
| 6 | CI evidence-size failure from main (found in sweep) | two rub-it-away evidence JPGs over 250 KB | shrunk with `tools/evidence-shrink.py` | CI |

## Noted, not fixed
- Station goal badge can clip at the screen edge on narrow phones.
- In bot runs (no touch) the "DRAG TO MOVE" hint can sit under the share button; real players dismiss the hint with their first drag.

## Checks
- `logic.test.mjs`: 29 pass, 0 fail. `tools/ci-checks.sh`: all passed.
- Bundle test: started, no errors, empty `fail`, `movesBeforeTouch` and `tapChangedScreen` true.
- Not proven: FPS and look on a real phone.

## Round 2 (coordinator visual review)
| # | Issue | Root cause | Fix | Evidence |
|---|-------|-----------|-----|----------|
| 7 | Tomorrow banner looked see-through and sat over the meteor | entry animation started at opacity 0; banner on row 4 over the meteor | entry pops by scale only (always opaque), banner moved to row 2 between the button columns (`max-width` keeps it off them), title gets an ink shadow, goal pill hides while a banner shows | `tmrA-v2-*` (4 sizes) |
| 8 | Frame looked washed out during beats (NEW FRIEND, unlocks) | tier-2 tilt-shift blurred the meteor itself (band 0.1 around the hero) | tilt band 0.34, amount 0.6 (only the far background softens); during beats tilt drops 70%, contrast +0.1, vignette +0.12; focus light 3 -> 1.6 | `tilt-before-v2.jpg` (tilt on / off), `after-v2-*` |
| 9 | DRAG TO MOVE over the hero and pads | hint 150 u above the bottom | hint in the bottom safe band; hidden while the share button shows | `tmrA-v2-*` |
| 10 | Target badge clipped at the screen edge | badge drawn at its world spot | vertex shader clamps the target badge inside 95% of the frame when it is partly on screen (off-screen goals keep the edge arrow) | `tmrA-v2-360x640` |
