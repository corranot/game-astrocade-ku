# Wonder Sprout: quality pass scorecard (27 Nov)

The scale is the repo visual scorecard (0 to 3 per category). "/10" is that score ×10/3.
"Before" is the round-2 build that went to review. "After" is this pass.

| Category | Before | After | Evidence (after) |
|---|---|---|---|
| Art direction | 1.5 | 2.5 | A sunny storybook identity runs through the sky, world, UI and title. The dusky lavender wash is gone. |
| Hero / critters | 1.5 | 2.5 | The hero is 20% bigger, with glossy iris eyes. Its mood shows: focused while aiming, "whee" while flying, a joy face on hits. |
| Targets | 2.0 | 2.5 | Each hit has a starburst plus a flash, a wobble and a role colour (mushroom bumper, crystal, piñata). |
| Rewards | 2.0 | 2.5 | Gem orbs fly in arcs. A goal chip pays out with confetti. Dock buttons show progress bars. |
| World | 1.0 | 2.5 | Four layered floating islands (cottages, waterfalls, vines), a balloon, birds and a cloud bank. The meadow has bushes, butterflies and pollen. Wide screens get meadow flanks. |
| Materials | 1.5 | 2.0 | Satin gradients, painted grass strokes, sandstone strata. Still flat vector shading in places. |
| Lighting | 1.0 | 2.5 | A warm sun with slowly turning rays, a horizon haze, and depth fog on far islands. |
| VFX / motion | 1.5 | 2.5 | A rainbow flight trail with sparkles, impact bursts, landmark smoke and bubbles, cinematic beats (kept). |
| UI / HUD | 1.5 | 2.5 | Toy buttons with lip and gloss on a wooden shelf with a leaf garland. New title logo with a ribbon. Storybook drawers. Goal chip on the 8 px grid. |
| Performance evidence | 2.0 | 2.0 | First frame 555-582 ms on 4G and 830-883 ms on slow 4G (57 kB gz). Software raster: 45-57 fps unthrottled during a raid. Not yet proven on a real phone. |
| **Average** | **1.55 (5.2/10)** | **2.45 (8.2/10)** | |

## Per screen (overall /10)

| Screen | Before | After |
|---|---|---|
| First screen + title (390×844) | 5 | 8.5 |
| Aim + FTUE fling | 5 | 8 |
| Fling flight | 5 | 8.5 |
| Late island (5 landmarks) | 6 | 9 |
| Kingdom / hatchery / evolution drawers | 5 | 8 |
| Sky pirates raid | 6 | 8.5 |
| Island done + rainbow | 6 | 9 |
| Goal complete | n/a | 8.5 |
| Small phone 360×640 | 5 | 8 |
| Tablet 768×1024 | 4 | 8 |

## New content

Garden goals: one icon-first goal at a time (pop mushrooms, crack crystals, gather gems, SUPER NOVA, combo,
wood, piñata, hatch). Each pays gems, and every 4th pays a gift egg. Goals grow each lap. They stay hidden until the tutorial is done.

## Known gaps

- Materials sit at 2/3: shapes are still vector-flat in places. The next pass would add painted texture to the critters and props.
- FPS on a real phone is unproven. The watchdog drops quality below 45 fps.
- The pacing bot does not model goal rewards (about 40-100 gems a minute early). The first landmark likely comes about 10-20 s sooner.
