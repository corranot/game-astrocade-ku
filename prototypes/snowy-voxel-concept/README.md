# Snowy Snapshot voxel style preview (concept prototype)

PROTOTYPE - NOT FOR PRODUCTION. Never uploaded. The live game is `prototypes/photo-safari/`.

## Hypothesis

A blocky voxel look (cuboid animals with pixel-grain fur, stepped pine trees, 1 m snow columns in 0.5 m layers,
like the chunky-voxel style of trending platform games) makes Snowy Snapshot look much better than its current
soft, rounded style.

## How to run

Serve this folder and open `index.html?local` (same dev hooks as photo-safari). `voxel.js` wraps the three.js
namespace so every sphere, cone, cylinder, torus, disc and gem the game builds comes out as blocks. `world.js` builds
the voxel terrain and voxel pines; `logic.js` steps the ground height to the columns; `critters.js` uses a pixel
grid grain and bigger eyes. HUD, gameplay and lighting are unchanged.

## Status

Concluded (28 Nov). Evidence: `production/qa/evidence/snowy-voxel-concept/`.

## Findings

- Reads clearly and looks fresh; blocks, shadows and bloom work with the existing lighting and grade.
- Loses the cozy-cute charm that carries Snowy: faces become flat (no rounded cheeks or glossy eyes), the pine
  forest turns darker and heavier, and the stepped ground adds visual noise behind the animals.
- Triangles +26% (512k vs 406k at the start view), draw calls unchanged.
- An automatic conversion is not enough. A real voxel version needs hand-made models for every species and rare,
  pixel face textures, voxel props and a new art pass, about 2 to 3 days plus a full QA and review round.
- Recommendation: keep the current style for Snowy; consider voxel for a new game built for it from the start.
