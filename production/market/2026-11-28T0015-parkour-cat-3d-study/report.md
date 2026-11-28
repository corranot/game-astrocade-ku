# Parkour Cat: in-game 3D technique (28 Nov 2026)

Game: Parkour Cat by blackwidowink, `01M7VBDFW0YNCWHA295RA54PB8`. Looked at as a guest on the live page with a
headless browser (frames 01-05) and by reading the page's game code. Asked by Larisha to see the real in-game look
before judging a blocky style for Snowy Snapshot.

## What the style really is

It is **not a voxel world**. It is blocky, pixel-skinned characters in a soft low-poly world.

| Part | Technique |
|---|---|
| Hero cat | A 13-bone box rig (head, chest, hips, arms, forearms, legs, shins, tail). Its skin is painted in code onto a small canvas atlas (cube-net per box) with per-pixel colour jitter, stripes, sunglasses with a glint and a mouth, sampled with nearest filtering. A low-poly bandana sits on top. |
| Zombies | Bevelled, slightly jittered boxes with vertex colours, animated on the GPU in the vertex shader, instanced (up to 160). |
| World | Procedural low-poly kit: faceted pine skirts, blob oaks, lathe and tube props, city/harbour/beach sets. Vertex colours, baked height AO, a top-light tint. Instanced grass tufts and flowers. Ground tiles coloured per quad. |
| Materials | Mostly MeshLambertMaterial with vertex colours, a few MeshStandardMaterial. |
| Light | Hemisphere + directional sun, soft shadow maps (planar fake shadows on low tiers), ACES tone mapping, fog. No bloom pass; tracers and hit rings glow additively. |
| Camera | High three-quarter follow camera, fov 52; the cat is small on screen. |
| Performance | Auto quality tiers, a draw-call cap of 150, shaders warmed with compileAsync before play. |
| Boot screen | The running cat is a pre-rendered 24-frame sprite sheet (frame 06), so it costs no 3D work while loading. |

## What it means for Snowy

Snowy's world already uses the same technique (low-poly faceted pines, vertex colours, baked AO, soft shadows). The
only real difference is the characters. Preview v2 (`prototypes/snowy-blocky-concept/`) keeps Snowy's world and turns
only the animals and Pip into box rigs with pixel-grain fur and pixel-art eyes. Shots:
`production/qa/evidence/snowy-blocky-concept/`.

Verdict: the blocky cat works in Parkour Cat because the camera is far away and the character is small and fast.
Snowy is a close-up photo game where the animal's face is the reward, and the round, glossy-eyed animals read cuter
there. Not recommended for Snowy now; a good fit for a new action game built around a far camera.
