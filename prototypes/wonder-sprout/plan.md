# Wonder Sprout: Royal Sky-Garden, game plan

Status: **PLAN, waiting for approval. No game code is written until it is approved.**
Date: 2026-11-27. Requested by Larisha (full spec in the project thread, 27 Nov 12:12 UTC).
Market check: `production/market/2026-11-27T1215-wonder-sprout-fit/report.md`.
Rules applied: CLAUDE.md (Game Quality Standard, Plan Before Building, Owner Preferences), `ASTROCADE.md`,
`docs/astrocade-distribution-playbook.md` (§1.2 gates, §3 themes, §10 checklist, §11.2 Players' Choice),
the Astrocade game dev guide (pulled 27 Nov), the Turbo Arena 2 study and the Draw It Alive and Soap Carving
audits.

Every change from Larisha's spec is marked **[CHANGE]** with its reason. Everything not marked is kept as
she wrote it.

---

## 0. One line

Fling a cute critter across a floating sky-island, smash crystals for star-gems, and watch your garden
kingdom pop up, while eggs hatch new friends that evolve into crowned mythic guardians.

## 1. Concept

- **Pitch.** A 2D portrait slingshot-bounce toy with a pet-collection and kingdom-building meta. Every fling
  pays out gems; gems visibly fly into the next landmark, which bursts out of the ground; eggs hatch helpers
  that keep the gems flowing.
- **Fantasy.** "I am the little royal gardener of a magic sky-island. My critters and I make it bloom."
- **Audience.** Kids 6 to 12 on Android web phones first (the day-0 cohort the gallery is scored on), and
  families. No fail state, no timers that punish, no reading needed.
- **Why now (data, 27 Nov).** 9 of today's 21 Players' Choice games are pet, egg or creature collection
  games; Sword Swing Chopper (hatch pets, rebirth, 3 worlds) is 18.5K plays/day at 11 days; Throw Food for
  Animals (throw at targets, collect pets that earn) is 20.9K/day. Drag-and-launch physics is proven by
  Robo-Crash (13.4K/day). Sources and proxies: the market report above.
- **Platform target.** Players' Choice: `15 × retention + 10 × share of sessions over 5 min + 0.033 × p50 s
  + 0.01 × p75 s`, after 50K plays. The design aims at all four terms.

### Targets (gates, not hopes)

| Metric | Gate | Stretch (Larisha's goal) |
|---|---|---|
| Median session (first 200 plays) | ≥ 90 s (platform dead line is 40 s) | ≥ 10 min |
| p75 session | ≥ 200 s | ≥ 15 min |
| Sessions over 5 min | ≥ 20% | ≥ 40% |
| Come back next day | ≥ 25% | ≥ 35% |
| First gesture | < 1 s after first frame | |

**[CHANGE] The 10-minute median is the stretch goal, not the pass line.** The platform average is 27% of
first plays past 90 s. A 10-minute median would be far above every game in today's pool; we design for it,
but we judge the build on the gates above, which are what the ranker reads.

## 2. Core loop

**Every 2 to 5 seconds:** drag back on the hero critter, release, it bounces through jelly mushrooms,
geodes, star-fruit trees and pinatas. Each hit pops gem orbs. Combo pitch climbs a pentatonic scale. Tap a
geode when its golden ring meets the core for a SUPER NOVA (×5).

**Every 15 to 30 seconds:** orbs fly along Bezier arcs into the active landmark pedestal; its fill ring
grows; a landmark finishes and pops up with fireworks. An egg drops or becomes affordable.

**Every minute:** a new landmark changes the island (bumpers appear, the ferris wheel starts paying, the
fountain magnetises loot). An egg hatches a new helper. A critter evolves. The sky-pirate pinata raid
arrives (first at 75 s).

**Every 10 to 15 minutes:** the lighthouse is built, the rainbow bridge opens World 2.

**Every day:** the garden grew overnight (capped offline income) and a Morning Gift Egg waits on the
pedestal. No streak (same decision as Rub It Away and Draw It Alive: a missed day never punishes).

### First 60 seconds, second by second (feeds the 40 s gate test)

| Time | What happens | Reward |
|---|---|---|
| 0.0 s | Live diorama is already moving (feed preview). Puff-Fox sits in the golden sling, a soft hand ghost drags back from it toward a geode | |
| ~1 s | First drag. Aim arc and dots appear from the critter | |
| ~2 s | First release. Two or three bounces, gems pop, sub-thump + kalimba | gems |
| ~8 s | Geode ring starts shrinking (FTUE step 2) | |
| ~10 s | First SUPER NOVA tap, 45 ms hitstop, shockwave | ×5 gems |
| ~20 s | First Meadow Egg drops out of a pinata | egg |
| ~25 s | Tap the egg 3 times: wobble, light cracks, Cloud-Bunny pops out and starts helping | helper |
| ~35 to 40 s | Honeycomb Bakery finishes: origami pop-up cinematic, harp glissando | landmark 1 |
| ~60 s | Jelly Grove half full; bumpers preview as ghost outlines | |
| 75 s | Sky-pirate airship pinata arrives for 22 s | gem shower + egg |

No end screen, menu or "game over" exists, so nothing can stop the session before 60 s.

## 3. Controls

| Action | Touch | Mouse / keyboard |
|---|---|---|
| Aim and fling | Press anywhere on the island stage, drag back, release | Same with mouse; Space flings at the last aim |
| Cancel a fling | Drag back into the critter's small "rest" circle and release | Esc |
| SUPER NOVA crit | Tap a glowing geode or pinata when the ring meets the core | Click it |
| Hatch egg | Tap the egg (3 taps; each tap is a wobble) | Click |
| Open Hatchery, Kingdom, Evolution | Big dock buttons | Click, or 1, 2, 3 |
| Close drawer | Tap outside, or swipe down | Esc |
| Sound | HUD sound pill | M |

- **Tap vs drag rule:** a touch that moves under 14 px and lifts within 220 ms on a geode or pinata is a
  crit tap; anything else is a fling. Tuned in `game_config.json`.
- Fat-finger hitboxes 1.45× visual radius (kept). Magnetic aim-assist: the launch angle bends up to 6°
  toward the nearest target inside a 20° cone (tunable).
- All handlers let touches reach `document` (feed counts a play from them); no `stopPropagation` on touch.
- Vibration via `lib.haptics.play` on hit (`tap`), crit and landmark (`thud`, `success`). Never the only
  feedback. No tilt, camera or microphone.

## 4. Progression

### v1 content (World 1: Sunlit Velvet Meadow)

- **6 landmarks**, built in a fixed order, each a visible change to the island:
  1. Honeycomb Bakery: spawns honey orbs.
  2. Bouncy Jelly-Grove: adds pinball bumper mushrooms.
  3. Starlight Observatory: + fling power and + crit multiplier.
  4. Clockwork Ferris Wheel: spins and pays passive star-gems (this is also the offline income).
  5. Crystal Prism Fountain: magnetises loose loot.
  6. Royal Sky-Lighthouse: opens the rainbow air-bridge (World 2 arrives in update U1; in v1 it opens a
     "next island is coming" cloud gate and a Golden Egg reward, so v1 still ends a chapter).
- **Resources.** Star-Gems (main currency, from every hit), Magic Wood (from star-fruit trees, needed by
  landmarks), Royal Crowns (rebirth currency, from update U2).
- **Critters in v1: Puff-Fox (hero), Cloud-Bunny, Sprout-Dragon**, each with 3 stages (Baby, Winged Royal
  Guardian, Crowned Mythic Avatar with orbiting star halo). Up to 3 helpers roam and dash into crystals.
- **Eggs in v1:** Meadow Egg (Cloud-Bunny or Sprout-Dragon) and Coral Geode Egg (better odds, rarer
  variant tint). Starlight Royal Egg arrives in U2.
- **Evolution:** feed star-gems in the Evolution drawer. Stage 2 near 3 min, stage 3 near 8 min for the
  hero (helpers later).
- **Leaderboard [CHANGE]:** one number, "Garden Stars" (lifetime star-gems in thousands). Reason: 16 of
  21 Players' Choice games have one, and the host's share-to-compete card needs a score.

### Pacing targets (tuned by the bot playtest, not by hand)

| Milestone | Target time from first frame |
|---|---|
| Landmark 1 | 35 to 45 s |
| First hatch | ~25 s |
| Landmark 2 | ~2 min |
| Hero stage 2 | ~3 min |
| Landmark 3 | ~4 min |
| Landmark 4 | ~6 min |
| Hero stage 3 | ~8 min |
| Landmark 5 | ~9 min |
| Landmark 6 (World 1 done) | 12 to 15 min |

Cost curve: landmark n costs `base × 1.85^(n-1)` gems plus wood; evolution and egg prices follow
`base × growth^k`. All numbers live in `game_config.json` with the formula named next to them.

### [CHANGE] Worlds 2 and 3, Star-Unicorn, Amber-Owl and Rebirth ship as updates

Reason: speed and the update boost. The playbook says to have 2 or 3 meaningful updates ready for days 3, 6
and 9 after launch (boost half-life 3 days, first 30 days only). One world with 6 landmarks already covers
the first 15 minutes, which is past every gate. Splitting gives us a tested v1 sooner and three real
updates.

| Release | Content |
|---|---|
| v1 | World 1, 6 landmarks, 3 critters × 3 stages, 2 eggs, raid, FTUE, daily gift egg, leaderboard, share |
| U1 (launch + 3 d) | World 2 Twilight Lantern Lagoon (6 new landmarks, night palette, lanterns), Amber-Owl, world-transition curtain |
| U2 (launch + 6 d) | World 3 Sovereign Cloud Citadel, Star-Unicorn, Starlight Royal Egg, Royal Star-Rebirth (+100% crown multiplier, mythic skins) |
| U3 (launch + 9 d) | Raid variants, rare egg mutations (gold, rainbow), weather events (petal wind, star shower) |

## 5. Art direction (2D, held to the Game Quality Standard in 2D terms)

- **Style.** Storybook velvet and satin enamel. Painted gradients, soft rim light, feathered contact
  shadows, paper grain over everything. Rich, never harsh.
- **Palette (kept exactly):** Cream Alabaster `#F5EFE4`, Twilight Plum `#231F3A`, Amber Gold `#E6A83A`,
  Emerald Teal `#1B7F79`, Rosewood Coral `#DF6458`, Meadow Sage `#4D8B6F`, Lavender Mist `#8E7CC3`. No
  `#FFFFFF`, no neon. Contrast rule from `ASTROCADE.md` (ΔE ≥ 22 or contrast ≥ 2.2) is checked on every
  screen: cream items never on cream panels, gold gems outlined on the sage hills.
- **[CHANGE] Brighter first impression.** The playbook found none of the 24 fastest covers dark, and the
  preview must read with no sound. World 1 is the dawn-gold meadow at full saturation of the palette; the
  plum is used for HUD glass and the world-2 night, not for the first screen's sky.
- **Five parallax layers (kept):** sky dome with drifting cloud banks; distant floating islands with tiny
  waterfalls; mid velvet hills with swaying grass and wildflowers; the play terrace with carved stone trim
  and glowing runes; soft-focus foreground leaves framing the top corners (never over the HUD or the
  aim area).
- **Critters.** Articulated parts (torso, head, ears or wings, tail, eyes) as baked sprites on a small
  spring rig; eyes blink and track the finger; squash and stretch keeps volume (`sx = 1 / sy`).
- **Landmarks** are drawn twice: a pedestal with a fill ring while building, and the finished building,
  which unfolds in 3 origami tiers.
- **Camera.** Fixed portrait stage with a gentle 2.5D parallax drift following the hero; trauma shake on
  crits; cinematic beats ease in (zoom up to 1.15×) and back.

## 6. VFX per interaction

| Interaction | Effect |
|---|---|
| Drag | Golden elastic band with stretch glow, trajectory dots fading with distance, critter squashes back |
| Launch | Dust puff, speed lines, stardust trail |
| Bounce | Jelly wobble on the mushroom, small ring, 3 to 5 gem orbs |
| Geode hit | Crystal shards with gravity and ground bounce |
| SUPER NOVA | 45 ms hitstop, two expanding shockwave rings, radial light burst, big number pop, shake |
| Orb collect | Bezier flight to the landmark (or HUD), sparkle tail, pill pulse on arrival |
| Landmark complete | Cinematic beat: zoom to pedestal, letterbox, 3-tier origami pop-up, fireworks, confetti petals |
| Egg tap | Spring wobble, crack lines with light rays; final tap bursts shell pieces and a glow ring |
| Evolution | Silhouette spin, light pillar, wings or crown appear, halo orbits, star shower |
| Raid | Airship drifts in with a cloud wake; weak-point targets spin; break showers rainbow gems |
| World 1 done | Rainbow bridge draws across the sky, golden petal curtain |
| Idle life | Grass sway, waterfalls, birds, drifting pollen, ferris wheel spin, fountain sparkle |

All particles come from one pool with a hard cap per quality tier.

## 7. Audio (all synthesized, Web Audio)

- Context unlocked on the first `pointerdown` (resume + silent buffer). The feed preview is muted by the
  host; nothing depends on sound to be understood.
- Kept from the spec: sling stretch (filtered triangle, pitch with tension), impact (130 to 55 Hz thump +
  kalimba on C5 D5 E5 G5 A5 C6 D6 E6 climbing with the combo), harp glissando on landmark, heartbeat and
  shell snaps on hatch, celestial fanfare on evolution, music-box ambient loop (toggle).
- Added: raid horn and propeller hum, orb arrival ticks (rate-limited), soft UI clicks, a one-note sting
  for each cinematic beat.
- Mix: one master and three buses (music, sfx, ui), a limiter, ducking of music under stings. Max 24
  voices; voices are recycled.

## 8. UI

### Layout on the 720 × 1280 host canvas

**[CHANGE] Logical canvas 720 × 1280, not 540 × 960.** The Astrocade iframe is exactly 720 × 1280 and the
host scales it to every screen, so the desktop plum frame and our own letterbox are not needed. The plum
`#1A162E` stays as the page background for any gap.

- **Top HUD** (one row, 8 px grid, equal safe-area margins, one shared pill height of 72 px): Star-Gems,
  Magic Wood, World Track (1, 2, 3 dots), Sound. Velvet-glass pills, icons and numbers at one size.
  Language (🌐) sits inside a small gear sheet, not on the HUD.
- **[CHANGE] Bottom dock about 22% of the height, not 35%.** Three big buttons (Hatchery, Kingdom,
  Evolution, each at least 160 × 160 px) with bouncing badges. Reason: the slingshot needs room to drag
  back and aim; 35% of a phone screen for three buttons would shrink the island by a third. Drawers slide
  up from the dock with spring physics (stiffness and damping in config) and cover at most 60% of the
  screen.
- World bubbles and pointers never sit under the HUD or the dock. Checked on 360 × 640, 390 × 844,
  430 × 932 and 768 × 1024 with `layout.js`.

### [CHANGE] No separate PLAY screen

The spec's title overlay with a big PLAY! button is replaced by a live title: the diorama is the game, the
logo floats over the sky for the first fling, and the pulsing hand ghost sits on the critter. Reasons: the
feed preview is the first screen and its first tap must already do something (`ASTROCADE.md`, Hukum Nilai
point 3); a PLAY screen costs a tap and seconds in the 5-second window. The PLAY button's job (one obvious
action, no text) is done by the hand ghost.

### FTUE (mandatory spotlight)

Dim the screen except a soft cutout around the target, an icon-first hint, one step at a time; each step
advances only on the real action; the cutout follows moving targets; skip button; finished steps saved and
never repeated.

1. Fling the critter (cutout on the critter, ghost arrow from the critter to a geode).
2. SUPER NOVA tap (cutout on the geode and its ring). Advances on a geode tap; the crit itself is praised.
3. Hatch the egg (cutout on the egg).
4. Kingdom button when landmark 2 is chosen (cutout on the button).
5. Evolution button when stage 2 is affordable.

All guides start at the hero and point to the goal; an off-screen target gets an edge arrow from the
hero's side.

### Cinematic beats

Landmark complete, first hatch, each evolution, raid arrival, raid break, world done, first SUPER NOVA of
the session. 0.6 to 2 s each, never block input, one priority queue with a cooldown (8 s default) so
repeated crits do not trigger beats after the first.

### Share

`lib.share` with title and text, **no image** (house rule: the card shows the live thumbnail), offered at
evolution stage 2 and 3, landmark 6 and a rare egg. Never in the first 60 s.

### Languages

All text in one string table, 7 languages (en, ar, es, vi, hi, bn, id), auto-detected, Arabic mirrored,
commands at most 3 to 4 words. Most of the UI is icons.

## 9. Architecture

**[CHANGE] Multi-file source, single file as a build output.** Astrocade requires `index.html`, `game.js`,
`game_config.json`, `asset_map.json` and `README.md`, with logic in modules imported from `game.js`. So
the 7 modules become 7 files with Larisha's names, and the single-file `index.html` she asked for is
produced by `tools/single-file.js` for the test artifact.

```
prototypes/wonder-sprout/
  index.html  game.js  game_config.json  asset_map.json  README.md
  modules/
    m0-orchestrator.js     EventBus, GameState, loop, viewport, mode handling
    m1-art-bakery.js       SpriteBaker, palette, paper grain, parallax layers
    m2-audio-engine.js     synth voices, buses, music box
    m3-physics-gameplay.js sling, bounce physics, targets, crits, helpers, raid
    m4-kingdom-critters.js landmarks, eggs, hatch, evolution, economy
    m5-vfx-kinematics.js   particle pool, rigs, squash and stretch, beats, transitions
    m6-kids-portrait-ui.js HUD, dock, drawers, FTUE, strings, share
  tests/  (node unit tests)
```

- Modules talk only through `EventBus` (`on`, `off`, `emit`) and read one serializable `GameState`
  (fields kept from the spec: `starGems, magicWood, royalCrowns, comboCount, worldIndex, landmarks[],
  eggs[], critters[], activeCritterIds[], bossState, weatherEvent, rebirthCount, stats`, plus
  `ftueDone, lastSeen, giftDay, schemaVersion`).
- Pure logic (physics step, economy, save validation, FTUE steps, tap-vs-drag) is free of canvas and
  audio so node tests can run it.
- `dt = clamp(rawDt, 0, 0.05)` (kept; also never negative, a lesson from Meteor Gems), physics in fixed
  substeps of 1/120 s so a fast critter cannot tunnel.
- **[CHANGE] Save through `lib.saveUserGameState`, not `localStorage`.** The sandboxed iframe blocks
  browser storage. Save on every milestone (hatch, landmark, evolution, rebirth) and after a 3 s settle,
  at most once every 8 s (kept cadence). Load validates the schema and falls back to a fresh state on any
  bad field, never crashing.
- **Edit mode:** `run('edit')` shows the living diorama without gameplay and registers tunables with
  `lib.showGameParameters`. Tested with the feed handover `run('edit')` then `run('play')`.
- Zero external images, fonts or audio files (kept). Text uses the system font stack.

## 10. Performance plan (60 FPS on a mid-range phone)

- **First load.** One JS bundle, target under 120 KB gzip, no assets to fetch. First frame bakes only the
  sky, terrace and hero (budget 150 ms); everything else bakes in 4 ms slices on later frames, landmarks
  just before they are needed. Audio graph is built on the first gesture. Target: playable first frame
  within 2 s on a throttled mid-range phone over 4G, measured with `tools/load-time.js` and reported every
  build.
- **Frame.** Baked sprites drawn with transforms only; parallax layers 1 and 2 cached to offscreen canvases
  and moved, not redrawn; grass drawn as a few baked strips skewed per strip, not per blade; paper grain as
  one pattern fill.
- **Pools.** Particles, orbs, debris and rings in fixed arrays (no allocation per frame). Caps: high 600,
  mid 350, low 180.
- **Adaptive quality.** Tier from cores, memory and touch; DPR 2, 1.5 or 1; a watchdog steps down when the
  2 s average drops under 50 FPS and steps back up after 10 s above 58. Tiers live in `game_config.json`.
- Budget per frame on mid tier: update 3 ms, draw 7 ms.

## 11. Test plan

**Automatic (every round):**
- Unit tests (node): physics bounce and no tunneling at max speed, tap-vs-drag classifier, rhythm window,
  economy curve and pacing table, save schema validation and migration, offline income cap, FTUE step
  logic, EventBus.
- Bot timeline playtest: rewards at about 10, 20, 30 and 40 s; landmark 1 by 45 s; no stall in 15 min of
  bot play; the pacing table above within ±25%.
- `tools/astrocade-bundle-test.js` (sandboxed 720 × 1280, real touch): `started: true`, no errors,
  `movesBeforeTouch` true, `tapChangedScreen` true, leaderboard and share code found.
- Feed handover: `run('edit')` then `run('play')`, intro on.
- `layout.js` HUD grid on 360 × 640, 390 × 844, 430 × 932, 768 × 1024; contrast check on every screen.
- Load time on a throttled phone profile; FPS on a mobile viewport with 4× CPU throttle.
- `bash tools/ci-checks.sh`.

**By eye (screenshots, phone portrait JPG, saved to `/mnt/project-files/wonder-sprout/` and
`production/qa/evidence/wonder-sprout/`):** first frame at 300 ms, drag aim, SUPER NOVA, hatch sequence,
each landmark pop-up, each evolution stage, raid, every FTUE step, every drawer, 7 languages on the main
screen, hero framed after a cinematic beat. The coordinator reviews these before anything goes to
Larisha.

**Full playtest** only before publish or after a pacing change.

## 12. Milestones (each one is a playable vertical slice)

| # | Slice | Done when |
|---|---|---|
| M1 | Island and fling | Baked sky, terrace and Puff-Fox; sling aim, launch, bounces off mushrooms and geodes, gem orbs into the HUD pill, impact sound, save and load. Bundle test passes, first gesture under 1 s, 60 FPS on the mobile profile, physics unit tests green |
| M2 | Juice and crit | Rhythm rings and SUPER NOVA, hitstop, shockwaves, debris, shake, combo pentatonic, eye tracking, squash and stretch, idle life on all 5 layers. Screenshots reviewed |
| M3 | Kingdom and hatchery | 6 landmarks with Bezier flow and origami pop-up, 2 egg types, hatch, 3 helpers, 3 critters × 3 stages, evolution, dock and drawers, leaderboard. Bot playtest hits the pacing table |
| M4 | Raid, FTUE and ship prep | Airship raid, FTUE spotlight, cinematic queue, share, Morning Gift Egg and offline growth, 7 languages, edit mode, quality tiers, load-time report. All §11 checks green; full playtest; ready for the draft upload |
| U1 to U3 | Updates | As in §4, each with its own quick-check round, ready before launch day + 3, + 6, + 9 |

Rough time: M1 to M4 about 2 working days of thread time with quick checks per round. U1 to U3 about half a
day each.

## 13. Listing (Astrocade sees only the game)

- **[CHANGE] Title: "Wonder Sprout"** (13 characters). The full "Wonder-Sprout: Royal Sky-Garden" is the
  in-game logo. Reason: the fastest quarter of the feed has a median title of 14 characters; short titles
  read in every market. Alternative if a test wants the verb first: "Sky Garden Fling".
- **Description (draft, 122 characters):** "Fling your critter, smash crystals and catch star-gems! Hatch
  eggs, evolve cute pets and build a magic sky-garden kingdom." Verb-led, unique, no brand or workflow
  words.
- **Target theme row: Farm** (68 games, smaller than Incremental's 100). To land there the game's own
  words and mechanics say garden: star-fruit trees regrow and are harvested, landmarks are "planted".
  If the taxonomy files it under Incremental or Merge instead, that is acceptable (Sword Swing Chopper
  leads Merge with the same meta).
- Thumbnail: Larisha's job. The preview's first 2 s (critter in the sling, a fling across the island)
  should match whatever cover she makes.
- Remix off during the launch window.

## 14. Scope risks

| Risk | Size | Handling |
|---|---|---|
| 7 modules × full polish in one go | High | Milestones above; each slice playable and reviewed |
| 3 worlds of art | High | v1 has 1 world; worlds 2 and 3 reuse the bakery with new palettes and 6 new landmarks each |
| 5 critters × 3 stages of rigged art | High | v1 has 3 critters; parts are shared (one rig, swapped part sprites) |
| Raid event | Medium | In v1 (it is the 75 s spike), one airship design, variants in U3 |
| Tap and drag on the same screen | Medium | One classifier with unit tests and tuned thresholds |
| 2D in a mostly 3D Players' Choice pool | Medium | Rich 5-layer parallax and rigged critters; Larisha's 2D toys already win her traffic |
| Pacing (10 min goal) | Medium | Bot playtest against the pacing table every pacing change |
| Kids reading | Low | Icons first, 7 languages, 3 to 4 word hints |

## 15. Decisions (per the house rule, the coordinator decides these)

1. Ship v1 with World 1 and 3 critters, and the rest as updates U1 to U3 (recommended).
2. Live title instead of a PLAY screen (recommended).
3. Dock at about 22% of the height instead of 35% (recommended).
4. Listing title "Wonder Sprout", in-game full name (recommended).
5. Target the Farm theme row (recommended).
6. Add a "Garden Stars" leaderboard (recommended).
