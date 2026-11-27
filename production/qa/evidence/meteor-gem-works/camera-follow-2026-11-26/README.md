# Meteor Gems: camera follows the hero (2026-11-26)

Owner report: the camera did not follow the character.

**Cause.** `camera.zMin -6.0` / `camera.zMax -3.8` (added with the HUD-grid round) clamped the camera's
look point to a 2.2-unit strip in front of the meteor. The deck runs from z -1.2 to 16.5, so walking toward
the front of the town left the camera parked and the hero slid down and off the screen. `lean 0.7` and
`followX 0.7` also let the hero drift on screen.

**Fix.** `lean 1` (the look point is always `hero.z - ahead`), `followX 0.85`, clamp opened to
`zMin -7` / `zMax 12` (only a safety rail now). Damping (`follow 3`) and velocity look-ahead (`lead`)
unchanged; cinematic beats ease back to the follow as before.

**Check** (`follow.js`: walk to each far corner and the meteor, sample hero screen position every second).
Hero screen y settles at 0.58 (390x844) / 0.60 (360x640) at every spot; x within 0.38-0.62.
After a 1.5 s cinematic on the meteor the hero is back at 0.58 within 2 s.

| spot | 390x844 (x, y) | 360x640 (x, y) |
|---|---|---|
| NW corner | 0.39, 0.58 | 0.38, 0.60 |
| NE corner | 0.62, 0.58 | 0.62, 0.60 |
| SW corner | 0.38, 0.58 | 0.38, 0.60 |
| SE corner | 0.62, 0.58 | 0.62, 0.60 |
| meteor | 0.50, 0.58 | 0.50, 0.60 |
| after cinematic | 0.50, 0.58 | 0.50, 0.60 |

Screenshots: `cf-390-*.jpg`, `cf-360-*.jpg`, `cf-sheet.jpg`. Not proven: feel on a real phone.
