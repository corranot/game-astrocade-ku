# Competitor analysis: "41 Ragdoll Executions" (psgame_studio)

Game `01M5355XJMD0FRQ2N1ZD3FY40D`, studied 22 Nov 2026 as a guest. Remix (`is_remix: true`, base
`01M3Y733A5YGTMYB623TA9TH93`) but the chat starts from a blank template. 1.5M plays in 35.7 days (~42k/day), 21.6k
likes (14.4/1k), 6.3k shares (4.2/1k), 441 comments, no leaderboard. Sources: all of chat.md (333 messages, 166
wishes), the GDD, game_config.json, asset_map.json (101 assets), game_metadata.json, game code lines 337–20188 of
game_code.html. Line numbers are game_code.html unless marked "chat #".

**Timing.** `created_at` 2026-10-16 20:06 UTC = first publish, after 14.5 days and ~140 wishes, right after a "ship
pass" (mobile controls, performance, load time). The title "41 Ragdoll Executions" and a custom thumbnail followed ~16 h
later (#293–#300), so almost all plays came under that packaging.

## 1. Wish history
### 1.1 Style
- 166 wishes over 16 active days (peaks Oct 12 and 16: 23 each). Median 12 words, mean 13.9; only the opening brief is
  long (168 words, #1). Typical: "add zombie too" (#199), "spikey ball weapon need" (#95), "reduce bit more" (#325).
- Non-native English. Frequent words: realistic (25), fix (21), button (17), remove (13), destroy (12), sound (11),
  mobile (11). Templates: "make X weapon. effect on ragdolls realistic", "make that we …".
- ~7 wishes with images: start view (#31), flamethrower bug (#43), road roller (#57), flail photo (#95), mannequin look
  (#211), ground glitch (#203), thumbnails (#297, #299, #331 "do not redraw it, use as is").
- Bug-fixing: one symptom at a time, pushing back until right — the bat grip took 8 wishes (#101–111, #133); wheel
  tap-to-open 3 (#303–307); 3 errors pasted verbatim "Please fix this game error:" (#91, #215, #243).
- Split: new weapon/creature 33; other mechanics 9 (permanent death + ash #27, bomb break-apart #35, crowd rallies at you
  #205, insult signs #209, costume waves #273, carts #161, push rock #193); animation ~22; looks ~24; bugs ~20; UI and
  controls ~25; sound 12 (mostly removing "funny whistle/siren" sounds: #113, 125, 127, 153, 187, 195, 229, 309); gore
  escalation ~9; tuning ~7; performance/loading 2 (#255, #257); packaging 4. ≈25 % content, 75 % polish.
- Speed: most wishes turned around in 1–7 min (creatures 6–13); next wish usually 1–3 min later; long gaps are breaks.

### 1.2 Phases (UTC)
- **Phase 0 – AI's 5-step plan (Oct 2, #1–#15):** 168-word brief ("3D ragdoll physics game… living ragdolls (floppy,
  colorful)… rally crowd… bombs, flamethrowers, bats, rockets… comedy, chaos… rather than gore… our player is the only
  real human") → "3d game full" → plaza, buildings → crowd of 18 with "RALLY TIME!" signs → bat + ragdoll physics +
  weapon wheel on Q → bomb, flamethrower, rocket, push gun, gravity gun → props, respawn, time of day, shake slider.
- **Phase 1 – looks and feel (Oct 6, #17–#35):** player costume, shoulder gaps, hair flicker, inverted look; **X eyes +
  O mouths "they are not real humans"** (#25); permanent death, crowd refills, char → ash (#27); low behind-view start
  (#31, pitch 0.08); marker at 39 % height; bombs break ragdolls into pieces (#35).
- **Phase 2 – arsenal (Oct 7–8, #37–#63):** chainsaw, acid gun, wider flame and fire spread, melting capped at march
  speed, katana 3-hit combo, sledgehammer shockwave, catapult fling, freeze → ice statue that shatters, road roller,
  lawn mower, virus syringe with contagion.
- **Phase 3 – summons, truck, hands (Oct 9–11, #65–#111):** hammer overhead slam, summon dog (shake rate 12.5), bear,
  eagle carry-drop, ANIMALS button + radial wheel, elephant, anaconda, gorilla, pointer-lock relock cooldown 1350 ms,
  drivable truck (horn, drift, chase camera), spiked flail, vertical bat swing, jointed fingers, two-hand bat grip.
- **Phase 4 – brutality, audio, more tools, wheel layout (Oct 12–13, #113–#191):** whistle purge (#125 "no funny
  whistle sounds… any attack"); ants (70 instanced); tiger; bat hits one best target; thunder; Natural Weapons wheel
  (thunder, meteor, tornado, earthquake) single-target; **tornado 3 s slow build-up "so we can see"** (#147); air pump (9
  pumps); giant scissors; blender; carts pushed in front; inner wheel ring; shock gun; wheel layout (94 px circles, ~5 px
  gaps, numbers removed); BBQ; shark tank; hornets; rolling boulder.
- **Phase 5 – identity (Oct 14–15, #193–#241):** push rock; MONSTERS wheel (vampire, devil, zombie with spreading
  bites); procedural paving floor (#203); **the crowd turns and marches at the player in a golden-angle ring (#205,
  lines 3320–3333)**; **36 procedural insult signs (#209, lines 2256–2293)**; mannequin dummies (#211); all yellow;
  chest muscle tweaks; meteor removed (dead code line 13103); burlap sack.
- **Phase 6 – ship pass (Oct 16, #243–#287; published 20:06):** r128 crash fix; right-side button rail (#247); drill;
  single bottom-left joystick + swipe to look (#251, #253); **"run extremely fast… low end devices" → quality tiers +
  dynamic resolution (#255, lines 410–431, 625–632, 19943–19958)**; **load-time pass (#257: lazy sounds, deferred icons,
  non-blocking fonts)**; WEAPON button; march speed 0.2; X eyes restored, 5 mouth types; **themed costume waves (#273)**;
  tornado slower and more visible; face stripes removed.
- **Phase 7 – packaging (Oct 17–18, #289–#325):** "41 Ragdoll Executions – is this a good game name" → the AI said
  "'executions' sounds grim", suggested "Ragdoll Rally: 41 Ways to Fall"; the creator kept his name; thumbnail refused
  once (title mismatch), applied on resend + rename (#299); WEAPON button centred bottom; wheel opens on `click` with a
  500 ms dismiss guard (lines 4548–4555, 18336); **pulsing action button "time to press it" (#313, CSS 223–228, lines
  18584–18613)**; desktop ACTION/WEAPON SELECT with key hints; master volume 0.3.
- **Phase 8 – hero refresh (Oct 31–Nov 1, #327–#331):** tank top, V body, black hair, new thumbnail.

### 1.3 What made it take off (inference)
1. Title + thumbnail (#293, #299): listicle number + shock word + "Ragdoll".
2. The crowd turns on you with insult signs (#205, #209): a motive and a joke in every frame.
3. Ship pass hours before publishing (#247, #253, #255, #257): mobile controls, performance, load time.
4. Costume waves (#273): novelty every 12–28 s.
5. 40 tools free from second 1, backing the "41".

## 2. Tech stack
- Three.js r128 from cdnjs only (line 336, preload 328); **no physics engine** (GDD names Cannon/Ammo, unused). Bebas
  Neue + Inter via Google Fonts, non-blocking (`media=print onload`, line 330). ~995 KB, one `async function run(mode)`
  (lines 345–20187); `<title>` still "Ragdoll Rally Chaos".
- **Ragdolls.** Visual skeleton from nested groups (`createRagdoll` 3130–3296), ~40–45 procedural meshes each (low tier
  drops details), ball joints, tube X eyes, 5 mouths. **14 one-axis spring-damper joints with limits** (3268–3285);
  `stepJoints` sub-steps 60 Hz, `acc = k(t−a) − c·v`, `c = 2√k·ζ`, bounce −0.3 at limits; `k = 15 + stiff·260`
  marching, `8 + stiff·50` knocked; wobble from body-bob acceleration and yaw rate (3522–3528) + random twitches.
  **Knocked-down = one rigid body + 12 ground contact points** (3567–3572, 3614–3855), bounce 0.3, friction
  `exp(−0.6·8.3·dt)`, walls ±24.6; limbs flail sinusoidally in the air, random sprawl on landing; `knockRagdoll`
  (3593–3612) sets velocity, spin and joint kicks by body part.
- Dismemberment (not for us): `breakRagdoll` re-parents meshes into impulse rigid bodies (`makeBody/stepBody`
  19144–19227: 8 corner contacts, restitution, Coulomb friction, ≤6 sub-steps at 120 Hz, sleep after 0.5 s). The 34
  props use the same code.
- Crowd separation 0.74 m (3969–3984); **a body faster than 3.5 knocks over a standing one and passes on 55 % of its
  speed (4082–4098)**.
- Renderer: AA on high only, `powerPreference: 'high-performance'`, `stencil: false`; **no tone mapping** (flat,
  saturated look); DPR 1 low / ≤1.5 medium / ≤2 high, dynamic down to 0.6/0.75; shadows off low, PCF every other frame
  medium, PCFSoft high, 1024/512 maps following the player; ambient 0.5 + directional 0.8 by time of day; 4 lamp lights
  on high; explosion flash; fog 40–80; gradient sky dome; FOV 60.
- **Perf:** auto tier (touch → medium only with ≥8 cores and ≥8 GB, else low; desktop high, lines 411–417); low swaps
  MeshStandard for a Lambert subclass globally (418–430); **dynamic resolution: average frame over 1.2 s; >1/45 s →
  DPR −0.15; <1/58 s → +0.1 (19943–19958)**; static scenery merged by material, `matrixAutoUpdate=false` (1288–1338);
  pooled `Points` per particle type (smoke 900, fire 1800, juice 1500, acid 1500; low skips 45 %, medium 15 %,
  4887–4948); caps (bursts 80/200, chunks 90/200, puddles 30, scorches 12, ash 24, 40 bodies on the ground then the
  oldest sinks, line 4079); only ants instanced (14319); sleeping bodies; **lazy sound (core first, rest 2 at a time,
  weapon sounds on select, 4800–4815, 18364)**; **deferred wheel icons (`data-src`, prefetch at 9 s, 404–408, 20186)**;
  HUD touches DOM only when a key changes. No LOD, no mesh pooling, no culling.

## 3. Code architecture
- Sections: quality 410, setup 624, lighting 650, textures 667, sky 817, plaza 937, player 1340, weapon models 1590–2037,
  crowd 2038, ragdoll 3562, state/UI/input 4150–4772, audio 4774, effects 4846, explosions 5013, juice 5104, one section
  per weapon 5435–18050, fire 18051, weapon update 18087, wheel and HUD 18201–18614, bat 18616, props 19084, hands
  19898, loop 19940.
- Loop (19960–20182): rAF, dt ≤0.11; **hit-stop by slowing time `if (hitStop > 0) dt *= 0.15` (19965), 52 call sites at
  0.03–0.09 s**; opening any wheel pauses the simulation and lowers loops (20121–20130).
- State: play/edit; pause from four wheel flags; ~30 string-keyed state machines (carts idle→grab→load→act→pour→idle;
  creatures chase→lunge→maul→leave).
- Weapons half data (`WEAPONS` 18202–18228: id, name, icon, emoji, description, button label; `ANIMALS` 4593,
  `NATURAL_WEAPONS` 4655, `MONSTERS` 12783; every number in `cfg` with `WEAPON_DEFAULTS` 349–392, ~185 sliders via
  `showGameParameters` 433–622), half code (switch in `firePress`, 22-branch pose chain, meter and pulse chains: a new
  weapon touches ~6 places).
- **No save/load**; lib: `getAsset` ×10, `log` ×2, `showGameParameters` ×1. No haptics, leaderboard or share.

## 4. Controls and camera
- Mobile (4392–4556): fixed joystick bottom-left 154 px (thumb 66, travel 58), grabs within 110 px or the bottom-left
  220×240 box; every other touch swipes to look (0.007 rad/px, pitch −0.5…1.2); buttons excluded; no jump/sprint.
- Desktop: WASD, Shift sprint, Space jump, pointer lock; fire LMB/F/E; Q weapons, Z/Tab animals, R natural, I monsters,
  X thunder, O boulder, T truck; digits pick weapons with the wheel open; "CLICK TO PLAY" overlay first.
- Camera (20135–20157): **third person**, distance 6, height 2.5 (truck 4.5/1.2), aim at player +1.2 m, start pitch
  0.08, no smoothing/collision; shake jitters position + roll, decays `exp(−9dt)`, fades with distance (1 − d/30).
- Aim by camera tilt: melee targets head (pitch <0.08) / legs (>0.62) / body (`aimType` 18438); yellow in-reach ring for grab tools.
- WEAPON button 150 px centred bottom → 25-slot radial wheel; ANIMALS/NATURAL/TRUCK/MONSTERS 104 px on the right; **one
  136 px action button whose label follows the tool** (SWING, SAW, SLASH, SMASH, THROW, SPRAY, FIRE, FREEZE, LIFT, GRAB,
  DRIVE, MOW, INJECT, PUMP, SNIP, BLEND, ZAP, GRILL, FEED, PUSH, SLAM, DRILL, HORN), pulsing when ready, dimmed while
  waiting; hold repeats bat/rocket/bomb; spray tools drain refilling tanks.

## 5. Visuals
- All 3D is procedural; 0 model assets; 101 assets = 54 sounds + icons + a few textures. Mannequin toys with ball joints
  in 10 costumes (2045–2057): Classic yellow #ffd21a, Denim, Track Star red, Park Ranger, Construction orange, Disco
  purple, Space Cadet teal, Formal, Tropical, Plain; roughness 0.45–0.72, metalness ≤0.15; X eyes + 5 mouths.
- Procedural player with jointed fingers gripping each weapon; 52×52 m plaza, 20 buildings (12–22 m), 8 trees, benches,
  4 lamps, 9 clouds; day/dusk/night, default 13:00.
- Effects: additive fire, smoke, dust, cotton stuffing, fluttering fabric scraps (gravity ×0.22), splinters, concrete
  chunks; rings, scorch, ash with embers, ice cubes, arcs; an explosion = 55–75 fire sprites, 30 smoke, 26 dust, chunks,
  a ring, light flash 3.5–5 (5321–5360). Hit-stop on nearly every hit; shake explosion 0.8–1.1, bat 0.22; no slow-mo.
- UI kit: Bebas Neue labels 16–36 px, Inter 13–20 px; translucent circular buttons, 3 px light border, shadow, 0.92
  press; colours weapon/action orange rgba(255,154,35,.88), animals olive/#d7ed91, natural navy/#9dc4ff, monsters dark
  red/#ff8a8a, truck red, selection gold #ffc83c.
- HUD (CSS 76–325): top-left wave text Inter 18 px at 60 % ("WAVE 1 · 15 MARCHING", "WAVE n ARRIVING!" 3.5 s); top-right
  weapon card (60×64 icon, Bebas 26 px name, 13 px hint, 14 px gold status, 160×10 meter); right rail right 44 px,
  104 px each at bottom 708 (MONSTERS), 468 (TRUCK), 348 (ANIMALS), 228 (NATURAL); action 136 px right 28 bottom 92;
  WEAPON 150 px centred bottom 52; joystick bottom-left; desktop crosshair at 39 %.
- Overlays (pause): weapon wheel 700 px (19 outer slots 94 px r300, 7 inner 96 px r198; centre name Bebas 36 + Inter 20
  description + "Game paused"); animals 620 px, 9 × 132 px; natural 3 × 144 px; monsters 3 × 170 px.
- Missing: title screen, pause menu, results, settings, music toggle. Text heavy for kids (10–20-word descriptions,
  long status lines, 36 sign slogans in Impact 46–58 px on 512×340 canvases), English only.

## 6. Content and progression
- 40 tools (41 with Unarmed or the duplicate Hornet): 24 hand weapons (Bat, Chainsaw, Katana, Sledgehammer, Bomb,
  Flamethrower, Rocket, Acid, Freeze, Gravity, Catapult, Road Roller, Lawn Mower, Virus, Flail, Air Pump, Scissors,
  Blender, Shock, BBQ, Shark Tank, Boulder, Sack, Drill), 9 animals (Dog, Bear, Eagle, Elephant, Anaconda, Gorilla,
  Ants, Tiger, Hornets), 3 natural (Thunder, Tornado, Earthquake; meteor dead), 3 monsters (Vampire, Devil, Zombie), 1 truck.
- **No economy**: no coins, ads, gates, levels, score or stars. Limits only: refilling tanks (5–6 s), cooldowns (rocket
  1.2 s, bomb 0.55 s, thunder 1.2 s), summon caps (3 dogs, 2 bears, 1 elephant, 4 zombies) and 30–45 s lifetimes.
- **Waves (3868–3904):** 15 per wave; next at 28 s or when ≤22 % still march (min 12 s); survivors leave through 4
  gates; spawn every 0.6 s; costumes rotate 6 sets of 3 themes, Plain in every wave (3123–3128).
- Crowd AI: golden-angle ring around the player (`ringRad = 1.45 + √idx·0.72`), march 0.2, catch-up ≤2.6×; within
  6–7 m they face you, stomp, lean, pump fists, point, shake signs, nod; status animations (burning, ants, virus, acid);
  never get up (#27; get-up code at 3746 unreachable); fire spreads within 0.8 m; bombs set off bombs; thrown bodies bowl others over.

## 7. Retention and virality
- First 10 s: no title, no loading bar; mobile starts behind the hero with the bat equipped, 15 mannequins 4.5–12 m ahead
  in a 270° arc already marching with signs; SWING pulses; "WAVE 1 · 15 MARCHING"; first action one tap → thwack,
  hit-stop, shake, splinters, tumbling body in ~2–3 s. Desktop shows "CLICK TO PLAY" first.
- Loop: smash a wave, next in 12–28 s; the wheel pauses to browse and summon; nothing persists; retention = novelty and spectacle.
- No share prompts: shared for absurd set-pieces, meme signs, shock title and thumbnail.
- Sound: 54 generated cartoon SFX, spatial `vol/(1+d²/300)`, throttled, looping engine/spray; no music; master 0.3; whistles/sirens removed.

## 8. Bugs, rough edges, performance risks
1. Draw calls: ~45 shadowed meshes per ragdoll × up to 40 on the ground + 15–30 marchers ≈ 2–3k meshes, doubled by
   shadows, no instancing (dynamic resolution only helps fill rate).
2. GC churn: new Mesh per burst/chunk (4855, 19236), new material per puddle/scorch (5127, 4972), cloned materials per burning ragdoll.
3. Fixed 700 px wheel (CSS 164) clips on small/landscape screens.
4. No `visibilitychange`: loops keep playing hidden.
5. Dead/stale code (meteor 13103/20119, "Ragdoll Rally Chaos", GDD's 6 weapons).
6. Key conflicts (E fires and quakes; offset digits; L → `WEAPONS[21]`).
7. Fragile pause from four flags (caused #305/#307; 500 ms guard).
8. Mobile gaps: no jump/sprint, whole screen swipe-look, wave text 18 px at 60 % on bright sky.
9. Camera without smoothing/collision.
10. ~19,850-line monolith, untestable; r128-missing-method crashes (#243), wrong types (#215).
11. Config drift (`cfg.environment` assumed; `marchSpeed` 0.2 config vs 1.6 fallback).
12. Per-frame waste (`groundMat.color.set` every frame, 19968).

## 9. Kid safety — what we must NOT copy
"Executions" in the title; a protesting crowd as targets; "the only real human" vs a dehumanised crowd; "yellow blood"
jets, pools, "blood loss", vampire draining; dismemberment and crushing (chainsaw, katana, scissors, drill, mower,
hammer, elephant, bear); torture set-pieces (BBQ "rare to burnt", blender "smoothie", sack slams, inflate to pop, virus
vomiting, eaten alive "in pain", "kill before eat"); predators attacking people; bullying signs ("DISQUALIFIED FOR BEING
UGLY!", "YOUR MOM CALLED US FIRST!", "NOBODY LIKES YOU!"); ~9 wishes escalating brutality. Safe to take: toys/robots that
visibly don't get hurt, destroying objects, creatures that boop, bounce or carry.

## 10. What Block Smash Crew should adopt, kid-safe (ranked)
1. **First hit < 3 s:** start in play, hammer equipped, BONK-BOTs 4.5–12 m ahead in a 270° arc walking at the player
   (copy 3354–3377) beside a wobbly tower; shop and stars after the first smash.
2. **Pulsing HIT button whose label follows the tool** (`actionReadyPulse`: 1.1 s, glow 0→14 px, brightness 1→1.28; dim
   0.78 while waiting; BONK, BOOM, FIRE, SWING, PULL, CRASH).
3. **Friendly dare signs** (`createSloganCanvas` 2295–2420: 512×340 cardboard, duct tape, outlined text, emoji); 30+
   dares with no insults ("CAN'T TOPPLE OUR TOWER!", "BONK-BOTS RULE!", "WE ATE ALL THE COOKIES 🍪"), in 7 languages.
4. **Hit-stop by slowing time:** `dt *= 0.15` for 0.04 s (hammer), 0.05 s (bomb/rocket), 0.07–0.09 s (ball/meteor);
   shake = max(current, a·(1 − d/30)), decay `exp(−9dt)`, roll ≤0.06, setting 0–2.5.
5. **Themed waves:** 15 BOTs, next at 28 s or ≤22 % left (min 12 s), 3.5 s "WAVE n ARRIVING!", survivors leave via 4
   gates; 6 cosmetic sets (party hats, astronaut, chef, pirate, construction, disco) mixed with plain; each wave pays coins + a daily star.
6. **Chain reactions:** a BOT faster than 3.5 knocks a standing BOT within 0.77 m and passes 55 % of its speed; bombs in a
   blast re-fuse to 0.12–0.24 s; falling voxels topple BOTs.
7. **Cheap floppy BOT:** one rigid body + 12 contacts + 14 spring joints (`k = 15 + stiff·260` standing, `8 + stiff·50`
   knocked, `ζ = 0.15 + stiff·0.6`, `stiff = 0.35`), flail in air, sprawl on landing; their unused get-up (3746–3754,
   1.1 s slerp) as our reboot.
8. **Toy faces:** dizzy X/swirl eyes on a bonk, 5 mouths, reboot smile + "BEEP!".
9. **Confetti, not gore:** ~26 puffs, 12 chunks, 8 fluttering paper chunks (gravity ×0.22, drag 2) as springs, bolts,
   sparks, confetti; pooled typed `Points` (cap 900/1800, low skips 45 %).
10. **Radial tool wheel that pauses**: our 6 tools on one ring, 120–140 px tiles, picture hint in the centre, open on
    `click` with a 500 ms guard, scaled to the viewport.
11. **"Helpers" summon button**: robo-pup, magnet drone, crane claw, bubble whale; 30 s, cap 2–3; chase → act → leave.
12. **Slow visible build-ups** (3 s) for black hole and meteor.
13. **Per-tool meter** 160×10 (orange filling, red empty, green ready); hold-to-use drains a 5–6 s refilling tank.
14. **All tools from second 1**; coins buy size and spectacle (radius 5 → 7 → 9, more bounces, golden skins), not access.
15. **Packaging:** number + noun in the title ("6 Mega Smash Tools", "Smash 100 Towers"), hand-made action thumbnail; no kill/destroy/execute words.
16. **Perf tiers:** touch tier logic, Lambert swap, no shadows and DPR 1→0.6 on low, frame-time rule (>1/45 s −0.15,
    <1/58 s +0.1), medium shadows every other frame, merged static voxels; instance BOT parts, cap knocked BOTs ~20.
17. **Fast load:** 6 core sounds first, rest 2 at a time; `data-src` icons; 9 s prefetch; non-blocking fonts.
18. **Audio rules:** master 0.3, `vol/(1+d²/300)`, 40–80 ms per-sound gap, no whistles/sirens; add music with mute.
19. **Respawning props** pop back with scale-up and dust; towers rebuild between waves.
20. **Remixable tuning** via `showGameParameters`: BOT count 5–30, wave interval 12–60 s, blast size, gravity, shake.
21. **Two-handed tool views with no gaps.**
22. **Short icon-first text**, under 5 words, in our 7 languages.

## Appendix: game_config.json
Player move 6, sprint ×1.8; camera distance 6, height 2.5, sensitivity 2; gravity 18, friction 0.6; crowd 15, march
0.2, stiffness 0.35, sign ratio 0.5, spawn 0.6 s, wave 28 s; bat knockback 12; bomb radius 5, force 16, fuse 1.8 s,
throw 11, break 0.75; rocket radius 7, force 21, reload 1.2 s, speed 26; flamethrower range 7, fuel 5 s, burn 3.5 s;
thunder cooldown 1.2 s, range 25, chain 4.5; tornado build 3 s, life 12 s; air pump 9; ants 70; summons 30–45 s; quality auto.
