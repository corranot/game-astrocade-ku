# Meteor Gems: wide living town (2026-11-26)

Goal from the owner: the play area felt cramped; make the whole world wide, like a live 3D world, and fix the
problems nobody named. Bar: still readable within 3 seconds, fast first load, 60 FPS.

## What changed

- Play area spread 1.6x on x and 1.5x on z (`world.spread` in `game_config.json`); the meteor, mine and rock pads
  stay at the rock. Hero, keeper and seller speeds were raised and mid pads (3 to 6) cost 8% less, so unlock times
  stay on the old pacing (`logic.test.mjs` pacing tests pass).
- Wider follow camera (fov 44, width 17, raised pitch): the top of the frame shows the horizon.
- Painted town square: sand ripples, grass, cart tracks, boot prints, boardwalk streets, plank pads under stations
  and dashed lots for the next builds. Ground vertex tint for colour variation.
- Living horizon: dunes, mesas, rocks, cacti, three rock arches, a second windmill, grass tufts, a flock of birds,
  shooting meteors, drifting cloud shadows, tumbleweeds across the whole width.
- One thin spectator row (crowd 8 to 20 by tier).
- Edge pointer: a gold arrow at the screen edge points to the current goal when it is off screen.
- Sound falloff: sales far from the hero play quieter.
- Sun shadow follows the camera on a 2 m grid, so the whole wide view keeps soft shadows.

Skipped: auto-walk to far stations, and wild critters roaming the outer desert.

## Screenshots (phone portrait, 1080x2400)

`00-before-cramped.jpg`, `01-opening.jpg`, `02-mid-game-wide.jpg`, `03-far-corner.jpg`, `04-busy-late.jpg`,
`05-dusk-night.jpg`, `06-meteor-mid-fall-intro.jpg`.

## Load (`tools/load-time.js`, 3 runs, swiftshader)

| Profile | before done / first frame (ms) | after done / first frame (ms) |
|---|---|---|
| slow 4G | 3701-3764 / 5339-5988 | 3896-4218 / 5514-6456 |
| 4G | 2208-2624 / 4050-4544 | 2485-2936 / 4284-4744 |

Transfer 281 kB before, 285 kB after. About 300 to 400 ms slower on swiftshader, most likely the square canvas
painting and the extra scenery built before the first frame.

## Frame times at tier 2 (CPU 4x, 120x213, 360 frames per point, `frames-wide-4x.txt`)

| Point | before med / p99 / max | after med / p99 / max | after calls |
|---|---|---|---|
| start | 5.5 / 26.6 / 34.6 | 6.7 / 20.0 / 21.5 | 83 |
| 3 min | 8.7 / 27.3 / 63.9 | 6.4 / 26.1 / 46.5 | 131 |
| 8 min | 7.7 / 25.7 / 28.5 | 8.9 / 20.3 / 47.7 | 169 |
| chapter 1 done | 7.6 / 30.8 / 42.9 | 7.2 / 20.7 / 47.1 | 130 |
| frost +4 min | 8.1 / 24.2 / 47.8 | 7.7 / 18.3 / 26.6 | 140 |

"Before" is `../perf/frames-after4.txt`. No gameplay frame over 50 ms. The single ~6.7 s frame at the frost ride is
the new chapter being built behind the ride card (same as before). Playtest draw-call budgets hold: tier 2 130 and
159 calls (budget 260), tier 0 104 and 112 (budget 160).

## Not proven

- Real-phone FPS and GPU fill cost (swiftshader is CPU raster).
- The load regression could be cut by painting the square after the first frame; not done in this pass.

## Review round 2 (same day)

Asked for: get the first-frame load back, fill the empty sand under the spectators, and give the top of the frame a
real sky.

- The full town-square paint (ripples, pebbles, grass, tracks) and the whole far desert (dunes, rocks, cacti, arches,
  far windmill, grass tufts) now build `quality.lateMs` (300 ms) after the first frame, `scene.late()`. The far
  desert is one merged mesh with its own seed.
- Camera looks further ahead (`camera.ahead` 10, `zMin` -6, mining look `mineZ` -1.5) and sits lower (`pitch` 0.32),
  so the spectators sit at the bottom of the frame and the horizon shows. The road is pulled in to run just behind
  the spectators.
- Sky: a tighter gradient (blue sooner above the warm horizon), a band of soft drifting clouds in the sky shader,
  lower and brighter 3D clouds (dimmed at night), lower mesas, lighter fog (camera far 230). The sky is now drawn
  after the opaque world, so the depth test skips its pixels under the ground.
- Fixed: the "district done" camera move pointed at the ghost town's old spot.

Load (`tools/load-time.js`, 3 runs): 4G done 2370-2538 ms, first frame 4152-4581 ms (before the wide world:
4050-4544); slow 4G done 3769-3944, first frame 5531-6331. 285 kB.

Frames (CPU 4x, `frames-round2-4x.txt`): median 5.0 / 6.4 / 7.2 / 7.9 / 8.6 ms at start / 3 min / 8 min / chapter 1
done / frost +4 min; no gameplay frame over 50 ms; 77 to 152 draw calls. Playtest: all checks pass (tier 2 130 and
145 calls, tier 0 94 and 102).

Screenshots 01 to 06 replaced with this round's.

Still visible: when the hero walks to the front fence the camera follows, and the ghost-town roofs fill the bottom
of the frame.
