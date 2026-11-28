# Snowy Snapshot, round 19: chibi Pip (28 Nov)

Pip is now the anatomical chibi from `prototypes/chibi-base`. Base: r18 draft 01M8G18CDMTGPZ0PDSPF54G220.

**Result:** new draft **01M8G3B3F1MHER5EERAMNVAR41** (sync token 92204f0821034456f0a2106c5edd9576). All 12 files were
pulled back and verified byte for byte against the upload. Not published. Fallback: r18 01M8G18CDMTGPZ0PDSPF54G220.

## What changed

| Area | Change |
|---|---|
| Rig anatomy (chibi-base, also used here) | Rest pose is the neutral human stance: palms face the thighs, thumbs point forward on the radial side. Pronation and supination are the forearm twist bone (the hand now hangs from it); the wrist never rolls, it only flexes (70 deg) and extends (80 deg) and deviates radial (20 deg) and ulnar (30 deg). The thumb CMC sits at the base of the palm on the radial side and flexes toward the palm; the finger mass curls toward the palm only. The wave supinates the forearm so the palm faces out. |
| Hero | `pip.js` dresses the chibi as Pip: quilted parka and sleeves in the outfit colour, beanie and mittens in the hat colour, the instant camera on the chest (spine3), the lantern on the belt (pelvis). Scaled to 2.0 m head top, the same reading size from the back camera as before. |
| Animation | Walk, look-at and breathing come from the rig. A hero pose layer runs before the joint clamp: camera raise (upper arms forward, elbows bent, palms on the camera's sides, the camera lifts from the chest to the eye), and the idles warm (rub mitts), stamp (boots) and peek (lift the camera to look at it). The lantern swings with the walk. |
| Outfits | A shop outfit rebuilds the rig with the new colours (vertex colours, no new shader); the camera colour stays a material tint. |
| Load | `pip.js` and `chibi.js` are fetched at the first frame and built `hero.pipAfterFrames` (8) frames later, with the shader compiled through `compileAsync` before Pip is added. Pip pops up out of the snow with a soft puff. |
| Collider, shadow | Unchanged collider (`hero.radius`); every Pip mesh casts a shadow. |
| Cleanup | The old `buildHero`/`animateHero` left `critters.js`; the chibi-base comparison shot keeps a frozen copy in `prototypes/chibi-base/old-pip.js`. |

## Checks

| Check | Result |
|---|---|
| Unit tests | 29/29 pass |
| Full playtest | 108/108 |
| Feed bundle test (upload set) | errors: [] |
| Comfort tour fresh and returning, 360 and 768, plus Arabic | 0 errors; FTUE, snap, card, book, shop, night |
| Controls tour 360 and 768, plus Arabic 360 | 0 errors; Pip framed in spins, low pitch, gate and edge |
| Cinematics (area unlock) and corner views | Beat plays; Pip framed in the corner views |
| Share card | `lib.share({ title, text })`, no image |
| Hero cost | 11 draws, 39.3k tris (before: about 15 small meshes) |
| Frame-time self-check (swiftshader, relative only) | Mid phone: game code 25.7 ms a frame vs 25.0 on r18, 123 vs 126 draw calls. Low-end: 37.6 vs 32.3 ms at 6x CPU. |
| 4G first frame, 3 runs interleaved | r18 2.43 / 2.53 / 2.34 s; r19 2.42 / 2.23 / 2.31 s; same within noise |

Test-tool notes: in paused (stepped) tours the Pip build waits for the event loop, so a frame taken right after a
synchronous `step()` can show the spotlight before Pip arrives; in real time Pip is there at 0.5 s (comfort a01).
The Arabic controls tour drags the left side while the RTL stick sits on the right, as in earlier rounds.

## Evidence

Frames here and in the shared project files under `snowy/chibi-pip/` (full-size `contact-sheet.jpg` there):
`pip-*` (back camera, close-ups, wrist per pose, camera raise, stamp, outfits), `cf-*`, `cfar-*`, `ctl-*`, `ctlar-*`,
`cine-*`, `share-360.jpg`, `chibi-pip-sheet.jpg`. Rig shots (outer side, front, 3/4, walk, wave; stress poses):
`production/qa/evidence/chibi-base/`.
