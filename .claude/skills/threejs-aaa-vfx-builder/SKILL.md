---
name: threejs-aaa-vfx-builder
description: Layered real-time VFX for Three.js Astrocade games - impacts, bursts, trails, shockwaves, shields, portals, pickups - with 5-beat timing, soft particles, NaN-safe shaders and selective bloom inside a mobile budget. Use when building or upgrading game effects.
---

# Three.js AAA VFX Builder

Adapted from [majidmanzarpour/threejs-game-skills](https://github.com/majidmanzarpour/threejs-game-skills) (MIT, commit 69058ed, 27 Nov 2026; see `LICENSE`). Adapted for Astrocade games in this repo. Where this file or its references disagree with `CLAUDE.md`, `ASTROCADE.md` or `.claude/rules/`, those win.

Build effects that read like crafted studio work: bold shapes, disciplined timing, soft scene contact, zero allocation per frame, selective bloom.

## Astrocade limits (override every reference below)

- Games are plain JS ES modules in `prototypes/<game>/` that Astrocade bundles into one page. No Vite, no TypeScript build, no npm packages at runtime. Snippets written as TS lose their types; `import ... from 'three/addons/...'` resolves through the game's importmap.
- First playable frame in about 2 s on a mid-range phone over 4G. Defer anything the first frame does not need, and measure with `node tools/load-time.js prototypes/<game>`.
- Mobile first: stable 60 FPS on a phone in portrait. Use the **Mobile** column of every budget table.
- No paid asset APIs. Generated art and audio come from the Astrocade MCP tools (`generate_image`, `generate_music`, `generate_sound_effect`) or are procedural.
- `references/vfx-kit-ts/` holds the upstream strict-TypeScript kit (timeline, procedural textures, geometry, shaders, impact post pass). It is reference source: port only the parts a game uses into a plain JS module, and bake textures after the first frame.
- Mobile defaults: no depth pre-pass (`uHasDepth = 0.0`), 0-1 pooled dynamic lights (prefer fake floor light cards), <= 20 extra VFX draw calls, <= 2 stacked full-screen transparent layers.

## References

| Resource | Read when |
| --- | --- |
| `references/vfx-architecture.md` | effect choreography, non-circular silhouettes, bloom and optical post pipeline, budgets |
| `references/vfx-shaders-and-textures.md` | noise/flowmap atlas, NaN-safe GLSL, colour-ramp erosion, SDF sigils |
| `references/vfx-geometry-and-motion.md` | ribbons, domes, beams, shards, trails, lightning, instanced sparks, audio-VFX sync |
| `references/vfx-kit-ts/` | the source to port when a pattern above is needed |

## Laws

1. **Shape and value before bloom.** Every effect reads as a crisp dark-to-bright silhouette with bloom off. Bloom only hot cores: threshold >= 1.05, radius 0.22-0.34, strength 0.25-0.45.
2. **5-beat timing.** Anticipation, telegraph, hold plus impact climax (50-110 ms stillness, then a 1-3 frame punch), payload, cooling aftermath. Pair the climax with the game's hitstop and cinematic beat queue.
3. **Distinct silhouettes.** Different abilities, hazards or rewards use different 3D shapes, never recoloured spinning rings.
4. **Soft contact.** Smoke, domes and beams fade where they meet the floor (depth fade on desktop, fake contact cards on mobile).
5. **Zero-alloc, NaN-safe, deterministic.** Pool every mesh, buffer and scratch vector at init. Guard `pow(max(0.0001, x), p)` and `normalize(v + vec3(1e-5))`: one NaN pixel blacks out an HDR bloom buffer. Drive effects from effect time and the seeded RNG, never `Math.random()`.
6. **Couple it.** Tie each effect to a gameplay event, a sound, camera shake or FOV punch, and the character's reaction.

## Workflow

1. Check camera distance, renderer setup, palette and the gameplay events that need VFX.
2. Brief each effect: silhouette, 3-value palette (dark rim, mid body, hot core), duration, beat timings, and clearance (never hide the next decision or the FTUE target).
3. Build shared infrastructure once: one texture atlas, pooled emitters, optional bloom.
4. Layer 3-5 parts per signature effect (backing, shell or ribbon, instanced debris, a brief light or light card, shockwave).
5. Expose `trigger(event)`, `update(dt)`, `setReducedMotion(on)` and `dispose()`.
6. Verify in motion: frames at anticipation, impact and aftermath, not only one still.

## Anti-patterns

Spinning glowing toruses and raw `Points` bursts. Bloom threshold < 0.9 washing out the scene. Unguarded `pow` or `normalize`. Hard clipping into the floor. `new THREE.Vector3()` inside `update()`. Lights or distortion uniforms stuck on after an effect ends.
