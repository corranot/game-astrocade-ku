# Block Smash Crew: Voxel Demolition — brief

<!-- PROTOTYPE - NOT FOR PRODUCTION -->

Status: first build done, private Astrocade draft `01M7YWVX1JHRJH2KJ0P7HRXCY9` (2026-11-21). Answer to **Voxel Wreck** (Poki, SwiftRoll, trending #9, 20,5rb like / 4,2rb
dislike), learned from, not copied: own theme, own camera, own controls, own code and art.

## What the leader does (played as guest 21 Nov, desktop 1280×800; bundle read for technique)
- **Stack:** Vite + three.js + Rapier3D WASM embedded (one 3,6 MB JS + 236 KB i18n), BatchedMesh/InstancedMesh,
  greedy voxel meshing, ±20 languages, Poki SDK ads (rewarded respawn, ad-for-ammo). Comments mention agent tooling.
- **Loop:** first-person, level starts in place (bank, fence ahead, sledgehammer in hand, objective marker "24 m").
  Smash → money (fence: 0 → 5.401 in 5 hits; one rocket at the facade: 10rb → 481rb). Tools: hammer ∞, drill ∞,
  grenade, dynamite, remote explosive, rocket, cluster, orbital strike, mega grenade, spray paint (ammo + shop).
  Hard materials need drill/explosives ("Too tough for the sledgehammer"). Find gold → carry to green zone.
  5 medals per level (fast <1:30, all cash, no damage, ≥75% wrecked, hammer+drill only). 31+ levels
  (Bank, Farm, Museum, Police Station, Airport, Theatre…). Defenses can kill you ("YOU DIED").
- **Measured layout (frame 836×470):** play area = full frame; HUD = 1 pill top-left (counter), coins top-right,
  2 small buttons (pause, shop), 9-slot toolbar bottom centre (each slot 4,5% of width), crosshair, objective marker.
  Building ≈ 60% of frame width from spawn, ground ≈ 35% of frame height.
- **Weak spots for our players:** phone must turn landscape ("Rotate your device"), twin-stick FPS look+move,
  tutorial step "Look around" blocks the other tools until the mouse/thumb looks, small HUD text, robbery theme,
  death screen, blocks just vanish (no visible collapse of what is left floating).

## Our game (portrait 720×1280, ages 5–12)
A demolition kid in a hard hat smashes cheerful voxel buildings to find the treasure chest hidden in each one.
- **One input:** tap or hold where you want to smash. The hero runs there and smashes everything in the way.
  Drag to turn the camera. Tool buttons: tap a tool, tap the world to use it.
- **Third person over the shoulder** (hero + giant hammer always on screen), cutaway of roofs above the hero inside.
- **Real collapse:** anything no longer connected to the ground falls as one piece and shatters ("CRASH!").
- **Tools (verbs):** hammer, bomb, rocket, wrecking ball, black hole, meteor. Cooldown, no ammo, no ads.
  Locked tools can be tried free once per level; coins unlock them.
- **Level:** treasure in a steel vault (needs a bomb) → chest bursts coins → 8 s SMASH TIME (cooldowns gone, ×2)
  → card: 3 stars (treasure / ≥50% wrecked / 3 gems), coins, big NEXT. No timer fail, no death.
- **Levels:** 8 building generators (cottage, candy shop, castle, lighthouse, toy factory, ice palace, jungle temple,
  space base), endless with growing size.
- **Hook:** demo hero smashing the fence before any touch; first tap = first smash in < 1 s.

## Layout numbers (720×1280 units; measured target, frame full 3D)
- Building ≥ 70% of frame width at spawn, centre at y ≈ 45%; hero at y ≈ 70–75%.
- HUD: coins pill top-left, 3-star pill + wreck bar (trophies at 50% / 80%) top centre, ⚙️ top-right; 96 u buttons.
- Toolbar: 6 buttons × 104 u at bottom 170 u (guest login sheet covers the lowest ±13%).

## Findings (first build)
- A level where the bot reaches the chest in 2 s is too short: 3 stars (vault + high + deep) with inner walls → bot 5–8.5 s, a child far longer, plus the free phase.
- Portrait framing: camera dist 15, height 10.5 shows the whole building with the hero at 68–76% (above the tools).
- Inside view by footprint with hysteresis; roofs peel from the top; occlusion pull only outside.
- Wreck rating uses trophies, not stars (two meanings of "star" confused).
- Tests: `node logic.test.mjs`, `node playtest.js <out>`, `node soak.js 10`, `node look.js <out>`, `node checks.js`.

## Run
`python3 -m http.server` is not enough (module MIME); use the tests' server: `node playtest.js <out>` or open with
`?local` through any server that sends `text/javascript`.

## Code
`voxels.js` grid + mesher + ray + collapse (pure), `levels.js` generators (pure, seeded), `logic.js` economy,
`scene.js` Three.js look, `game.js` flow/input/HUD/sound/save, `game_config.json` tuning + 7 languages.
