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
- Tests: `node logic.test.mjs`, `node playtest.js <out>`, `node journey.js <out> <lang>`, `node soak.js 10`, `node look.js <out>`, `node checks.js <out>`, `node perf.js`.

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
- Astrocade guide pass: touch targets ≥ 96 (invisible tap areas on small pills), trophies saved per building kind
  (bounded), arrows and the hint hand moved with `translate`; `look.js` checks touch targets on 9 screens.
- BONK-BOTs (user asked for ragdoll NPCs; made toy robots for a kids' game): `bots.js` — strolling robots that the
  hammer, blasts, TNT and landing pieces knock flying as a time-corrected Verlet ragdoll (7 points, 12 sticks, ground
  and voxel push-out), BONK! + coins once per knock-over, then a reboot back on their feet. One strolls in the front
  yard, so the first boom sends it flying. 14 tests in `logic.test.mjs`, journey checks the boom and a tap.

## Horde package (22 Nov, owner: "kerjakan semuanya sebagai satu paket"; numbers from the two competitor analyses)
- **Waves of BONK-BOTs:** 15 per wave appear 4.5–12 m ahead in a 270° arc and march (0.45 m/s, catch-up ≤ 2.6×) into
  golden-angle ring slots (`1.45 + √idx·0.72`, idx from 2 so no robot stands in your face) gathered in the 120° arc you
  look at (first person portrait: a full ring stands mostly out of view). Within 6.5 m they face you, stomp and lift
  their sign. Half carry a cardboard dare sign (512×340 canvas, 34 friendly dares × 7 languages, a pool of 18 textures);
  faces: X / dizzy eyes when knocked, 5 mouths, a smile + BEEP! on getting up. Knocked robots reboot and walk off
  through one of 4 gates. Next wave at 28 s or when ≤ 22% still march (≥ 12 s), "WAVE n ARRIVING!" 3.5 s, 6 costume
  sets (party, astronaut, chef, pirate, construction, disco) mixed with plain, a cleared wave pays coins. Caps: 30 robots,
  20 lying down. The front-yard robot keeps its old spot and stroll (demo rocket + first TNT).
- **Feel:** hit-stop `dt × 0.15` for 0.04 s (hammer) … 0.09 s (meteor); shake = max(now, a·(1 − d/30)), decays exp(−9dt);
  chain bonks (a robot flying > 3.5 m/s knocks a standing one within 0.77 m, 55% speed); bombs inside a blast go off
  0.12–0.24 s later; falling blocks still knock robots.
- **Upgrades, cheap and often:** 30 levels per tool, price c0·1.42^lv (c0 9,500–60,000 in our coin scale: the
  competitor's "12–40 coins" is ~15 s of its income, ours is ~15 s of child-pilot income), size/cooldown with
  diminishing steps, coins +30% per level (×1.3 at level 2; compounding made the pilot max every tool in 5 minutes).
  Pilot child: first buy 14–18 s, a buy moment every ~20 s for 5 min (a real child is slower: ~30 s). Shop shows
  "Lv n" + a bar; red "!" (38 u) on the coins when anything is affordable. Old saves keep their levels.
- **Celebrations:** SMASH TIME, ≥ 80% wrecked, wave cleared, new biggest blast → fanfare, big words, confetti, haptic,
  leaderboard (≤ once per 10 s). Result card brag line "I smashed 1,234 blocks!" goes out with ✈️.
- **HIT button:** the tool's verb (BONK, BOOM, FIRE, SWING, PULL, CRASH) under 💥, ready pulse 1.1 s (glow 0→14,
  brightness 1→1.28), dimmed 0.78 while cooling. **Quality:** weak phone (≤ 4 cores or ≤ 3 GB) starts low (no shadows,
  half particles, DPR 0.6); everywhere the frame average over 1.2 s moves DPR −0.15 (> 1/45 s) / +0.1 (< 1/58 s).

## BOOM update (22 Nov; lesson from a competitor's "16 kinds of TNT + one BOOM button", own content)
- **Special barrels:** the barrels inside a building are special, two kinds per level in turn (`tnt.kinds`): orange
  **cluster** (throws 6 bombs outward), purple **black hole** (swallows what is around it), blue **meteor** (calls one
  down on itself). Each still booms like a plain barrel first. They show the locked tools at work before they are
  bought. What they throw pays at the barrel's rate, not at the player's upgraded tool's (otherwise the pilot bought
  something every 11 s). The barrel in front of the start stays plain: the first tap is unchanged.
- **BOOM box:** a red box with a yellow T-handle and a bobbing arrow, behind the fence and left of the hammer in the
  hand, outside the front barrel's blast. Smashing it with anything lights every barrel still standing, nearest first,
  ≤ 0.28 s apart and ≤ 2.6 s in all, with a KABOOM! banner. It stood to the side at first: outside the portrait view
  (61° off the look direction at a 49° wide view), so nobody would have found it.
- **Found on the way:** barrels inside buildings were sometimes not drawn at all (an instanced mesh's bounding sphere
  is measured once; fixed with `frustumCulled = false`, checked in `checks.js` by the barrel's colour on screen); a
  robot facing a block dropped its goal every frame and could stand still for good (`bots.js walk`).
- Tests: 12 new in `logic.test.mjs` (114), 4 barrel-colour checks in `checks.js`. Pilot child unchanged: 48/48,
  median 11 s. Not proven here: how it feels on a phone, and whether a child notices the box without being told.

## Run
`python3 -m http.server` is not enough (module MIME); use the tests' server: `node playtest.js <out>` or open with
`?local` through any server that sends `text/javascript`.

## Code
`voxels.js` grid + mesher + ray + collapse (pure), `levels.js` generators (pure, seeded), `logic.js` economy,
`scene.js` Three.js look, `game.js` flow/input/HUD/sound/save, `game_config.json` tuning + 7 languages.
