# Wonder Sprout: polish round r3 scorecard (27 Nov)

The scale is the repo visual scorecard (0 to 3 per category). "/10" is that score ×10/3.
"r2" is the quality-pass build. "r3" is this round.

| Category | r2 | r3 | Evidence (r3) |
|---|---|---|---|
| Art direction | 2.5 | 2.5 | Same sunny storybook identity. |
| Hero / critters | 2.5 | 2.5 | Unchanged: moods, iris eyes, 20% bigger hero. |
| Targets | 2.5 | 2.6 | Mushrooms, crystals, the piñata and trees now have a rim light, top-light volume and paint tooth. |
| Rewards | 2.5 | 2.5 | Goals are retuned and inside the pacing windows. Max one "!" badge, on the most useful next action. |
| World | 2.5 | 2.6 | The meadow, hills and floating islands get painted mottling, rims (warm top, cool sky bounce) and shading. |
| Materials | 2.0 | 2.4 | Shared `finish()` pass on 20 baked props and backdrops: vertical volume gradient, tiled paint-tooth texture (soft mottling plus speckle), warm rim upper-left and sky bounce lower-right. It reads as painted, not flat vector. |
| Lighting | 2.5 | 2.5 | Unchanged. The rims now agree with the sun direction. |
| VFX / motion | 2.5 | 2.5 | Unchanged. |
| UI / HUD | 2.5 | 2.7 | Four fixed HUD slots on one 8 px row on every screen; the wood pill is dimmed until the first wood, then pops. Mirrored for Arabic. One badge at most. Every toast uses one size (448×120) and one spot, 16 px under the HUD. |
| Performance evidence | 2.0 | 2.0 | First frame 593-705 ms on 4G and 904-950 ms on slow 4G (58 kB gz). The bake pass adds about 50-100 ms. Real-phone FPS is still unproven. |
| **Average** | **2.45 (8.2/10)** | **2.48 (8.3/10)** | Materials 2.4 = 8.0/10 |

## Per screen (overall /10)

| Screen | r2 | r3 |
|---|---|---|
| First screen + title (390×844) | 8.5 | 8.5 |
| Aim + FTUE fling | 8 | 8.5 |
| Fling flight | 8.5 | 8.5 |
| First wood (pill pops in its slot) | 8 | 8.5 |
| New friend / Evolve / Welcome back / Sky pirates / Built toasts | 8 | 8.5 |
| Late island (5 landmarks) | 9 | 9 |
| Kingdom / hatchery / evolution drawers | 8 | 8 |
| Sky pirates raid | 8.5 | 8.5 |
| Island done + rainbow | 9 | 9 |
| Goal complete | 8.5 | 8.5 |
| Arabic (mirrored HUD) | 8 | 8.5 |
| Small phone 360×640 | 8 | 8 |
| Tablet 768×1024 | 8 | 8 |

## Pacing with goal rewards

The bot now plays with garden goals on (3 seeds, 15 min). The first tuning (40 gems, +15% per goal, a gift egg every 4th) was far too generous. The run ended with 15-18K gems against 4.3K without goals, and the last landmark came at 8:50, before the 9-minute floor.

Retuned to `goalGems` 20, `goalGrowth` 0.04 and `goalEggEvery` 6:

- Last landmark at 11:15-12:25.
- Hero stages at 2:20-2:35 and 6:15-7:40.
- 35-39 goals in 15 minutes, with the first one inside a minute.

The pacing test asserts these.

## Known gaps

- Real-phone FPS is unproven. The watchdog drops the quality tier below 45 fps.
- Critter bodies keep their clean satin shading. Paint tooth was left off them on purpose, to keep the faces clean and readable.
