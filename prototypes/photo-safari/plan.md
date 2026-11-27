# Snowy Snapshot (working title): winter photo safari, game plan

Status: **PLAN, waiting for approval. No game code is written until Larisha approves it.**
Date: 2026-11-27. Requested by Larisha in the project thread (27 Nov 14:45 UTC).
Data: the 27 Nov backend dig, `production/market/2026-11-27T1420-next-game-dig/report.md` (concept #1),
playbook `docs/astrocade-distribution-playbook.md` §1.2, §1.3, §2, §5, §10, §11.2, §12.
Proxy for daily plays: `gain24` (plays now minus plays 21 h earlier, scaled to 24 h), and lifetime plays / age
where `gain24` is missing. Daily plays are not exposed by Astrocade.
Rules applied: CLAUDE.md (Game Quality Standard, Plan Before Building, Owner Preferences), `ASTROCADE.md`,
lessons in project memory (Meteor Gems camera and feed handover, Wonder Sprout plan format).

Team voices: Creative Director (CD), 3D Technical Art Director (TAD), Retention/Economy Designer (RED), VFX and
Animation Lead (VFX), Audio Lead (AUD), Mobile Kids UX Lead (UX), Performance Engineer (PERF), QA Lead (QA).

---

## 0. One line

Walk a cozy snowy valley in 3D, sneak up on shy, fluffy animals and catch their silliest poses on an instant
camera, then watch each photo develop and fly into your book, while night brings the aurora and new visitors.

## 1. Concept, title and hook

### Why this game (data)

| Fact (SEEN, 27 Nov) | What it means for the plan |
|---|---|
| Zoo Zen (calm photo collection, 3D) first seen in Players' Choice at **4.1 days**, now in **97%** of 140 random-seed draws; 81.7K plays at 4.9 d, `gain24` 21.8K | The fastest entrant on record. The loop (walk, photograph, complete a set) scores high on the formula |
| Calm photo collection: **1 real game** in all 1,766 crawled games | Thinnest proven niche. Supply is almost zero |
| Zoo Zen's owner: under 1M lifetime plays, 93 followers | No big-creator advantage needed |
| Winter / holiday: 150 games, Frost Harbor (ice-fishing tycoon) in **85%** of draws | Winter is the season's look; it lifts a concept but is not a niche by itself |
| Fastest entrants averaged **9K to 22K plays/day from day 0**, past 50K on day 3 to 6 | Our day-0 target: about 15K/day |
| Players' Choice score = 15 × retention + 10 × share of sessions > 300 s + 0.033 × p50 s + 0.01 × p75 s, min 50K plays | Every system below is tied to one of the four terms (§5) |
| 0 of the 24 most-drawn covers look 2D; puzzle/dress-up/ASMR convert worst | 3D, with a long goal (book, areas) and a reason to return |
| Near-duplicate descriptions are removed (`dedup-description`) | Our setting, verbs and words must differ clearly from Zoo Zen (§1, Listing) |

### Pitch, fantasy, audience

- **Pitch.** A no-fail 3D photo safari in a snowy valley. The twist that Zoo Zen does not have: animals *do
  things* (yawn, belly-slide, sneeze, snowball-roll, peek from a burrow), and the photo is rated 1 to 3 stars on
  framing and on catching the pose. Treats coax shy animals out. A short in-game day ends in an aurora night
  with night-only animals. A different rare visitor shows up every real day.
- **Fantasy (CD).** "I am the little nature photographer of a magic winter valley. The animals trust me."
- **Audience (UX).** Kids 6 to 12 and families, Android web phones first (the day-0 cohort the gallery is scored
  on, playbook §1.3). No fail, no timer that punishes, no reading needed.
- **Hero.** Pip, an original kid in a bright red puffer parka, a huge cream pom-pom hat and mittens, holding an
  oversized mint instant camera. Red reads against snow at any size.

### Title options (playbook §2.3: short, plain English, no brand, no echo of a big title)

| Title | Chars | Note |
|---|---|---|
| **Snowy Snapshot** (recommended) | 14 | Matches the fastest quarter's median of 14; verb-noun promise; no "zoo", no "zen" |
| Frosty Lens | 11 | Shorter; less clear to a kid that it is about photos |
| Peekaboo Pines | 14 | Cute, but hides the camera verb |
| Snow Snap Safari | 16 | Clear; "Safari" is generic, slightly longer |

"Snapshot" also appears in "Sneaky Students Exam Snapshot"; the bigram ("snowy snapshot" vs "exam snapshot")
differs, so bigram dedup should not fire (INFERRED).

### Hook (first 5 seconds)

The game starts live, no PLAY screen: Pip stands in fresh snow, an arctic fox kit sits 6 m ahead and yawns, a
glowing paw-print trail runs from Pip to the fox, and the shutter button pulses. Any tap walks Pip toward it.
The first photo is possible within 3 s.

## 2. Core loop

**Every 5 to 10 seconds:** walk toward a glowing animal → the camera eases into viewfinder mode when one is in
range (6 m) → wait a beat for the pose (a pose icon bubbles over the animal 0.8 s before it) → tap the shutter
→ flash, the instant photo slides out, shakes and develops in 1.2 s, stars pop → the card flies into the book
button, snowflakes (currency) burst into the HUD pill.

**Every minute:** a new species or a new pose slot is filled, a book page completes (4 animals), a daily
request is ticked off, or a treat or lens is bought.

**Every 3 to 5 minutes:** a new area opens (ice wall cracks, cinematic beat), dusk falls, and the aurora night
brings night-only animals (the in-game day is 6 minutes, §4).

**Every day:** a new rare visitor, 3 new photo requests from Hoot the owl ranger, and a morning mail gift.

### First 60 seconds (feeds the 40 s gate and the timeline test)

| Time | Event | Reward |
|---|---|---|
| 0 to 3 s | Live title over the valley, fox yawns, trail and pulsing shutter | |
| ~4 s | First photo (always at least 2★ in the FTUE) | Develop, stars, 24 snowflakes |
| ~10 s | Card flies to the book: "1 / 24" | Book page stamp |
| ~18 s | Hare peeks from a burrow 10 m away, trail turns to it | 2nd species |
| ~28 s | Shy hare hides; treat button glows; toss a carrot; hare comes out and does a binky jump | Pose photo, 3★ chance |
| ~38 s | Penguin chick belly-slides down a slope (moving target) | 3rd species |
| ~50 s | Page 1 has 3 of 4; the 4th (snowy owl) blinks on a branch | |
| ~60 s | Page 1 complete: cinematic beat, page glows gold, 100 snowflakes | First shop item affordable |

No menu, no end and no text wall before 60 s (playbook §10 item 1).

## 3. Controls (one finger first)

| Action | Touch | Keyboard / mouse |
|---|---|---|
| Walk | Drag anywhere in the lower 70% of the screen: a floating joystick appears at the finger | WASD or arrows |
| Walk to a spot | Tap the ground: Pip walks there (tap vs drag classifier: < 12 px and < 220 ms = tap) | Click the ground |
| Photograph | Tap the big shutter (bottom right, 176 px). Auto-aim frames the nearest animal in range; the shutter also works on anything else (snowman, sunset) for 1★ fun | Space or left-click on the shutter |
| Fine framing | While in viewfinder mode, a short drag nudges the frame ±12° | Mouse move |
| Zoom (after lens unlock) | Tap the zoom chip next to the shutter (1×, 2×, 3×) | Q / E |
| Toss a treat | Tap the treat button (bottom left, 112 px): throws toward the shy animal nearest the frame centre | T |
| Book | Tap the book button (right column under sound) | B |

- No pinch, no two-finger gestures, no precise timing needed (the pose window is 2.0 s plus a 0.5 s grace, and animals pose every 4-7 s while the hero waits nearby).
- Touch handlers never stop propagation before `document` (gestures are counted there, playbook §7.2).
- Haptics are off on web, so every action has a visual and sound confirmation (§7, §8).

## 4. Progression, book, areas, rare visitors and economy

### Areas (v1 ships 1 to 3; 4 and 5 are updates, see §12)

| # | Area | Opens at | Animals (day / night) | Feature |
|---|---|---|---|---|
| 1 | Pine Meadow | start | Arctic fox kit, snowshoe hare, penguin chick, snowy owl, reindeer calf, red squirrel / ermine, lynx kit | Burrows, slopes, snowman |
| 2 | Frozen Lake | 10 stamps (~4 min) | Seal pup, otter, beaver, puffin, walrus calf, moose / beluga at the ice hole, arctic tern | Ice crackle, skating otters, fishing hole |
| 3 | Ice Caves | 25 stamps (~10 min) | Polar bear cub, pika, marmot, mountain goat kid, snow leopard cub / glow-moth swarm, bat, wolf pup | Crystal glow, echo sounds |
| 4 | Hot Springs (U1) | 45 stamps | Red panda, snow monkey, yak calf, musk ox, crane / tanuki, fox family | Steam, soaking poses |
| 5 | Aurora Ridge (U2) | 70 stamps | Husky pups, wolverine, caribou, narwhal (sea view), ptarmigan / aurora jellies in the sky, star owl | Big sky, the best aurora |

v1: 3 areas × 8 = **24 species**, 4 rare visitors. Full game after U2: **40 species**.

### The book (album)

- One page per area, 8 species per page split in two half-pages of 4 (a "page complete" moment every ~4 species).
- Each species has **3 slots**: Hello (any photo), Pose (catch its special action), Star (3★ of the pose). A slot
  fills once and gives one **stamp**; 24 species × 3 = 72 stamps in v1, 120 after U2.
- Missing species show as a soft silhouette with a hint icon (time of day, area, treat needed). No text needed.
- The best photo per slot is kept. Photos are stored as small parameter records, not images (§10), and
  re-rendered for the book.

### Photo rating (generous; kids never "fail")

Stars = 1 + framing (0 to 1) + pose (0 to 1), rounded down, max 3.
- Framing: the animal's screen box covers 18% to 60% of the frame and its centre is within 25% of the frame
  centre → 1. Anything visible → at least 1★.
- Pose: the shutter fell inside the 2.0 s pose window (+0.5 s grace) → 1. The pose icon over the animal tells the player when.
- Occlusion over 50% (a tree in front) gives a gentle "peek" photo that still counts as Hello.
All thresholds in `game_config.json`.

### Rare visitors (daily return driver)

7 rare visitors, one per real calendar day (local date, seeded so it is the same for everyone that day):
Golden Hare, Crystal Fox, Aurora Moose (glowing antlers), Moon Owl, Frost Whale (breaches at the lake hole),
Snow Yeti cub, Rainbow Ptarmigan. Each appears at a sparkle spot for the whole day (always reachable in an
open area), with a shimmer sound and an edge arrow from Pip. Photographing it gives a gold frame, 5× snowflakes
and a cinematic beat. Missing a day loses nothing: a visitor returns the next week. No streak, no punishment
(the 26 Nov decision for Rub It Away: "today's picture" without streak).

### Daily photo requests and mail

- Hoot the owl ranger posts **3 requests a day** ("a sleeping animal", "two animals in one photo", "a 3★ at
  night"), shown as icons on a small board in the HUD's book sheet. Each pays 60 snowflakes, all three a gift
  box (lens cosmetic or treat).
- Morning mail: the first session each day opens with Hoot dropping a letter (150 snowflakes + a hint where
  today's rare visitor is).

### Day and night (5-minute driver)

One in-game day lasts 6 minutes: day 4:00, golden dusk 0:40, aurora night 1:00, dawn 0:20. Night-only animals
(10 of 40) can only be photographed at night. The first night falls at about **4:30 into the first session**,
with an aurora cinematic beat; a kid who wants the night animals plays past 5 minutes. A lantern unlock (U1)
lets players pick "stay at night" later.

### Economy (snowflakes)

| Faucet | Amount |
|---|---|
| Photo 1★ / 2★ / 3★ | 5 / 12 / 25 |
| First fill of a slot | ×2 |
| Rare visitor photo | ×5 + gold frame |
| Half-page complete / page complete | 50 / 150 |
| Daily request / all three | 60 / gift box |
| Morning mail | 150 |

| Sink (permanent unlocks, no consumables) | Price |
|---|---|
| Treats: carrot (free), fish 80, berries 150, yarn ball 260 (each opens a shy-animal type) | 0 to 260 |
| Zoom lens 2× / 3× (reach skittish animals) | 300 / 700 |
| Night flash (night animals come closer) | 450 |
| Slow shutter (moving animals easier) | 550 |
| Outfits and hats (12 in v1), camera colours (6) | 80 to 400 |

Pacing targets (tuned by the bot playtest, ±25%): first purchase at ~60 s; area 2 at ~4 min; first night at
~4.5 min; area 3 at ~10 min; 50% of v1 stamps at ~25 min across sessions; v1 book complete at ~90 min over 4 to
6 days (enough to bridge to U1 on day 3 and U2 on day 6).

Round 8 measurement (27 Nov, real-clock kid bot, `retention-bot.js`): area 2 at 1.5-2.5 min, first night at
~4.6 min, area 3 at ~4.5-7 min, book complete at ~13 min. That is much faster than the targets above, but
the bot knows where every animal is. The day is 210 s and the night 90 s, and a "wait for night" button
appears once only night visitors are left. Watch the live completion rate; if the book is finished in the
first session, U1 (a second chapter) moves forward.

## 5. Retention targets and how each feature drives them

| Term in the score | Weight | Gate (v1 must reach) | Target | Benchmark |
|---|---|---|---|---|
| Retention (come back next day) | 15 | ≥ 25% | **≥ 32%** | Platform prior `p_ret` 17.7% |
| Share of sessions over 300 s | 10 | ≥ 25% | **≥ 35%** | Wonder Sprout gate 20% |
| p50 session | 0.033 / s | ≥ 120 s | **≥ 200 s** | Dead line 40 s, featured 50 s |
| p75 session | 0.01 / s | ≥ 300 s | **≥ 480 s** | Theme row needs 75 s |
| First gesture | | < 1 s | < 1 s | Top games < 5 s |
| p_sig (first play past 90 s) | gallery | ≥ 45% | ≥ 55% | Platform prior 26.6% |

If retention is a 0 to 1 fraction (INFERRED), the target build scores about 15 × 0.32 + 10 × 0.35 + 0.033 × 200
+ 0.01 × 480 = 4.8 + 3.5 + 6.6 + 4.8 = **19.7**. Competitors' values are UNKNOWN; the cluster conversions stand
in for them (dig §4, §7).

| Feature | D1 retention | > 5 min share | p50 | p75 |
|---|---|---|---|---|
| Live start, fox in front, photo in 4 s | | | ●● (no bounce in first 10 s) | |
| Rewards every ~10 s in the first minute | | | ●●● | |
| Half-page / page completes every ~1 to 2 min | | ● | ●● | ● |
| First night at ~4.5 min with night-only animals | | ●●● | | ●● |
| Area 2 at ~4 min, area 3 at ~10 min | | ●● | | ●●● |
| Pose and 3★ slots (3 per species) | ● | ● | | ●● |
| Daily rare visitor | ●●● | ● | | |
| 3 daily requests + morning mail | ●●● | ● | | |
| Saved book with silhouettes ("what's missing") | ●● | | | ● |
| Updates U1 / U2 on day 3 / 6 (new area, new animals) | ●● | ● | | ● |

## 6. Art and 3D direction

- **Style (TAD, CD).** "Soft-toy diorama": chunky rounded animals with big heads and eyes, faceted-but-smooth
  forms (not raw low-poly), soft rim light that reads as fur, glossy eyes with two catchlights, blush cheeks.
  The world reads as a miniature: tilt of the camera, warm against cool, big readable silhouettes. Clearly
  different from Zoo Zen's low-poly zoo with enclosures: wild nature, snow, night sky.
- **Palette.** Snow `#F4F9FF` lit / `#B9D4F2` shadow; pine `#2F6B5A` / `#1F4A43`; ice `#9FE3F5`; warm accents:
  Pip red `#E8513A`, lantern amber `#FFB347`, wood `#9A6A44`; aurora `#5CF2C7` → `#8A7DFF` → `#FF7AD9`.
  Dusk grade toward peach `#FFB08A`; night toward indigo `#1B2350`.
- **Characters.** One parametric "critter kit": shared part library (body capsule, head, snout, ears ×5 shapes,
  tails ×5, legs, flippers, wings, antlers, horns) assembled per species from a data table; vertex colours with
  baked AO; each species has idle, walk, look-at-Pip, react (heart / startle) and its special pose, all as
  code tweens on the part hierarchy (no skinned meshes). Pip: 1,600 triangles, squash-and-stretch walk, breath
  puffs, camera raise animation.
- **Environments.** Each area is a hand-laid diorama about 80 × 80 m, edges framed by tall pines and cliffs so it
  never looks empty. Instanced pines (3 shapes, ~400), rocks, snow drifts, logs, berry bushes; set dressing:
  a snowman, sled, frozen waterfall, cabin with a lit window, lanterns on poles, ice crystals in caves.
- **Lighting.** Hemisphere sky/ground light + one directional sun with a 1,024 shadow map (512 mid, blob
  shadows on low), soft PCF; sun colour and angle follow the day clock; night uses a moon light + emissive
  lanterns and crystals. Exp2 fog in pale blue for depth; aurora and stars in a sky dome shader.
- **Camera.** Third-person follow behind and above Pip: distance 9 m, pitch 0.38 rad, FOV 48 (lesson from Meteor
  Gems: at pitch 0.45 the portrait top shows fogged ground; ~0.32 to 0.38 shows sky, which the aurora needs).
  Viewfinder mode eases in over 0.35 s: camera to over-the-shoulder, FOV 48 → 34, frame brackets. Follow keeps
  Pip framed in all corners and after every cinematic (tested, §11).
- **Post-processing (by tier).** ACES filmic tone mapping (all), colour grade via lift/gamma/gain in the final
  pass (all), selective bloom only on emissive layers (aurora, lanterns, crystals, star frames) at 1/4
  resolution (mid and high), baked vertex AO (all) instead of SSAO; a soft vignette in viewfinder mode.
  Gameplay readability first: bloom never on snow or animals.

## 7. VFX (per interaction)

| Interaction | Layers |
|---|---|
| Walk | Footprint decals (pooled, fade 20 s), snow kick puffs, breath clouds, pom-pom bounce |
| Approach animal | Animal ears perk, "!" or heart icon, sparkle ring on the ground under it |
| Viewfinder in | Frame brackets snap in, focus ring tightens and turns mint when framed, 3-dot star preview |
| Pose cue | Pose icon bubble with a pop, small anticipation squash on the animal |
| Shutter | 80 ms white flash, iris close/open, tiny camera kick, chromatic edge snap (high only), click puff |
| Photo develop | Card slides out with spring, shakes, image fades in over 1.2 s, stars stamp in one by one with ring shockwaves |
| 3★ | Gold rim sweep, snowflake confetti burst, short hit-stop 80 ms |
| Card to book | Card flies on a curve with a trail into the book button, button bounces, stamp counter rolls |
| Snowflakes | Pooled flakes arc into the HUD pill, pill bumps |
| Treat toss | Arc trail, landing poof with crumbs, animal sniff then hop out of hiding |
| New species | Cinematic beat (§9), silhouette-to-colour reveal on the book page |
| Area unlock | Ice wall glows, cracks spread, shockwave, ice debris chunks (pooled), dust of snow, path lights up |
| Rare visitor | Shimmer column, sparkle trail, gold frame photo |
| Night / aurora | Aurora ribbons (sky shader), star twinkle, glowing crystals and lanterns ramp up |
| World alive | Snowfall (instanced points, 3 depths), pine wind sway (vertex shader), snow sliding off branches when Pip passes, ice crackle lines on the lake, steam (U1), birds taking off, smoke from the cabin chimney |

All particles in one pooled system (§10). Effect strengths live in `game_config.json`.

## 8. Audio (all synthesized, Web Audio, no files)

- **Music.** Cozy music box + soft pad + pizzicato at 76 BPM, pentatonic; day, dusk (warmer, slower) and night
  (celesta + aurora shimmer) layers crossfade with the clock. Ducks 40% under stings.
- **SFX.** Shutter: noise click + mechanical clack + tiny spring; develop: soft whirr and paper flick; stars:
  rising pentatonic chimes (1 to 3 notes); footsteps: filtered-noise snow crunch, pitch varies; treat: whoosh +
  plop; animal voices: formant chirps per family (squeak, hoot, honk, bleat, purr), pitch-randomized ±10%;
  area unlock: ice crack, rumble, chime chord; rare visitor: glassy shimmer; snowflake pickup: tick that rises
  with the count.
- **Mix.** Buses: music, SFX, voices, UI; limiter on master. Muted in the feed preview; the audio graph starts on
  the first gesture. Sound button always visible.

## 9. UI, HUD and FTUE

### Layout (720 × 1280 host canvas, 8 px grid)

- **Top row** (24 px margin + safe area, one shared height of 88 px, 16 px gaps, 56 px icons, 48 px numbers):
  Snowflakes pill (left), Stamps pill "12 / 72" with a book icon (centre-left), Sound button (right margin).
  **Right column** on the same margin below Sound: Book button (88 px). Nothing else on top.
- **Bottom:** Shutter 176 px (right margin, bottom margin + safe area), zoom chip 88 px stacked above it once
  unlocked; Treat button 112 px (left margin, same bottom line, centres aligned with the shutter).
- **Day clock:** a thin 8 px arc around the Stamps pill icon (sun → moon), no extra element.
- World bubbles (pose icons, "!", hearts) are clamped to stay below the top row and above the bottom buttons.
- Book: a full-screen scrapbook sheet (paper, tape, stickers), tabs per area, 4 × 2 grid of species cards with
  3 slot dots each, silhouettes for missing; Hoot's 3 requests on the first tab. Close with a big X on the
  same top margin.
- Checked with `layout.js` on 360 × 640, 390 × 844, 430 × 932 and 768 × 1024.

### Guidance (hero to goal)

A glowing paw-print trail always starts at Pip and runs toward the current goal (FTUE target, nearest
unphotographed species, today's rare visitor, or the new area gate), updating live as Pip moves. When the goal
is off screen, an edge arrow sits on Pip's side of the screen and points outward toward it. Never an arrow over
the goal pointing back.

### FTUE (mandatory spotlight)

Dim + soft cutout around the target, one icon-first hint (hand ghost, ≤ 3 words), one step at a time; each step
advances only on the real action; the cutout follows moving targets and fits every safe area; skip pill under
the top row; done steps are skipped and the finished tutorial is saved and never repeats. It never blocks
input outside the cutout for longer than the step.

1. **Walk** (cutout on Pip and the trail to the fox) → advances when Pip is within 6 m.
2. **Shutter** (cutout on the shutter once the fox is framed) → advances on a photo.
3. **Book** (cutout follows the flying card, then the Book button) → advances on opening the book; it closes
   by itself after 2 s if the kid does nothing else.
4. **Treat** (cutout on the hiding hare, then the Treat button) → advances on a toss.
5. **Pose** (cutout on the penguin's pose icon) → advances on a photo inside the pose window.
6. **New area** (at 10 stamps: cutout on the glowing ice gate, edge arrow if off screen) → advances on entry.

### Cinematic beats

First photo, first 3★, each new species (first 8 only, then only rares), half-page and page complete, area
unlock, first dusk-to-aurora, rare visitor sighting and photo. 0.6 to 2 s: camera eases to frame the moment,
brief slow motion (0.3×) or hit-stop, letterbox bars or vignette, VFX, sting, then eases back. One priority
queue with an 8 s cooldown; input never blocked; skipped if the player is mid-drag.

### Share

`lib.share` with title and text, **no image** (the host card shows the live thumbnail; house rule), offered on
a rare visitor photo, a page complete and an area unlock. Never in the first 60 s; at most once per 3 minutes.

### Languages

One string table, 7 languages (en, ar, es, vi, hi, bn, id), auto-detected, Arabic mirrored. Almost all UI is
icons; hints are ≤ 3 words.

### Astrocade feed handover

- `run('edit')`: the living valley (snowfall, animals idling, day clock running) without input or saving;
  tunables via `lib.showGameParameters`. `run('play')` may follow, and may be called more than once: init is
  idempotent, the scene is reused, not rebuilt.
- Preview is muted; the first tap in the preview walks Pip toward the tap (a visible change at once).
- Loop `dt = clamp(rawDt, 0, 0.05)` (never negative; Meteor Gems lesson).
- Save only through `lib.saveUserGameState` (no `localStorage`); save on every stamp, purchase and area unlock,
  at most once per 8 s; load validates the schema and falls back to a fresh save on a bad field.
- No `console.error` on normal paths, no external requests while running, all capabilities optional.
- Tested as `run('edit')` then `run('play')` with the intro on, on the real Astrocade draft (pulled through the
  Astrocade MCP) on a phone profile, not only locally.

## 10. Performance plan and load budget

### First load (target: playable first frame ≤ 2.0 s on a mid-range phone over 4G)

| Item | Budget |
|---|---|
| HTML + inline CSS splash | ≤ 12 KB gzip; shows a snowy gradient with Pip's silhouette and a pulsing shutter at once |
| Three.js r187 | `three.module.min.js` + `three.core.min.js` through the import map (the Meteor Gems fix: never the unminified 1.47 MB core), both `modulepreload`ed: ~130 KB brotli |
| Game code | ≤ 120 KB gzip, one bundle, no extra assets, no fonts (system rounded stack) |
| Total transfer before first frame | ≤ 280 KB |
| First frame builds | Pip, area 1 near Pip, sky, 4 animals; ≤ 150 ms of scene work at 1× CPU |
| Shaders | ≤ 12 shared programs; `compileAsync` before the first frame, capped by `quality.warmMs` |
| Deferred | Areas 2 and 3, the rest of the animals, audio graph (first gesture), book renderer, bloom targets: built in 4 ms slices per frame after the first frame |

Measured with `node tools/load-time.js prototypes/photo-safari` (4G and slow 4G, 390 × 844, 4× CPU) and reported
with every build.

### Frame (target 60 FPS, mid tier)

- Draw calls ≤ 120, triangles ≤ 150K on screen, update ≤ 3 ms, render ≤ 8 ms.
- `InstancedMesh` for pines, rocks, drifts, footprints, snowfall; shared materials (one toon-lit snow, one
  vertex-colour standard, one emissive); species parts merged per animal into one geometry and one draw call.
- Animals beyond 30 m: frozen to idle and updated at 10 Hz; beyond 55 m: hidden behind fog.
- One pooled particle system (single `Points` with a custom shader). Caps: high 800, mid 500, low 250.
- Photo capture: one reused 256 × 320 render target. Book cards re-render lazily from saved photo records (animal,
  pose, stars, camera pose, time of day), with a 24-texture LRU cache. A save stays a few KB.
- **Adaptive quality:** tier from cores, memory and touch; DPR 2 / 1.5 / 1; shadows 1,024 / 512 / blob; bloom
  on / on / off. A watchdog steps down when the 2 s average is under 50 FPS and steps up after 10 s above 58.
  All tier values in `game_config.json`.

## 11. Test plan

**Automatic, every round (quick checks only):**
- Unit tests (node, pure logic in `logic.js`): photo rating (framing box, centre, pose window, occlusion, min 1★),
  stamp and slot fill, area unlock thresholds, economy faucets and prices, daily rare visitor and requests
  deterministic by date, day clock phases, save schema validation and migration, FTUE step logic, tap-vs-drag
  classifier, guide target selection (FTUE > rare > nearest new species > gate) and arrow direction from hero.
- Bot timeline playtest: rewards at ~10, 20, 30, 40 s; page 1 half complete by 60 s; area 2 by ~4 min; first
  night by ~4.5 min; no stall in 15 min of bot play; pacing table within ±25%.
- `tools/astrocade-bundle-test.js` (sandboxed 720 × 1280, real touch): `started: true`, no errors, first tap
  changes the screen, share code found.
- Feed handover: `run('edit')` then `run('play')`, intro on; `run('play')` twice.
- `layout.js` HUD grid on 360 × 640, 390 × 844, 430 × 932, 768 × 1024.
- `tools/load-time.js` (throttled phone profile) and FPS on a mobile viewport with 4× CPU throttle (the loop
  yields every ~30 frames so SwiftShader does not fake stalls).
- `bash tools/ci-checks.sh` and `tools/astrocade-upload-set.sh` (no workflow words in the upload).

**By eye (phone-portrait JPG to `/mnt/project-files/photo-safari/` and `production/qa/evidence/photo-safari/`,
reviewed by the coordinator before anything goes to Larisha):** first frame at 300 ms; viewfinder framed; photo
develop at 0.3 s and 1.2 s; 3★ burst; book page with silhouettes; each area at day, dusk and aurora night; area
unlock beat; rare visitor; every FTUE step; Pip moved to all four corners and right after a cinematic (camera
follow check, Meteor Gems lesson); trail from Pip to an off-screen goal with the edge arrow; HUD on 4 sizes;
7 languages on the main screen.

**Full playtest** (~45 min) only before the first publish and after any pacing change.

## 12. Milestones (each a playable vertical slice)

| # | Slice | Done when |
|---|---|---|
| M1 | Valley, Pip and the first photo | Area 1 diorama, follow camera, walk (drag + tap), fox / hare / penguin with idle and pose, viewfinder, shutter, develop animation, save and load. Bundle test passes, first gesture < 1 s, first frame ≤ 2 s on the 4G profile, rating unit tests green |
| M2 | Book, juice and sound | Rating and stamps, book sheet, all 8 area-1 animals, treats, all §7 VFX for area 1, all §8 audio, HUD on the grid. Screenshots reviewed by the coordinator |
| M3 | Areas, night and dailies | Areas 2 and 3 (24 species), day clock and aurora night, lens / flash / slow shutter, shop, rare visitors, Hoot's requests and mail, area unlock beats. Bot playtest hits the pacing table |
| M4 | FTUE and ship prep | Spotlight FTUE, guidance trail and edge arrow, cinematic queue, share, 7 languages, edit mode and handover, quality tiers, load-time report, full playtest. All §11 checks green; draft uploaded to Astrocade (not published) and verified on the live draft URL on a phone |
| U1 | Launch + 3 days | Hot Springs (8 species), lantern "stay at night", 2 new rare visitors |
| U2 | Launch + 6 days | Aurora Ridge (8 species), book complete reward |
| U3 | Launch + 9 days | Snow festival: decorated valley, festival poses for all species, cabin photo wall |

Rough time: M1 to M4 about 2 working days of thread time with quick checks per round; U1 to U3 about half a day
each, ready before their dates (update boost half-life 3 days, only the first 30 days, playbook §1.2). The $100K
contest floods the feed from 30 Nov (dig §7): aim the first publish for 29 Nov or as early as M4 allows.
Larisha (or the coordinator, if she delegates) publishes; we never set the thumbnail.

## 13. Listing (Astrocade sees only the game)

- **Title:** "Snowy Snapshot" (alternatives in §1).
- **Description (draft, 133 characters):** "Sneak up on shy snow animals and catch their silliest poses! Toss
  treats, wait for the aurora night and fill your frosty photo book." Verb-led, unique; it avoids Zoo Zen's
  words ("stroll", "zoo", "low-poly", "snap photos", "wildlife album") to stay clear of description dedup.
- **Target rows:** Zen or Simulation, decided by the platform's taxonomy (no score, no fail, no leaderboard in
  v1, like Zoo Zen); Players' Choice through the score.
- Thumbnail: Larisha's job. The preview's first 2 s (Pip, a yawning fox, the shutter flash, a photo developing)
  should match whatever cover she makes.
- Remix off during the launch window.

## 14. Risks

| Risk | Size | Handling |
|---|---|---|
| Description or concept dedup against Zoo Zen | High | Different setting (wild snow valley vs zoo), different verbs (poses, treats, night), unique title and description; nothing copied |
| 24 animals × poses at full polish | High | Critter kit: one part library + data table; poses are tweens; areas 4 and 5 are updates |
| Day-0 traffic below ~10K/day | High | Not under our control (dig §7); win the first 40 s and p_sig, publish fast, updates every 3 days |
| Load time with Three.js | Medium | Meteor Gems import-map fix, deferred areas, async shader compile, splash |
| Rating feels unfair to kids | Medium | Min 1★, generous 2.0 s pose window + 0.5 s grace, pose cue icon, slow shutter unlock |
| Camera framing in portrait | Medium | Pitch 0.38, corner and post-cinematic frame tests every round |
| Night too dark on cheap screens | Low | Grade night toward indigo, not black; emissive lanterns; contrast check |
| Scope creep (cabin, multiplayer) | Low | Cabin photo wall only in U3; no multiplayer |

## 15. Decisions (the coordinator decides these per the house rule)

1. Title "Snowy Snapshot" (recommended), alternative "Frosty Lens".
2. 3D, Three.js, portrait, no PLAY screen: live start (recommended).
3. v1 = 3 areas and 24 species; areas 4 and 5 as updates U1 and U2 (recommended).
4. No leaderboard and no streak in v1; daily rare visitor and requests instead (recommended).
5. Photos stored as parameter records and re-rendered, not as images (recommended).
6. Folder `prototypes/photo-safari/`; renamed once the title is final.
