# Study: "Turbo Arena 2" by Butwheniii (27 Nov 2026)

Game: `01M6VC682EKS33BM81NP0SARTD`, astrocade.com/games/turbo-arena-2. Requested by the owner as a learning study.
Read-only: no remix, no like, no comment, no follow. Their code, models and audio are not copied into this repo; only
facts, numbers, short quotes and our own screenshots of the guest page.

Sources: the guest game API record (`game-record.json`), the creator profile API (`creator-games.json`, 29 public
games), the served build's `full.json.gz` (code, 11-module workspace with tests, asset map, Astra chat history), the
same for the prequel **Turbo Arena** (`01KG2KE8QCN18Z3ETT06TT7XWF`), our own row/config snapshots, and two guest
playtests of the live page (Playwright, Chromium + SwiftShader, 390×844 phone portrait) plus one throttled load run
(4G 9 Mbps / 60 ms, CPU ×4). Claims are **seen** (data, code, screenshot) or **inferred**.

## 0. Headline

1. **Turbo Arena 2 is not a traffic game yet.** 297 plays, 7 likes, 6 shares in 3.2 days since first publish
   (24 Nov 04:33 UTC) = ~93 plays/day (seen). It is far under Players' Choice `min_plays 50000` and at risk of the
   200-play / 40 s dead-game gate. The creator is still editing an unpublished draft (latest draft
   `01M8DKMB…`, last change 27 Nov 09:04 UTC, seen).
2. **The traffic is in the prequel.** **Turbo Arena** (1) has **1,024,386 plays**, 10.4K likes, **19.1K shares**
   (18.7 per 1,000 plays, about 4x our pool median of 4.5–7.3), 776 comments, live since 29 Jan 2026, ~3.4K
   plays/day lifetime (seen). On 22 Nov it sat in Astrocade's day-0 engagement-length gallery list
   (`d0_v0_eng_length`, rank 94 of 100, seen in our statsig snapshot). The creator account: 2.96M plays, top three
   games are all **3D ball sports** (Turbo Arena 1.02M, World Cup Shot 669K, Kickverse 524K, seen).
3. **How it was made: 100% Astra wishes, no outside coding agent.** TA2 = 56 user wishes over 17 days
   (7–24 Nov); TA1 = 410 wishes over 4.5 months (244 in its first 4 days). Astra wrote a modular workspace with
   unit tests and a README. The creator's job was taste and QA: one short, specific complaint per wish.
4. **Tech: Three.js r128 (global build from cdnjs), 11 script modules, ~740 KB of game code, no post-processing.**
   Strengths: hardware-tier detection + FPS watchdog that steps quality down, real vehicle/ball physics with tests,
   instant replay, kickoff/podium cinematics, layered blue boost VFX, ring-buffer tire trails. Weaknesses: ~25 MB of
   GLB models (10–12 MB transferred in a play session), three.js and Google Fonts fetched from outside CDNs while
   running, per-frame allocations, no save, `hasLeaderboard: true` but no leaderboard call in code.
5. **IP risk.** Asset map and code name "Rocket League" models (Octane, Fennec, Dominus, ball, "Samus's Gunship")
   and a "2024 Porsche 992 GT3 R" model, all uploaded by the creator (seen). Our playbook §7.2: brand IP is dropped
   from curated rows and invites review. The mechanics (car soccer) are a genre; the models are someone's property.
   **We take the techniques, never the names or assets.**

## 1. Metadata and stats (seen, guest API 27 Nov 09:19 UTC)

| Item | Turbo Arena 2 | Turbo Arena (prequel) |
|---|---|---|
| Created / first published / last published | 7 Nov / 24 Nov 04:33 / 24 Nov 06:44 | 28 Jan / 29 Jan / 8 Jun |
| Plays / likes / shares / comments | 297 / 7 / 6 / 1 | 1,024,386 / 10,398 / 19,136 / 776 |
| Remix / remix locked | original / `disableRemix: true` | original / locked |
| Leaderboard flag | `hasLeaderboard: true` (descending), never written in code | none |
| Review | approved | approved |
| Description | "High-octane 3D rocket car arena striker with drift physics, nitro boost, aerial jumps, and explosive ball goals." (110 chars) | ~400 chars with bullet list |
| Capabilities | `haptics: optional` | – |
| Animated thumbnail / video preview | none | none |
| Context size | full.json 1.68 MB (game_code 742 KB), play.json.gz 120 KB | game_code 682 KB, GDD 12 KB |

Creator (seen): Butwheniii, 2,959,687 plays, 47,979 likes, 275 followers, 29 public games. Bio says the goal is
"3m plays". Lifetime plays/day by game: World Cup Shot 4.2K, Turbo Arena 3.4K, Kickverse 3.1K; everything else
under 750/day. Remixes make up about half the list and none of the top three is a remix of someone else's hit
except Kickverse/World Cup Shot (`isRemix: true`).

Rows (seen): TA2 is in no row we sampled (deep-dig 26 Nov, account-health rows 27 Nov). Kickverse was in
`sports#39` on 26 Nov. TA1 was in the `d0_v0_eng_length` list on 22 Nov.

## 2. How the creator built it: the wish history

### 2.1 Turbo Arena (prequel), 410 wishes (seen)
- First prompt: a long spec for "a 3D car soccer game inspired by Rocket League, built from scratch": small rocket
  cars, big ball, 5-minute matches, boost pads, PC + mobile. Astra wrote a GDD (12 KB, "Core Game Loop",
  "Starting Scope / Must Have") from it.
- Rhythm: 26 wishes on day 1, **135 on day 2**, 77 on day 3; then bursts of 10–27 a day in February, a trickle to
  June. Wishes are tiny and corrective ("make the ball bigger", "camera can't pass through walls", "the AI always
  spins near the ball", "goal counts before the highlight").
- Late wishes are all mobile HUD polish: boost meter covered by the joystick, blurry PNG buttons, tutorial
  darkening the button you must press.
- Feature arc: joystick → ball physics → goal nets → camera → explosion on goal → **goal replay** (day 2) → speed
  meter → AI fixes → PNG HUD → tutorial.

### 2.2 Turbo Arena 2, 56 wishes (seen, our grouping)

| Group | Count | Examples (paraphrased) |
|---|---|---|
| Crash / black screen / freeze fixes | 10 | settings panel crash, black screen, freeze on play, missing function, models not loading |
| Feel and physics | 11 | realistic ball and rolling physics, landing bounce, wall driving that faces travel, no climbing to the sky, flip on double jump, slower flip |
| Camera | 6 | car stays on screen in ball cam, no clipping, less jitter on landing, spinning and low-end devices |
| Visual and VFX | 15 | brighter then less bright, black futuristic court, bigger stadium, tire trails, hit effects, idle blue flame, sparks, real flame, goal portals, futuristic skyline |
| Menus, UI, branding | 5 | 3D garage menu, better match buttons, title PNG matching the cover, remove title overlay, bigger car in menu |
| Cinematics | 6 | shorter intro clips that look like real play, at least 4 then 3 more scenes, goal replay keeps VFX, dynamic podium, 3 MVP podium entrances |
| Performance | 2 | optimize for low-end, loading-screen stutter |
| Questions | 3 | "what AI are you", "what game", wheel model origin |

Pattern: one change per wish, judged by playing on a phone, then the next. The creator never wrote code. Astra's
replies always say "tested in a browser with zero errors" and offer 3–4 next ideas.

**Lesson (inferred):** a sequel built mostly for *looks* (intro clips, podium, skyline) did not add anything that
changes the first 40 seconds, which is what the algorithm measures.

## 3. Tech stack teardown (seen in the served workspace)

| Area | What they did |
|---|---|
| Engine | Three.js **r128** global build from cdnjs; custom bundled GLTFLoader (`gltf-loader.js`, 96 KB) |
| Structure | `index.html` (100 KB: HUD, menus, CSS, SVG button plates) + `game.js` (243 KB) + `vehicles.js` (134 KB) + `stadium.js` (109 KB) + `fx.js`, `trails.js`, `physics.js`, `collision.js`, `controls.js`, `arena.js`, `garage.js`; pure-math modules exported as globals (`TurboPhysics`, `TurboCollision`, `TurboControls`, `TurboArena`, `TurboTrailsCore`, `TurboFXCore`) |
| Tests | 6 node test files for physics, collision, controls, arena, fx, trails (Astra wrote them) |
| Renderer | ACES filmic tone mapping, exposure from a `brightness` config, `FogExp2`, hemisphere + ambient + key + rim fills, PCF soft shadows (2048 high / 1024 medium / off low). **No EffectComposer, no bloom pass**: glow is additive sprites and emissive materials |
| Quality tiers | `detectHardwareTier()` from `hardwareConcurrency`, `deviceMemory`, mobile UA: low (≤2 cores or ≤2 GB or mobile ≤4 cores), medium (≤4 cores, ≤4 GB or any mobile), high. Low = no MSAA, `mediump`, `low-power`, pixel ratio 0.85, no shadows, fill lights off. Medium = DPR 1.25. High = DPR 1.75–2 |
| FPS watchdog | every 2.2 s, if average FPS < 34 step down one tier (auto mode only), never back up; manual quality pill saved in `localStorage` |
| Physics | own model: quadratic drag, Magnus spin, speed-dependent restitution, Coulomb friction, bicycle steering, spring-damper suspension, landing bounce with PD self-righting, air-roll momentum, ramp roll-back; rounded-rectangle arena with continuous curved wall ramps (`TurboArena` gives wall distance, normal, slope) |
| Collision | per-model oriented boxes, sphere-vs-box ball contact, car-vs-car SAT on the ground plane |
| AI | per-car role (goalie / support / striker), aim behind the ball on the ball-to-goal line, wrong-side detour, boost when aligned and far, jump when ball is 4.5–14 high and close; difficulty scales throttle 0.55–1.1 |
| Camera | ball cam / car cam toggle, kickoff orbit sweep eased over 3.2 s, replay cam that lerps to a side view of the ball, clamp against arena and ramps, menu camera with slow drift and pointer parallax |
| Replay | ring of 180 frames (3 s) cloning ball and car transforms each frame, replayed after a goal, skippable |
| VFX | shock rings, flashes and gravity sparks on smashes and ball impacts; blue exhaust puffs + spark streaks, denser on boost; textured plasma ribbons at model nozzles; tire trails in one additive ring-buffer mesh (2,400 segments shared by all wheels); goal-net hex energy field with ripples where the ball hits; stadium crowd via one `InstancedMesh` (720+ fans) |
| Audio | WebAudio with a `DynamicsCompressor` on the master, preloaded buffers, rate-limited hit sounds, pitch-driven engine and tire loops, crowd bed, music, 3 commentator lines (kickoff, goal ×2) |
| Platform API | `lib.getAsset` (16 calls), `lib.haptics` (4), `lib.showGameParameters` (2). **No** `lib.share`, no save, no leaderboard writes |
| Config | 13 live knobs in `game_config.json` (speed 52, boost 120, bounce 85, match 180 s, AI 75, camera 15 / 5.8, `touch_steering: point`) |

Perf risks we saw in code (seen): `recordReplayFrame` clones 3 + 3×cars `Vector3`/`Euler` every frame; AI creates
new vectors per car per frame; 11 `new THREE.Mesh` in fx.js plus 28 in game.js on effect paths (no general pool;
only the trail mesh is a ring buffer). Inferred: GC hitches on low-end phones, which matches the creator's repeated
"jitter on low-end devices" wishes.

## 4. Playtest audit (guest, live page, 390×844 portrait)

Screenshots: `shots/` (also in project files `turbo-arena-2-study/`). SwiftShader runs this at 6–9 FPS, so FPS and
feel numbers below are **not** phone numbers.

### 4.1 Load
- Throttled 4G + CPU ×4: game canvas and intro overlay at **3.45 s after tapping Play** (seen). Ball GLB 2.0 MB
  done at 3.3 s, Samus chassis 3.4 MB at 8.2 s, Dominus 1.45 MB at 11.8 s (seen) — the intro plays on stand-in
  meshes while the real models arrive.
- Whole session transferred 10.6–11.8 MB (seen). The full asset map holds ~25 MB of GLBs (stadium 4.7 MB, Porsche
  4.2 MB, Samus 3.4 MB, Fennec 2.7 MB, ball 2.1 MB, Dominus 1.5 MB).
- External requests while running: three.js from cdnjs and Google Fonts (seen in `index.html`). Playbook §7.2:
  `GAME_EXTERNAL_REQUESTS` is reported to the host.

### 4.2 Flow and FTUE (seen)
Cover → Play → **intro montage** (4+ short scripted clips: "Arena Showdown", "Wall Ramp Boost", "Supersonic"…, with
Skip) → **title menu** (3D car on dark showroom, logo PNG, big orange PLAY MATCH, Garage / Controls / Settings
tiles, quick strip MAP / GFX / BOOST) → **mode select** (1v1 Duel, 2v2 Clash, 3v3 League, Free Play) → **garage**
step 1 (5 cars, 8 metallic paints) → step 2 (6 goal explosions, 5 boost trails) → **START MATCH** → kickoff
countdown with flavour text ("2 · BOOST CHARGED", "1 · LOCKED IN!", "GO! STRIKE THE BALL!").

That is **5 taps after the intro before the car moves** (Play Match → mode → garage next → start, plus skip
intro). No interactive tutorial: only a "DRAG TO DRIVE" label by the joystick and a static controls page written for
keyboard (WASD, SPACE, SHIFT, Q/E, C).

### 4.3 Match (seen)
- HUD: top center score pill (BLUE 0 · 2:53 · 1 ORANGE, mode tag under the timer), top-right "BALL CAM: ON [C]" and
  "GARAGE / MODES" pills; bottom-right speed + NITRO BOOST bar plate, DRIFT / AIR ROLL (98 px), BOOST (122 px,
  orange), JUMP / 2X FLIP (126 px, green) in an arc; floating joystick in the lower-left 56%×46% zone.
- The AI scored **3 goals in the first ~16 s of match time** against our scripted driver (seen: 0–3 at 2:44).
  A new phone player meets the same AI with no difficulty ramp (inferred).
- Goal: big italic "ORANGE GOAL!" with "SCORED BY RIVAL · 252 KM/H", hex net flash, then **instant replay** with a
  red "INSTANT GOAL REPLAY · SKIP" bar and ball-side camera; kickoff resets with the countdown.
- Wall driving up the curved ramps works and reads well; boost leaves blue plasma puffs, speed lines, cyan trails.
- Score pills and labels are tiny on a phone: the host renders the game at a fixed **720×1280** layout scaled to
  the frame (seen: HUD layer rect 720×1280 in a 390×693 frame), so 10–12 px CSS text shows at ~6 px.

### 4.4 Visual read (art director, our opinion)
Strong: one colour language (cyan player, orange rival, deep navy night stadium), neon court lines that sell
speed, real-looking car models, readable ball silhouette, chunky arc buttons with clear colours.
Weak: the court and walls are very busy (stripes everywhere fight the ball), the ball is black on a dark court, top
HUD text is too small, menus are dense panels of small text, the intro is long for a feed game.

## 5. Why it gets (or does not get) traffic, mapped to our playbook

| Playbook signal | Turbo Arena (1M) | Turbo Arena 2 (297) |
|---|---|---|
| First 40 s (§0, dead gate) | Short spec, quick start, one mode at first (inferred from GDD) | Intro + 5 menu taps + 3 s countdown before control; AI may score before the player touches the ball (seen in our run) |
| Shares per 1K plays | 18.7 (seen) — goal replays and explosions are clip-worthy | 20 per 1K on a tiny base; no in-game share call |
| Session length | 5-minute matches (GDD) → long sessions feed `d0_v0_eng_length` | 3-minute matches, but heavier funnel before them |
| Theme row (sports) | Same creator's football games sit in `sports` | Not seen in rows yet |
| Series (§4.3) | — | A sequel 10 months later competes with its own 1M-play original for the same audience (creator dedup, §7.2) |
| Brand IP (§7.2) | prompt says "inspired by Rocket League" | asset names say "Rocket League" and "Porsche" → curated-row and review risk |
| Load (owner rule ~2 s) | — | 3.45 s to first canvas on 4G/CPU×4; 10+ MB per session |
| External requests (§7.2) | — | cdnjs three.js + Google Fonts at runtime |

Why TA1 won (inferred): an instantly understood fantasy (cars + giant ball), a genre with a famous reference but
**no** Astrocade equivalent in January, physical comedy on every touch, a replay and an explosion on every goal
(share bait), and months of tiny fixes driven by real phone play.

## 6. Lessons for our games, ranked (whole team)

1. **Feed-first start beats a pretty menu.** Put the player in control within ~3 s of the first frame; menus,
   garage and modes come after the first goal (Draw It Alive / Meteor Gems already aim for this; TA2 shows the
   cost of skipping it).
2. **Every goal is a shareable moment.** Goal banner with a stat ("252 KM/H"), short instant replay from a better
   camera, then back to play. This is our "every key moment is cinematic" rule; TA1's 18.7 shares/1K is the proof.
   Keep it skippable and ≤3 s, and add `lib.share` at that peak (TA2 does not).
3. **Hardware tier + FPS watchdog** is cheap and good: detect tier from cores/memory/mobile, set DPR, shadows,
   MSAA and precision per tier, and step down once if the 2-second average drops under ~34 FPS. Add a step back up
   and keep tiers in `config.js`.
4. **Pure-math modules with node tests** (physics, collision, controls, arena surface, VFX emission math) let an AI
   coder change feel safely. Same as our coding standard; this creator got it from Astra for free.
5. **Do not let the AI score first.** A difficulty ramp for the first match (slower rival, rival hesitates at
   kickoff) protects the 40 s gate. TA2's rival scored 3 in 16 s.
6. **Weight budget for models.** One hero model + ball for the first frame, others on demand, each ≤~1 MB
   (meshopt/Draco, smaller textures). TA2 ships 25 MB of GLBs and plays its intro on stand-ins.
7. **Size the HUD for the 720×1280 host canvas.** Text and pills must be designed at the scaled size: at 390 px
   wide, 12 px CSS reads as ~6 px. Check our own HUD grid against this.
8. **Tire trails as one ring-buffer mesh and a crowd as one InstancedMesh** are the right pattern for many small
   repeated things; extend it to pooled impact rings and sparks (TA2 allocates per effect and per frame).
9. **One colour language** (player cyan, rival orange, boost blue, gold for wins) carried through cars, trails,
   score pills and buttons makes a busy 3D scene readable. Keep the court calmer than TA2 so the ball pops.
10. **Small, specific iteration loops win over big sequels.** TA1 got to 1M with hundreds of one-line fixes from
    real phone play; TA2 spent its wishes on intro clips and podiums. Spend polish on the first minute.

Also: never ship brand names or ripped models; never pull libraries or fonts from a CDN at runtime; a
`hasLeaderboard` flag with no writes is wasted (a leaderboard is in 67% of the Players' Choice pool).

## 7. Not checked
Real-phone FPS, landscape play, audio by ear (headless), a full 3-minute match to the podium cutscene, the
unpublished TA2 draft, TA1's own playtest, and the exact Astra system prompt.

## Files
- `game-record.json` — guest API record for TA2.
- `creator-games.json` — the creator's 29 public games (plays, likes, shares, flags, dates).
- `shots/` — playtest JPGs at 390×844 and two contact sheets.
