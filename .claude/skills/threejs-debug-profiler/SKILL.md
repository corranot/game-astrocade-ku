---
name: threejs-debug-profiler
description: Debug and profile Three.js Astrocade games - blank canvas, bloom NaN blackouts, shader and runtime errors, resize, mobile input, animation bugs, draw calls, triangles, textures, memory and load time. Use when diagnosing a defect or a slow frame or load.
---

# Three.js Debug Profiler

Adapted from [majidmanzarpour/threejs-game-skills](https://github.com/majidmanzarpour/threejs-game-skills) (MIT, commit 69058ed, 27 Nov 2026; see `LICENSE`). Adapted for Astrocade games in this repo. Where this file or its references disagree with `CLAUDE.md`, `ASTROCADE.md` or `.claude/rules/`, those win.

Find root causes and fix measured bottlenecks without breaking play.

## Astrocade limits (override every reference below)

- Games are plain JS ES modules in `prototypes/<game>/` that Astrocade bundles into one page. No Vite, no TypeScript build, no npm packages at runtime. Snippets written as TS lose their types; `import ... from 'three/addons/...'` resolves through the game's importmap.
- First playable frame in about 2 s on a mid-range phone over 4G. Defer anything the first frame does not need, and measure with `node tools/load-time.js prototypes/<game>`.
- Mobile first: stable 60 FPS on a phone in portrait. Use the **Mobile** column of every budget table.
- No paid asset APIs. Generated art and audio come from the Astrocade MCP tools (`generate_image`, `generate_music`, `generate_sound_effect`) or are procedural.

## Reference

`references/debug-playbook.md`: ordered triage for blank canvas, asset and audio loading, loop, animation and physics, input and mobile, the profiling order, and a diagnostics object shape. Read it for anything non-obvious.

## Debug

Reproduce first, the way the player meets it: `node tools/astrocade-bundle-test.js prototypes/<game>` runs the Astrocade feed bundle in a sandboxed iframe, and the live draft is pulled through the Astrocade MCP. Read page, console and network errors. Fix the root cause in the module that owns it, then retest that exact path. Common causes: two active loops, a canvas whose display size does not match its drawing buffer, negative or unclamped `dt`, the feed handover (`run('edit')` then `run('play')`), a module touching `THREE` at import.

## Profile

Baseline one fixed scenario, classify the bottleneck (CPU, draw calls, fragment, vertex, memory, network, shader compile), change one thing, and re-measure the same scenario. Tools here:

- `tools/load-time.js`: load timeline on a throttled phone profile.
- `tools/astrocade-bundle-test.js`: `feed.fpsAfter5s` and `feed.gpu` (median draw calls and triangles per frame).
- SwiftShader frame rates only compare runs with each other; real phone FPS needs a device or owner analytics.

## Report

Lead with the root cause or the measured bottleneck, then baseline and after numbers, files changed, the broken path retested, and residual risk.
