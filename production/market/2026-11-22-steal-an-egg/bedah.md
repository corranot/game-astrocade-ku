# Bedah Steal an Egg (f3ather) — 2026-11-22

Sumber: context publik `full.json.gz` (workspace 10 berkas, 38 aset, 2 wish terakhir) + main lokal (lib tiruan, SwiftShader 360×640). Ringkasan & keputusan: ASTROCADE.md §2. Ambil tekniknya, bukan isinya (`disableRemix: true`; game ini sendiri remake Roblox).

## Diamati saat main
- Judul + PLAY berdenyut, siap ±8 dtk headless. Dunia voxel cerah penuh frame; banner bioma besar; HUD ikon 84 px berlabel kecil.
- Sarang: prompt ✋ "Egg Steal", bot saingan ikut mencuri. Tertangkap: "CAUGHT! The guardian took the egg back" + ragdoll + fade hitam ke spawn.
- Menetas: telur besar + sinar → pet voxel berputar, "NEW!", rarity, $/s, kg, "tap to continue"; uang HUD langsung menghitung naik + "+5" melayang.
- Kamera menembus dinding saat lari mundur (tombol S); 1 haptics saat menetas, 3 saat mencuri.

Source: `ws/` (README, index.html, game.js, src/*.js). README says it is a "3D remake of the Roblox egg-stealing simulator" and the balance comes from the Roblox wiki. Units: 1 stud = 1.16 world units. UI px are design px at 720x1280.

## 1. Boot and the first 30 s (new player)
- The host calls `window.run(mode)`. Loading screen: bobbing `title_logo`, the tagline "Sneak. Steal. Hatch. Get fast.", a 420x30 progress bar, then the steps 10% "Loading save..." (getUserGameState, 3.5 s timeout race), 30% "Building the safe zone...", 60% "Waking the guardians...", 100% "Ready!". After that a pulsing **▶ PLAY** button appears (84px, Luckiest Guy). It unlocks WebAudio, fades the loader in 0.6 s, shows the HUD, toasts offline earnings and starts bgm_main. Edit mode skips the button.
- **There is no tutorial.** The six-step Astra script still exists (`TUT`: steal → "RUN!! back over the red line" → place on pad → OPEN when READY → treadmill → Index + FREE chest), but `updateAstra()` and `updateGuide()` both `return` early: "Astra tutorial removed (player feedback)". The bouncing arrow is also off, and the CSS sets `#astra{display:none!important}`. All onboarding now comes from world prompts, the glowing ring + "FREE!" label on the chest, the biome sign "X recommended", and the label "Your Base".
- Derived timeline. Spawn is at z=36 and the red line at z=0. Forest nest distance from the line is 26+130×0.68 = 114u. Base run speed is 22 studs/s = 25.5 u/s.
  - t≈1.4 s cross the red line. t≈2.5 s "Forest 🙂" title pops. t≈6 s reach the nest, hold the steal prompt 0.9 s.
  - t≈7 s: steal. "RUN!!" (110px), chase music, roar, shake 0.5, haptic. The guardian waits 0.4 s, then chases at 80→100% over 0.5 s.
  - t≈12 s: cross the line (114u at ×0.9 carry). Confetti, "You stole an EGG!", levelup sfx.
  - t≈14 s: walk into the base, "Place Egg" prompt, tap.
  - t≈25–30 s: a Common egg is READY (10–13 s grow) → OPEN → 1.3 s shake reveal → pet auto-equips, **first income ≈ $1–2/s at ~t 30 s**.
  - Index badge "1" → CLAIM gives +420 Speed and +$100. The FREE chest gives **+10,000 Speed** in one go, which passes the Lake gate (900) and reaches the Desert gate (10K) in the first minute.

## 2. Core loop (src/data.js and play.js)
**Biomes** (gate Speed / guardian studs/s / length u / nest distance from line):
Forest 0/16/130/114 · Lake 900/35/219/305 · Desert 10K/62/388/639 · Jungle 40K/82/514/1113 · Snow 170K/98/614/1695 · Volcano 700K/113/708/2372 · Abyss Ocean 2.5M/130/814/3153 · Prehistoric 18M/152/952/4060 · Cosmic 700M/200/1253/5217 · Cherry Blossom 2.5B/222/1391/6564 · Titan Temple 7B/229.5/1438/7987 · Angels&Demons 20B/244.8/1533/9489 · Enchanted Forest 50B/251.1/1573/11050. Total corridor is 11.5K u. Biome length = max(130, guard×STUD×5.4), so one biome is about 5.4 s of guardian travel. There is a 14th "Alien" biome that only sells eggs in the shop.
- **Pets:** 8 per biome plus 8 Alien, as `[name, rarity, $/s, base kg, Index Speed reward, wiki grow s, spawn %]`. There are 10 rarities (Common→Divine). Common income per biome: 1, 3, 6, 90, 140, 180, 220, 280, 1.5K, 4K, 95K, 225K, 350K. Jackpots: Lake Frost Fenrir is Cosmic, 220K $/s at 0.57% (vs 3 $/s Common); Scarecrow Crow is 15B $/s. Forest odds: Common 58%, Uncommon 17%, Rare 17%, Epic 7%, Legendary 1%.
- **Egg roll at steal:** the species is fixed but hidden until hatch. Size roll: 70% ×0.6–1.4, 20% ×1.4–3, 8% ×3–10, 2% ×10–60.
  - Income = inc × weight multiplier (ratio^(37/60) up to 125, so ×2→1.53, ×10→4.1, ×60→12.5) × mutation.
  - Mutation at hatch: 1% Rainbow ×3.5, 4% Golden ×2.5, 6% Silver ×1.2.
  - Bigger eggs carry slower: ×0.9 down to ×0.76.
- **Grow time** = 10×(wiki/10)^0.6 × size^0.35. 10 s→10, 40→23, 300→77, 1500→202 s, 4 h→13 min, 12 h→25 min, 20 h→34 min.
- **Speed → run speed:** piecewise-linear in log10(Speed). The anchors are 0→22 studs/s and each gate→guardian×1.16, so **at a gate you are 16% faster than that guardian**, capped at 330 studs/s. With a carry factor of 0.76–0.9 a big egg loses the race at the gate. That is the risk/reward lever.
- **Steal:** 0.9 s hold, decays at 2× when released, not allowed at night. Nests hold 4 eggs and refill only at dawn.
- **Chase and caught:**
  - The guardian catches you within max(3.6, h×0.32)+1.2 u, and only past z<-2. It cannot enter the safe zone.
  - Night slows it to ×0.8.
  - When caught, the egg goes back to the nest and you get a ragdoll fling (40/34/40 velocity), shake 1.2, a "CAUGHT!" banner, then a fade-teleport to spawn after 1.3 s. **No money or Speed is lost.**
- **Safe zone:** red 1.6u line at z=0 with "SAFE ZONE" painted on the floor. Crossing it banks the egg "in hand", and you then place it on a pad.
- **Drop** (red button, chase only): drops the egg 2u ahead. The guardian switches to "fetch", carries it home and goes back to sleep. Picking it up again restarts the chase at full speed.
- **Bat:**
  - Free, 0.7 s cooldown. Reach = (15+bat.reach)×1.16×0.55 u.
  - Stuns 1.4×pow s and knocks back 6×pow u.
  - There are 14 bats (pow 1→3.1). You get the next bat (and +50 gems) by completing a biome's Index page.
  - Bonking a bot that carries an egg makes it drop the egg for you.
- **Bear traps:**
  - You start with 3, at most 3 placed. They only work while you carry an egg and are outside the safe zone. They are placed 3.5u behind you.
  - The guardian is trapped 7 s, and the trap is refunded on hit.
- **Base:** Lv1 has 4 pet slots and 3 pads. Upgrades: $1K (6/4), $1M (8/5), $1B, $1T, $1Qa (14/8). "+1 EQUIP" costs $75M×6^n, max 6. Storage holds 250 pets. Pets wander freely in the pen.
- **Treadmill:**
  - 5 steps/s, gain = step × trail mult × boost × slider.
  - Steps (price): 2 (free), 5 ($15K), 12 ($250K), 30 ($5M), 80 ($120M), 100 ($3B), 200 ($75B), 500 ($2T), 1000 ($50T), 2000 ($1Qa), 3000 ($2.5Qa), 8500 ($7.5Qa).
  - Base rate is 10 Speed/s, so the Lake gate takes 90 s without the chest. Walking forward keeps you on; sideways or jump steps off. While running, the camera swings to the front.
- **Trails** (treadmill multiplier, price): ×1.5 $100, ×2 $5K, ×2.5 $75K, ×3 $1.5M, ×3.5 $30M, ×4 $750M, ×5 $20B, ×7 $500B, ×10 $12.5T, ×14 $300T, ×20 $5Qa.
- **Sell:** an egg sells for inc×(kg ratio)^0.62×80+20 (≈$100 for a Squirrel) after a confirm modal. An unequipped pet sells for 60 s of its income.
- **Fuse:** 3 of the same pet + a fee of 40× their summed $/s gives 1 egg of that species. Size is ×1–4, with a 15% chance of ×3 on top. Mutations are lost.
- **Paranoid Pete:** flavor modal only. UFO Debris is never granted and the Alien mutation weight is 0. It is a dead feature that links to the shop.
- **FREE chest:** one-time +10,000 Speed.
- **Daily (7 days, calendar):** 25 gems, 5K Speed, 40 gems, 1 trap + 600 s cash, 60 gems, ×2 treadmill for 10 min, 120 gems + Alien egg.
- **Playtime gifts at 1/3/6/10/15/20/30/45/60 min:** 5/10/15/25/50 gems, Speed 1.5K/25K, 300 s cash, ×2 boost. They never reset (playSec is lifetime), even though the UI says "today".
- **Quests:** 12 fixed one-time goals (steal 3/10/30, hatch 3/10/30, reach each gate), 15–150 gems, about 680 total.
- **Shop: all prices are in gems, there is no real money** ("⚙️ gems instead of Robux, prices echo R$"):
  - x2 Money 399, x2 Growth 467.
  - Treadmill boosts ×2/4/8/16 for 10 min at 15/40/90/180.
  - Cash packs: 10 min/1 h/4 h of income at 20/90/300.
  - Grow All 25. Alien Egg 99 (×1) / 249 (×3), odds 30/24/18/12/8/5/2.4/0.6.
  - Each pass card has a fake "gift" button that just opens Gifts.
  - Gem faucets total about 30 at start + 245/week + 105 + 680 + 650.
- **Index:** World and Limited tabs, 13 biome pages, silhouettes of unfound pets marked "???" with the spawn % shown. **The first discovery claim gives Speed + 100× its $/s.** Claiming all 8 Forest pets gives 5.1K Speed, Lake 24.9K, Desert 90K. Collection is the main Speed faucet. There is a Claim All button.
- **Night:** a 300 s day with the last 10 s night, synced to the wall clock (`Date.now()/1000 % 300`), so every player gets the same night. Night ends a run: you teleport home, a carried egg goes back to its nest, and pad eggs grow ×30. Dawn refills all nests and clears dropped eggs.
- **Rival bots:**
  - 5 bots (Pip_2015, MochiMuffin, xX_Zuko_Xx, BeanBoi, NovaStar), each with a plot and 5–9 showcase pets, using the Astro GLB tinted toward the bot's color.
  - Each has a max biome [1,3,5,2,6] and Speed = gate×1.1–2.4+2000, running at 92% of that.
  - Loop: idle 2–14 s → run to a nest → 1.1 s steal (this **empties your nests**) → guardian chases → sometimes caught and flung.
  - **They never steal from your base.** You can bonk a bot to take its egg.
- **Rebirth:** none. **Offline earnings** = 25% × income × away time (min 60 s, max 8 h). Pad eggs also advance by the full away time.
- **Leaderboard:** "🏆 Fastest Thieves" board in the hub. It submits `floor(save.speed)` 8 s after boot and every 60 s, and shows the top 9 (descending).

## 3. Economy curve
- **First purchases:** Grey Trail $100 is affordable right after the first Index claim. Base Lv2 $1K takes about 1–2 min (Forest income ~10 $/s plus Index cash of 100×inc).
- **Speed:** Sci-Fi 5/step × Green ×2 = 50/s, so Desert (10K) takes 200 s. In practice the chest and Index rewards skip most early grinding.
- **Growth rates:** gate ratios are ×11, 4, 4.3, 4.1, 3.6, 7.2, 39 (spike at Cosmic), 3.6, 2.8, 2.9, 2.5. Treadmill prices rise ×16–600 per tier, trails ×15–50, base ×1000 per level. Income rises about ×10 per biome, so the curve is exponential and kept in check by log-scaled speed.
- **Faucets:** passive $/s, Index (cash + Speed), egg and pet selling, offline earnings, daily/gifts/quests, the chest, the treadmill.
- **Sinks:** treadmills, trails, base, equip slots, fuse fees. Gems go to passes, boosts, Alien eggs, cash packs and Grow All.
- **Time sinks:** grow timers, the 10 s night, nest refill each 5 min.

## 4. Juice and feel
- **Sounds:** 13 asset sounds (`sfx_hatch, grab, cash, bonk, roar, speedup, rare, buy, place, reveal, levelup, bgm_main, bgm_chase`). Every sfx has a WebAudio synth fallback, and synth-only cues add click/open/close/jump/tread/hold/swing/trap/coin/error/zone/pop/gift/night/whoosh. Each cue is throttled to 40 ms. Music crossfades in 0.5 s: main ↔ chase on steal, drop, home, caught and night.
- **Particles:** instanced cubes, max 420, with gravity and bounce. Presets: dust, confetti (50 on a successful steal, base upgrade, passes), sparkle, guardian puff.
- **Floating text:** "+$X" over a random pen pet every 1.6 s; "+N" from the treadmill every 4 steps; "Z" over sleeping guardians every 1.1 s; "BONK!", "TRAPPED! 7s".
- **Stat counters:** cash counts up (lerp k=10), stats bump to ×1.14 on change.
- **Camera shake:** 0.3 (trap), 0.5 (roar, bonk), 1.2 (caught). It decays 2/s.
- **Speed feel:** FOV kick up to +16 with speed; the camera pulls back up to +7u.
- **Chase screen:** HUD stripped bare, "RUN!!" pulsing, red edge vignette pulsing.
- **Hatch reveal:** a separate 520px canvas with spinning conic rays. The egg shakes with accelerating frequency for 1.3 s (tap to skip), then the pet pops with easeOutBack and spins.
  - Text: rarity name in rarity color, mutation tag, name, $/s, kg, and a tilted "NEW!" sticker.
  - Mythic+ swaps sfx_reveal for sfx_rare and plays haptic success.
  - It has no rarity-scaled VFX. Rainbow pets use a hue-cycle shader.
- **Haptics** (lib.haptics.play): tap (steal), warning (wake), thud (caught, bonk), success (home, rare).

## 5. Controls and camera
- **Floating joystick:** spawns where you touch in the left 50% and bottom 52% of the screen. 190px base, 80px travel.
- **Look:** drag anywhere else (0.0068 rad/px × sensitivity, pitch 0.06–1.2). After a drag, auto-follow resumes in 1.6 s and lerps behind you.
- **Jump:** 150px button bottom-right (vy 30, g 90). Keyboard: WASD/arrows, Space, and E (hold to steal).
- **No auto-run.** `lib.shouldUseTouchControls` is not used, so the touch UI shows on desktop too.
- **Prompts:** a 92px circle with emoji + label at the projected world point. Steal fills a green ring over 0.9 s; everything else fires on pointerdown.
- **"Slow Mode" toggle on the HUD:** fixed 16 studs/s, for kids who find the speed too fast.
- **Camera:** FOV 72 in portrait (60 if aspect ≥ 0.7). Distance 23, pitch 0.34, clamped inside the walls.

## 6. HUD layout (design px)
- **Top-left:** gear 84px circle at (20,20).
- **Top-right:** Quests, Gifts (label shows a countdown), Daily. 84px circles at right 212/116/20 with 20px labels and red 32px badges.
- **Left:** gems (30px) at bottom 272; **Shop** green 188×66 at top 330; **Index** cyan at top 410; Slow Mode toggle at top 492.
- **Right:** **Eggs** red 86px square at top 330 (badge = ready count); **Pets** orange at top 440.
- **Bottom-left:** Speed 46px orange #ff9a1e at bottom 214; Cash 46px #7dff3a at bottom 160; "+$X/s" 20px at bottom 136.
- **Bottom-right:** Jump 150px; moon/night timer 28px.
- **Bottom-center:** hotbar of 96px slots (bat, trap ×3, egg); Drop button (40px, chase only) at bottom 150.
- **Center/top:** biome name at top 175 (40px), RUN!! at top 224 (56px), toasts at top 236 (max 3, 2.6 s), banner at top 400 (78px).
- **Panels:** inset 24, top 170, max-height 900, 80px striped colored header, 58px red ✕.
- **Fonts:** Fredoka 600/700 and Luckiest Guy. Every text has an 8-direction text-shadow outline.
- **Tap targets at rest:** about 13–14.
- **Menus (13):** Shop, Index, Pets, Growing Eggs, Trails, Treadmills, Base, Sell, Fuse, Settings (music, sfx, slow, graphics Low/Med/High, camera speed, stats), Daily, Gifts, Quests. Plus Pete and sell modals, and the hatch screen.

## 7. Tech
- **Scripts:** three **r147** classic scripts (three.min.js plus examples/js GLTFLoader and SkeletonUtils), ES-module game.js, and fonts from fontsource `@latest`, which is unpinned.
- **rem scaling:** `html{font-size: min(w/720,h/1280)px}`, so the whole DOM is authored in design px. Uses safe-area env().
- **Renderer:**
  - antialias on, high-performance power preference, pixel ratio min(dpr, 1.5), or 2 on High.
  - PCFSoft shadows at 1024 with a ±45 shadow camera that follows the player.
  - Fog 220–1300. No tone mapping.
  - Hemisphere 0.8 + Directional 0.62 light. Lambert materials.
  - The sky is a shader dome (gradient, procedural stars and clouds) that follows the camera. Sky color blends per biome and toward night.
- **Corridor streaming (`updateSegments`):** keeps biomes [cur-1, cur+2] loaded and builds **at most 1 biome per frame**. It disposes geometry and canvas textures when a biome leaves the window. Guardians are hidden beyond 700u (asleep), bots beyond 500u. Bot pens animate only within 160u.
- **Voxel builder:** the `VB` class turns boxes and tapers into one merged BufferGeometry with vertex colors and a shared atlas map. The bottom face is shaded 0.78. Optional outline uses backface hull geometry. Pets are `Rig` parts (body/head/legs), each merged; geometry is cached; there is one `animate(pet, dt, moving)` call. The hub decor is one mesh. The only InstancedMesh is the particle system.
- **Astro avatar GLB** (`lib.getAsset("player_avatar")`): scaled to 5.8u, textures forced to LinearEncoding. Clips are matched by name (idle/walk/run/jump/fall) and cross-faded in 0.18 s; walk/run timeScale is 0.7–2.4. Bots use `SkeletonUtils.clone` with their own mixers. The voxel fallback body shows until the GLB loads.
- **Performance:**
  - No adaptive FPS (GC.quality "auto" is unused). The only quality control is the manual Graphics setting, and Low is not applied at boot.
  - dt is clamped to 0.11.
  - The whole step loop is wrapped in try/catch and logs via lib.log.
  - **3 WebGL contexts:** main, a 160px thumbnail renderer (toDataURL, cached), and the hatch renderer.
  - About 40+ DOM world labels are projected every frame, culled by maxD.
- **Save:**
  - `lib.saveUserGameState(clone)` is debounced (dirty + 4 s). It is marked dirty for a full second every 5 s, plus on pagehide and visibility change.
  - Schema v1: `{cash, gems:30, speed, steps, debris, tread, treadOwned, trail, trailsOwned, base, extraEquip, pets[{id,p,kg,m,eq}], nextId, eggs[{id,p,b,kg,size,pad,total,left,m}], found, claimed, pages, bat, traps, passes, boosts, chest, tut, stats, daily, gifts, set, lastSeen, playSec, quests}`.
  - On load, missing keys are merged from defaults.
- **Full lib.\* list:** getUserGameState, saveUserGameState, getAsset, log, haptics.play, showGameParameters (7 sliders: music, sfx, income ×0.5–10, speed gain, guardian speed 0.5–1.5, grow speed, camera sensitivity), addPlayerScoreToLeaderboard(score, 9), getTopNEntriesFromLeaderboard(9). Note: GC is an `Object.assign` copy, so live slider edits may not propagate.
- **Localization:** none. Strings are hardcoded English plus emoji.

## 8. Weaknesses, bugs, risks
1. **The hotbar is hidden during a chase** (`#hud.chase #hotbar{opacity:0;pointer-events:none}`). Traps only work while you carry an egg, so on touch the bat and traps are unusable exactly when they matter. There are no number hotkeys either.
2. **Traps leak.** Unhit traps are never cleared; three misses leave you with 0 traps permanently (the save keeps the count, the scene list is lost on reload).
3. **It is a Roblox clone.** README, wiki values, R$-echo prices, Roblox-style bot names and Pete all copy the original, which is an IP and originality risk.
4. **No onboarding.** The tutorial was removed after player feedback, so the text bar was disliked, and nothing replaced it.
5. **Menu overload:** 13 menus, about 14 HUD buttons, dense 19–22px card text, and suffixes like Qa/Qi/Sx that are hard for kids.
6. **Night punishes you.** It can confiscate a nearly-banked egg with no pre-warning beyond a small timer.
7. **Dead or misleading features:** Pete/UFO debris; gifts labelled "today" that never reset; Sky-biome Index Speed rewards of 1000–1749 (a data error); unused luck parameter; GC.quality unused.
8. **Performance and robustness:** 3 contexts, DOM label churn, shadows on by default, examples/js removed after r147, unpinned fonts, no touch/desktop detection, no landscape layout.
9. **Bots can't raid your base.** The genre's PvP "steal from players" fantasy is missing.

## 9. Steal this (12)
1. rem = design-px scaling for the DOM HUD at 720×1280.
2. Hold-to-steal (0.9 s ring) for the one risky verb; everything else is a single tap.
3. Run speed anchored in log-space so you are +16% over the gate's guardian, with carry slow 0.76–0.9 by egg size, giving readable risk/reward.
4. A fair chase start: 0.4 s wake plus a 0.5 s ramp from 80% to 100%.
5. Soft fail: the egg returns and you get a ragdoll fling and a teleport, but lose no currency.
6. A chase-mode screen: stripped HUD, RUN!!, vignette, music swap, shake, haptics.
7. Hidden rarity inside the egg, a grow timer compressed with ^0.6, wall-clock-synced night (growth ×30), and nest refill at dawn.
8. Index as a progression faucet: Speed + 100× $/s on first discovery, and a page completion gives a new bat.
9. Treadmill as a visible grind (+N/step label, chase lights) with multiplicative trails.
10. A day-1 power spike: the FREE chest skips two gates.
11. Rival bots as social proof: they use the corridor, get caught, show off their pens, and you can bonk them for their egg.
12. Tech: single data file plus showGameParameters sliders, streaming window built one segment per frame with disposal, merged vertex-color voxels, instanced particles, synth sfx fallback, offline 25%/8h toast, a debounced save.

## Do better (8)
1. Keep the bat and traps on screen during a chase as one big contextual button, and fix the trap leak.
2. Onboarding through arrows and diegetic pointers instead of text, for 3 steps only.
3. Progressive HUD: unlock buttons as features come online; merge Treadmill, Trails and Base into one "Upgrades" menu; aim for 6 buttons or fewer at the start.
4. Visual-first, number-light UI with icons and a string table, ready for localization.
5. An original theme, names and numbers.
6. Warn 10 s before night with a countdown, and let a carried egg still count if you are near the line.
7. Performance: one WebGL context (thumbnails through render targets), auto quality tiers from measured FPS, `lib.shouldUseTouchControls`, capped DOM labels, pinned versions, r187 ESM.
8. Deeper loop: bots or rivals that raid your base (defense), rarity-scaled hatch VFX with slow motion for Mythic+, and a leaderboard metric beyond raw Speed.
