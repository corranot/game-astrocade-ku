# Snowy Snapshot, round 18: final review fixes (28 Nov)

The coordinator's last review of round 17 asked for three fixes. Base: round 17 draft 01M8G049JTWPN8Y1NA249MFWBG.

**Result:** final draft **01M8G18CDMTGPZ0PDSPF54G220** (sync token 9edd9204e95fca977e7f0ad31d25f116). All 10 files were
pulled back and verified byte for byte. It is not published. Fallback: r17 01M8G049JTWPN8Y1NA249MFWBG.

## Fixes

| # | Finding | Cause | Fix |
|---|---|---|---|
| 1 | A dark brown pyramid at the bottom of the low-pitch frame | A lamp post's roof right under the camera (found by hiding meshes one by one) | Lamps (post and bulb) hide while the camera is within `camera.lampHideM` (3.6 m) of the lamp head. Rocks, cover and props also dither away within `camera.nearFadeM` (1.6 to 3.0 m) of the lens. |
| 2 | Shop at 768: the grid filled only the top half | **A real bug.** While the tab's pop-in class was on, any rebuild of the book (for example after a photo) restarted the pop-in, so cards could keep popping at small scale | The pop-in class is removed 0.7 s after a tab turn, so cards pop once and stay put. At rest the 768 shop is a full 3-column grid that scrolls. |
| 3 | The lake crack was hard to read at 360 | Cracks opened at a random point on the lake, often off-screen | Cracks now open 4 to 8 m ahead of where the player is looking (`alive.crackAheadM`), inside the ice, with a small ice sparkle burst and a tiny camera rumble (off under reduced motion). The line is wider and darker. |

## Regression

| Check | Result |
|---|---|
| Unit tests | 29/29 |
| Full playtest | 108/108 |
| Feed bundle test | errors: [] |
| Controls tour 360/768 + Arabic, comfort tour fresh/returning 360/768 + Arabic, life tour 360/768 | 0 errors |
| 4G first frame, 6 runs interleaved | r17 2.43 / 2.40 / 2.55 s, r18 2.34 / 2.62 / 2.38 s; medians 2.43 vs 2.38 s, same within noise |

## Evidence

Contact sheet `r18-sheet.jpg` (also `/mnt/project-files/snowy/final/r18-sheet.jpg`). Frames: `ctl-*`, `ctlar-*`,
`cf-*`, `cfar-*`, `life-*`.
