---
name: threejs-aaa-graphics-builder
description: Raise a Three.js Astrocade game from primitive-looking to premium visuals - authored models, shared material kits, lighting, surface shaders, render budgets and the 10-category visual scorecard. Use for a graphics pass or to score screenshots in a visual review.
---

# Three.js AAA Graphics Builder

Adapted from [majidmanzarpour/threejs-game-skills](https://github.com/majidmanzarpour/threejs-game-skills) (MIT, commit 69058ed, 27 Nov 2026; see `LICENSE`). Adapted for Astrocade games in this repo. Where this file or its references disagree with `CLAUDE.md`, `ASTROCADE.md` or `.claude/rules/`, those win.

Turn basic screenshots into authored, dense, performance-aware visuals, to the Game Quality Standard in `CLAUDE.md`.

## Astrocade limits (override every reference below)

- Games are plain JS ES modules in `prototypes/<game>/` that Astrocade bundles into one page. No Vite, no TypeScript build, no npm packages at runtime. Snippets written as TS lose their types; `import ... from 'three/addons/...'` resolves through the game's importmap.
- First playable frame in about 2 s on a mid-range phone over 4G. Defer anything the first frame does not need, and measure with `node tools/load-time.js prototypes/<game>`.
- Mobile first: stable 60 FPS on a phone in portrait. Use the **Mobile** column of every budget table.
- No paid asset APIs. Generated art and audio come from the Astrocade MCP tools (`generate_image`, `generate_music`, `generate_sound_effect`) or are procedural.
- Post-processing on mobile: at most one post pass beyond render and output, behind the game's adaptive quality level (values in `config.js`).

## References

Load each one only when its sub-task starts:

| File | Read it when |
| --- | --- |
| `references/authoring-recipes.md` | building hero, obstacle, reward, world-kit or prop models; lighting, tone mapping, shadows, fog |
| `references/technical-art.md` | render budgets, shared material kits, instancing and LOD |
| `references/shader-cookbook.md` | PBR materials, `onBeforeCompile` surface shaders, skies, HDR bloom |
| `references/visual-scorecard.md` | scoring active-play screenshots, or any premium/AAA claim |
| `assets/scorecard-anchors/` | calibrating a score: scene-1 = 1, scene-2 = 2, scene-3 = 2.5-3 |

## Core rule

Glow does not make primitives look AAA. Build authored forms first, then materials, then lighting, then effects, in that order.

## Workflow

1. Capture active-play phone-portrait screenshots (`tools/astrocade-bundle-test.js <game> shot.png`, plus the game's own playtest shots).
2. Score them with `references/visual-scorecard.md` and pick the weakest surfaces. A new game sets art direction, camera scale, material roles and the hero target first.
3. Add what the game is missing: a material library, procedural textures and decals, model factories, a world prop kit.
4. Upgrade every weak visible surface, not only the hero: hazards, rewards, ground, foreground props, background layers.
5. Add lighting, `RoomEnvironment` IBL, tone mapping and selective bloom once authored forms exist.
6. Hand event VFX (impacts, bursts, trails, shockwaves) to `threejs-aaa-vfx-builder`.
7. Re-score with the anchors and the measured `feed.pixels` and `feed.gpu` numbers. Premium = every category >= 2 and average >= 2.3.

## Report

Scores before and after with one line of evidence per category, surfaces upgraded, screenshots, draw calls and triangles against the mobile budget, and what is still weak.
