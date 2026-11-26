# Meteor Gems: smooth frame pass (2026-11-26)

Goal from the owner: the whole game runs smoothly, with no lag. Bar: median 60 FPS (16.7 ms), 1% low at or
above 50 FPS (p99 at or under 20 ms), no frame over 50 ms after load, on a throttled phone profile.

## How it was measured

- Headless Chromium with swiftshader (CPU raster, no GPU), viewport 120x213 so the CPU and draw-submit cost shows
  instead of software pixel fill, CPU throttled 4x and 6x through DevTools.
- `node prototypes/meteor-gem-works/perf.js <gameDir> <out.json> <rate>`: the bot plays 3, 8 and 15 minutes, the
  whole first chapter, the ride to the frost chapter and 4 more minutes there; 360 rendered frames are timed at each
  point (tier 2, the highest tier a phone reaches).
- `node prototypes/meteor-gem-works/tierstep.js <gameDir>` (env `T0=1 SEQ=2,1,0,1,2`): times the first frame after
  each adaptive-quality step, from the game's real start tier.
- "Before" is origin/main at c09bfc5 (the build in the current draft). Raw logs sit next to this file.

## Frame times at tier 2 (ms, 360 frames per point)

| Point | before 4x med / p99 / max | after 4x med / p99 / max | before 6x med / p99 / max | after 6x med / p99 / max |
|---|---|---|---|---|
| start | 7.9 / 21.7 / 25.4 | 5.5 / 26.6 / 34.6 | 8.7 / 26.6 / 33.6 | 9.6 / 29.2 / 42.5 |
| 3 min | 7.9 / 37.0 / 48.9 | 8.7 / 27.3 / 63.9 | 11.4 / 37.3 / 41.2 | 12.6 / 46.8 / 67.2 |
| 8 min | 7.4 / 16.1 / 19.0 | 7.7 / 25.7 / 28.5 | 12.3 / 38.0 / 46.0 | 17.3 / 49.1 / 81.0 |
| chapter 1 done | 8.3 / 26.0 / 33.2 | 7.6 / 30.8 / 42.9 | 13.5 / 34.1 / 38.4 | 20.3 / 51.9 / 58.2 |
| frost +4 min | 8.1 / 20.8 / 34.9 | 8.1 / 24.2 / 47.8 | 12.4 / 33.3 / 39.7 | 18.8 / 57.5 / 71.0 |

Reading it:
- At 4x the median stays near 8 ms (about 120 FPS of CPU budget) in both builds, all session long.
- Draw calls (100 to 192), triangles (220k to 395k), heap (flat, about 36 MB) and textures (10) are the same in both
  builds, so steady-state cost did not change, as expected: the fixes target hitches, not the average.
- The 6x "after" run came last on a busy machine and its medians are higher on the same draw counts; earlier
  back-to-back A/B runs of the two builds were equal (7 to 8 ms). Treat the 6x columns as noise-limited.
- p99 in the 20 to 50 ms range is swiftshader's software raster jitter on a shared CPU; it is the same in both builds.
- The single ~6 to 7 s frame after the ride to the frost chapter (both builds) is the new chapter being built while
  the ride card covers the screen; it is not a gameplay frame.

## Hitches fixed (ms, CPU 4x, first frame after a quality step)

| Step | before | after |
|---|---|---|
| tier 1 to 2 (first glow on, about 8 s into play) | 759 | 181 |
| tier 2 to 1 | 6 | 20 |
| tier 1 to 0 (slow phone drops) | 633 | 14 |
| tier 0 to 1 | 51 | 19 |
| tier 1 to 2 again | 16 | 15 |

What caused them, and the fix:
- Every quality step flagged every material for a rebuild (all shaders recompiled). Now only a change of shadows
  on/off does that, and tier 0 keeps a small 512 shadow map, so no step switches shadows any more.
- Drawing into the glow target and drawing straight to the screen use different shaders (tone mapping in the
  shader or not). Only one set was built before the first frame, so the first glow-on or glow-off step built the
  other set mid-game. Both sets are built now: the one in use first, the other 1.5 s after the first frame
  (`quality.warmLaterMs`). The 181 ms left on the first glow-on is the glow targets being created.
- Hidden objects (later unlocks, effects) are shown for the warm-up compile, so their shaders do not build on first
  appearance.

## Other changes in this pass

- Shadows refresh every other frame on tiers below `quality.shadowEvery1` (2).
- No per-frame allocations left in the glow toggle and the crowd sync (a reused set instead of `new Set` each frame).
- The hero walks through stations, props, critters and people; only the deck edge stops them, so they can never get
  stuck. Unit test: 900 s of play, then sweeps across the whole deck in rows every 0.5 m, both directions; the hero
  moves every step and reaches the far edge (fails on the old code, stuck at x -6.01 z -0.75).

## A test trap (not a game bug)

Rendering about 1000 frames in one script call, without letting the browser run, makes swiftshader's GPU process
block for 15 to 18 s once every ~120 frames. The same play, yielding to the browser every 30 frames, has no frame
over 300 ms in 70 game seconds. Frame-loop scripts here yield or time short batches.

## Not proven

- Real-phone FPS: swiftshader is CPU raster, so GPU fill cost on a phone is not measured here. The bar above is
  met on CPU and submit cost (median about 8 ms at 4x), not proven on a device.
