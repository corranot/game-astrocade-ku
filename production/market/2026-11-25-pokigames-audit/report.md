# Porting audit: "GTA6 - Ground Throw Anyone" and creator PokiGames, 2026-11-25

Question (owner): is the creator of `01M868Y4VQ0QNY36FN4KHQT50H` porting/ripping other people's games?

Method: read-only, guest. Astrocade public game API (as the web page calls it), the public context files
(`full.json.gz`: code, workspace, asset map, chat/wish history when present), the asset files on the CDN, the
creator's profile list (22 public games). For comparison, the public Poki game pages were opened as a guest and
their served build files fetched and hashed. Nothing was remixed, copied into this repo, reported or contacted.
Their code and images are **not** stored here; only hashes, file names and counts.

Labels: **SEEN** = in a file or response (named). **INFERRED** = reasoning. **UNKNOWN** = not checkable.

## 1. Verdict

- **Yes, porting is proven for at least 2 games, and very likely for a 3rd** (SEEN, byte-level):
  - **Zen Burger** (`01M6K5JHKZS4ACHJR1Q84QAG6F`) is the PlayCanvas build of the Poki game **Burger Bounty**.
    87 of its files are byte-identical to the build Poki serves, including the 2.97 MB scene `1686599.json`.
  - **Phone Case DIY** (`01M6NHYMNVCVP3FXH0H5QAMYWD`) is the Poki game **Phone Case DIY**. 169 of 200 Poki
    file paths exist in it; 70 are byte-identical (fonts, `i18n/en.json`, 9-patch UI art).
  - **DIY Beauty Salon** (`01M6J7K826JG0GJKKJMPVYE4M0`) carries the art of the Poki game **Beauty Salon**:
    same file names (`assets/girl/[girl]{default2}_0.webp`), 3 loader files byte-identical, the character
    atlases are the same pictures downscaled to 40% (mean pixel difference 0.2-0.6 of 255 after resizing).
- **"GTA6 - Ground Throw Anyone" itself**: the code is new and written for Astrocade, but the assets are not
  clean. No wish history exists: the game was filled from outside (MCP/creator API).
  - The basketball is a CC-BY Sketchfab model used without the required credit.
  - Seven of the character models carry the marks of models ripped from another game.
  - "GTA6" is a trademark used as clickbait; the game has nothing from GTA.
- Confidence: **high** for Zen Burger and Phone Case DIY (byte-identical files), **medium-high** for DIY Beauty
  Salon, **medium** for the ripped characters (strong markers, source game not identified).
- One open alternative: the creator could be (or work for) the original developers. **INFERRED unlikely**:
  - Burger Bounty's dev log inside the build is English, by "OnRushStudio" (GitHub issue link).
  - The creator writes Indonesian everywhere.
  - The account is named "PokiGames", a portal brand, not a studio.

## 2. The game asked about: "GTA6 - Ground Throw Anyone"

Public facts (SEEN, `/v3/games?gameId=`): owner `PokiGames` (Google_110536148567105692470), 240 plays,
3 likes, approved, `disableRemix: true`, not a remix. Created 2026-11-24 07:57:13 UTC, first publish 08:07:18,
last publish 09:37:04.

### 2.1 Wish/version history
- The context has **no `chat_history`, no `game_design_document`, no `task_plan`** (SEEN, `full.json.gz` keys).
  Astrocade's wish agent never ran on this game.
- The 25 assets were all **uploaded** (user upload host `d16qq0o35va7kz…/images/<owner>/`), between 07:59:09 and
  08:02:53 UTC: 25 files in 224 s, starting 2 min after the game was created. None are Astrocade-generated.
- Workspace (`workspace.tar.gz`, created 09:19 UTC): `README.md`, `game.js` (2.39 MB), `index.html`,
  `game_config.json`. Published version `01M86E51HD…` at 09:28 UTC.
- **INFERRED**: the whole game was built offline and pushed through the creator API/MCP (the same route the creator
  named in another game's wish: "saya akan membuatnya melalui mcp", Brutal Fight, 2026-10-31). Per-version history
  beyond the published version is owner-only (UNKNOWN).

### 2.2 Code
- `game.js` = one esbuild IIFE: three.js r181 (MIT header kept), GLTFLoader + meshopt decoder, then the game.
  No source map, no foreign URLs (only `jcgt.org` from three.js and the w3 namespace), no portal SDK.
- Game code calls Astrocade's `lib` (`lib.getAsset`, `lib.haptics`, `lib.showGameParameters`, leaderboard): it
  was written for Astrocade. Identifiers are minified but the tail is pretty-printed.
- Line 5263 embeds 1.6 MB of baked skeletal animation (`nu = {bind, clips, motion: <base64>}`): 26 clips
  (`hit-back`, `idle-1..6`, `npc-walk/run/stand`, `player-throw`, `player-flip-1..6`, …) on Mixamo bone
  names (`Hips`, `Spine`, `LeftUpLeg`, `RightHandThumb4`). **INFERRED**: Mixamo animations baked by a local tool.
  Mixamo animations are free to use in games.
- No copied third-party game logic found (UNKNOWN whether the mechanic copies a game outside Astrocade).

### 2.3 Assets (SEEN, glTF `asset` headers and material/node names)

| Asset | Generator / markers | Reading |
|---|---|---|
| `basketball.glb` | `Sketchfab-15.4.0`; `extras`: title "Basket Ball", author **vvesy**, license **CC-BY-4.0**, source sketchfab.com/3d-models/basket-ball-5f9da304f5a44196804068647abae104 | CC-BY needs credit. `vvesy`, "Sketchfab", "credit" appear nowhere in the code or description: **license breach** |
| `player`, `cewe-blonde`, `cewe-curly` | Blender glTF I/O 5.2.39; mesh/material `tripo_*`; Mixamo rig | Tripo AI generated, Mixamo rigged: fine |
| `cewe-1` | gltfpack; 31 `tripo_part_*` parts | AI generated: fine |
| `cewe-2/3/4/5/6/7/8` | gltfpack; Sketchfab-style `Object_N` nodes; **all 7 share one identical base body and face texture**, only outfits differ | One game's avatar-customization system (**INFERRED ripped**) |
| `cewe-5`, `cewe-6` | materials `Tex_0028_0.dds`, `Tex_0384_0.dds.003`, … | Texture names in the pattern GPU-capture rippers (e.g. Ninja Ripper) write: **strong rip marker** |
| `cowo-1/11/12` | materials `24_Material10_0.3_0_0.002`; shared mouth/teeth/tongue atlas | Same rig family from one game (INFERRED ripped) |
| `cowo-2` | materials `Male_Hat_Cos_Seafood_GP_CabinShow.003` | Costume naming from a commercial game's asset pipeline (source UNKNOWN) |
| `cheer`, `impact`, `music` mp3 | ID3 "LAME in FL Studio 21", year 2026 | Made or re-encoded by the creator (source UNKNOWN) |
| voice mp3 ×6 | `Lavf62.3.100` | ffmpeg output (source UNKNOWN; TTS likely) |

Outfit textures include a "WANTED … BEAR … DEAD OR ALIVE" poster and "WOOM" sign art, typical of game cosmetics.
The same character pool (`Tex_0028_0.dds`, `0apelo`, `24_Material…` models) is reused in the creator's
**"GTA 6 - Grand Taxi Auto"** (`01M82AMWB3BQR9N3Y2QA2TR60R`), next to 10 Blender cars and 18 Mixamo FBX clips;
there the export generator string is the creator's own `Gtaxi-Blender52-MobileOptimizer`.

### 2.4 Trademark
"GTA6" in the title and logo (`<span class="title-mark">GTA6</span>`). The game is a beach basketball toss.
Rockstar's mark used as a traffic hook. Same on "GTA 6 - Grand Taxi Auto"; also "Naruto No Jutsu +999" and
"ONE PUNCH" use anime marks.

## 3. The creator's other games (22 public, profile 2026-11-25)

Profile: 1,862,758 total plays, 200 followers, bio "everybody make a game :)". The 22 listed games sum to
1,832,855 plays; the GTA6 game is not in the profile list (pagination), so other games may exist (UNKNOWN).

| Game (plays) | How it was made (SEEN) | Origin finding |
|---|---|---|
| DIY Beauty Salon (770,201) | No wishes (empty chat). PixiJS build, all art inlined, **Poki SDK loader** with error strings, page title "Beauty Salon" | **Poki "Beauty Salon" art** (§1). Top game of the account |
| ONE PUNCH - THUNG SAUR (226,286) | Wish "saya ingin buat game berjudul ONE PUNCH", then replaced by a 1 MB three.js r128 page titled "One Punch — Hero City", save key `aetherwild_save_v1` | Code reused from another project "Aetherwild" (source UNKNOWN) + anime trademark |
| Egg Rush Farm (210,954) | Wishes for "CUTE vs CUTE"/"Sugar Rush", then a 3.7 MB self-contained three.js bundle | No foreign marker found |
| My Date Planner (194,450) | 3 short wishes, then 21 uploaded files | No foreign marker found |
| Cute Haircut (162,767) | README: "compiled **Construct 3** web export … uploaded as a static file tree". Project "Hair Salon" v1.0.0.0, first layout `Change_girl`, exported 2026-10-01. Event sheet `Gamepush_ads`; Indonesian bridge comment: "Iklan: DIHAPUS" (ads removed), rewarded hook grants the reward free | **A portal game (GamePush ads) with its ads stripped**. Source game not identified (not Poki "Diva Hair Salon") |
| BEAUTY CLINIC (52,380) | No chat; 5.6 MB three.js bundle, save key `glowclinic.v1` | No foreign marker found |
| Love Match Making (51,731) | Shares save key `mdp_save` with My Date Planner | Self-reuse |
| Girl's Shopping Simulator (50,468) | 22 uploaded images | No foreign marker found |
| Naruto No Jutsu +999 (30,182) | Wish "Saya akan buat game fight berjudul Naruto…", 26 uploads | Anime trademark |
| Phone Case DIY (16,607) | One wish (an error paste). PixiJS v8, 808 inlined files, `[Poki] commercialBreak` adapter; README claims "No ads, no Poki SDK"; page title "Case Coloring" | **Poki "Phone Case DIY"** (§1) |
| Lobster Rush (12,016) | No chat; 5.2 MB three.js bundle | No foreign marker found |
| Cute Couple Battle (11,333) | No chat; 114 card images inlined | No foreign marker found |
| 1 Day With Lover (10,791) | Indonesian title "Dua Hati · Jalan ke Pantai"; MeshoptDecoder error paste | Own build |
| INK RUSH (7,634) | Normal wish-built game | Clean |
| Bubblegum Blitz (6,584) | Wish then 5.6 MB bundle | No foreign marker found |
| Brutal Fight (4,001) | Wish "saya akan membuatnya melalui mcp", "kerjakansaja jangan banyak tanya"; title "BRUTAL FIGHT 3D — Octagon Series" | Built outside, origin UNKNOWN |
| Dessert Stack (3,519) | Long, detailed wishes, Astrocade-generated art | Clean |
| **Zen Burger** (3,500) | Wishes "saya ingin abuat game pembuat gerger"; then a PlayCanvas export: `index.html` loads `files/assets/127265571/1/PokiPlugin.js`; embedded `Readme.md` = dev log "# Burger Rush … github.com/OnRushStudio/burger-bounty/issues/81" | **Poki "Burger Bounty"** (§1), only the title changed |
| Reel & Slash II (2,778) | Wish, then a 973 KB three.js page | No foreign marker found |
| My Home Defense (2,673) | Wishes: "hanya copy code txt kedalam code.html", "jangan buat ulang gamenya", then two 3.3 MB `.txt` code files | Pre-made code pasted in; origin UNKNOWN |
| Harvest Queen Farm (1,347) | No chat; save key `kebun_buah_3d_v2` (Indonesian) | Own build |
| GTA 6 - Grand Taxi Auto (653) | No chat; 45 uploads, shared ripped character pool | Ripped characters + trademark (§2.3) |

Pattern (INFERRED): a near-empty wish creates the game, then a finished build replaces it through MCP or uploads.
The account's biggest earners are the ported portal games: DIY Beauty Salon alone is 41% of its plays.

## 4. Byte comparison detail (SEEN, `compare-*.json` in this folder)

| Astrocade game | Poki game (build seen 2026-11-25) | Poki files | Path in Astrocade build | Byte-identical | Same path, other bytes |
|---|---|---|---|---|---|
| Zen Burger | burger-bounty (`069b7bca…`) | 248 | 176 | **87** | 89 (re-encoded GLB/MP3, patched loaders) |
| Phone Case DIY | phone-case-diy (`fb791e7e…`) | 200 | 169 | **70** | 99 (re-encoded/downscaled WebP) |
| DIY Beauty Salon | beauty-salon (first screen only) | 62 | 10 | 3 | 7 (same pictures at 40%, loader recoloured) |

Byte-identical examples: `1686599.json`, `__settings__.js`, `Motion.js`, `Station.js`, `BakedPhysicsPlayer.js`
(Zen Burger); `fonts/B_en.json`, `fonts/S_en.png`, `i18n/en.json`, `9patchbetween.webp` (Phone Case DIY).
Poki's Phone Case DIY page lists 231,157 ratings and a publish date of 2026-06-12, months before the Astrocade
copy (2026-11-05).

## 5. What this means for us

- If Larisha reports it, the evidence that stands on its own: §4 (hash matches) and the Burger Bounty dev log
  with the OnRushStudio GitHub link inside Zen Burger. Reporting is the owner's call; nothing was sent.
- Our own rule stands: build from scratch, credit CC-BY assets, no trademarks in titles. This account's top
  traffic shows that ported Poki casual games (salon, DIY, makeover) do very well on Astrocade.

Sources: [Poki Phone Case DIY](https://poki.com/en/g/phone-case-diy), [Poki Burger Bounty](https://poki.com/en/g/burger-bounty),
[Poki Beauty Salon](https://poki.com/en/g/beauty-salon), [Sketchfab "Basket Ball" by vvesy](https://sketchfab.com/3d-models/basket-ball-5f9da304f5a44196804068647abae104).
