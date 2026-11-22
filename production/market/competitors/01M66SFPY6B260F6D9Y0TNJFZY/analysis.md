# Competitor analysis: "Punch through prison escape" (cardsharkg)

Game `01M66SFPY6B260F6D9Y0TNJFZY`. Studied 22 Nov 2026 as a guest. 424k plays in 19.3 days (~22k/day), 6.9k likes
(16.3/1,000), 4.0k shares (9.5/1,000, very high), 104 comments, leaderboard. Account total 5.8M plays.
Line refs: the ws/*.js files are one compacted line each; refs are to Prettier-formatted copies
(`prettier --no-config --print-width 120 --parser babel`). index.html refs are real lines; game_code.html refs are bundle lines.

## 0. TL;DR
- First-person **incremental digger**: punch → vacuum the rubble → spit it into a crusher for coins → upgrade → dig the
  next, harder wall. **15 walls** in code (the description says 10), 21 items, 6 gear upgrades, gold/diamond blocks, a
  Berserk meter, vacuum bots, auto-sell, prestige "Escape".
- **Three.js r128** (cdnjs) + ~175 KB hand-written ES modules. **No physics library**: custom typed-array voxel grid,
  DDA raycast, one InstancedMesh per wall holding only exposed voxels, custom rubble particles, two-pass fists.
- Made **outside Astrocade** by what looks like an AI coding agent with automated browser tests (debug hooks
  `window.__ptw`, `I2.dbg()`, `counts()`, save migrations v1→v8, README-as-spec). The only chat message asks to set a thumbnail.
- **Advertised hidden TNT is switched off**: cluster count hard-coded to 0 (`world.js:481`, `game_code.html:602`).
- **No share prompt, no challenge prompt, no haptics** in code: the share rate comes from the hook/theme, absurd items,
  the depth number and the platform's own share UI.

## 1. How it was made
- chat.md: one message, "Set this image as the games thumbnail please" (11-03 00:06). Built elsewhere, uploaded multi-file.
- README: "BLOCKHEADZ Punch Through Walls — First-person incremental wall-breaker (inspired by the viral 'punch through
  walls to escape' idea)"; written as a spec/changelog (every room's items, materials, controls, "~x3.1 hp and ~x2.8
  value per wall"); says files are whitespace-compacted "so the whole game fits in one save" (upload size limit);
  describes 15 walls.
- Code signs: test hooks behind `window.__ptwDebug` (`game.js:3402-3449`), `items2.js` exports `dbg()`, `counts()`,
  `DBG.freeze` (`items2.js:52-71,730`); save `v:8` with migrations (`game.js:3213-3248`); retired tools refunded
  (`RETIRED = {pick, sledge, drill, jack, laser}`, `game.js:380`, toast `game.js:3474`) — began as a pickaxe digger,
  re-themed to fists with live saves carried; `items2.js` added later through a context object (`game.js:633-656`);
  seed watermark "BLOCKHEADZ-CARDSHARK-PTW" FNV-hashed (`game.js:12-20,668`). Created 2026-10-30, updated 2026-11-03.
- Structure: `index.html` (201 lines: CSS, DOM HUD, three r128, module game.js); `game.js` 68 KB core; `world.js` 14 KB
  voxels/materials/raycast/scenery; `models.js` 25 KB procedural models; `decor.js` 26 KB 15 rooms; `items2.js` 16 KB
  gadgets; `fx.js` 8 KB rubble/bits/shots; `audio.js` 6 KB. `game_code.html` = esbuild IIFE (6,739 lines, 262 KB),
  three external. `window.run = run` (`game.js:3480`); edit mode skips title and saving (`game.js:3450-3457,3173`);
  config from `window.gameConfig.settings` with defaults (`game.js:32-37`).

## 2. Tech stack
- Three.js r128 global (`index.html:7`). No physics: per-axis AABB player vs voxels, gravity 26, step-up 0.46 m, no jump
  (`game.js:942-1027`); rubble hand-rolled Euler, bounce −0.28, sleeps after 0.25 s (`fx.js:115-225`).
- Grid 40×18×1224 cells of 0.2 m (8 × 3.6 × ~245 m): `type:Uint8Array`, `hp:Float32Array`, `inst:Int32Array`, ~8 MB (`world.js:2-31`).
- 15 wall segments, thickness 6+2t blocks (1.2 m → 6.8 m), 60-block rooms between (`world.js:12-26`).
- One InstancedMesh per segment (cap 6,000, doubling), only exposed voxels, swap-with-last removal, per-instance colour
  for pattern and damage (`world.js:254-326,353-373,518-538`).
- One shared 32×32 bevel canvas texture (NearestFilter); 13 procedural patterns by hash, brightness jitter 0.94–1.04 (`world.js:147-224,551-571`).
- DDA raycast ≤400 steps (`world.js:407-458`); `damageAt` oriented ellipsoid, 25 % rim falloff, radius ≤7
  (`game.js:737-794`); damage darkens blocks up to 55 % (`world.js:273-284`).
- Rubble cap 600 instanced SoA with cnt/val, evicts cheapest-farthest (`fx.js:5-226`); 260 chips + 36 dust; 160 homing shots.
- Renderer: antialias, DPR ≤2, fog 0x0B0A10 6–24 m, FOV 70, near 0.05 far 60; two passes (world, clearDepth, fists) (`game.js:531-565,3365-3368`).
- Light: ambient 0.3, hemi 0.3, head-lamp PointLight 0.72 range 8, nearest room lamp, exit and vacuum lights; no shadows; Lambert.
- Second offscreen WebGLRenderer renders 3D icons to cached canvases (`game.js:2689-2732`).
- Perf: exposed-only instancing; z-window culling −26…+30 m (decor 26 m) hidden by fog; one flush per frame; cached
  materials; HUD writes on change every 0.08 s; dt ≤0.11; SFX throttling; world regenerated from seed, `carve(bestK)` cuts the corridor.

## 3. Code architecture
- `game.js` orchestrator with module-level state; `world.js` data; `models.js`/`decor.js` factories; `fx.js` particles; `items2.js` via `init(C)`.
- Loop (`game.js:3347-3369`): `dt = min(0.11, delta) × timeScale` (slowT unused). `update()` order: player, action,
  berserk, TNT, gadgets, bots, rubble+vacuum, shots, auto-sell, rooms, shake, highlight, held item, bits, flush/cull,
  flash, tutorial, HUD /0.08 s, save /12 s (`game.js:3262-3338`).
- Screens: title, play, upgrade sheet, loadout picker, escape; tutorial index 0–8 then 99.
- game_config: `{punchPower, coinMultiplier, wallHardness, tntPerWall(ignored), startBag, magnetRange}`; tools,
  materials and costs hard-coded (`game.js:49-450`, `world.js:37-141`).
- lib: `getAsset` for 15 audio assets (`audio.js:23-51`); `saveUserGameState` debounced 800 ms + every 12 s with
  `{v:8, coins, ups, tl, loadout, curSlot, esc, bag, bagVal, bz, maxRoom, bestK, tut}` (`game.js:3172-3197`);
  `getUserGameState` raced against 2.5 s (`game.js:3198-3253`); `addPlayerScoreToLeaderboard(esc*100 + floor(bestK*0.2))`
  on every new room and on escape (`game.js:1625,2268`); `showGameParameters` (Punch Power, Coin Multiplier, Wall
  Hardness, Starting Tank, Suction Range) (`game.js:3372-3384`); `shouldUseTouchControls`, `log`. No haptics, no share.

## 4. Controls and camera
- First person: eye 1.42 m, FOV 70, pitch −1.3…1.2 (start −0.2); bob on the viewmodel only; shake position ×0.3, pitch ×0.05, decay pow(0.003, dt).
- Touch: floating joystick bottom-left (x<50 %, y>55 %), base 230 px, knob 100, clamp 90, dashed "MOVE" hint, 4.3 m/s;
  drag elsewhere to look (0.0062/0.0058 rad/px); tap (<14 px, <350 ms) queues a punch (≤2); 172 px hold-to-use button —
  **dragging the holding thumb aims** (`game.js:3028-3036,3094-3105`); 120 px secondary (BERSERK/SPIT/BOOM) also aims;
  5 vertical hotbar slots (slot 1 = vacuum; tap selected/empty opens loadout picker); 360×104 BUY near pedestals.
- Desktop: pointer lock (0.0024), LMB/Space/F use, RMB/R spit/detonate, WASD, 1–5, E buy, Q berserk, U upgrades.
- Punch: alternating fists, ease-out-cubic thrust 35 % then return, per-tool hit delay 0.03–0.08 s, per-tool model/rate/radius/shake/SFX pitch (`game.js:795-803,1096-1120,1200-1220`).
- Vacuum: cone cos(0.42+0.02·lv) (~24°), range 3+0.6·lv m, pull 70+40/(d+0.3), shrink, absorb at 0.3 m; **tone
  500→1400 Hz as the tank fills**; fill gauge on the model (`fx.js:124-167`, `game.js:3276-3303,1250-1263`).
- Sell: tank 100 ×1.32/upgrade; "🛢️ TANK FULL! SPIT it into a yellow chute (12m)" (`game.js:2367-2381`); SPIT 14 shots/s
  of ceil(cap/40) blocks (`game.js:1046-1071`); shots home to a hopper within 9 m and dot 0.8 (`fx.js:397-415`); miss
  falls back as rubble; crusher wheels speed up per sale; sales summed into one "+🪙 N" 0.5 s after the last
  (`game.js:1373-1383`); Vacuum Bots (max 6, 12 each) and Auto-Sell 20k at 80 % (`game.js:1394-1511,3308-3314`).

## 5. Visuals
- Blocky low-poly toy-box style in a dark foggy prison lit by a head-lamp; all textures canvas-drawn. Hand tiers: skin,
  white wraps, red gloves, steel dusters (emissive), giant green "Hulk" fists (`models.js:19-141`). Primitive gadgets:
  articulated rubber chicken, 8×6-segment octopus, bowling ball, duck bombs with fuses, wrecking ball, anvil, Thor's
  hammer, laser-eye glow; models double as icons.
- Cell: bed, toilet, bars, "BLOCKHEADZ STATE PRISON" sign, tally marks (`world.js:679-700`).
- 15 themed rooms (`decor.js:143-951`): Guard Break Room, Laundry, Kitchen, Workshop, Gym, Boiler Room, Security, Sewer,
  Warden's Office, Library, Infirmary, Mail Room, Visiting Room, Chapel, Bank Vault; floor/wall/trim, colliders,
  "ROOM n · depth m" sign, SELL CRUSHER $ chute with hazard stripes, bobbing arrow and toothed wheels
  (`models.js:158-214`), NEW ITEMS wall with pedestals spinning items at 1.4 rad/s under sprite price tags (`game.js:1512-1571`).
- Teaser: room 2 sign "HULK FISTS IN ROOM 4!!" with a 1.7× model (`decor.js:1000-1012`).
- Gold 0.5 % / diamond 0.12 % of cells from wall 3; TNT designed as red/white 3×3×3 clusters.
- Effects: crosshair 1.3× for 80 ms; 2–4 chips + dust per hit; crumble volume by blocks broken; duster clink 1.9 kHz;
  Hulk boom + 60 Hz thump; shake 0.012 (chicken) … 0.16 (Hulk), 0.35 TNT; damage darkening; wireframe target within
  2.4 m; rubble wakes near blasts; flash; red Berserk vignette; pops "💎 DIAMOND!" "🟨 GOLD!"; lightning lines, ice tint
  (frozen = 8× damage), black hole swallowing voxels, anvil markers, toasts "🎳 STRIKE! N blocks", "💥 ANVIL! N blocks" (`items2.js:335,728`).
- UI kit (720×1280): white text, 2 px #14203a stroke; pills/buttons with 5 px navy border and hard 6–7 px navy shadow,
  pressed 5 px; gradients green #8cf26a→#2fb82a, yellow #ffe25a→#ffa800, red, blue, purple, grey, orange; Arial Rounded
  MT Bold / Trebuchet, no webfont, heavy emoji.
- HUD: coin pill left 16 top 16 (34 px); tank pill right 16 + 200×18 bar; depth centre top 20 (44 px) + material/room
  name top 68 (20 px yellow); UPGRADE 120×110 left 16 top 100 with a **red "!" when anything is affordable**
  (`game.js:2357-2360`); escape multiplier pill top 232; hotbar right 12 top 250 (5 × 92 px, 3D icons, "Lv");
  crosshair 34 px; action button 172 px right 34 bottom 70 (112 px icon + 20 px verb caption); secondary 120 px right
  222 bottom 78; BUY 360×104 bottom 340; red prompt bottom 460; tutorial sign top 118 (44 px + dots); toast top 186
  (22 px, 5 s de-dupe); big text at 27 % (64 + 28 px).
- Panels: UPGRADES sheet (inset 16, top 110, r36) with "🛠️ YOUR ITEMS" rows (96 px icon, 32 px name, purple LEVEL,
  24 px desc, "Power a → b", 190×96 buy) and "⚙️ GEAR"; LOADOUT grid 150×170; escape screen "YOU ESCAPED!" 110 px
  wobble, reward, "NEXT PRISON ▶" 480×130; title BLOCKHEADZ / PUNCH THROUGH WALLS 112/150 px, 150 px 👊, PLAY/CONTINUE
  420×130. Minimal text; tutorial = emoji + one word on touch. Z order: canvas, HUD, fx, big text 12, toast 20, tutorial 25–27, sheets 30, escape 40, title 50.

## 6. Content and progression
- Loop: punch (fists clear ~15–35 plaster blocks per hit) → rubble → vacuum (100-block tank fills in ~3 s: **the tank,
  not damage, is the early income limit**) → spit into crusher → upgrade → breakthrough bonus **120 × previous wall's
  block value** (× escape mult), score submitted (`game.js:1617-1628`) → new crusher + pedestal items → next wall ×3.1 HP
  for ×2.8 value (value/HP 1.33 → 0.13) → after 15 walls, EXIT and escape.
- Walls (HP / value / thickness): Plaster 0.75/1/6, Old Brick 4/3/8, Concrete 14/8/10, Cobblestone 45/20/12, Rebar
  140/55/14, Granite 450/150/16, Obsidian 1,400/420/18, Crystal 4,500/1,200/20, Magma 14k/3,500/22, Titanium 45k/10k/24,
  Diamond Rock 140k/28k/26, Plasma 435k/78k/28, Neutronium 1.35M/220k/30, Dark Matter 4.2M/615k/32, Vault Steel
  13M/1.72M/34. Walls at 4.8, 18.0, 31.6 … 226.0 m; exit ~249.8 m. Room bonuses 120, 360, 960, 2.4k, 6.6k … 206M.
  Gold ×15 value ×2 HP; diamond ×60 value ×4 HP.
- Items (price / base damage), level cost c0·1.42^lv, damage ×1.3/lv × (1+0.25·escapes), max lv 50:
  Cell Fists free 1 (0.46 s); R1 Wraps 150 1.8 (0.2 s); R2 Gloves 900 10; R3 Dusters 3k 26; R4 Hulk 12k 120; R5 C4 30k
  900 (3 charges), Termite 48k; R6 Spring Glove 150k 1,500 (5 m reach); R7 Freeze Ray 380k (frozen 8×), Rubber Chicken
  520k 1,600 at 0.065 s; R8 Thor 1.4M 16k, Octopus 2M 6k×8; R9 Bowling 5M 60k; R10 Ducks 15M 230k; R11 Wrecking Ball 42M
  520k; R12 Magnet 55M, Laser Eyes 120M 150k beam; R13 Lightning 330M 5M; R14 Rocket Fist 950M 26M, Anvil 1.2B 16M; R15 Black Hole 3B 26M.
- **Tuning rule:** each new item's base damage ≈ the next wall's HP (Gloves 10 vs 14, Hulk 120 vs 140, Thor 16k vs 14k,
  Rocket 26M vs 13M); unlock ≈ 150× the block value of the wall just cleared.
- Gear (`game.js:401-450`): Swing Speed 40·2ⁿ (max 10, ×0.9 rate, floor 0.35); Smash Size 90·2.6ⁿ (max 8, +0.3);
  Vacuum Tank **20·1.6ⁿ (20, 32, 51, 82, 131…)** (max 40, cap 100·1.32ⁿ); Suction 25·1.75ⁿ (max 12, 3+0.6n m); Vacuum
  Bots 400·4.5ⁿ (max 6); Auto-Sell 20k (sell anywhere at 80 %). Fist levels 12, 17, 24, 34, 49 … ten levels 924 coins for ×13.8.
- Berserk: +1/110 per block; 7 s ×2 damage, rate ×0.35, radius +1, red vignette, music ×1.12 (`game.js:2301-2315`).
- TNT as designed: 3×3×3, arms 1.7 s with beeps, blast r6.5, chains, knockback, **spills 40 % of the tank** (`game.js:840-941`) — never spawns.
- Escape: coins ×(1+0.5·esc), damage ×(1+0.25·esc), everything else resets, new seed (`game.js:2263-2300`).
- Session (estimate): first wall ~1–2 min; rooms 1–5 ~20–30 min; first escape plausibly hours across sessions.

## 7. Retention and virality
- First 10 s: wobbling title, pulsing PLAY (CONTINUE when returning) → start in the cell facing the wall → "🚶 WALK!"
  with a **130 px hand** and **bouncing 3D arrow** → ✅ + 880/1320/1760 Hz arpeggio per step → "👊 HOLD!" (plaster 0.75 HP
  vs fists 1: **first punch blows a 20–30 block crater** in ~5 s). Tutorial 8 steps: walk, punch 12, tap vacuum, suck
  10, spit at crusher, smash to Room 1, pedestals, UPGRADE (`game.js:2405-2576`).
- Cadence: sound on every punch/absorb/spit; a sale every 2–10 s; something affordable every ~30 s early (red "!");
  Berserk every ~110 blocks; random gold/diamond chimes; a breakthrough every 1–5 min (room-2 teaser sets up room 4); prestige after hours.
- Shares: **no in-game share/challenge**, no share on the escape screen. Ranked hypotheses: meme hook + description
  with goal + number + hazard; absurd screenshot-able items with count toasts; depth number on screen + leaderboard;
  creator's audience (unverifiable); the platform share UI. Hook + content alone reach 9.5/1,000.
- Audio: 15 assets (9 generic, 6 bespoke: punch, crumble, sell cha-ching, cartoon TNT boom, breakthrough fanfare, 30 s
  synthwave loop at 0.22); ±6 % pitch; per-key throttle; synth fallbacks; procedural squeak/boing/quack/whistle/rumble/
  clatter/chain; `sfx_breakthrough` never played. Haptics: none.

## 8. Bugs, rough edges, performance risks
1. TNT never spawns (`const o = 0`, `world.js:481-497`, `game_code.html:602`); description promise false; ~100 dead lines (likely a deliberate kill-switch).
2. Description says 10 walls; code has 15 (`NSEG=15`).
3. Breakthrough under-celebrated: `discoverRoom` only floats coins (`game.js:1617-1628`); fanfare never played, no big text.
4. Progress wipe: load races a 2.5 s timeout (`game.js:3201`); after a timeout the next save overwrites the real save with an empty one.
5. Dug tunnel not persisted (wider digging regrows), floor rubble lost.
6. Rubble cap 600: new low-value rubble silently discarded (lost coins); O(n) scan per spawn → O(n²) on big blasts (`fx.js:36-54`).
7. Every rubble matrix rewritten each frame incl. sleeping; up to 6 bots scan all rubble per frame.
8. Voxel scan spikes: magnet 31³ ≈ 30k cells, lightning ~35k, `damageAt` ≤3,375 per hit (×8 octopus).
9. Second WebGL context with `preserveDrawingBuffer` (iOS / low-end risk).
10. `frustumCulled=false` everywhere; only z-window culling.
11. Three.js r128 is old.
12. Leaderboard score = escapes·100 + metres (≤~249): depth dominates; submitted score drops after an escape.
13. Dead code (`slowT`, `soft("break"/"pick")`).
14. Fixed-pixel UI relying on host scaling.
15. Toast de-dupe can hide TANK FULL.
16. No jump; stuck players get a "Look down…" toast.
17. Switching slots cancels a pending hit.

## 9. Kid safety
- Prison theme mild/cartoonish; only walls are hit; light copy.
- "C4" is a real explosive name; TNT prompted "kid friendly" but disabled.
- "Knuckle Dusters" (a real weapon), "Hulk Fists" / "Thor's Hammer" (Marvel IP), "Berserk 😡" (rage as power-up).
- Chapel room (religious setting), Bank Vault of gold (heist overtones). No chat/ads/links.
- For us: toy names for explosives ("Boom Putty", "Party Popper"); no weapon names, no third-party IP.

## 10. What Block Smash Crew should adopt (ranked)
Baseline today: every material worth 5 coins; tools 5 upgrade levels at base×1.9ⁿ (hammer first upgrade 1,500); tool
unlocks 8k–110k; ~1,000 coins per level; we already use `lib.share` and `lib.haptics`.
1. **Physical collect-and-sell loop with a tank**: rubble cubes worth coins; vacuum/magnet cone ~24°, reach 3 m + 0.6/lv;
   tank 100; spit 14 shots/s of ceil(cap/40), homing within 9 m ±37°; misses fall back; red "TANK FULL → chute (12m)";
   auto-magnet within 1.5 m for ages 5–7. Second satisfying verb; the tank is the early limit upgrades visibly fix.
2. **First purchase at 12–40 coins, something buyable every ~30 s**: c0·1.42ⁿ with ×1.3 damage/lv; tank 20·1.6ⁿ for
   ×1.32; speed 40·2ⁿ; size 90·2.6ⁿ; reach 25·1.75ⁿ; raise our cap from 5 to 20–50 levels.
3. **Red "!" on the shop button when anything is affordable** (38 px dot); pulse in-world BUY.
4. **Zone ladder ×3.1 HP / ×2.8 value** instead of a flat 5 coins; new tool damage ≈ next zone HP; unlock ≈ 150× value of the zone just cleared.
5. **Celebrate every breakthrough**: 3 s crash + fanfare, 64 px big text, 120× value bonus, confetti, haptics, score submit, share card.
6. **Visible future goal in the world**: "🚀 ROCKET IN THE CASTLE!" sign with a spinning model (their `decor.js:1000-1012`).
7. **In-world pedestals for new tools**: NEW ITEMS wall, spin 1.4 rad/s, sprite price tag, BUY within 1.5 m; keep the menu for levels.
8. **Silly, showable tools with count callouts** ("STRIKE! 37 blocks"; squeaky chicken, duck bombs).
9. **Prestige**: +50 % coins, +25 % damage per prestige, "x1.5 COINS" pill; leaderboard prestiges×1000 + best blocks.
10. **Aim while holding HIT** (drag the holding thumb turns the camera); a tap on the look side also hits (≤2 queued).
11. **Picture-first tutorial**: emoji + one word, 130 px animated hand, pulsing ring, 3D arrow, progress dots, ✅ arpeggio.
12. **Instant first-hit power**: first blocks 0.75 HP vs 1 damage, first wall 6 blocks thick → 20–30 block crater, breakthrough < 90 s.
13. **Super Smash meter**: 1/110 per block; 7 s ×2 damage, ~3× rate, +1 radius, music ×1.12; circular meter on a 120 px button by HIT.
14. **Juice**: damage darkening to −55 %, rising tank tone 500→1400 Hz, crusher wheels speed up per sale, sales summed
    into one pop 0.5 s after the last coin, crosshair 1.3× for 80 ms, per-tool pitch tables + ±6 % random pitch.
15. **Gold ×15 / diamond ×60 blocks** at 0.5 % / 0.12 %, "💎 DIAMOND!" pop + 1046/1568 Hz chime.
16. **Automation**: helper bots 400·4.5ⁿ (max 6, carry 12 each — our toy robots); Auto-Sell 80 % ~20k.
17. **Do the share they don't**: `lib.share` at peaks (breakthrough, big count, prestige, daily) with a numeric brag line; description = goal + number + hazard.
18. **Chunky UI kit**: 5 px navy outlines, hard 6–7 px shadow collapsing on press, 2 px text stroke, gradient fills, 92 px
    slots with 3D icons, 172 px action button whose verb caption changes per tool.
19. **r187 engine tricks**: instance only exposed voxels per chunk; swap-remove; colour in `instanceColor` with one
    32 px bevel texture; DDA; z-culling with fog; two-pass viewmodel; sleeping debris; one buffer flush per frame.
20. **Avoid their mistakes**: never save after a timed-out load (loaded flag); keep the description in sync; merge
    debris instead of deleting value; play the fanfare you generated; kid-safe names.

**First five:** #1, #2, #5, #4, #10.
