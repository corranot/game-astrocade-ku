<!-- PROTOTYPE - NOT FOR PRODUCTION -->
# Chibi base (engine prototype)

**Hypothesis:** the owner's 2D chibi base silhouette (big round head, small body, mitten hands, short legs) can
become one reusable, code-built Three.js character that every game dresses differently, at AAA-cute quality and
inside the mobile budget, with no external assets.

**Status:** concluded (v1). Not wired into any game yet. Snowy Snapshot's code and Astrocade draft were not touched.

## How to run
- Viewer: serve `prototypes/` (any static server) and open `chibi-base/index.html?shot=turn|pip|compare|looks|anim|phone`
  (add `&live` to animate).
- Renders: `node prototypes/chibi-base/capture.js <outDir>` writes one JPG per shot (headless Chromium, swiftshader).

## Module API (`chibi.js`)
- `buildChibi(look)` returns `{ group, mesh, skeleton, bones, head, eyes, pom, stats }`. Origin on the ground,
  facing +z, head top at about 1.8 units (same scale as Snowy's Pip).
- `animateChibi(c, t, dt, { walk 0..1, wave 0..1, look -1..1 })`: idle breathing and sway, blink, walk cycle,
  wave, pom-pom spring. Blends, so a game drives it with its own speed value.
- `attach(c, 'chest' | 'handR' | ..., object)`: props on bones (Pip's camera rides `chest`).
- Look slots (`DEFAULT_LOOK`): `skin`, `blush`, `eyes {color,size}`, `mouth smile|open|cat`,
  `hair {style bob|short|pigtails|none, color}`, `top {color, sleeve 0..1}`, `bottom {color, length 0..1}`, `shoes`,
  `mitts`, `hat {style beanie, color, cuff, pom}`, `coat {color, trim, quilt}`.

## Build
- One skinned body mesh (torso, neck, arms, mitten hands with thumbs, legs, rounded feet) on 12 bones
  (root, hips, spine, chest, neck, head, 2 arms, 2 hands, 2 legs). Weights blend at the shoulders, hips and along
  the spine, so joints bend without seams.
- Profiles traced from the silhouette and resampled on a smooth curve; clothes are vertex colours with a stitch
  line at each edge; the coat is the body profile inflated with real stitched quilt channels, a fluffy collar,
  cuffs and a zip. Head, ears, nose, mouth and blush are one mesh; eyes (iris gradient, two catchlights, lash
  line) are one glossy mesh that blinks; hair is a shell whose radius dips under the skin outside the style's
  mask (scalloped fringe, side locks, nape line, glossy ring).
- Materials: three shared instances, one shader program (`chibi-toy`: soft rim light plus a warm shadow-side
  fill), reused by every chibi on screen.

## Findings (measured 28 Nov, headless Chromium, 4x CPU throttle)
| | Snowy Pip now | chibi base | chibi Pip (coat + beanie) |
|---|---|---|---|
| draw calls | 14 | 4 | 7 (+7 for the camera prop as built in the demo) |
| triangles | 5.5k | 21k | 34k |
| build time | - | 112 ms | 120 ms |
| animate per frame | - | 0.015 ms | 0.015 ms |

- Fits the 150 calls / 300k tris mobile budget easily for 1 to 3 characters. A crowd needs a lower-segment
  variant (the sphere and lathe counts are the only knobs).
- Build cost (~120 ms on a throttled phone) must run after the first frame, or the geometry be built once and
  cloned for repeat looks, to keep the 2 s first-load rule.
- Evidence: `production/qa/evidence/chibi-base/`.

## Team verdict on swapping Snowy's Pip
- Art: the chibi Pip has a real face (big glossy eyes, blush, bangs) and reads as one designed character; the
  current Pip is rounder and chunkier, which reads better at a distance from the follow camera.
- Animation: real skinning gives smooth shoulders and hips, a wave, blinks and a proper walk; the current Pip is
  rigid parts.
- Tech/perf: half the draw calls, 6x the triangles, still small. Needs build-after-first-frame.
- Recommendation: do not swap in the current Snowy publish round (locked). Test it in Snowy's next update with
  in-game follow-camera frames (back view at play distance) before deciding; use the base now for new games'
  heroes and NPCs. Integration cost: about half a day (map `animateHero`'s walk, viewfinder raise, idles and
  lantern onto bones; recolour hooks for the outfit shop).
