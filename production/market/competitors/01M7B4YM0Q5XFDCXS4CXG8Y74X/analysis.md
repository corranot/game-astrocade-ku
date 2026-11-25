# Teardown: "Giant Salami Saw" (CrazyHaribo) — 2026-11-25

Sources (all public): the guest game page (`astrocade.com/games/giant-salami-saw/01M7B4YM0Q5XFDCXS4CXG8Y74X`, its
embedded `game` record), the game's `contextCdnUrl` (`full.json.gz`: code, workspace, asset map), the same for its
parent game **Giant Salami Factory** (`01M5CM86X6R3JDCG7K92PQM1FY`, which still has `chat_history`), astrotopper
(snapshot `production/market/2026-11-25T1244/`, about 5 h behind) and a full headless bot playthrough of a local
copy (Chromium + SwiftShader, 430×932, no lib, no save). Screenshots: `play/`. Claims are marked **seen** (in code,
data or a screenshot) or **inferred**.

Take the techniques, not the content: remix is locked (`disableRemix: true`), and nothing of its code or assets goes
into our repo.

## 1. Numbers

| Item | Value |
|---|---|
| Created / first published / last published | 13 Nov 2026 / 14 Nov / 24 Nov (seen, page record) |
| Plays | 271,581 on the page at 13:42 UTC; astrotopper 276.6K, +198.1K in 7 days, rank 11 weekly (seen) |
| Earlier | 19 Nov: daily rank 8, +44.5K/day, ~2.9K plays/h live (seen, `2026-11-19T1140/live-rates.md`) |
| Shares | 706 (≈2.6 per 1,000 plays) |
| Remix | original, not a remix; remix locked; no leaderboard |
| Creator | CrazyHaribo: 187 games, 11.3M total plays, median game only 1,521 plays, +1.4M plays this week (rank 2 creator) |

**The family matters more than the single game.** CrazyHaribo's hits in the monthly top list (seen, topper):
Giant Salami Factory 1.0M (+821K/30 d), Frozen Harbor 1.3M, Harpoon Harbor 990K, Giant Salami Saw 276K, Halo or Horns
145K. Four of these are the same genre: **3D arcade idle tycoon** (walk, carry a stack, drop at stations, collect
cash, pay into floor pads). Giant Salami Saw is the sequel of Giant Salami Factory (1M plays). The code says so: it
reuses "shared helpers (from Tuna Soup Pier)", a "Woolly Slope-style celebration", "PERFKIT v1, same approach as
Tulip Rush", and the Factory's code says "same pattern as Giant Salami Saw / Whirlwind Hunter" (seen).

## 2. How the creator builds (the "wishes")

- **Giant Salami Saw has no public wish history.** Its context has no `chat_history`, no GDD and no task plan (seen).
- **The parent has only 2 messages in its whole history** (seen), both surgical:
  1. 21 Oct: "Use the attached image exactly as-is as the game thumbnail… Do not redraw, restyle, crop or add anything."
  2. 21 Oct: "Make the small task label… about 15% larger so it is easier to read on phones. Do not change anything else."
- **So the game is not built by wishes on astrocade.com.** It is built with an outside coding agent and uploaded
  (inferred, strong): the code carries task ids (T27, T60, T69, T70, T72 "approved visual sample"), a dated kit
  ("PERFKIT v1 (2026-10-26)"), a named save pattern ("AstroSave v1"), and test hooks a coding agent uses:
  `?bot` auto-player, `window.__step(sec)` deterministic fast-forward, `window.__game` state handle, `?prices=`,
  `?skip`, `?nosave`, `?pk=` pixel-ratio override, `stat.tr` per-second telemetry and `stat.events` (seen). This is
  the same workflow we use (agent + `save_draft`), only more mature.
- **The workflow, reconstructed:** one shared kit across games (items/stacks, mergeGroup, log fences, rope gates,
  perfkit, save menu, guide trail, bot); each new game is a task (T72) with a visual sample approved first, then the
  full build; the bot plays the whole game for testing; the cover art is made outside and set as-is.
- **Volume + sequels.** 187 games, median 1.5K plays: most fail; the hits get sequels in the same genre and kit.

## 3. Tech stack and code architecture (seen)

- **One `index.html`, 1.72 MB.** three.js **r128 from cdnjs**, GLTFLoader and SkeletonUtils inlined (r128
  examples/js), PERFKIT (2 KB), and one 1.6 MB IIFE. Of that, only **213 KB is code**; the rest is base64 data:
  Kenney Mini Characters GLBs (CC0, 1.0 MB), a fox GLB re-dressed as a husky (217 KB, CC-BY), palette PNGs, a husky
  texture. `game_config` empty, one audio asset (`bgm_salami`, generated, prompt reused from a "winter pizza shop
  tycoon"), `lib` used only for `getAsset` and `saveUserGameState`/`getUserGameState`/`deleteUserGameState`.
- **No post-processing, no bloom, no AO, no tone mapping.** Materials: Lambert almost everywhere (17), Basic for
  UI/FX (28), Standard only for the salami, saws and robot arms (3). One hemisphere + one directional light with a
  1024² PCF-soft shadow that follows the camera. Fog + flat sky colour. **The look comes from art direction, not
  from renderer features.**
- **The hero object is the tech showpiece.** The salami is a 440×160 grid (≈140K triangles) with a 2048×1024
  canvas-painted casing (mottling, pores, bump wrinkles) and a **768×384 "cut field" DataTexture**: saw blades
  write depth into it (`carveDisc`, `carveNotch`), the vertex shader pushes vertices inward by that depth and the
  fragment shader blends in a tiling meat texture with fat flecks, a pale rim and faceted normals
  (`onBeforeCompile`). Wounds are persistent and grow every pass. A 40-sided cylinder casts the shadow instead of
  the 140K mesh. The finale splits the salami with two clipping planes and caps the cut with a painted cross-section.
- **Robot saw arms:** 3-link planar IK, spring-damped head, eased cut cycle (approach, sweep, retract), blade spin
  speeds up while cutting, crumb + spark bursts at the contact point, slices arc to the pile.
- **Everything numerous is instanced:** crowd up to 520 people as two vertex-coloured InstancedMeshes (body, head),
  bills (1,700), slices (900), pizzas (400), crumbs, sparks, particles, a GPU point-sprite fire shader (1,400).
  Static props are baked into one vertex-coloured mesh per group (`bakeStatic`, `mergeGroup`).
- **Named characters are skinned GLBs** (hero, waiter, chef, sled driver) with an AnimationMixer, clip filtering,
  and an upper/lower body split so legs walk while arms hold a stack.
- **PERFKIT:** wraps `THREE.WebGLRenderer` before the game creates it. Touch devices: no MSAA, pixel ratio ≤1.25,
  PCF instead of PCF-soft. Every 1.2 s, if the average frame is slower than 1/34 s twice, drop a stage (PR 1.0, then
  PR 0.85 + shadow map every 3rd frame).
- **Fixed 60 Hz simulation** with an accumulator (max 8 steps), seeded RNG, `hitStop` slow-motion, camera shake.
- **Save:** autosave every 6 s if changed, right after each unlock, and on hide. Restore = silent replay of the
  unlock order (arms replay their passes so the wounds match). CONTINUE / NEW GAME menu with an upgrade progress
  bar; the menu stays up until the restored scene has drawn 8 frames. Reads retry 30×300 ms because the game id
  arrives late; if the save can't be read, play without saving rather than overwrite it.
- **Guide:** "NEXT" panel (name, bar, $have/$price), a bouncing arrow over the current target, and an animated
  chevron trail along a BFS path on a 0.5 m walk grid when the next pad is affordable. Same `guideTarget()` drives
  the bot, so the test bot and the player hint can never disagree.

## 4. Playtest (bot, deterministic fast-forward)

Unlock timeline (game seconds; seen, `play/timeline.json`): robot arm 23 s · slice belt + oven 2 49 s · table 2 +
bonfire 72 s · waiter 84 s · bridge repair 103 s · smokehouse 133 s · triple saw 164 s · sled + village diner 196 s ·
arm 2 224 s · grand bridge 266 s · hot spring 713 s · bacon 717 s · lamps 724 s · giant feast 735 s, end card ~18 s later.

- **Opening (0–5 s):** the salami rolls down a slope, crushes the rope bridge (planks fly), survivors flee with panic
  bubbles, thud + shake + snow puffs, banner "A GIANT SALAMI!" (seen, `03-open-thud.jpg`). Then "STAND IN THE CIRCLE
  TO SAW THE SALAMI!" and a drag-hint ring. No title screen, no tutorial text beyond that.
- **First upgrade at 23 s, then one every 12–35 s** until the grand bridge. Prices are tiny ($25 → $540). Each
  unlock: ching, sparkles, glow burst, a camera "showcase" fly to the new thing, a banner that says what it does
  ("ROBOT SAW ARM! IT CUTS FOR YOU", "WAITER HIRED! PIZZAS GO TO THE TABLES").
- **Every unlock adds a new thing, not a bigger number** (code comment: "each step opens something new, not just
  more"): automation (arm, belt, waiter), a story beat (bridge rebuilt by the people you fed), a new product line
  (smokehouse skewers, bacon), a new district (frozen village whose cabins thaw one per delivery, hot spring).
- **Finale (~12 min for a human, inferred):** both arms at full speed, the salami breaks, pizzas flood the tables,
  warm sky, fireworks, a camera tour of every district with names, then "VILLAGE SAVED!" with stats and KEEP
  PLAYING (seen, `90-feast-f5-end.jpg`). A short game with a real ending.
- **Problem seen:** between 266 s and 713 s the bot was stuck for ~7 minutes holding a full stack of slices
  ("MAX") while every oven was full; cash stayed at $45. `guideTarget()` sends a slice-carrier back to the slice
  pile when no oven has room, and never to the cash piles. The player's arrow uses the same function, so a human
  who follows the arrow gets the same dead end (inferred). Lesson for us: the guide must never point at a step
  that does nothing.
- **FPS:** SwiftShader gives 3.5 fps here, which says nothing about phones (CPU raster). Renderer info at the end:
  164 draw calls, 512K triangles, 1,000 textures in memory, PERFKIT at stage 2. The 1,000 textures come from one
  canvas texture per floating text / tile and are never disposed (inferred from `popText`).

## 5. Visual analysis

- **Palette:** warm salmon plank deck, white snow, cyan river, the orange-red salami as the single dominant shape;
  blue robot arms and belts as the "machine" colour; yellow-parka crowd as texture. Three colour families, each one
  a meaning (food / machine / people).
- **Camera:** fixed 3/4 orthographic-feeling view (yaw 0.25, pitch 0.74, FOV 46) that frames a 12.5 m wide area and
  keeps the salami as a diagonal across the top of the portrait screen. It never rotates; it only pans, zooms out on
  showcases and shakes.
- **Scale contrast is the hook:** a salami ~5 m tall next to 1.5 m people, and a crowd of hundreds. The title says it
  and the first 5 seconds prove it.
- **Persistent change on screen:** the wounds in the salami, the stacks of bills, the queue that grows, cabins that
  thaw, the bridge that comes back. The world visibly records progress.
- **Juice per action:** bills fly in arcs with a pitched tick, items hop with spin into stacks, pads fill with a green
  sweep and pop, every unlock has sound + particles + camera + banner. Customers show pizza bubbles that turn into
  red angry faces after 9 s.
- **UI:** minimal: cash pill, NEXT panel, music toggle, restart (tap twice), banner. All in-world prompts (rings,
  arrows, floor tiles with price) instead of menus.
- **Against our standard:** no bloom, AO, tone mapping or colour grading; primitive buildings and props; flat
  sky. It wins on concept, scale and feedback, not on rendering. Our Game Quality Standard is above this bar.

## 6. Lessons to apply

1. **Genre with proven traffic:** 3D arcade idle tycoon (carry-stack-drop, floor pads, helpers automate you away)
   holds four of one creator's top games (≈3.6M plays). Short (10–15 min) with a real ending.
2. **One giant "hero object" that changes as you play** (persistent damage shader). It is the thumbnail, the title
   and the first 5 seconds.
3. **A 5-second cinematic cold open** that sets up the story, then straight into play. No title screen.
4. **First upgrade in ~20 s, one every 15–35 s, and each unlock adds a new kind of thing** with a showcase camera
   move and a one-line banner that says what it does.
5. **A finale and an end card** with stats and "keep playing".
6. **Build tooling like theirs:** a bot that plays the whole game from the same function as the player's guide, a
   deterministic `__step`, per-second telemetry, and an approved visual sample before the full build.
7. **Save pattern:** replay unlocks on load, retry the first read, never overwrite a save you couldn't read.
8. **Sequel the hits** in the same kit; most new games will be small, so make many and grow the winners.
9. **Avoid their two flaws:** the guide dead end (§4) and the texture leak.
