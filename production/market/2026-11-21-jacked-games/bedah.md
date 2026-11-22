# Bedah Jacked Games (alex, Modcade) — 2026-11-21

Sumber: context publik `full.json.gz` + main lokal (lib tiruan, SwiftShader 360×640). Ringkasan & keputusan: ASTROCADE.md §2. Ambil tekniknya, bukan kodenya (`disableRemix: true`).


Three r128 (cdnjs) plus GLTFLoader. One global object per module, and one `GameConfig` holding every number. World: 6 islands, each 20 m wide, in a corridor about 800 m long.

## Core pattern
- **Chained `onBeforeCompile` patchers on stock `MeshStandardMaterial`.**
  - `Atmosphere.patch`: adds the `vWPos` varying and applies fog before `tonemapping_fragment`.
  - `Heightfield.patchSun`: `directLight.color *= sunVis` before `RE_Direct`.
  - `ContactShadow` and `BeamLight`: injected after `aomap_fragment`.
  - `Lod`: distance and fade helpers.

  Each patcher is a GLSL string plus a shared uniform object assigned by reference, so one JS write updates every material.
- **Tiers are config overrides.** `DEVICE.TIERS` maps dotted paths to values (`"SUN.MAP_SIZE": 1024`). `setTier` restores the originals, applies the new values, then calls `live()`. `live()` resets DPR, resizes, rebuilds Bloom, reallocates the shadow map and toggles ground hex tiling.

## Modules
- **Device**:
  - Detection: touch comes from `lib.shouldUseTouchControls()` (falls back to `pointer:coarse`). Touch with `max(screen)<1100` CSS px gives **MID**; anything else gets **HIGH**. **OPTIMIZED** is menu-only. The choice is saved in localStorage.
  - Tiers: MID sets DPR 1, no MSAA, bloom off, motion blur off, shadow map 1024. OPTIMIZED is MID plus plants off.
  - `report()`: sends the GPU string (`WEBGL_debug_renderer_info`), core count, memory and DPR to `lib.log`.
  - **No FPS-adaptive quality.**
- **Stage**:
  - Camera and renderer: FOV 70, near 0.5, far 2000. DPR cap 1.5, anisotropy 4.
  - `TEXTURE_SCALE 0.5` on **all tiers**: every procedural or canvas texture is box-downsampled to half before upload, and the CPU copy is freed after upload (`onUpdate`: `bitmap.close()` or canvas set to 0×0).
  - `painted()`: paints canvases only after a promise resolves (fonts).
  - `precompile()`: makes hidden objects visible and compiles into the Bloom render target with `NoToneMapping`, so the program keys match the real path.
- **ToneMapping**: ACES at exposure 0.6. It can switch to Khronos Neutral (0.75) or AgX (0.95) by replacing r128's `CustomToneMapping` stub in `ShaderChunk` (a backport).
- **Loading / StreamedAssets / Fonts**:
  - Loading is a promise counter, and `Opening` waits for `Loading.idle`.
  - About 127 mp3s are fetched as ArrayBuffers **2 at a time**, and each counts toward Loading.
  - Fonts loops `document.fonts.load("900 Sofia Sans")`, retrying every 0.1 s.
- **MergeGeometry**: merges attributes, keeps material groups, picks Uint16 or Uint32 by vertex count. Buildings and walls are also baked by hand into big arrays: one draw call per material per structure.
- **Bloom** (custom post):
  - Scene target: the scene renders into a HalfFloat `WebGLMultisampleRenderTarget` with tone mapping off, so it holds linear HDR.
  - Bright pass: 4 taps with a Karis weight `1/(1+max(rgb))` against fireflies, plus a NaN/Inf guard. **Threshold 4, knee 2.**
  - Blur: 5 half-res mips, each a separable 9-tap Gaussian done as 5 linear-filtered taps.
  - Composite: weights `[1,.85,.7,.55,.45]`, strength 0.35, then tone mapping and sRGB. Optional RGB split, vignette and grain.
  - **Motion blur**: rebuilds world position from depth and reprojects with the previous viewProj. 8 samples, capped at 4.5% of screen width. A player cylinder (r 0.7 m, h 2.2 m) stays sharp. It is skipped on cuts (>3 m or >25°) and normalised by dt.
- **Snapshot**: render target, then `readRenderTargetPixels`, then rows flipped into a canvas. Used for HUD and menu icons of 3D objects.
- **ProcTex**: integer hash, value noise, tileable noise and fbm, 3D noise, height-to-normal. All surface textures are generated in JS at boot.
- **Atmosphere**:
  - Sky model: Preetham (three.js Sky math) as a reusable `skyRadiance(dir)`. Turbidity 6, Rayleigh 2.2, Mie 0.005, g 0.86.
  - **Fog** = analytic exponential height fog (density 2.2e-4, falloff 450 m, integrated along the ray). Its **colour is skyRadiance in the view direction**, so geometry dissolves into the sky.
- **Sky**:
  - Dome: a 48×24 sphere with `z = w*0.999999`, `renderOrder 1e6` and depthTest on, so it draws last and early-z rejects covered pixels.
  - Clouds: 5-octave fbm projected as `dir.xz/(dir.y+0.12)`, coverage 0.62 at the horizon to 0.15 at the zenith, lit by one offset sample toward the sun.
  - **Environment map is baked once**: PMREM of a sky variant with no sun disk and ground tint.
- **Sun**:
  - Light: elevation 12°, azimuth 35°, colour 0xFFB27A, intensity 3.2.
  - Shadows: PCFSoft with an ortho box of only **±30 m**, a 2048 map (≈2.9 cm per texel; 1024 on MID), bias -1e-4, normalBias 0.005.
  - **Texel snapping: yes.** The follow point is projected onto the light's right and up axes and rounded to whole texels.
- **Heightfield**:
  - Terrain spacing 0.25 m.
  - Data texture: normal xz, **sunVis**, rock mask. sunVis is a CPU horizon ray-march toward the sun (step ×1.12, reach 3 km, on every 2nd texel, then upsampled). It gives **far self-shadowing without a shadow map**. Every patched material samples it at `vWPos.xz`, so props inherit terrain shade.
  - Shape texture: curvature (box blurs r 3 and r 9) and **flow accumulation** (heights sorted, water routed downhill). These feed crevice darkening and wet streaks.
- **GroundMaterial**:
  - Textures: dirt (pebble splats plus fbm) and rock (two Voronoi plate layers, lichen) at 512², with derived normals.
  - **Hex-tile bombing**: 3 randomly rotated taps blended by hex weights (contrast 5) to hide tiling.
  - Rock: triplanar with `pow(|N|,4)` weights, height-blended with dirt (sharpness 0.18, 33-entry lookup).
  - **Detail LOD**: beyond 60–160 m all texture taps are replaced by a **precomputed mean albedo**.
  - Extras: GPU-baked macro tone maps, curvature and flow weathering.
- **Gardens + PlantGround**: plants live only in 18 m garden patches that repeat as **2 variants**. What grass, flowers, weeds and shrubs look like from afar (average colours, dapple, footprints) is baked once into a **1440×720 HalfFloat RT** that the ground samples. When plants fade out at distance, matching paint is already underneath: **far vegetation costs zero**.
- **CellStream**: a fixed pool of cell slots (`(ceil(2R/cell)+2)²`). Each frame it frees out-of-range cells, then fills new ones in an outward ring order, **at most BUDGET (1–2) cells per frame**. No allocation after boot.
- **Scatter / Grass / Flowers / Weeds**:
  - Draws and culling: one `InstancedMesh` per slot (DynamicDraw, partial `updateRange`), culled per cell by bounding sphere against the Frustum.
  - Grass: 16 blades × 3 segments (128 verts per clump), spacing 0.55 m, 16 m cells (≤1024 instances), view 39 m (30×`LOD.DISTANCE_SCALE` 1.3) with an 8 m fade, no shadows, 49 slots. Flowers: 45 m, 64 slots. Weeds: rosette and stalk cards from a 768×256 canvas atlas, 52 m, 81 slots each.
  - Vertex shader: two-sine wind, and **blade widening `aSide*max(1,dist/12)`** so far blades never go sub-pixel.
  - Fragment shader: **dither discard** (interleaved gradient noise against `vGone`). The fade edge is **ragged** (value noise of 6 m depth and 4 m scale, plus 1.5 m jitter per instance), so there is no visible ring.
  - `alphaKeep` raises alpha with mip level so alpha-tested cards don't thin out at distance.
- **Foliage + Shrubs**:
  - Atlas: canvas-drawn leaves are built into 3D clusters and rendered into a **1024² colour atlas plus a matching normal atlas** (via `overrideMaterial = MeshNormalMaterial`), 256 px tiles, with depth shade baked in.
  - Meshes: 9 InstancedMeshes (3 species × 3 variants), 71 m view. They are **repacked only when cell visibility changes**, and cells within the shadow radius stay on so their shadows persist.
  - Shading: the normal blends toward a sphere "volume" normal (0.45), and sun translucency `pow(dot(v,sun),3)*0.6` is added.
  - Extras: 8 hit-shake slots, 96 leaf particles, and an alpha-tested depth material.
- **Rocks**: displaced icosahedra (5 variants) **merged per cell into preallocated dynamic buffers** with `setDrawRange`, not instanced. Boulders: 64 m cells, 420 m range (169 slots). Stones: 24 m cells, 70 m range (64 slots).
- **Island / Bridges / WallSegments / Buildings / RoadSign**:
  - Island: grid terrain meshes, procedural block walls with a grime band shader, and planks bent in the vertex shader by 6 ripple slots.
  - Bridges: a CPU spring chain sent as a `uniform float[]`. The **same vertex patch is applied to the depth material**, so shadows deform too.
  - WallSegments: hazard stripes and a lattice screen drawn analytically with `fwidth`, fading to mean alpha where it would alias.
  - Buildings: vertex colours plus an `aWeather` attribute that drives streaks, splash, moss and chips.
  - Signs: 2048-wide canvases plus an **emissive mask canvas**, so the letters bloom.
- **Ocean**:
  - Mesh: a 1950 m disc that follows the camera.
  - Surface: 2 scrolling 256² fbm normal maps (14 m and 37 m tiles), flattened between 150 and 700 m.
  - Shading: Fresnel power 9 with a cap of 0.45. Reflection = analytic `skyRadiance`. Fades into the sky between 1650 and 1900 m.
- **Billboards**: laser burns paint into a 256×128 CPU DataTexture: discard holes, char, and hot edges at ×16. Cooling uses a dirty rectangle, and **uploads are throttled to 30 Hz**. A hidden warm-up mesh pre-compiles the shader.
- **VFX pools** (preallocated, one instanced draw each): Sparks 320 (ring buffer, ×14), Trail 128, Smoke 400 (vertex-built billboards, unsorted), Scorch 80 (polygonOffset decals), Embers 160, Debris 128 + 144 + 96, Dust 72, SmokeTrail 200, SpentRounds 16, Gleam 8 (additive), Materialize 4×40 cubes (×12).
  - **Explosion**: pool of 2, a backface box that ray-marches an fbm SDF fireball in 24 steps at ×60 and writes `gl_FragDepthEXT`.
  - **HDR multipliers above threshold 4 are the only way things bloom.**
- **Face**: SDF eyes, brows and **9 mouth shapes** are drawn in the head mesh's fragment shader, using mesh-space xy with `fwidth` antialiasing. Blink is a `sin` pulse every 3.5 s, and talking swaps mouth shapes at random. `customProgramCacheKey "face"`.
- **ContactShadow / BeamLight**: everything is uniform-driven, so no three.js lights are added and nothing recompiles.
  - ContactShadow: one analytic sphere occluder (the player, r 0.35): cos × r²/d², applied to indirect light and 50% of direct.
  - BeamLight: a shader-only point light for the laser hit (range 10, ×12).
- **main.js**:
  - Loop: one rAF loop with **dt clamped to [0, 0.05]**, and separate world and player dt for freeze and slow-motion.
  - Order: about 60 updates, then `camera.updateMatrixWorld()`, then stream and cull, then render (Bloom path), then the 2D-canvas HUD.
  - No fixed timestep, no adaptive resolution.

## Performance strategy
1. DPR cap of 1.5, or 1 on phones. Phones lose MSAA, bloom and motion blur.
2. A half-size texture pass everywhere, with CPU copies freed.
3. Fixed slot pools, per-cell sphere culling, 1–2 cell fills per frame, no runtime allocation.
4. LOD inside the shader: dither fades, mean-albedo ground far away, vegetation baked into ground paint.
5. Baked far shadows (sunVis) plus a small ±30 m shadow map with texel snapping.
6. Fixed lighting (1 directional light plus PMREM). Fake lights and AO are uniforms. `precompile()` and warm meshes compile up front.
7. Merged static geometry, and pools for every effect.

## Visual look recipe
- Low 12° golden sun (0xFFB27A ×3.2) against a ×1.6 saturated Preetham sky, with **fog coloured by the sky in each pixel** (aerial perspective).
- A linear HalfFloat HDR pipeline, ACES at 0.6, and bloom only above 4 (emissives), across 5 wide mips.
- PMREM sky light, terrain sunVis, a contact-AO sphere, and curvature and flow grime.
- Dense wind-animated grass that never pops, translucent shrub cards, and anti-tiling hex ground.
- Earthy palette: dirt 0x3B2F25–0x7A6650, rock 0x4D4A45–0x8F877B, grass 0x2D3A1A–0x8C9A4E, with magenta and neon HDR accents.

## Weak / risky
- **r128 lock-in.** `WebGLMultisampleRenderTarget`, `sRGBEncoding`, `gl_FragDepthEXT`, and string patches on chunk names (`lights_fragment_begin`, `encodings_fragment`, the tone-map stub) all break by r187. Port the ideas; r187 has AgX and Neutral, render-target `samples` and `colorSpace` built in.
- **Load time.** The intro waits for all about 127 audio files (2 at a time) plus 2 GLBs. Boot also does a lot of synchronous JS: 512² fbm textures, the sun ray-march, the flow sort, atlas and plant bakes.
- **Tiering is coarse.** It uses screen size and touch only, with no FPS feedback. Tablets get HIGH (MSAA, HalfFloat bloom, motion blur at 1.5 DPR). MID still runs the full ground shader, per-pixel Preetham fog in every fragment, and full plant density.
- **Many potential draws.** About 49 + 64 + 162 plant slots, 9 shrub meshes and 233 rock slot meshes. Most are hidden, but they still need culling every frame.
- **No fallbacks.** There is no HalfFloat render-target capability check. The explosion's fragDepth kills early-z. Smoke is unsorted. Snapshot's readback stalls the GPU. Vertex loops run over uniform arrays.
- **Portrait.** FOV 70 is vertical, so horizontal FOV at 720×1280 is about 43°. It needs retuning.

## lib.* (Astrocade SDK)
Three kinds of call:
- `lib.shouldUseTouchControls()`: tier detection and Joystick.
- `lib.log()`: the device report and the start line.
- `lib.getUserGameState`, `lib.saveUserGameState`, `lib.deleteUserGameState`: SaveData, every 3 s.

No other SDK calls in the engine modules.


Sources: the `mods/` folder (`000_GameConfig.js` and every listed module) plus `all.css`. The internal name is "Steal a Jewel" (main.js log, localStorage key `stealAJewel.tier`).

## 1. Core loop (all numbers from config)
**World.** There are 6 islands in a line, each 20 m wide, with 8 m gaps crossed by wobbly rope bridges. The bridges are spring-simulated: 16 nodes, a 1.4 kick per step, sag 0.3. Island lengths are 20 / 40 / 60 / 80 / 80 / 80 m (EXTEND). Islands 2-5 have wobbly plank holes.
- **Island 0, "SAFE ZONE".** "WE BUY JEWELS" shop, "UPGRADE SHOP" (a COMING SOON stub), the hamster **Wheel**, and a vending machine. Every island has a vending machine (6 in total).
- **Islands 1-5, "DANGER ZONE #n".** Each road sign shows "SPEED LEVEL RECOMMENDED" with 0 / 4 / 8 / 12 / 16.

| Island | Jewel (value) | Guard |
|---|---|---|
| 1 | yellow (5) | Cannon laser |
| 2 | green (10) | faster Cannon laser |
| 3 | blue (15) | Silo nuke missile |
| 4 | magenta (20) | faster nuke |
| 5 | red (25) | BigGun minigun ("whatever this is") |

**One run:**
1. Cross the bridge and run to the jewel at the far end of the island. Walking into it picks it up automatically, and the player carries it overhead.
2. The guard wakes and chases.
   - **Laser:** aim tracking speed = `Walker.speedAt(ESCAPE_POINTS-1)`, so you outrun it only at the recommended level. It fires 0.25 s after waking, range 120, kill radius 0.5. A hit deals **20 dmg per 0.5 s tick** plus a lurch shove (6 m/s, lift 3). HP is 100, so you die after 5 ticks, about 2.5 s in the beam.
   - **Missile:** speed = `speedAt(ESCAPE-2)`. It catches up (+2 per metre behind, max 30), kill radius 1.2. The blast deals **150 dmg × falloff over a 24 m radius**.
   - **BigGun:** 12.5 rounds/s at 210 m/s. Each round deals 10 dmg as a "heavy" hit and shoves the player (48 m/s, lift 12).
3. While you carry the jewel, **field coins** spawn every 0.8-2 s, 4-12 m away and inside the camera view. At most 6 are alive at once, and each run spawns `max(6, speedLevel)`. Each coin is worth 10. A **red health can** (+10 HP) spawns every 6-12 s if you are hurt.
4. Return to island 0 and touch the shop. The jewel pops (×1.25 in 0.12 s) and shrinks (0.18 s), then a coin fountain flies out: VALUE coins × 10, staggered 0.05 s apart. Yellow = 50, green 100, blue 150, magenta 200, red 250. The jewel flies home and respawns, so **runs are repeatable** and you grind them.
5. Banking happens on island 0. If you die, the unbanked coins spill around the body (2.5-5 m) and can be picked up again.
6. **Wheel (hamster wheel = the speed shop).** Run inside it (tap the prompt or press E; the camera auto-centres and auto-faces you). You earn points at 1/s at full rim speed (7.5 m/s). Each point **costs 50 coins and gives +1 speed level**.
   - The camera dolly zooms in steps of ×1, 1.15, 1.32 and 1.52 for consecutive levels in one session.
   - A 7-segment display on the wheel counts the points.
   - If you cannot pay, you hear a damage sound and get ejected.
   - The cap is 30 levels, 1,500 coins in total.
7. **Speed** = (5 + 0.333 × level) × 1.5 (sneaker pace). That is 7.5 m/s at Lv0 and 22.5 m/s at Lv30. ACCEL 10, jump 8 m/s, gravity 25.
8. **Pacing:** to reach Lv4 you need 200 coins, about 3-4 yellow runs. Each later island needs another 200 coins, about 1-2 runs of the newest jewel.

**Death.** Triggers are HP 0 or falling more than 10 m below the island top (into the sea). DEATH_TIME is 3.6 s, then a band wipe, then respawn on island 0 with full HP. Speed levels are kept (DEATH_LOSS 0).

**Power-up drinks** (bought from the vending menu, up to 9 of each, drag-equipped into 2 slots Z/X):
- **Carolina Reaper Durian Breeze, 20 coins (AUTO).** You reflect lasers back at the gun. It drains over 6 s of reflecting. Arm HP is 160, BigGun HP 200, Silo HP 100, at 20 dmg per tick. A destroyed cannon arm drops a **hand laser** you can pick up and fire.
- **Hypomanic Mango Cayenne Boost, 25 coins.** ×1.5 speed for 5 s.
- **Habernero Cherry Fugue Blast, 30 coins (AUTO).** When a missile reaches you, a slow-mo **missile kick** plays: the world freezes, the player plays the Drink animation, then Kick. You can also **punch a cannon arm off** within 10 m.
- **Blueberry Ghost Pepper Freeze, 35 coins.** Time freeze for 10 s.
- RocketRide (ride the kicked missile) exists in code but is **OFF**.

## 2. First 30 seconds (player view)
- **0 s to load end:** black screen with a purple progress bar. It tracks the player GLB, the announcer GLB, fonts and images. Audio streams only *after* the loop starts.
- **+0-1 s:** fade in. The camera sits on the host, "Max Thunderballs", in a TV studio: a desk, a mic and light towers on a floating platform.
- **+1-5.4 s:** intro voice line "Ladies and gentlemen, I am Max Thunderballs and you are tuned into JACKED GAMES."
  - At 1.17 s he points at himself; at 2.99 s he points at the camera, and the camera flinches.
  - At 1.76 s the name lower-third slams in (stripe 0.5 s, text bounce 0.4 s) with a blinking **"@PlayAstrocade" plus the X logo**.
  - The camera creeps from 7 m to 4 m, then snap-zooms at the title (47% in 0.2 s).
  - It hard-cuts at 4.39 s. If the voice clip is not decoded within 3 s, the shot is skipped.
- **+5.4 to about 8.5 s:** drone fly-over of the islands (5 m/s, at least 3 s) under the "JACKED GAMES" title lockup (slides in at 15°). Then the line "Brought to you by JACKED.®".
- **About +8.5 s:** a purple 8-band diagonal wipe (0.7 s) with a spinning soda can.
- **About +9.5 s:** the player materializes in a burst of purple cubes (4 bursts × 40). The letterbox opens (0.6 s), the HUD fades in (0.5 s), and the camera swings 180° from a high angle over 2.5 s. **Control here, about 9-10 s after load. The intro cannot be skipped and replays every session.** The line "And our first contender takes to the field." plays. Ground chevrons (GuideBeam) point to the bridge.
- **About +12-15 s:** stepping onto island 1 triggers a **frozen-control island cut-scene**. The camera orbits the jewel while a green telestration circle draws itself, then sweeps to the cannon, where an arrow draws itself and the camera punch-zooms ×1.6. Both parts of the line play: "grab that yellow jewel… run back before the laser gets him". Then "Let's see how he does."
- **About +20 s:** the cannon wakes and the first-time shot plays (2.2 s): "Looks like somebody woke the baby!"
- **About +25-30 s:** you grab the jewel, the laser fires, and you hear "And there's the laser!" followed by "Will he head straight for the safe zone or chase those coins?"

## 3. Juice inventory
- **Camera shake** (decay 7, rate 30 Hz, roll 0.15):
  - explosion 2.5
  - missile-kick hit 1.2
  - kick blast 0.5 (fades over 3.2 s)
  - BigGun death 0.6, per round 0.12
  - reflect 0.15
  - gun death 0.35
  - cannon unfold wobble 0.025 at 9 Hz
- **Hitstop:** the missile kick freezes the world (worldScale 0) during approach and wind-up. The player is slowed to 0.3, then a 0.25 s full freeze on contact. A heartbeat SFX loops and a whoosh and impact are scheduled to land on the hit frame.
- **"Psychosis" post-FX** (internal name; on during kick, freeze, boost and reflect):
  - chromatic split 0.03 (2.5× on hit), vignette 0.55 with a pulse on each heartbeat, grain 0.08
  - music low-passed to 220 Hz with a bass shelf
  - SFX ducked to 25%
  - a "cinematic bwom" sting, and commentary is cut
- **Camera moves:**
  - pursuit cam pulls out from 10 m to 26 m while a missile chases
  - close-up ×0.5 at the vending machine
  - wheel zoom steps
  - death shot zooms 0.4
  - handheld wobble during cut-scenes
  - silo and BigGun first-reveal shots zoom ×3 in 0.12-0.2 s
- **Motion blur** (8 samples), **bloom** and glowing beams.
- **Laser effects:** scorch decals, sparks and smoke on the ground; billboards burn through (holes char and glow). Lasers glint off missiles. Spent brass casings fly from the BigGun.
- **FCT:** "-20" / "+10" in magenta (#E0186C) above the head, spring-pop scale (cubic-bezier overshoot 2.12), 1 s. "-50" in gold when you buy a level.
- **Coins:** bounce-in scale with back-ease 1.7, magnet pull at 2.5 m (accel 30, max 14 m/s, plus the player's excess speed), spin, bounce SFX scaled by impact speed. The payout fountain is staggered 0.05 s per coin.
- **Sneakers glow** on a ramp from cyan through green, yellow, orange and red to magenta across Lv1-30, and leave a glowing footstep trail every 0.15 m. This is visible progression.
- **Audio:** footsteps switch between grass, wood and solid surfaces; servo whirr loops while guns move; laser buzz; rocket roar.
- **Voice:** 99 announcer lines with captions. While Max speaks the music ducks to 15% (in 0.15 s, out 0.8 s). Each pool cycles in order, so there is no repeat until it wraps; 0.94 s of each clip's tail can be overlapped by the next line.
- **Line triggers:** contender, island intro (only if your level is at or above the recommended level), laser, coins-or-home, going for coins, hype at mid-island while carrying, last island, win on reaching safety, payout on sale, first-upgrade nudge (0.5 s after you can afford one, plus a wheel shot), train and level on the wheel, shoes (first level), advance (reached a new recommended level), launch, praise (kick or gun kill), death by severity, respawn.
- **Robot guard voice** ("Intruder detected", "Drop the jewel, human!", "Oh, balls."): implemented but `VOICE_ON:false`.

## 4. Economy and persistence
- **Sources:** jewel sales (50-250) and field coins (10 each, risked until banked).
- **Sinks:** speed levels (50 each, max 30) and drinks (20-35).
- **Saved via `lib.saveUserGameState`** every 3 s when something changed: speed, banked coins, drink counts, equipped slots with charge, sold jewels, every "seen" flag (island intros, shots, tutorial, shoes, upgrade, advance), and lifetime totals (jewels, coins, deaths). Versioned, with a migrate hook.
- Cut-scenes and the tutorial therefore play once per account, but the **opening plays every time**.
- "New Game" in the menu wipes progress instantly, with no confirm.
- **Shipped cheats:** 4 taps within 0.5 s on the coin counter give +10,000 coins; 4 taps on the speed counter give +4 levels.

## 5. Controls, camera, device detection
- **Touch:** the left 50% of the screen is a floating joystick (26vmin ring, dead zone 0.12). The right 50% is drag-to-look (0.0025 rad/px). Pitch is clamped from -1.2 to 0.5.
- **Buttons** in a bottom-right diagonal: JUMP, DROP (C), Slot1 (Z), Slot2 (X). Each is 18vmin.
- **Context prompt** ("TAP TO USE"): vending machine, wheel, hand-laser pickup.
- **Desktop:** WASD or arrows, mouse pointer-lock look, Space, E, Z/X/C, Shift (dev freeze). Full gamepad mapping.
- **`lib.shouldUseTouchControls()`:**
  - decides the quality tier; touch on a screen under 1100 px gets MID (pixel ratio 1, no AA, no bloom, no motion blur, 1024 shadows)
  - shows the joystick at boot; any touch pointerdown also shows it
  - falls back to `(pointer: coarse) and (hover: none)`
- **Camera:** third-person chase at 10 m, lift 1.6, follow rate 8, collision-aware, never below sea level + 5. FOV 70° is fixed vertical, so **portrait gets about 43° horizontal**, which is narrow. Nothing is portrait-specific beyond vmin CSS.
- The layout is fullscreen at any aspect and all HUD sizes use vmin. It works at 720×1280 but the composition is landscape-first.

## 6. HUD layout
- Top: a full-width health bar (4vmin tall).
- Top-right, at 12vmin: coin counter (a spinning 3D coin rendered by scissor), speed "Lv n"/"MAX", inventory cans with counts, and a menu (hamburger) button.
- Captions at 30vmin from the top (5vmin font, magenta for alerts).
- Small world-space health bars over the player, guns and silos.
- Bottom-right: equip cluster with charge bars (reaper is lime, freeze is blue).
- Centre-bottom (36vmin): the use prompt.
- Vending menu: 90%×65% panel, scrolling cards with live 3D spinning cans, staggered 0.08 s entrance. The tutorial is a purple 65% dim with a bouncing arrow (2 steps after the first purchase: inventory, then "drag to slot").
- Cinema mode: letterbox at 10% and the HUD hidden during cut-scenes.
- Game menu: New Game and 3 rendering tiers.

## 7. Astrocade `lib.*` calls (complete list)
- `lib.shouldUseTouchControls()`: Device.decide, Joystick.init
- `lib.log()`: Device.report (GPU, cores, memory, screen) and main ("running")
- `lib.getUserGameState()` / `lib.saveUserGameState({v,state})` / `lib.deleteUserGameState()`: SaveData
- `window.run` is exposed for the host to call.
- None of the following are used: score, gameOver, ready, ads, haptics, mute or pause hooks.

## 8. Not kid-safe or risky for Gen Alpha
- **Profanity / religious exclamations:** "JESUS CHRIST!" and "Jesus CHRIST, dude!" on extreme deaths (missile, BigGun), "GOOD GOD!", "Damn, son!", "Oh, balls." (robot line, disabled).
- **Host name** "Max Thunderballs" is an innuendo.
- **Nuclear weapons played for laughs:** "LITERAL nuclear missile", "Anybody order a nuke?", "outrun a NUCLEAR WARHEAD".
- **Can names:** the drinks read like energy-drink marketing, with spicy-pepper flavours and a fake sponsor ("Brought to you by JACKED.®"). "Hypomanic" and "Fugue" are clinical terms. One ABOUT line says "…live faster die faster".
- **Adult references:** "Take that, student loans!", "Gold coins? In THIS economy?!", "belongs on TikTok", "LLMs", "Coins rule everything around me" (Wu-Tang reference).
- **Violence:** lasers burn the player and the player death shot shows explosions. The vocabulary is gun-heavy: "neutralized", "intruder".
- The players are always called "he" / "my man" / "the kid", so the game is male-gendered.
- An X/Twitter handle is shown on screen.
- Shipped cheats and "New Game" without a confirm.

## 9. Weaknesses and what to copy
**Why kids skip early:**
- About 10 s of unskippable intro every session, plus load time (2 GLBs, ~150 assets, heavy procedural foliage, rock and grass bakes).
- Then a second frozen cut-scene about 3 s after first control.
- First reward (a jewel) arrives around 25 s in and the first coins around 35-40 s.
- Landscape-first framing, with dual-stick plus drag-to-look on a 3D camera, which is hard for under-10s.
- The drink inventory needs drag-and-drop.
- Text-heavy captions and adult-ironic humour. English only: strings live in GameConfig but there is no locale system.
- The intro voice is skipped if audio streams slowly (3 s timeout).

**Brilliant, worth copying:**
1. A live **sports-announcer layer**: priority, queuing, captions, music ducking, lines picked by context, tail overlap, pools cycled without repeats.
2. **Carry-and-return risk loop**: coins are at risk until banked and they spawn *only while you carry the jewel*, which creates greed versus safety (the announcer even asks "coins or home?").
3. **Hazard speed is tied to the recommended level**, so the road sign tells you the exact grind target. The speed upgrade is itself a physical toy (the wheel) with zoom steps and a counter.
4. **Glowing sneaker ramp** as visible progression.
5. One-time "first sight" cut-scenes for each threat, with telestration draw-on strokes.
6. **Missile-kick hitstop**: freeze, heartbeat, slow-mo, then a scheduled whoosh and impact.
7. The purple band wipe that hides respawn and becomes a branding moment.
8. Every value lives in config; device tiers patch config keys.
9. Saving is change-detected every 3 s, including "seen" flags.
