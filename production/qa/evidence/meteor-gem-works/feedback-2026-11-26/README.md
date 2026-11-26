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
