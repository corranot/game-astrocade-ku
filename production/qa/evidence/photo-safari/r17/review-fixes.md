# Snowy Snapshot, round 17: fixes from the visual review (28 Nov)

The coordinator reviewed every round 16 frame and asked for four fixes. Base: round 16 draft 01M8FYCMVVNCG69DJZZSJXC5G7.

**Result:** new draft **01M8G049JTWPN8Y1NA249MFWBG** (sync token db74d9f82e52d9566b564ca6f05e6ff1). All 10 files were
pulled back and verified byte for byte. It is not published. Fallback: r16 01M8FYCMVVNCG69DJZZSJXC5G7.

## Fixes

| # | Finding | Cause | Fix |
|---|---|---|---|
| 1 | Shop items tiny and faded on a big empty page | The tour shot the tab while the cards were still popping in (0.3x scale). At rest it is a 3x3 card grid. | Prices you can't afford yet now use ink text on cream (they were white on beige). The tour now waits for the pop-in to finish. |
| 2 | Pitch extremes: near top-down, or a frame of plain snow | Look tilt allowed +0.62 / -0.5 rad on top of a 0.66 rad base | `camera.look.elUp` 0.12, `elDown` 0.4. Pip stays readable, and the crystals and trees stay in view. |
| 3 | An almost pure white viewfinder | The viewfinder aimed at a penguin behind a hill, so the lens filled with snow | New `W.seeLine`: an animal hidden by a hill or a rock is never the aim target. |
| 4 | The lake crack barely showed; fish faint | The crack was a bright glow on bright ice, so it washed out | The crack is now a dark blue line spreading from the crack point, held 1.5 s before it fades. The fish shadows are about 1.4x larger and darker. |
| 5 | (found in QA) Tutorial could stay on "walk" | The walk step needed the fox to be the nearest animal; the rare visitor can stand 0.1 m nearer | Any animal in range now completes the walk step; the snap step already accepts any animal. |

## Regression

| Check | Result |
|---|---|
| Unit tests | 29/29 |
| Full playtest | 108/108 (fixed the tie above; the walk window in the check was widened from z 0.6 to 0.2) |
| Feed bundle test | errors: [] |
| Controls tour 360/768 + Arabic, comfort tour fresh/returning 360/768 + Arabic, life tour 360/768 | 0 errors |
| 4G first frame, 6 runs interleaved (this session's machine is slower) | r16 2.20 / 2.40 / 2.20 / 2.61 / 2.31 / 2.32 s, r17 2.29 / 2.35 / 2.46 / 2.27 / 2.21 / 2.60 s; both medians 2.32 s |

## Evidence

Contact sheet `r17-sheet.jpg` (also `/mnt/project-files/snowy/final/r17-sheet.jpg`). Frames: `ctl-*`, `ctlar-*`,
`cf-*`, `cfar-*`, `life-*`.
