# Bedah Modcade (pipeline pribadi alex) — 2026-11-22

Sumber: context publik 4 game Modcade (Runespell 20 Nov, Runespell: Arena 28 Sep, Astro Avatar Studio V1 3 Nov, Jacked Games 19 Nov) + 3 game alex sebelum Modcade (Astro Karts, Ragdoll Slingshots, Penguin Reunion). Dibaca statis, tidak dieksekusi. Web, GitHub, dan npm: tidak ada jejak publik "Modcade"/"mod3d". Dicek ulang langsung: komentar build Arena baris 45/64/76/226, worker `avatar-downloads.astroalex.workers.dev`, `HeadFront` di Jacked, stempel Runespell 2026-11-20 20:58 UTC. Ambil arsitekturnya, bukan kodenya.

# Bagian A — Arsitektur

Legend: **[V]** verified in the bundle (file:line is the line in `code.html`); **[I]** inferred.
Work files: `scratchpad/mc/work-a/{rs,ar,jk}/sNN.js` (+ `.pretty.js`).

## 0. Dating correction (read this first)
- [V] The Runespell context's only chat message, "Made with Modcade.", has timestamp **2026-11-20 20:58:36 UTC**. Its one asset (the `chapter3` pack) went up 0.4 s earlier, at `1795208315787_…chapter3.json`. **So `runespell/code.html` is the 20 Nov upload, not the 4 Sep one.** Arena's message is dated 2026-09-28, Avatar Studio's 2026-11-10 and Jacked's 2026-11-19.
- [I] The Runespell → Arena comparison is therefore between **two forks of one lineage**, not old → new. Runespell (its own project, updated until Nov) has newer *rendering*: a linear colour workflow, ToneCurve, PBR, Bloom, LevelAO and WaterReflection. Arena (Sep) has the newer *pipeline structure*: the components/engine/game split.

## 1. Repo layout and build
**Paths in the bundles [V]**
- Arena: `components/`, `src/`, `src/config.js`, `src/debug.js`, `src/engine/`, `engine/ui/`, `src/game/`, `projects/mod3d`, `uiLayer.js`.
  - Arena:45 says: "Shared tool-contract components (the SceneEdit schema + scene-build helpers), inlined from the repo's components/ by Modcade. These stay shared across every Modcade game; only src/ below is copied per project."
  - Arena:76 says: "src/engine/: THE ENGINE, copied verbatim from projects/mod3d and never edited here; an engine fix lands in mod3d and is a folder copy."
- Runespell: a flat `src/`: `src/touchGuard.js` (Runespell:35), `main.js`, `colorManagement.js`, `postFX.js`, `bloom.js`, `waterWaves.js`, `runLog.js`, `flags.js`. Runespell:41 says "three.js r128 addons vendored locally (inlined into code.html by Modcade)".
- Avatar Studio:
  - a dev-server API: `/api/assets/read`, `/api/assets/write` and `/api/assets/write-binary` (avatarstudio:510);
  - project files: `<project>/modcade.config.json` (it has a `files` map), `<project>/src/bakeManifest.js` and `assets/bake/*.webp`;
  - `tools/bake.html` and `bake.js`, which uses `window.BAKING.project`;
  - `index.html` and `css/ui.css`.
- Jacked: `css/base.css`, `css/hud.css`, `ui/*.js`, `game/opening.js` and `assets/svg/…`. Jacked:664 says "Load order is the dependency graph."

**Reconstructed tree [I, from the above]**
```
modcade/                      (private repo)
  components/                 shared SceneEdit contract: schema.js, lattice.js, uvProjection.js, blobShadows.js, geometryBuilder.js
  projects/mod3d/             engine reference project (Arena buildTag "mod3D reference")
  projects/<game>/
    index.html                dev entry: ordered <script>/<link> tags, comments kept
    modcade.config.json       files map {key: "assets/…"} (+ packs/deferred)
    src/config.js  src/debug.js  src/engine/ (copy of mod3d)  src/game/  src/main.js
    css/  assets/  tools/ (bake.html…)
  (tools: SceneEdit, PackEdit, a tile-map editor, local dev server with /api/assets/*, builder/uploader)
```

**What "inlined by Modcade" means [V + I]**
- [V] Each source file becomes its own classic `<script>` block, in `index.html` order: 115 blocks in Runespell, 126 in Arena, 104 in Jacked.
- [V] The HTML comments from `index.html` survive. Each JS file is minified on its own: locals are mangled, top-level `const` names are kept, and comments are dropped, but GLSL comments inside template strings are kept.
- [V] CSS stays readable, with its path headers (Jacked:10 `css/base.css`).
- [V] The CDN scripts stay as `src=` tags: three r128 from cdnjs, and GLTFLoader from jsDelivr in Jacked.
- [V] All blocks share one global lexical scope. Runespell:287 warns that out-of-order files "hit the temporal dead zone". So order is the dependency graph.
- [V] The minifier is deterministic: 17 blocks are byte-identical between Runespell and Arena. They are the three addons, the schema, Lattice, UVProjection, BlobShadows, GeometryBuilder, ThreeSetup, three animation actions, GpuProbe, InstancingProbe and AccentStripes.

**Shared vs per-project [V]**
- Shared, byte-identical: the components (the schema and four helpers) and the vendored addons.
- Per project: `src/` (config, debug, engine copy, game).
- AccentStripes was copied from Runespell into Arena ("Runespell's diagonals", Arena:434).

**Arena's dependency order [V]**
1. Three addons.
2. Components.
3. `GameConfig`.
4. `ModcadeDebug` (its console capture must start first, Arena:70).
5. The engine spine: PointerEvent polyfill, TouchGuard, SaveData, ScreenTransition, ThreeSetup, AssetManager, SceneBuilder, BgGradient, SceneManager.
6. The character stack.
7. PostFX, then the probe trio, then the gate.
8. UI primitives.
9. Shake, particles and VFX.
10. `src/game/` (input … match … menus).
11. The boot (Arena:448).

**The boot contract [V]**
- Arena:448 calls it "The boot: game-owned, and Modcade's required entry point".
- It must define an async `window.run(mode)` that ignores a second call (Arena:450, Runespell:438).
- It reads the host-injected `window.gameConfig`, which is `game_config.json` and holds only `assetImports`. The bundle never assigns it.
- Runespell logs `lib.log(TITLE+" starting in mode: "+mode)`. Arena ignores the argument. Neither has an edit-mode branch.
- `GameConfig` (capital G, in `src/config.js`) holds the tuning. Arena:64 calls it "a REQUIRED shape for any game built on mod3D".
- [V] The mod3d engine reads `GameConfig` directly only once (`ASSETS.ATLAS_HEADROOM`, in AssetManager). Everything else is passed in through `init(cfg)` from the boot. Runespell modules instead read the globals directly, for example 62× `GameConfig.CAMERA`.
- [I] Modcade requires the boot file to exist and to set `window.run`. The local harness supplies a mock `lib` and a `gameConfig` built from the project config.

**Assets [V]**
- `gameConfig.assetImports = {packs:{<name>:{textures,materials,scenes,maps}}, deferred:{<name>:{url}}, files:{<key>:{url}}}`.
- Runespell: the pack `chapter1_2` (59 textures, 49 materials, 20 scenes, 1 map file) and a deferred pack `chapter3` (CDN JSON).
- Arena: the pack `arena` (63/32/18), with an empty `deferred`.
- Jacked: no packs, 151 `files` (sfx 127, img 21, model 2, music 1).
- Avatar Studio: GLB `files`.
- Astrocade `asset_map` keys: `modcade_pack_<name>` (type `other`) and `modcade_file_<key>` (types `model_3d`, `audio`, `image`).
- CDN name pattern: `<ms>_<ULID>.<kebab-path>.<ext>`.
- Jacked's assets went up about 150 ms apart; the last one was 2 s before the "Made with Modcade." message. Assets keep URLs from earlier days, so uploads are incremental.

**What a pack contains [V, AssetManager `_unpackTextureMaps` / `_decodeIndices`]** — no GPU-compressed textures. These are 16-colour indexed pixel textures:
- `[headerB64, maps, palettes?, variants?]`.
- The header is `uint16 w`, `uint16 h`, then 16 RGBA palette entries.
- `maps` is `{color, emissiveMap…, eyesClosed overlay}`. Each map is base64 indices: flag 0 means packed 4 bpp; flag 1 means RLE (bit7 = run, low 7 bits = length-1). Index 0 is transparent.
- `palettes` maps names to 64-byte palettes (`warm/cool/dark`). `variants` maps names to `[header, maps]`.
- Decoding builds `THREE.DataTexture` objects with Nearest filtering. Mips are made only for power-of-two sizes.
- The textures are packed into a 1024-wide atlas per map type (1 px pad, pow2 height plus `ATLAS_HEADROOM`) unless `atlas:false` or a u/v repeat is set.
- Materials are `{id(base64 GUID), texture, variant, palette, type lambert|phong|unlit, alphaMode, selfIllumination…}`. The defaults come from the schema's `materialAsset`.
- Scenes, positions and splines are base64 little-endian Float32.
- Maps: see §2.

**AssetManager API [V]**
- `init(gameConfig)` and `downloadPack(name)`. `downloadPack` fetches the URL, accepts `json.export || json`, registers the pack late, and calls `MapManager.registerPack`.
- `isPackLoaded`, `getMaterial(id|name)`, `getMaterialVariant`, `applyMaterialVariants`, `getTextureBillboardMaterial`, `getMasterAtlasMaterial`.
- `decodeTexture`, `getTextureCanvas` and `getTextureDataURL` (these feed DOM UI icons), `getTextureSize`, `getAtlasInfo`.
- `addTexture` (Arena: procedural textures), `unpackFloat32`, `unpackFloat32Array`, `unpackSpline`.
- Pack keys get a pack prefix: `chapter1_2.coin`.

## 2. The SceneEdit / ModcadeSchema tool contract [V, Arena:48, identical in Runespell:62]
`window.ModcadeSchema`:
- **base:** ident(string), parent(select,null), category("helper"), type("helperPoint"), position(vector3 0), orientation(quaternion 0,0,0,1, label Rotation), scale(vector3 1), material("_defaultMat").
- **categories:**
  - rendering{castShadow T, receiveShadow T, blobShadow F, blobShadowScale 1 (min0 step.05), billboard None|Spherical|Cylindrical}
  - material{projection cubic|planar|cubicPack2|unwrap|sample, axis x, pole y, uvw{u,v,w=1}, sampleUV custom, unwrapUVs hidden, unwrapMaxAngle 15 / unwrapSnap T / unwrapSnapW 32 / unwrapSnapH 32 (all hidden, editorOnly)}
  - geometry{pivot hidden}
  - optimization{animateIndependently F}
  - lattice{latticeMode None|Taper|Shear|Edge|Freeform(disabled), latticeAxis ±x/±y/±z (default +y), latticeTaperAmount 1, latticeOffset 0}
  - shadows{castShadow F, shadowMapWidth/Height 1024 (256–4096 step 256)}
- **categoryScope:** rendering/material/lattice → geometry and instance; geometry → geometry; shadows → light.
- **types:**
  - plane{w,h=1; projection planar, axis z}, cuboid{w,h,d}, pyramid{w,h,d}, octahedron{radius .5}
  - extrusion{footprintScale 1, extrude 1, shapePoints unit square, holeSplines []}
  - spot{color, intensity 1, distance 0, decay 2, angle π/6 (max π/2), penumbra .2}, point{…distance 10}, directional{intensity .5, shadowExtent 20, shadowNear .5, shadowFar 50}
  - helperPoint{}, helperVolume{w,h,d}
  - sceneInstance{sourceScene, ignoreLights T, isPlaceholder F, scene hidden}
- **materialAsset:** type lambert, color 0xffffff, opacity 1, selfIllumination 0, twoSided F, u/v 1, alphaMode opaque, blendingMode alpha, specular, shininess 60, texture/variant/palette/overlay null, atlas T.
- **supportedTextureMaps:** map, emissiveMap, bumpMap, specularMap, alphaMap, normalMap, displacementMap, aoMap, envMap.
- **scene:** type scene|object, background(hidden), environment.ambient{enabled T, color, intensity .5 (0–2, step .1)}.

**Scene format [V]:** `{scene:{type,environment,background}, definitions:[{type,category,material,params}], nodes:{name:{def, position, orientation, scale (b64 f32), parent?, scene?}}}`.

**How `SceneBuilder` (engine) turns it into Three.js objects [V]:**
- `hydrate` fills the schema defaults per category scope and type.
- Geometry is cached per definition and built by `GeometryBuilder`. `Lattice.apply` and `UVProjection.apply` follow, then the geometry is recentred on its pivot.
- Lights get `_target` children. `sceneInstance` nodes recurse.
- Each object gets `userData.modcade = {category unique|import|batched, scene, def, blobShadow, billboard…}`.
- `_optimizeInstances` merges identical geometry+material pairs into `InstancedMesh` (with a mirrored-determinant split). It skips billboards, blob shadows and `animateIndependently` objects.
- `masterCache` plus `_cloneAndLink`, `buildObject(scene, am, nodeName)` and `definitionOf()`.

**Use [V + I]**
- Runespell's `chapter1_2.level` scene is a *kit*: 102 named nodes such as `blockStone`, `blockGrass` and `gateL`, which LevelManager pulls by name for tiles.
- A second tool defines levels: a tile-map file `{w,h,schemas{file,map,tile,entity}, layers[{name,tiles[{name,values}]}], entities, groups, maps[{name,w,h,values,grids(b64 raw/RLE),placements(half-cell x,y)}]}`, decoded by `MapManager` and turned into tile arrays and colliders by `LevelSource`.
- The log lines name the tool "**PackEdit**": "Rebuild the pack in PackEdit to include it." (Runespell:277) and "Add it in PackEdit." (Arena:309).
- [I] SceneEdit is Modcade's in-house primitive modeller: extrusions with hole splines, lattice deforms, UV unwrap with a 32 px snap, and indexed pixel palettes. The `editorOnly` and `hidden` flags only matter to its inspector UI. The game and the editor share `components/`, so what the editor shows is what the game builds.
- [I] There is no evidence of AI tool calls, or of Astrocade edit mode (`run('edit')` is not handled).

## 3. ModcadeDebug [V, Runespell:69, Arena:72]
- Off by default (`debugOn:false`). It is toggled by **holding the pause button 1 s** (PauseControl `const J=1` / `i=1`); in Runespell the toggle also shakes the camera.
- The overlay `#modcade-debug-overlay` is titled "MODCADE DEBUG [+]/[-]" and has an ✕ button that runs `localStorage.clear`. It shows:
  - FPS;
  - device info (viewport, DPR, WebGL1/2, unmasked renderer and vendor, InstancingProbe verdict, InstancedMesh batches and culled);
  - GPU (draw calls, triangles, geometries, textures);
  - the texture atlas;
  - scene stats (imports, batched, unique);
  - particles;
  - a 40-line console capture (`console.log/warn/error` and `window.onerror` are hooked at load).
- `buildTag`: Runespell "Almost done with modular pack refactor", Arena "mod3D reference". `Telemetry` adds it to every `lib.log` JSON line (`{e,t,build}`); `RunLog` emits per-room and per-run counters when `telemetry:true`.
- Runespell flags: forceTouchControls, equipAll, startingMap, startingCoins, startingLevel, startingXp, startingTotalXp, startingHp, unlockAllChapters, invincible, telemetry. Arena flags: showPlayerPosition (X/Y/Z and cell), showBots (`BotDebug` lines). Both also have the show* panel toggles.
- Other dev markers: `LevelManager loaded — build MARKER-008`, and a "DEBUG - NO INTRO" label when `ENTRANCE.ENABLED` is false.

## 4. The mod3d engine (Arena `src/engine`) [V]
**Engine modules:**
- Spine:
  - PointerEvent polyfill, TouchGuard (gesture and select suppression), SaveData (versioned `{v,state}`, `init({version,collect,apply,migrate})`, `lib.get/save/deleteUserGameState`), ScreenTransition (diagonal-bar wipe), ThreeSetup (renderer factory).
  - AssetManager, SceneBuilder, BgGradient (sky quad), SceneManager (stage group, instanced blob shadows, scene stats).
- Characters: AnimationManager (curve channels; IDLE/WALK_BIPED, FIRE_STANCE), BipedPose (flinch/death), BipedRig, EntityCore (impulse/damping kinematics), Characters (registry, max 64), PointerPick (screen-ray picking), DamageFlash, Eyes (blinks).
- Post-FX: PostFX (tilt-shift/blur composer), GpuProbe (offscreen timing benchmark), InstancingProbe (detects broken instance matrices), DeviceProfile (tier high/low, cached in `localStorage` under "modcade.deviceprofile.v1", Arena:154), PostFXGate.
- UI (`engine/ui`): UILayer (720-reference DOM HUD, `HUD_PX_SCALE`, `(pointer:coarse)` touch), NineSlice, FlexGap, FillBar, UITween, BoxButton, ConfirmModal, Spotlight (tutorial), PixelNumber, ScreenFlash, TextBox, FloatingText, HealthBar, TouchButton.
- FX: ScreenShake, Spring3, CameraDrift, GlowSprite, ParticleManager (types from `GameConfig.PARTICLES`), VFX.

**Game side (`src/game`), one line per group:**
- InputControl and FollowCamera (orbit/drag), PauseControl, HUD, ActionButtons.
- Lightmap (baked quad lightmaps), TextureFrames, ArenaGenerators (named world generators such as `oasisTowers`, seed 1337), World (cell heightfield, colliders, chunks), walls, scoreboards, Water, Waterfalls, Platforms/Rails, SunLight (static and dynamic shadow maps).
- Projectiles, Weapons, coins, pickups, shields, loot, portals.
- Teams, Players and `FakeUsernames`, plus about 10 Bot* modules (sense, aim, fire, noise, unstick, combat, nav, move, brain, debug). **There is no networking: the "multiplayer" deathmatch is bots with fake names.**
- Match, EndScreen, MainMenu, CharacterPreview, Profile and a game-level SaveData override.
- **There is no audio** in Runespell or Arena.
- Main loop: rAF, dt clamped at 0.1, a pause/menu/tutorial gate, explicit per-module `update(dt)` calls, `PostFX.render() || renderer.render`, and debug stats.
- `lib.*` calls: get/save/deleteUserGameState and `log`. There is no `shouldUseTouchControls`, so touch uses `matchMedia` instead.

## 5. What changed
**Runespell → Arena:**
- The engine is split out (`projects/mod3d` copied into `src/engine`) and the components are labelled as shared.
- Config is dependency-injected.
- The DeviceProfile storage key and SaveData are generic.
- The debug flags moved from gameplay cheats to inspection flags.
- The world moved from tile maps to procedural generators.
- The Runespell-only rendering stack (linear workflow, PBR, Bloom, AO, reflections) did not go into mod3d.

**Jacked (Nov):**
- None of AssetManager, SceneBuilder, the schema or ModcadeDebug is present. Dev flags live in `GameConfig.DEV` (Jacked:666), with `DevNotice` and an ObjectViewer marked "Dev only: remove before shipping".
- Assets are ordinary files (GLB/MP3/PNG/SVG), streamed through `assetImports.files` at 2 concurrent loads.
- WebAudio `Sound` was added.
- Tiers became dotted-path config overrides.
- CSS files are inlined with their path headers.
- Its SaveData is byte-identical to mod3d's engine SaveData, so it is the same lineage.
- The build still uses one script per module and an ordered load.

## 6. GDD and task_plan
- [V] Runespell: `game_design_document: ""`, `task_plan: null`, and `chat_history` holds only "Made with Modcade.". The same is true for Arena, Avatar Studio and Jacked.
- [V] Runespell is a remix (`is_remix: true`, base `01KRN1XDE5KJ3YE6X1YRPYKTD3`).
- [I] The uploader overwrites `code`, `config`, `asset_map` and chat through the creator API, outside Astra. That leaves the timing and naming patterns in §1 as the only workflow evidence.

## 7. Blueprint for our own pipeline (original games only; architecture, not code)
1. **Repo:** `shared/components/` (scene schema and builders), `engines/<engine>/` (reference project), `projects/<game>/{index.html, studio.config.json, src/config.js, src/debug.js, src/engine/ (copied by script), src/game/, src/main.js, assets/, tools/}`. *Evidence: Arena:45/64/70/76, the Avatar Studio paths.*
2. **Config file** `studio.config.json`: `{title, gameId, files:{key:path}, packs:{name:path}, deferred:{name:path}}`. Our tools may rewrite it through a local API (`/api/assets/read|write|write-binary`). *Evidence: avatarstudio:510.*
3. **Build script:**
   - (a) Copy the engine and check that `src/engine` matches the reference by hash.
   - (b) Parse the `index.html` tag order (it is the dependency graph) and keep the HTML comments.
   - (c) Minify each file with top-level names kept and no cross-file bundling; keep GLSL template text.
   - (d) Inline local scripts and CSS as separate blocks; leave pinned CDN tags (three r128).
   - (e) Emit `code.html` and `game_config.json` (`assetImports` only).
   - (f) Fail the build if `window.run` is missing.
4. **Assets:**
   - Hash each file and upload only new or changed ones to the Astrocade CDN (`upload_asset`) under `studio_file_<key>` or `studio_pack_<name>` names. Cache hash → URL.
   - Write the URLs into `game_config.json`, then save the draft. Deferred packs use `fetch()` at runtime.
   - Small art can go into embedded packs as indexed 16-colour RLE textures (tiny and atlas-friendly).
   - *Evidence: the asset_map keys and upload cadence; `downloadPack`.*
5. **Boot contract:** the async, idempotent `window.run(mode)` handles `'edit'` explicitly (unlike them) and reads `window.gameConfig.assetImports`. Tuning lives in code `GameConfig`, passed into engine `init(cfg)`. Saves go through a versioned SaveData with `migrate`, never `localStorage` (they break this rule).
6. **Schema contract:** one schema object shared by editor and runtime, with `{type, default, label, min, max, step, options, hidden, editorOnly}` per field, `base`, `categories` with `categoryScope`, `types` and a `materialAsset` default, plus `hydrate()`. Store scenes as definitions plus named nodes with base64 Float32 vectors, and batch identical meshes automatically.
7. **Debug overlay:** set `debugOn:false` in builds, unlock it with a long press on pause, show `buildTag`, FPS, device and GPU info, `renderer.info`, atlas and instancing stats and a console tail, and add `{build}` to every `lib.log` line. Strip cheats in release builds; Jacked shipped its cheats.
8. **Device tiers:** run a GPU micro-probe once, cache it per renderer string, and express tiers as config overrides (the Jacked pattern).

# Bagian B — Alat, avatar, evolusi

Sources: bundles under `scratchpad/mc/` (split into `work-b/<game>/sNN.js`) + ctx JSONs. Everything was parsed as text and nothing was executed. **V** = verified (quoted), **I** = inferred.

## 1. Astro Avatar Studio V1 internals

**Player flow (V).** A loading bar (staged job list in `run()`), then a camera intro orbit plus a "Dance" clip (`CONTROLS:{IDLE:"IdleA",INTRO:"Dance"}`), then a 3-step tutorial: "Edit your avatar here!", "Personalize and download your avatars here!", "Adjust rendering and display settings here!". Menu groups are Basics (body A/B, skin with 5 tones), Head (hair, hat), Face, Torso (top, neck, wrists), Legs (bottom, shoes) and Presets (15: "Astrokid A", "Astrokid B", Green/Desert soldier, Pirate, Cowboy, Assassin, Neon Punk, Ms. Mittens, High School Demon, Disco Stu, The Director, Mr. Florida, Downtown, Pastry Chef). The settings cog holds "Upload textures", "Add/remove animations", "Add/remove emotes", "Download (optimized)" and "Download (high quality)", plus a fast/quality toggle. State is saved with `lib.saveUserGameState` (debounced). A double-tap copies the outfit JSON (`Save.copyOnDoubleTap`).

**Model structure (V).**
- Per body there are 9 GLBs: `bodyX.avatar|hair|tops|bottoms|shoes|eyewear|jewelry|headphones|hats`.
- About 47 items in `GameConfig.ACCESSORIES` (`{FILE:"hair",ITEM:"ponytail",LABEL:"Ponytail",SLOT:"HAIR",PAINT:"HAIR"}`).
- Slots: HAIR, HAT, EYES, TOP, BOTTOM, FEET, NECK, WRISTS, HEADBAND, MASK.
- Colours come from a fixed 38-colour `PALETTE`, `METALS` (11) and garment `DYES`. There are procedural patterns (plaid, dots, stripes, camo, meme, skull) and 2 user image slots (`IMPORT:{SLOTS:["A","B"],SIZE:512}`, stored as webp data URLs in user state).
- The rig is Mixamo-style naming (`Hips`, `Head`, `HeadTop_End`, `Neck`, `LeftFoot`).
- The GLB carries authoring metadata in userData: `uv_layout` (groups/rects atlas), `scalp_line`, `hair_lift`, `crown_z`, `region`.
- Clips: `CLIPS:["IdleA","Walk","Run","Jump"]` plus more in avatar.glb (Dance, Giddy…). Clips are trimmed and lifted per config (`TRIM:{Jump:[.333,1.3]}`).
- Model height is normalised: `HEIGHT:1.7`.

**Face (V).** It is drawn in a shader on mesh `Head` with uniforms `uFaceEyeOn/uFaceBrowOn/uFaceMouthOn/uFaceMouthKind/uFaceBrowPose…`. There are 9 mouths (`FACE_MOUTHS=["SMILE","FROWN","OVAL","GRIN",…]`) and styles `FACE_STYLES=["ASTRO","ANIME","ANIME_B"]` (anime eyes are SVG paths). Expressions are listed in `FACE.EXPRESSIONS.LIST` ("Neutral", "Joyful", "Super happy", "Giddy"…) and cycle `EVERY:5` s. Rendering is cel shading with outlines, patched into three r128 `lights_physical_pars_fragment`.

**Export (V).**
- Uses `THREE.GLTFExporter` with `{binary:true,trs:true,onlyVisible:true,animations}`.
- Only `.quaternion` and `Hips.position` tracks are kept.
- The face is split. Front-facing triangles of `Head` become a new skinned mesh, `name+"Front"`, i.e. **`HeadFront`**. Every enabled emote is baked into one face sheet (`EXPORT_FACE:{WIDTH:1024,CELL:256,PAD:8}`) and exposed as **`KHR_materials_variants`**, one variant per emote.
- "optimized" (`MERGE:true`) merges everything into one SkinnedMesh with a packed atlas. "high quality" keeps separate meshes.
- Metadata goes in `scene.userData.avatar={body,export,items:[{key,label,slot,nodes,indices}],base,merged,face,emotes}`.
- Delivery: `EXPORT_UPLOAD:"https://avatar-downloads.astroalex.workers.dev/upload"`, a POST of the GLB bytes with `?name=astro-avatar-v1.glb&settings=<json summary incl. preset label>&user=<username>`. A 201 returns `{url}`, which goes to the modal "Avatar ready for download!" / "Copy link". A 429 shows "wait a minute" and a 503 shows "Downloads are closed for today". The fallback is a local Blob download (`model/gltf-binary`).
- The username comes from `lib.getTopNEntriesFromLeaderboard(1)` → `userUsername`, which is a hack.

**Naming (I, strong).** `EXPORT_NAME:"astro-avatar-v1.glb"` and preset label "Astrokid B" are sent in `settings`. The Steal an Egg asset `astro-avatar-astrokid-b-v1.glb` therefore looks like the worker's rename, `astro-avatar-<preset-slug>-v1.glb`. The worker lives on alex's personal Cloudflare account (`astroalex.workers.dev`) and has a daily quota, so it is not on an astrocade.com domain.

**Bake tool (V, `s06.js` `window.Bake`).**
- Procedural CPU textures go through `Bake.data/values/many/icon(name, params, w, h, generator)`: ground-slab, wall-block, wood, sign-face, wear-top/side, ao-mask, sun-mask, plus icons for items, swatches, expressions and silhouettes.
- Each texture is keyed by a 64-bit dual FNV-style hash of (name, size, params).
- Shipped mode: images are read from sheets listed in `window.BAKE_MANIFEST` (written to `src/bakeManifest.js`). Icons are shown as CSS background sprites via `Bake.show`.
- A missing or stale key throws: `"[Bake] OUT OF DATE …"` and the modal "Baked images are out of date."
- Bake mode is set from outside by `tools/bake.html`: `window.BAKING={project, say}`. Generators run live, `Bake.report()` switches through every body, then `save()`. `window.BAKE_CHECK` is a verify-only pass.
- Packer `_pack`: a shelf packer. Items are sorted by height then width, descending. Sheet width is ≤2064 (2048+16) and height ≤4096, with a 16 px gutter and alignment. There are 3 families (`colour`, greyscale `mask`, `icons`), each split into `<family>_<n>`. Output is WebP at `BAKE:{QUALITY:.85,MASK_QUALITY:.8,ICON_QUALITY:.8}`.
- The current manifest has colour_0 2064×2672, mask_0 2064×3312, icons_0 1888×4064 and icons_1 1968×2032: 20 images and 105 icons.

**Dev server API (V from the client; responses partly I).** Every call is `POST` with a JSON body. An error is non-OK, or `{error,details}`.
| endpoint | body | returns |
|---|---|---|
| `/api/assets/write-binary` | `{path, dataBase64}` | json |
| `/api/assets/read` | `{path}` | `{content}` with **parsed JSON** (code does `t.files` directly) |
| `/api/assets/write` | `{path, content:<object>, force:true}` | json |

Paths are `BAKING.project + "/" + rel`. Examples: `<project>/assets/bake/colour_0.webp`, `<project>/src/bakeManifest.js` (the JS is sent as base64 too) and `<project>/modcade.config.json`. No other endpoints appear in any bundle. The client's comment is `"// Written by tools/bake.html (bake.js's save()) … Not to be edited."` (V).

**modcade.config.json (V for `files`, I for the rest).**
```jsonc
{
  "files": {                       // V: key "<group>.<name>" -> project-relative path
    "studio.bakesheet_colour_0": "assets/bake/colour_0.webp",   // V (bake writes these)
    "bodyA.avatar": "assets/…/avatar.glb"                       // I (published as {url})
  },
  "packs":    { "<name>": "<editor export>" },   // I: becomes assetImports.packs (inlined)
  "deferred": { "<name>": "<editor export>" }    // I: becomes assetImports.deferred[name].url
}
```
Bake deletes every `files` key matching `/^studio\.bake/` and then merges in the new ones, so a key prefix acts as a namespace that a tool owns (V). At publish, Modcade turns each `files` path into `assetImports.files[key]={url}` (I, matching the published shape).

## 2. Avatars in games

**Jacked (V).** `PLAYER:{FILE:"model.avatarPlayer",CLIPS:{IDLE:["Idle","IdleA"],WALK:"Walk",RUN:"Run",JUMP:"Jump",FALL:"FallBackward"},KICK:{CLIP:"Kick"},DRINK:{CLIP:"Drink"},PUNCH:{CLIP:"PunchA"},CROUCH:{CLIP:"IdleCrouch"}…}` and `ANNOUNCER:{FILE:"model.avatarMax"…}`. The URL is read directly from `window.gameConfig.assetImports.files[...]`, with no `lib.getAsset`.

**Proof these are Studio exports.**
- `FACE:{MESH:"HeadFront",…}` matches the mesh name the Studio export creates.
- `Player._fitShoes` reads `userData.avatar.items.find(t=>t.slot==="FEET").indices`, which is the merged-export metadata.
- Jacked's Face shader is a trimmed copy of Studio's: same `FACE_MOUTHS`, `uFace*` uniforms, and `LOOKS:{PLAYER:{EYES:true,BROWS:false,MOUTH:false},MAX:{…all…}}`. It draws the face live and ignores the KHR variants.
- The extra clips (Kick, Drink, PunchA, IdleCrouch, FallBackward) were picked via "Add/remove animations".

**Shared standard? (I, moderate).** The tagline "Customize and download Astro Avatars for use in your own games", preset "Astrokid B" and Steal an Egg (made by another creator via Astra) shipping `astro-avatar-astrokid-b-v1.glb` with idle/walk/run/jump/fall clips all point to a creator-facing avatar standard. Its tooling, though, is alex's own (workers.dev, Modcade). I found no Astrocade API for avatars in any bundle.

## 3. assetImports and upload

**Shape (V):** `{packs:{}, deferred:{}, files:{}}`.
- `files`: `"<group>.<name>": {url}`. Groups seen: `bodyA`, `bodyB`, `studio` (Studio); `model`, `sfx` (127), `img` (21), `music` (Jacked).
- `packs` (Runespell/Arena only): `{textures, materials, scenes, maps}`. Materials are `{id:"<b64 16-byte uuid>", texture, atlas, alphaMode, twoSided}`. Scenes are SceneEdit `{scene, definitions:[{type,category,material,params}]}` with base64 Float32 arrays (`uvw`, `shapePoints`, `unwrapUVs`). Maps are `{w,h,schemas,…}`.
- Textures (V, decoder `_unpackTextureMaps`/`_decodeIndices`): `[header, {mapName: indices}, palettes?, variants?]`. The header is base64 of u16 width, u16 height, then 16 RGBA palette entries. Index 0 is transparent and colour = `palette[n-1]`. Indices byte 0 = `0` means raw 4-bit nibbles. Byte 0 = `1` means PackBits-like RLE: the high bit marks a run of one nibble, with length `(b&127)+1`. Filtering is nearest, so these are pixel-art textures.
- `deferred`: `{chapter3:{url:".../chapter3.json"}}`, fetched by `AssetManager.downloadPack` (`t.export||t`).

**asset_map (V).** `modcade_file_<key>` with types `model_3d` / `audio` / `image` / `other`, and `modcade_pack_<name>` for deferred packs. Arena has 0 entries because everything is inline.

**CDN (V).** Modcade URLs look like `d16qq0o35va7kz.cloudfront.net/images/Google_102064273444123805802/<ms>_<ULID>.<original-filename>`. The ms equals the ULID time. This is the same bucket and path scheme our own `upload_asset` uploads get (`…/images/Google_<our id>/<ms>_<ULID>.webp`). Agent-generated assets instead go to `d2oir5eh8rty2e…/assets/images/…`.

**Upload behaviour (I, strong).**
- Uploads run serially about 150–200 ms apart.
- Jacked's first asset landed 5.9 s after the game ULID (130 files), then later batches of 10, 4, 1, 5 and 1. Studio's batches were 3, 1, 6, 2 and 12 over 8 days.
- So Modcade uploads only changed files (hash diff) through the user asset-upload path, i.e. the equivalent of `begin_upload(purpose asset)` + PUT + `upload_asset`. It keeps the original filename in the key, which our uploads do not show. It then writes game_config plus asset_map (the equivalent of `save_draft`).
- The chat history is replaced by one assistant message, "Made with Modcade.". Runespell kept its agent-era `workspace`/GDD (a June remix) but now has only that one message, so Modcade can also overwrite an existing game.

## 4. Evolution

| game | date | stack | style |
|---|---|---|---|
| Astro Karts | Oct 2025 | three r128 | agent single file, `lib.getAsset` ×29, `lib.log` ×194, `const ASSET_MAP={}` |
| Ragdoll Slingshots | Mar–Apr 2026 | Matter.js 2D | Astra agent, 139 user prompts, `async function run(mode)`, camelCase config (`version:"0.32"`, `baseChargeTime`), **in-game Level Edit Mode saving levels into game_config** |
| Penguin Reunion | Jul 2026 | canvas | agent, `lib.getAnimationPlayer`, edit-mode grid + markers |
| Runespell / Arena | Jun→Sep 2026 | three r128 + **mod3D** | Modcade: 115–126 `<script>`s, each one minified module; `window.X={}`; UPPER_SNAKE `GameConfig` |
| Avatar Studio / Jacked | Nov 2026 | three r128, "studio stack" | Modcade, 52/104 modules, `"<!-- Load order is the dependency graph. -->"` |

**Verified patterns.**
- Minification appears with Modcade and is per module. HTML and CSS comments are kept: `"src/engine/: THE ENGINE, copied verbatim from projects/mod3d and never edited here"`, `"Shared tool-contract components (the SceneEdit schema + scene-build helpers), inlined from the repo's components/ by Modcade"`, `"The boot: game-owned, and Modcade's required entry point."`
- The run guard `"[main] run() called again, but already running: ignored."` appears in all four Modcade games and none of the earlier ones.
- Modcade games stop using `lib.getAsset` and read `gameConfig.assetImports` directly. They use `lib.get/save/deleteUserGameState` and `lib.shouldUseTouchControls`.
- There are two engine lineages. mod3D (Runespell↔Arena) shares 46 modules, 9 byte-identical (ModcadeSchema, GeometryBuilder, Lattice…). The studio stack (Studio↔Jacked) shares Stage/Sky/Sun/Atmosphere/Bloom/Face, with ToneMapping and Logo byte-identical. `SaveData` is identical between Arena and Jacked.

**Ragdoll seeding Modcade (V negative / I).** There is no code overlap: no matter, slingshot, ragdoll, Fredoka or edit-mode strings in Modcade bundles. The lineage is in workflow, not code. Ragdoll's "edit mode inside the game, persist to config" (prompts: "Put the amount of time taken to charge up in config", "the arrangement … should be saved to each current level") grows into Modcade's dev-mode tools that write `modcade.config.json` through a local server.

## 5. "tl-" and internal names

The only hit is `tl-bouncyboi`, in Jacked CSS comments: `"from tl-bouncyboi's (.hud, .hud-top, .hud-value)"` and `"tl-bouncyboi's .hud-right"`. It is another project in the same repo whose HUD CSS was copied. "tl-" is probably a repo prefix for a project family (I; meaning unknown, maybe "toy lab" or "template"). Other internal names:
- `projects/mod3d`, `components/`, `src/engine/`, `src/game/`, `src/config.js`, `src/debug.js`, `src/touchGuard.js`
- `tools/bake.html`, `src/bakeManifest.js`, `css/ui.css`, `css/hud.css`, `css/base.css`, `ui/*.js` (20 files), `game/opening.js`, `assets/svg/jacked-games-title.svg`, `assets/bake/`
- `ModcadeDebug` (`buildTag:"mod3D reference"`), `ModcadeSchema`, `userData.modcade={category:"batched|unique|import"}`
- Jacked's internal name is `CHOSEN_KEY:"stealAJewel.tier"`

The repo layout is therefore `projects/<game>/{src,assets,tools?,css,ui,modcade.config.json}` plus a shared `components/` (I).

## 6. Takeaways for our studio

1. **Local dev server with 3 endpoints** (read JSON, write JSON, write base64), sandboxed to `projects/<name>/`, so in-game tools can save their results into the repo.
2. **Bake-in-dev pattern.** Generate procedural textures and icons live in dev, pack them into WebP sheets with a manifest keyed by a param hash, and ship only the sheets. Fail loudly when a key is stale. This cuts load time, which was Jacked's problem.
3. **A config manifest** with namespaced keys (`group.name` → path). The uploader diffs hashes and uploads only changed files through `begin_upload` + `upload_asset`, then writes `asset_map` + `game_config`. This is cheap to build on our `astrocade-ship` skill.
4. **Packs for pixel art.** A 16-colour palette with 4-bit RLE textures inlined in game_config needs zero asset fetches.
5. **Avatars.** Use Studio GLBs (merged "optimized" export, Mixamo-named bones, clips IdleA/Walk/Run/Jump plus extras, the `HeadFront` face with an emote atlas via `KHR_materials_variants`, and `userData.avatar` slot indices for per-slot tweaks). Match clips case-insensitively. Ask before relying on the workers.dev endpoint, which is a personal account with quotas and may disappear.
6. Keep the **run() guard** and **`window.X` modules in dependency load order**. Keep dev flags in `GameConfig.DEV` and strip them before shipping (Jacked shipped its dev cheats).
