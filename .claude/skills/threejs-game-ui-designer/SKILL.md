---
name: threejs-game-ui-designer
description: Game UI for Three.js Astrocade games - HUD, menus, overlays, win/lose screens, touch controls, typography, safe areas and text fit, matched to the world's look. Use for HUD or overlay layout and styling.
---

# Three.js Game UI Designer

Adapted from [majidmanzarpour/threejs-game-skills](https://github.com/majidmanzarpour/threejs-game-skills) (MIT, commit 69058ed, 27 Nov 2026; see `LICENSE`). Adapted for Astrocade games in this repo. Where this file or its references disagree with `CLAUDE.md`, `ASTROCADE.md` or `.claude/rules/`, those win.

Make game UI intentional, readable, responsive and specific to the genre.

## Astrocade limits (override every reference below)

- Games are plain JS ES modules in `prototypes/<game>/` that Astrocade bundles into one page. No Vite, no TypeScript build, no npm packages at runtime. Snippets written as TS lose their types; `import ... from 'three/addons/...'` resolves through the game's importmap.
- First playable frame in about 2 s on a mid-range phone over 4G. Defer anything the first frame does not need, and measure with `node tools/load-time.js prototypes/<game>`.
- Mobile first: stable 60 FPS on a phone in portrait. Use the **Mobile** column of every budget table.
- No paid asset APIs. Generated art and audio come from the Astrocade MCP tools (`generate_image`, `generate_music`, `generate_sound_effect`) or are procedural.
- The HUD grid rule in `CLAUDE.md` wins: one 8 px grid, equal safe-area margins, one shared pill/button height, aligned centres, equal gaps, world bubbles never under the HUD. Check 360x640, 390x844, 430x932 and 768x1024.
- The FTUE spotlight and share-card rules in `CLAUDE.md` apply to every UI pass.

## Reference

`references/ui-patterns.md`: hierarchy and required states, HUD zones, menus, touch controls, responsive limits, style cohesion, state wiring. Read it before designing HUDs, menus, overlays or touch controls.

## Workflow

1. Capture phone-portrait screenshots of what exists, at the four sizes above.
2. List the UI states: play, pause, settings, fail and retry, win or milestone, loading, FTUE, touch controls.
3. Set the hierarchy: survival and status, then objective, then feedback, then flavour.
4. Replace generic stat cards with authored clusters, meters, badges, icons and modal states.
5. Use stable sizes, safe-area padding, text-fit limits and pressed/disabled states.
6. Read UI values from game state; never copy game rules into UI code.
7. Check text fit with the longest likely values (and every shipped language), overlap, and touch targets >= 44 px.

## What goes wrong

A dashboard of stat cards. UI covering the player, threats or the next decision. Text that shifts or clips on a small phone. Touch controls that look right but send no input.
