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
- **First person like the leader (owner's call, 21 Nov), but portrait:** hands + tool on screen, crosshair, outline on
  the target block. Device found by itself: phone = stick + drag-look + HIT button; desktop = WASD + mouse (pointer
  lock after the keys are used) + click/Space. Only the stick / WASD walk (no auto-walk); a tap smashes a block in reach, a far one pulses the resting stick.
- **Real collapse:** anything no longer connected to the ground falls as one piece and shatters ("CRASH!").
- **Tools (verbs):** hammer, bomb, rocket, wrecking ball, black hole, meteor. Cooldown, no ammo, no ads.
  Locked tools can be tried free once per level; coins unlock them.
- **Level:** treasure in a steel vault (needs a bomb) → chest bursts coins → 8 s SMASH TIME (cooldowns gone, ×2)
  → card: 3 stars (treasure / ≥50% wrecked / 3 gems), coins, big NEXT. No timer fail, no death.
- **Levels:** 8 building generators (cottage, candy shop, castle, lighthouse, toy factory, ice palace, jungle temple,
  space base), endless with growing size.
- **Hook:** demo hero smashing the fence before any touch; the first tap anywhere hits the TNT barrel in reach of the start = first boom in < 1 s.

## Layout numbers (720×1280 units; measured target, frame full 3D)
- Building ≥ 70% of frame width at spawn, centre at y ≈ 45%; hero at y ≈ 70–75%.
- HUD: coins pill top-left, 3-star pill + wreck bar (trophies at 50% / 80%) top centre, ⚙️ top-right; 96 u buttons.
- Toolbar: 6 buttons × 104 u at bottom 34 u (user 21 Nov: no empty band at the bottom; the guest login sheet
  covers the lowest ±13% only for a few seconds); resting stick + HIT sit in one row above it.

## Findings (first build)
- A level where the bot reaches the chest in 2 s is too short: 3 stars (vault + high + deep) with inner walls → bot 5–8.5 s, a child far longer, plus the free phase.
- Portrait framing: camera dist 15, height 10.5 shows the whole building with the hero at 68–76% (above the tools).
- Inside view by footprint with hysteresis; roofs peel from the top; occlusion pull only outside.
- Wreck rating uses trophies, not stars (two meanings of "star" confused).
- Tests: `node logic.test.mjs`, `node playtest.js <out>`, `node soak.js 10`, `node look.js <out>`, `node checks.js`.

## Upgrade P1–P5 (21 Nov, "setuju semuanya")
- P1 day-one safety: child pilot (taps near the goal, hesitates, bombs half the time) went 9/48 → 48/48 runs (median 23 s) with
  star bombs (tap a shining star), SUPER HAMMER (steel breaks after 3 bounces), stick-zone taps, idle hand hint.
  `perf.js`: game code 2.6 ms/frame at CPU 4× (GL submit is SwiftShader's, not a phone's).
- P2: tall pieces tip over their base (TIMBER!, slow motion), TNT chains (one straight ahead of the start), material
  fragments, sparks, scorch, hit-stop, camera kick (exponential: a spring was unstable at slow frames).
- P3: 13 recorded sounds + music from the asset map (code sounds as fallback), 16-tile pixel atlas, glove.
- P4: shop (tap coins) with 5 upgrade levels per tool, album, daily challenge ×2 (never moves the level path).
- P5: boss every 5th level (biggest size, ×2), day / sunset / snow looks.
- Controls pass (user): no auto-walk (only stick / WASD walk; swipe elsewhere looks), resting stick shown on phones,
  tools at the bottom edge (no empty band), spawn 1.5 closer so the front TNT is in hammer reach. Child pilot now
  walks with the stick + holds HIT: 48/48, median 12 s.
- First-time guidance pass (user): coach spotlight (dim + lit hole + moving hand + label) for walk → look → smash →
  bomb, each until used once (saved in `learned`); level card (icon, LEVEL n, name, BOSS / DAILY) under a white flash;
  coins and found stars fly into the HUD; result coins count up. `journey.js` plays a new player's first minutes
  (phone) and checks every step, label placement and the flights.
- Text auto-fit pass (user): every box follows its text — one line when it fits, else two balanced lines, only then a
  smaller font (≥70%); result buttons share the longest label's width; shop tabs centred between an empty cell and ✕;
  album names in two readable lines. `look.js` measures it in 7 languages (no sideways spill, no text under 12 u,
  equal buttons, centred tabs).

## Run
`python3 -m http.server` is not enough (module MIME); use the tests' server: `node playtest.js <out>` or open with
`?local` through any server that sends `text/javascript`.

## Code
`voxels.js` grid + mesher + ray + collapse (pure), `levels.js` generators (pure, seeded), `logic.js` economy,
`scene.js` Three.js look, `game.js` flow/input/HUD/sound/save, `game_config.json` tuning + 7 languages.
