---
name: threejs-gameplay-systems
description: Core loop, design brief, level plan, input, camera, collision and game feel (hitstop, trauma shake, FOV punch, squash-stretch) for a Three.js Astrocade game. Use when building or tuning mechanics, feel, physics or camera.
---

# Three.js Gameplay Systems

Adapted from [majidmanzarpour/threejs-game-skills](https://github.com/majidmanzarpour/threejs-game-skills) (MIT, commit 69058ed, 27 Nov 2026; see `LICENSE`). Adapted for Astrocade games in this repo. Where this file or its references disagree with `CLAUDE.md`, `ASTROCADE.md` or `.claude/rules/`, those win.

Build a playable loop first, with responsive controls, a fixed update order, and a space that shapes the player's decisions.

## Astrocade limits (override every reference below)

- Games are plain JS ES modules in `prototypes/<game>/` that Astrocade bundles into one page. No Vite, no TypeScript build, no npm packages at runtime. Snippets written as TS lose their types; `import ... from 'three/addons/...'` resolves through the game's importmap.
- First playable frame in about 2 s on a mid-range phone over 4G. Defer anything the first frame does not need, and measure with `node tools/load-time.js prototypes/<game>`.
- Mobile first: stable 60 FPS on a phone in portrait. Use the **Mobile** column of every budget table.
- No paid asset APIs. Generated art and audio come from the Astrocade MCP tools (`generate_image`, `generate_music`, `generate_sound_effect`) or are procedural.
- Physics: custom collision (overlap tests, lanes, sweeps) is the default. Rapier's WASM is about 1.1 MB gzipped and breaks the load budget; use it only when the game needs real rigid bodies, and then load it after the first frame. cannon-es is the lighter fallback.
- The upstream Vite scaffold (`create_threejs_game.py`) is not used. New games start from `/prototype` and the project's existing game structure.

## References

| File | Read it when |
| --- | --- |
| `references/game-feel.md` | tuning feel, juice, impact, hitstop, screenshake, or claiming polished gameplay |
| `references/genre-design.md` | designing levels, arenas, tracks, waves, puzzles, encounters or difficulty curves |
| `references/physics-engine-selection.md` | adding or changing physics (apply the Astrocade physics rule above first) |

## Design first

The plan required by `CLAUDE.md` (Plan Before Building) carries these three artifacts:

**Design brief.** Player promise in one sentence, target feeling, primary verb, what the player repeats every 5-30 s, what changes over 1-5 min, how they lose, learn and restart, what is rewarded, what a better player does differently, how the next decision is shown, and non-goals.

**Core loop contract.** `Player does [verb] to achieve [objective] while [pressure] creates risk; success gives [reward], failure causes [cost/retry].` Prove each clause in code: the verb maps to real touch input, the objective is visible, pressure exists in the first minute, the reward changes state (not only visuals), failure teaches, and restart is instant.

**Level plan.** Camera view, player start, first decision, first threat, first reward, landmarks, escalation every 20-60 s, recovery beats, hazard telegraphs.

## Build

1. Read the existing loop, input, camera, entities, state, UI and diagnostics first.
2. Build in playable steps: input, state, entity, collision, feedback, HUD and audio hooks.
3. Finish one representative encounter at the real camera scale before adding content.
4. Tune feel with `references/game-feel.md`: acceleration, camera follow, hitstop, impact, cooldowns, restart.
5. Keep hot paths free of per-frame allocation. Clamp loop `dt` to >= 0 (feed handover lesson).
6. Route gameplay randomness through one seeded RNG so tests stay deterministic.
7. Emit gameplay events (hit, pickup, win, fail) that VFX, audio and the cinematic-beat queue consume.

## What goes wrong

A static demo instead of a loop. A mechanic no input can trigger. A camera that hides the next decision. State changes that never reach UI, audio or VFX. Abstractions before a mechanic needed them.
