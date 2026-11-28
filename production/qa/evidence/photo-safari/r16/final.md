# Snowy Snapshot, round 16: the last alive details and the final regression (28 Nov)

This round builds the life details that waited in round 15 and then runs a final end-to-end regression. Base: round 15
draft 01M8FXD24XA4M4TA1Y93S28AME.

**Result:** new draft **01M8FYCMVVNCG69DJZZSJXC5G7** (sync token a12c6ae753b26315d3f0943678a3da28). All 10 files were
pulled back and verified byte for byte against the upload. It is not published. Fallbacks: r15
01M8FXD24XA4M4TA1Y93S28AME, then r14 01M8FW4V2JR71J4EQXV4SHYK40.

## What shipped

| # | Change | Discipline |
|---|---|---|
| 1 | **Footprints fill with snow**: after 3 s a print brightens from blue shadow to fresh white, then shrinks away over its last 4 s (30 s life, `alive.printS`). | VFX |
| 2 | **Ear and head flicks**: a quick 0.4 s twitch joins the idles (sniff, shake, look around). | Animation |
| 3 | **Pair play**: two free, idle animals within 4 m sometimes bounce, bob and wag at each other for 1.8 s, every 8 to 16 s. A pose or its cue cancels play at once, so photo timing is unchanged. | Animation / Gameplay feel |
| 4 | **Fish under the ice**: four soft fish shadows glide in loops under the frozen lake (shader only, no new meshes). | Environment / Tech art |
| 5 | **Cracking ice**: every 7 to 14 s near the lake, a crack glows along the ice lines from a point near Pip, with a panned creak. | Environment / Audio |

All values live in `game_config.json` under `alive`. Life effects use their own random stream, so seeded poses,
rares and requests are unchanged.

## What waits

| Idea | Why |
|---|---|
| A full day-to-night shift during one session | It changes when night animals appear, which changes pacing and book completion time. Better as its own round with a pacing playtest. |

Ear flicks are a head-and-ear twitch, because the ears are part of the head mesh; separate ear pivots wait for a
model pass.

## Final regression

| Check | Result |
|---|---|
| Unit tests / CI checks | 29/29, pass |
| Full playtest | 108/108 |
| Feed bundle test (upload set) | errors: [] |
| Controls tour 360 and 768, plus Arabic | 0 errors, Pip framed in every frame |
| Comfort tour fresh and returning, 360 and 768, plus Arabic | 0 errors; FTUE, snap, photo card and book work |
| Life tour 360 and 768 (prints, crack, fish, pair play) | 0 errors |
| 4G first frame, 6 runs interleaved | r15 1.92 / 1.96 / 1.90 / 2.09 / 2.04 / 2.06 s (median 2.00); r16 2.16 / 1.99 / 2.01 / 2.10 / 2.07 / 2.04 s (median 2.05), same within noise |

Test-tool note: the shutter breathes, so Playwright's "element is stable" wait never ends on it. The comfort tour
clicks it with `force: true`. Real taps and the playtest's mouse clicks are unaffected.

## Evidence

Frames in this folder (also in the shared project files under `snowy/final/`): `ctl-*`, `comfort-*`, `life2-*`.
