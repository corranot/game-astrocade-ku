---
name: threejs-qa-release
description: Verify a Three.js Astrocade game before upload - feed bundle run, screenshots per viewport, measured pixel and render-budget metrics, motion frames, bot playtest and release risks. Use for a QA pass or before a game goes to its Astrocade draft.
---

# Three.js QA Release

Adapted from [majidmanzarpour/threejs-game-skills](https://github.com/majidmanzarpour/threejs-game-skills) (MIT, commit 69058ed, 27 Nov 2026; see `LICENSE`). Adapted for Astrocade games in this repo. Where this file or its references disagree with `CLAUDE.md`, `ASTROCADE.md` or `.claude/rules/`, those win.

Prove the game works the way a player meets it, then hand a shippable build to `/astrocade-ship` with its known risks.

## Astrocade limits (override every reference below)

- Games are plain JS ES modules in `prototypes/<game>/` that Astrocade bundles into one page. No Vite, no TypeScript build, no npm packages at runtime. Snippets written as TS lose their types; `import ... from 'three/addons/...'` resolves through the game's importmap.
- First playable frame in about 2 s on a mid-range phone over 4G. Defer anything the first frame does not need, and measure with `node tools/load-time.js prototypes/<game>`.
- Mobile first: stable 60 FPS on a phone in portrait. Use the **Mobile** column of every budget table.
- No paid asset APIs. Generated art and audio come from the Astrocade MCP tools (`generate_image`, `generate_music`, `generate_sound_effect`) or are procedural.
- This repo's own tools replace the upstream canvas inspector and Vite scaffold. The evidence location is `production/qa/evidence/` plus the shared project files, per `CLAUDE.md`.

## References

| File | Read it when |
| --- | --- |
| `references/release-checks.md` | mobile verification, release, performance evidence, release-failure traps |
| `references/visual-test-harness.md` | screenshot baselines, visual regression, the test-hook contract (`__THREE_GAME_TEST_HOOKS__`, optional here) |
| `references/playtest-bot.md` | gameplay, difficulty or fairness claims, or a loop never driven by scripted input |

## QA pass (quick round, per the efficiency rule)

1. `bash tools/ci-checks.sh prototypes/<game>/`: syntax, JSON, lint, upload set.
2. `node tools/astrocade-bundle-test.js prototypes/<game> shot.png`: starts, no errors, tap reaches the host, `feed.gpu` against the mobile budget, `feed.pixels` against the scorecard thresholds.
3. `node tools/feed-card-test.js prototypes/<game>`: what the feed card shows before play.
4. `node tools/load-time.js prototypes/<game>`: first frame about 2 s on 4G.
5. Phone-portrait screenshots of active play at 360x640, 390x844, 430x932, 768x1024, plus FTUE steps. On each, check the text-label rule in `CLAUDE.md`: every icon, button, goal, pickup, guide and tutorial step carries words, and no text is clipped in any shipped language.
6. For animation, camera or signature VFX changes: frames at anticipation, impact and aftermath, and with the hero moved to far corners and after a cinematic.

The full bot playtest (`references/playtest-bot.md` pattern, the game's own `playtest.js`) runs only before a publish or when pacing changes.

## Reading the numbers

`feed.pixels` and `feed.gpu` are observations, not verdicts. `colorEntropyBits` < 3.0, `dominantColorShare` > 0.6 or `edgeDensity` < 0.04 point to a sparse, flat or empty scene. `luminance.contrast` < 60 points to fog or darkness compressing the image. Draw calls > 150 or triangles > 300k exceed the mobile budget and need a written tradeoff. An intentional clean composition can measure low: explain it, do not add clutter.

## Report

Lead with the result and open defects. Then commands run, the numbers, screenshot paths, controls exercised, issues fixed and residual risks.
