# Snowy Snapshot blocky characters preview, v2 (concept prototype)

PROTOTYPE - NOT FOR PRODUCTION. Never uploaded. The live game is `prototypes/photo-safari/`.

## Hypothesis

Matching Parkour Cat's real technique (blocky, pixel-skinned characters in a soft low-poly world, see
`production/market/2026-11-28T0015-parkour-cat-3d-study/report.md`) makes Snowy look much better. v1
(`../snowy-voxel-concept/`) also turned the ground into voxels, which Parkour Cat does not do.

## How to run

Serve this folder and open `index.html?local`. Only `critters.js` differs from photo-safari: animals and Pip build
from a block-only copy of three.js (`voxel.js`), fur gets a pixel-grid grain, and eyes are pixel art on a tiny
nearest-filtered canvas. The world, HUD and gameplay are unchanged.

## Status

Concluded (28 Nov). Evidence: `production/qa/evidence/snowy-blocky-concept/`.

## Findings

- Much closer to the reference than v1; the world already matches its technique.
- Blocky animals read clearly, but faces lose the round cheeks and glossy eyes that make Snowy's close-up photos
  cute; it suits far-camera action games better than a close-up photo game.
- Triangles about the same as current (386k vs 406k); one extra texture.
- A proper version would need hand-painted pixel skins for all 28 animals and Pip, about 1.5 to 2 days plus QA.
