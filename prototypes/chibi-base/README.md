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
  `mitts`, `hat {style beanie, color, cuff, pom}`, `coat {color, trim, quilt}`, `build chibi|tall`.
- `build: 'chibi'` (default) matches the owner's silhouette: head about 40% of the height and wider than the
  shoulders (body x0.8, head x1.25, mittens x1.22, scaled on bones). `'tall'` keeps the longer first proportions.

## Build
- One skinned body mesh on an anatomical 31-bone skeleton at chibi scale: root, pelvis, spine1-3, neck, head;
  per side clavicle, upper arm (shoulder), forearm (elbow hinge), forearm twist, hand (wrist), thumb CMC and
  MCP/IP, finger mass; thigh (hip), shin (knee hinge), foot (ankle), toe (ball). Euler order ZXY so a limb's own
  twist applies first.
- `LIMITS` holds each joint's human range of motion (left side; right mirrors). `clampToLimits` runs every frame
  after animation and poses, so nothing bends past anatomy (elbows and knees bend one way only).
- Skin weights blend over each joint (shoulder cap to clavicle, soft elbow and knee, ankle, ball of the foot);
  the forearm twist bone carries half the wrist roll, spread along the forearm, so turning the wrist does not
  pinch the sleeve. `groundFeet` keeps the lowest foot on the floor in every pose.
- Mitten: palm and finger mass as one shape, the thumb a lobe sunk into it high on the body side near the wrist,
  and a soft knit cuff when mitts are worn.
- Profiles traced from the silhouette and resampled on a smooth curve; clothes are vertex colours with a stitch
  line at each edge; the coat is the body profile inflated with stitched quilt channels, a fluffy collar, cuffs and
  a zip. Head, ears, nose, mouth and blush are one mesh; eyes are one glossy mesh that blinks; hair is a shell whose
  radius dips under the skin outside the style's mask.
- Materials: three shared instances, one shader program (`chibi-toy`).

## Findings (measured 28 Nov, headless Chromium, 4x CPU throttle)
| | Snowy Pip now | chibi base | chibi Pip (coat + beanie) |
|---|---|---|---|
| draw calls | 14 | 4 | 7 (+7 for the camera prop as built in the demo) |
| triangles | 5.5k | 24k | 38k |
| bones | rigid groups | 31 | 31 |
| build time | - | 132 ms | 173 ms |
| animate per frame | - | 0.13 ms (incl. limits and foot grounding) | 0.13 ms |

- Stress poses (`?shot=stress`: wave, arms up, squat, reach, look around) all keep the mittens clear of the head
  (`headClearance`, printed by `capture.js`: 0.035 to 0.19 m). Straight-up arms are impossible at chibi
  proportions (the head is wider than the reach), so "arms up" is a cheering V and the wave is beside the cheek.
- Fits the 150 calls / 300k tris mobile budget for 1 to 3 characters. A crowd needs a lower-segment variant.
- Build cost must run after the first frame (or build once and clone) to keep the 2 s first-load rule.
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
