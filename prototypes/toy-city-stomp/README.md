<!-- PROTOTYPE - NOT FOR PRODUCTION -->
# Toy City Stomp: Giant Monster Smash

Bonbon, a giant gummy dino, walks through a toy-block city with one finger. Whatever it bumps breaks: blocks fly
off, houses pancake, towers topple like dominoes, cars squash flat and pop back, toy residents float away on
balloons. Points fill the grow bar; Bonbon grows 8 stages and can then break bigger buildings.

## Question this slice answers

Does the full-3D toy-diorama look, with one-finger stomping, feel special enough on a phone to build the whole
game (GDD and storyboard: artifact "Toy City Stomp", decisions K1–K6 all taken as recommended on 2026-11-19)?

## In this slice

- One city (Block Town, 6×6 lots, ~110 buildings), growth stages 1–8, combo, dominoes, Tail Spin skill at
  stage 3, cars, trees, residents with balloons, see-through cut when a building hides Bonbon, result screen with
  stars and an instant PLAY AGAIN, 7 languages with RTL for Arabic, sound made in code, save of coins and best time.
- Toy army and wanted stars (army.js), the Wind-Up Robot boss (3 phases), Spirit (hits make Bonbon dizzy, never
  a game over), the shop with 10 moves (moves.js) on the result screen.
- Not yet: missions, other cities, Rainbow Mode, edit-mode object editing (edit mode shows the city without gameplay).

## How to run

Serve this folder (modules need `content-type: text/javascript`) and open `index.html?local`. Options:
`&tier=0..3` forces a quality tier, `&speed=N` runs N simulation steps per frame (tests only).
`node playtest.js <out folder> [--lang xx]` plays a whole round on the game's own autopilot and saves screenshots.
Artifact page: `node ../../tools/artifact-modules.js . <page.html>`, then publish it with `game.js`, `city.js` and
`bonbon.js` as files.

## Files

- `index.html`: the HUD's CSS and `#app`; loads `game.js`.
- `game.js`: `run(mode)`, renderer and camera, input, rules (bite, grow, combo, sweep, finish), HUD, sound, languages, save.
- `city.js`: the city: one InstancedMesh for every block (toy-plastic shader with bevel edges and the see-through
  cut), island, sea and sky props, flying and resting blocks, pancake and topple, cars, trees, lamps, residents, soft dust, confetti.
- `army.js`: toy cars, foam tanks, bubble helicopters on the road grid, their shots, wanted stars, the boss.
- `moves.js`: the nine button moves as short scripts, plus buy and ready rules.
- `bonbon.js`: the monster: head with jaw, claws, candy material (matte on low-end phones), ink outline, spring tail, squash and stretch, six faces.
- `game_config.json`: every tunable value and the strings for 7 languages.

## Status and findings

In progress (v2, after a side-by-side with Kaiju City: low camera with a sea horizon, island world, candy Bonbon,
glossy HUD). Autopilot round from the first touch (playtest): first domino chain at ~26 s, city flat in ~73 game
seconds at stage 7 (the autopilot takes the shortest path; a child wanders, so a real round is longer: not yet
measured); replay resets in under 100 ms. Before the first touch the game plays itself (attract mode) and saves
nothing. Frame rate not measured on a real phone yet (the test browser renders on the CPU). Known cost left: the
whole block buffer uploads each frame while blocks fly.
