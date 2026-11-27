# Snowy Snapshot, round 8 scorecard (27-28 Nov)

Round 8 covered the whole game: the visual fixes from the art review, plus a retention pass driven by a
real-clock bot.

Scoring method:

- Scored with `.claude/skills/threejs-aaa-graphics-builder/references/visual-scorecard.md`.
- Each category is scored 0-3; the /10 figure is the average x 10 / 3.
- "Before" is round 7 (`../r7/scorecard.md`).
- All screens are on one sheet: `r8-sheet.jpg`.

## Retention bot (`prototypes/photo-safari/retention-bot.js`)

How the bot plays:

- Real clock, 240x520, tier 0, 15 minutes.
- Kid mode:
  - It looks at each new stamp for 3-7 s.
  - It drifts off now and then (8%).
  - It hits the shutter late (45% per check).
  - It gets impatient after about 12 s of waiting for a pose.
- It buys treats and lenses in order.

The quit model turns the timeline into session lengths for 4,000 simulated players:

- Patience is lognormal (median 45 s), measured against each reward-free gap.
- Players also quit at a steady 3% per minute after the first minute.
- This is an estimate, not player data.

| Run | Build | Stamps at 3/5/8/12/15 min | Longest gap | Share over 5 min | p50 | p75 |
|---|---|---|---|---|---|---|
| r1 | round 7 (eager bot) | stuck at 10 for 435 s | 435 s | 0.2% | 67 s | 89 s |
| r3 | first fixes, first kid run | 19 / 26 / 46 / 57 / 57 | 174 s | 24.5% | 119 s | 275 s |
| r4 | + night button, longer night | 20 / 33 / 52 / 58 / 58 | 208 s | 58% | 581 s | 603 s |
| r8 | + guide fixes | 23 / 34 / 50 / 62 / 62 | 206 s | 23.5% | 143 s | 219 s |
| r11 | + kinder poses | 18 / 19 / 36 / 58 / 58 | 229 s | 1.5% | 144 s | 167 s |
| **r12** | **final round 8** | **22 / 35 / 55 / 70 / 73** | **93 s** | **66.7%** | **612 s** | **635 s** |

The targets were over 5 min at least 35%, p50 at least 200 s and p75 at least 480 s. The final build meets all
three, and its bot finished the whole book (72 stamps plus the rare visitor) at about 13 minutes.

Runs between r4 and r12 swing widely, because one stall of 2-3 minutes early on sinks the quit model. Each swing
traced back to a real stall, and each stall was fixed.

### Stalls the bot found, all fixed

| Stall | Fix |
|---|---|
| The gate guide stopped outside the new area, so the player stood at the gate for 7 minutes. | The guide goal moved 9 m inside the area (`camera.gateInM`). |
| The guide pointed through valley walls at animals in another area. | `routeVia` routes through the gate corridor. |
| The rare visitor paid 5x on every photo, so players farmed it. | It pays 5x once a day, then the repeat rate. |
| Every day animal was done and the rest only come out at night, a dead wait of up to 3 minutes. | A pulsing moon button, "Wait for night", fast-forwards the clock. The day is now 210 s and the night 90 s. |
| The hero got pinched at a corridor mouth. | Corridors are 20 m long, so they overlap both areas. A unit test checks this. |
| The hero stood on top of the beluga, so its photo could never be framed. | The whale's ice hole pushes the hero back. |
| Animals were pushed off the valley floor, out of reach. | Animal moves slide along walkable ground. When an animal is backed against an edge, the hero steps back instead. |
| The viewfinder locked onto a nearer animal whose page was already full. | Animals with empty slots win the aim (`photo.fullPenaltyM`). |
| The guide pointed at night animals missing only their 3-star photo, which needs the flash. | Without the flash, the night 3-star slot doesn't count as a goal. A one-time hint names the Night flash. |
| Night visitors were missed while day animals were nearer. | While a night visitor still has an empty slot, the guide sends the player to it first. |
| Pose windows were too short for a kid. | Windows went from 1.6 to 2.0 s, with a 0.5 s grace. Animals pose every 4-7 s while the hero waits nearby (7-12 s otherwise). |

## Measured

| | Round 7 | Round 8 |
|---|---|---|
| colorEntropyBits | 4.76 | 4.67 |
| dominantColorShare | 0.255 | 0.225 |
| edgeDensity | 0.218 | 0.224 |
| luminance mean / contrast | 118.4 / 110.6 | 122.4 / 123.3 |
| draw calls / triangles (feed run) | 132 / 224k | 134 / 251k |
| 4G first frame (`load-time.js`, 6 runs each, interleaved with round 7) | median 1.82 s (1.71-1.92) | median 1.84 s (1.79-1.91) |
| full playtest | 75/75 | 75/75 |
| unit tests | 26 | 30 |

The new dressing adds no shader programs:

- Shrubs and logs are instanced on the rock material.
- The stream's snow lip is drawn on the prop material.
- Only the ice ribbon has its own standard material.

## Categories

| Category | R7 | R8 | Evidence |
|---|---|---|---|
| Art direction | 2.5 | 2.5 | The corners now have frozen streams, logs and berry shrubs (r8-15/16/17). The wide snow between them is still the softest part. |
| Hero (Pip) | 2.5 | 2.5 | Unchanged. The hero stays framed in every corner and after every beat. |
| Obstacles (ice gates, shy animals) | 2.5 | 2.75 | The unlock reads: 9 shards, one ring and a quick settle. The gate shot frames the path, Pip and the area beyond (r8-13). |
| Interactables | 2.5 | 2.75 | The moon button and the flash hint. The viewfinder picks the animal you still need. |
| World | 2.5 | 2.75 | Streams with snow lips, log lines, berry shrubs and ice bells, plus a cave drone per area. |
| Materials | 2.5 | 2.5 | Unchanged fur, bark and ice. |
| Lighting/render | 2.5 | 2.5 | Softer shadow radius and a higher sun. Night fur gets form shading and a moon rim (r8-19). The diagonal pine shadows in r8-16 are still strong. |
| VFX | 2.5 | 2.5 | The unlock was trimmed for clarity. Haptics on snap, new friend and gate. |
| UI/HUD | 2.5 | 2.75 | The moon button sits in the treat slot on the 8 px grid. The Today tab ends with a "Tomorrow: a new visitor!" row (r8-today-tomorrow). |
| Performance evidence | 2.5 | 2.75 | Interleaved 4G load, 15-minute real-clock bot runs, tier 0 throughout. |
| **Average** | **2.5 (8.3/10)** | **2.63 (8.75/10)** | |

The softest calls:

- Art direction stays at 2.5, because the wide snow fields still dominate the corner shots.
- Lighting stays at 2.5, because of the strong diagonal pine shadows in r8-16.

## Per screen (/10)

| Screen | R7 | R8 | Note |
|---|---|---|---|
| 01 first frame, 04/05 FTUE steps | 7 | 7 | The spotlight dims everything but the target, as the FTUE rule requires. |
| 02 viewfinder | 8.5 | 8.5 | |
| 03 photo develops | 8.5 | 8.5 | |
| 06/07 book, shop | 8 | 8 | |
| 08 today | 8 | 8.5 | The tomorrow row gives a reason to come back. |
| 09/10 treat | 8.5 | 8.5 | |
| 11/12 pose | 8.5 | 8.5 | |
| 13 gate, unlock | 8.5 | 9 | Readable burst over the lake. |
| 14 after cinematic | 8 | 8.5 | |
| 15-17 corners | 8 | 8.5 | Streams, logs and shrubs break up the white. |
| 18 aurora | 8 | 8.5 | |
| 19 night | 8.5 | 8.5 | |
| 20 feed handover | 8 | 8 | |
| 21 HUD x4 | 8 | 8.5 | |
| 22 Arabic tier 0 | 8.5 | 8.5 | |
| night button | | 8.5 | |

## Left for later

- The SwiftShader tree-shadow stripes at an early sun angle need a real-phone check.
- The bot finishes the book in about 13 minutes. After that, players come back for the daily rare visitor and the
  three requests. A second book chapter (U1) is the next pull for long players.
