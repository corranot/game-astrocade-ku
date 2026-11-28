# Mow Mow Meadow: game plan (GDD as a modular meta-prompt)

Status: **APPROVED by the owner on 2026-11-28 07:24 UTC (title Mow Mow Meadow, all three districts in one release, Nilo as planned; main goal Players' Choice). Build in progress.**
Date: 2026-11-28. Requested by Larisha (project thread, 28 Nov 06:59 UTC).
Research behind it: `production/market/2026-11-28T0710-new-sim-dig/report.md`.
One-page summary: `prototypes/mow-mow-meadow/summary.md`. Pacing model: `prototypes/mow-mow-meadow/pace-model.py`.

How to read this file: it is written to be handed to a build thread as its brief. Modules A to D frame the work
(ROLE, CONTEXT, GOAL, CONSTRAINTS). Modules 1 to 28 are the design. Modules E to G close it (QUALITY BAR,
OUTPUT FORMAT, DONE-WHEN). Every number is a starting value that lives in `config.js`; the build tunes it with
the tests in §24, never by hand in code. "Working title" means the owner may rename it.

---

## A. ROLE

You are one combined AAA studio team, and every decision is the team's agreed best recommendation. Each
discipline speaks for its own part:

- **Direction**: game director, creative director, producer.
- **Design**: game designer (loop and feel), systems and economy designer, level and world designer, narrative
  designer, child-development and kids-UX specialist, user researcher.
- **Art**: art director, character artist, environment artist, lighting artist, VFX artist, animator, technical
  animator, tech artist, UI artist and motion designer.
- **Engineering**: technical director, gameplay programmer, graphics programmer, performance engineer.
- **Audio**: sound designer, composer.
- **Reach**: distribution lead, retention and live-ops lead, data analyst, localization lead, accessibility
  specialist.
- **Quality**: QA lead.

## B. CONTEXT

- **Platform.** Astrocade: a portrait iframe (720 x 1280 design size), mostly phones, many players are guests who
  arrive from a muted swipe feed. Platform rules and the `lib` API: `get_game_dev_guide` (pull it again before
  coding) and `ASTROCADE.md` §4 to §6.
- **Reference genre.** One More Lawn (a PC mowing simulator, Steam, 12 Nov 2026). It is a genre reference only.
  We take five mechanics: stripes that follow your driving, a live "% cut", a client receipt, a generous 90% gate
  to the next job, and a sparkle on missed grass. We take nothing else: not its name, characters, humour, art,
  levels, dashboard or music. Its adult tone has no place here.
- **Traffic (28 Nov, daily-plays proxy = gain between two row crawls).** Coverage games lead the simulator and
  tidy-up rows (Canvas Flow about 40K a day, a restoration simulator 23.5K a day on its first day), but
  single-object coverage toys never enter Players' Choice. The ones that last have a place to move through, a job
  chain, upgrades and a collection (Zombie Miner 1.21M plays, Frost Harbor, Zoo Zen, Throw Food for Animals).
  Eleven bare mowing simulators sit under 1,300 plays each: the niche is empty at the top.
- **Distribution model.** `docs/astrocade-distribution-playbook.md`: the 40 s median gate at about 200 plays, the
  day-0 stranger cohort (a play over 90 s, a second play, a return), Players' Choice score (retention x15, share
  of sessions over 300 s x10, p50, p75) from 50,000 plays.
- **Repo assets to reuse.** The chibi base character (`prototypes/chibi-base/chibi.js`, 31-bone anatomical rig),
  the six `threejs-*` skills, `tools/astrocade-bundle-test.js`, `tools/load-time.js`, `tools/lint-game.mjs`,
  `tools/ci-checks.sh`, the `astrocade-ship` skill, and the Snowy Snapshot lessons (controls, no-clip test,
  comfort report).

## C. GOAL

Build **Mow Mow Meadow**: a portrait, 3D, fully procedural (every model, texture and sound made by code, no
external asset files) Three.js mowing simulator for kids. The player rides a friendly little mower through
overgrown gardens for animal neighbours, leaves perfect stripes, finds surprises in the tall grass, and always
has one more garden waiting. It must feel alive, special and rich without glare, with every interaction
animated, and with every part of the game structured, precise and in balance with the others.

Session targets, staged and honest (see §19 for why):

| Stage | Median session (p50) | p75 | Sessions over 5 min | Measured by |
|---|---|---|---|---|
| Content test before upload | The scripted bot is still being rewarded and still has an open goal at minute 15 | | | §24 bot playtest |
| Launch gate (first 200 plays) | 90 s or more | 240 s | 20% | Creator analytics |
| Target after two tuning updates | 180 s or more | 600 s | 35% | Creator analytics |
| The owner's stretch goal | above 600 s | | above 50% | Creator analytics |

## D. CONSTRAINTS

1. **No game code before the owner's explicit yes on this plan** (CLAUDE.md, Plan Before Building).
2. **Skills on**: `leanrea`, `caveman`, `ponytail` for the whole build; load the `threejs-*` skill each task needs.
3. **Game Quality Standard** (CLAUDE.md) in full: authored-looking models, layered VFX, tweens, tasteful post,
   60 FPS on mobile, retained screenshots as evidence.
4. **Fully procedural and offline**: no image, model or audio files; Three.js and add-ons vendored in `vendor/`
   as minified modules; no network requests while running.
5. **Very fast first load**: a playable first frame within about 2 s on a mid-range phone over 4G, measured on a
   throttled profile and reported with every build (§21).
6. **Mandatory FTUE** as an interactive spotlight (§12). **HUD on a precise 8 px grid** (§17). **Guidance always
   points from the hero to the goal** (§11). **Every key moment is cinematic** through a priority queue (§13).
   **The rig follows human anatomy** (§15).
7. **Comfort (no glare)**: the limits in §16 are hard limits, checked by `glare()` on every scene.
8. **Kids-safe**: no ads, no purchases, no chat, no name entry, no external links, no personal data, no fail
   state, no timers that punish, no streaks, no scarcity tricks, no fear. Readable without text.
9. **Seven languages** including right-to-left: English, Arabic, Spanish, Vietnamese, Hindi, Bengali,
   Indonesian (§20).
10. **Share cards use the live thumbnail**: `lib.share` with a title and text, no image (§22).
11. **Thumbnails are the owner's job.** Never generate, propose or set one.
12. **One publish per round**, after every fix and the full QA of §24. A publish waits in Astrocade's manual
    review; "not live yet" is pending, never a failure, and is never re-published.
13. **Astrocade sees only the game**: nothing uploaded (files, comments in code, title, description, version
    notes) mentions our workflow, repo, tools or process. Build the upload set with
    `tools/astrocade-upload-set.sh`.
14. **Tuning values live in `config.js`**; gameplay randomness goes through the seeded `rng()`.
15. **Original work**: no name, character, level or look from any existing game.

---

## 1. Concept and fantasy

**One line.** Ride a cute little mower through wild, overgrown gardens, leave perfect stripes, and find the
friends and lost toys hiding in the tall grass.

**The fantasy.** "I drive my own machine, and I make this messy place beautiful." A child gets the two things
they are rarely allowed: a vehicle of their own and a big, visible job done entirely by them. The grass stands
taller than the mower at the start, so every garden begins as a small jungle and ends as a striped, blooming
lawn with the neighbour dancing on it.

**The world.** Clover Lane is a row of gardens that belong to animal neighbours. Each one has let the grass grow
wild and asks for help in a single picture bubble. The gardens sit side by side along one lane, so the player
drives from one job straight into the next, with no menu in between.

**The cast (all original, all built from code).**

- **Nilo**, the hero: a chibi child gardener in overalls and a straw sun hat (the chibi base with a new look).
- **Buzzy**, the mower: a rounded ride-on machine with two headlamp eyes that blink and look where it is going,
  a little chimney that puffs dandelion seeds, and a baler on the back that swells as it fills. Buzzy is a
  character, not a tool: it purrs when the Flow is high and yawns when left alone.
- **Twelve neighbours**, one per garden (§8): hedgehog, rabbit, duck, mole, squirrel, fox, sheep, goat, frog,
  owl, fawn, badger.
- **Hidden friends and lost toys** in the grass (§9).

**Tone.** Warm, sunny, funny, gentle. Nothing chases, breaks or scolds.

**Design pillars** (every later decision is checked against these):

1. *The lawn is the scoreboard.* Progress is read from the world first, from the HUD second.
2. *Something answers every second.* No input goes without sound, motion and particles.
3. *One more garden.* A session never reaches a dead end or a full stop.
4. *Rich, never loud.* Depth of light, material and motion; no glare, no clutter, no noise.
5. *A four-year-old can start, a ten-year-old can master.* One thumb to play; Flow, stripes and perfect scores
   to chase.

## 2. Target player

| | Primary | Secondary |
|---|---|---|
| Who | Children 5 to 10, on a parent's or their own phone | Teens and adults who like calm "satisfying" games |
| Reads | Little or no text, often not English | Any of the seven languages |
| Hands | One thumb, small reach, imprecise | One thumb |
| Wants | To drive, to find animals, to finish and be praised | Clean stripes, 100%, a full album |
| Leaves when | Confused in the first 5 s, punished, or made to wait | The loop stops offering something new |
| First contact | A muted, moving card in a swipe feed; a tap on it is already a play | The same |

What that means for design: the first frame is the toy and already moving; no start menu; the first tap does
something visible; every instruction is a picture; nothing is ever lost; and the game is never the one who ends
the session.

## 3. Objective and core loop

**Objective.** Tidy every garden on Clover Lane, earn stars from each neighbour, fill the Friends album and the
Lost and Found shelf, and grow Buzzy into the grandest mower on the lane.

### 3.1 Second to second (0.3 to 6 s)

1. Hold a thumb anywhere and drag: Buzzy drives that way.
2. The deck cuts the tall grass under it. Blades fall, clippings spray into the baler, the cut strip turns into
   a light or dark stripe according to the driving direction.
3. Each square metre cut plays the next note of the garden's tune and ticks the % up.
4. Fresh grass without a gap builds **Flow** (§5.3): Buzzy speeds up, the tune gains a layer, petals trail.
5. Every 6 to 10 s the grass gives something up: a friend, a toy, a coin burst, a butterfly cloud.

### 3.2 Minute to minute (20 s to 3 min)

1. Every 20 to 30 s the baler is full and pops out a **bale** with a bounce; driving over bales turns them into
   coins that fly to the coin pill.
2. The % passes 25, 50 and 75 with a small chime and a ribbon on the progress bar.
3. At **90%** the garden gate swings open (cinematic beat) and the first star is stamped. The player may leave
   or stay for 97% (two stars) and 100% (three stars); a sparkle and a dotted trail from Buzzy find the last
   patches (§11).
4. The neighbour comes out and plays on the lawn; flowers bloom across it in the order it was mown.
5. Past the gate, three **upgrade pads** wait on the lane (§6). Driving onto one buys it, and Buzzy changes
   shape on the spot.
6. The next neighbour is already waving at the next gate with a new picture bubble.

### 3.3 The session (10 to 25 min)

- A district is six gardens; each garden adds one new idea (§8), so no two jobs in a row feel the same.
- District finale: a **garden party** (the six neighbours gather, lanterns or bunting go up, fireworks made of
  petals), then the road to the next district opens.
- The album and the shelf fill; cosmetic gifts dress Nilo and Buzzy.
- At any moment the player holds at least three open goals of different lengths (§19).

### 3.4 The return (next day and after)

- **Garden of the Day**: one new garden generated from the date, with its own neighbour bubble and a gift.
  It is there every day; missing a day costs nothing and nothing counts streaks.
- **Regrowth**: gardens with fewer than three stars show a small star outline on the lane map and can be
  replayed. A replayed garden has new hiding places.
- **Album gaps**: silhouettes of friends not yet found, with the garden they live in.
- **Planned updates** on days 3, 6 and 9 after launch (§27).

## 4. Detailed rules

### 4.1 The lawn

- A garden is a rectangle of up to 40 x 40 m on a grid of **0.125 m cells**. Each cell has a type: grass, flower
  bed, path, water, solid (tree, rock, fence, shed) or outside.
- Each grass cell stores: height (tall or cut), the direction it was cut in, and a bloom timer for the finale.
- **Coverage %** = cut grass cells / all grass cells of the garden, shown as a whole number, rounded down, so
  100% is only shown when it is true.
- The cut footprint is a rectangle under the front of the mower: deck width W (§6) by 0.6 m. A cell is cut when
  its centre is inside the footprint. Cutting is continuous between frames (swept), so fast driving never leaves
  dotted gaps.
- **Edge help**: a cell within 0.2 m of a solid, a bed or the fence is cut when the footprint comes within
  0.2 m of it. Children are never asked to shave a fence line.
- **Finish help**: from 97% the footprint grows by 50% for cells in patches smaller than 0.5 m2.

### 4.2 Stripes

- Each cut cell remembers the driving direction in 16 steps. The lawn shader shades a cell light or dark from
  that direction against the light, like a real striped lawn. Stripes are judged by nobody in District 1; they
  are simply beautiful.
- From District 2, some neighbours ask for a **pattern** in their bubble (lengthwise, crosswise, diagonal or
  chequer). Matching it on 80% of the lawn earns the Style ribbon. It is optional.

### 4.3 Driving

- Speed S (§6), reached in 0.25 s, with a soft lean into turns. Releasing the thumb stops Buzzy in 0.3 s.
- Buzzy slides along solids and never stops dead on a corner. Water has a low kerb; Buzzy cannot enter it.
- Tall grass does not slow Buzzy. Nothing slows Buzzy except the player.
- **Flower beds are not grass.** Driving through one bends the flowers and throws a few petals; they stand up
  again in 2 s. Nothing is lost. A garden finished without touching a bed earns the Gentle ribbon.

### 4.4 Stars, ribbons and the gate

| Reward | Rule | Effect |
|---|---|---|
| Star 1 | 90% | Gate opens, next garden unlocked |
| Star 2 | 97% | Tip x1.5 |
| Star 3 | 100% | Tip x2, the garden's gold leaf in the album |
| Gentle ribbon | No flower bed touched | Sticker |
| Style ribbon | Pattern matched on 80% (District 2 on) | Sticker |
| Flow ribbon | Flow held full for 20 s in one go | Sticker |

There is no fail, no timer and no score that goes down.

### 4.5 Edge cases

- The player leaves through the gate below 97%: the garden keeps its % and stars; it can be finished later.
- The player drives back into a finished garden: it stays finished; Buzzy can still draw stripes for fun.
- A bale left behind when the player leaves a garden is collected automatically with a coin trail.
- All finds are placed in grass cells, never under solids, and at least 2 m from the start.
- A garden where the last cells are unreachable must not exist: a generator test floods from the start cell
  with the smallest deck and requires 100% of grass cells reachable (§24).
- Loss of focus or a second finger: Buzzy stops; a resumed touch continues. A second `run()` call or a late
  save follows `ASTROCADE.md` §6.
- Reduced-motion setting: Flow speed-up stays, camera effects and shakes are off (§20).

## 5. Systems and formulas

All symbols are config keys.

### 5.1 Cutting rate

`rate = W x S x eff x flowSpeed` (m2 per second), where `eff` is how much of the deck meets fresh grass. A
careful player reaches eff 0.8; the pacing model uses 0.65; a wandering small child about 0.4.

### 5.2 Coins

- **Clippings**: 1 coin per m2 cut, paid when the bale is collected. Bale size B (§6) is how many m2 one bale
  holds. Bales pay `B x flowBonus`, where `flowBonus` is 1.0 to 1.5 by the average Flow while it filled.
- **Tip** at each new star: `area x 0.25 x starFactor` (1, 1.5, 2), paid once per star per garden.
- **Finds**: a coin burst pays `6 + 2 x gardenNumber`.
- Coins are only ever added. Prices are shown as a number beside an icon.

### 5.3 Flow

- Flow is a value from 0 to 1 shown as a ring of petals under Buzzy (in the world, not in the HUD).
- It rises by `0.25` per second while at least 60% of the footprint meets tall grass, and falls by `0.5` per
  second after 1.2 s on cut grass or standing still.
- Effects at full Flow: speed x1.15, bale value up to x1.5, the tune gains its top layer, a petal trail, Buzzy
  purrs. Flow never drops below 0 and losing it costs nothing but the bonus.
- Purpose: one-thumb mastery. It rewards planning a path (long passes, tidy turns) without a single extra button.

### 5.4 The reward clock

Checked by the bot test (§24). Starting values:

| Period | Reward | Source |
|---|---|---|
| Every frame | Blades fall, clippings spray, engine pitch, lean | Driving |
| 0.3 to 0.6 s | A note of the tune, the % ring creeps | Each m2 cut |
| 6 to 10 s | A find | Hidden items per garden = area / 14, minimum 5 |
| 20 to 30 s | A bale pops | B |
| 30 to 45 s | A % milestone (25, 50, 75) | Garden size |
| 1 to 3 min | Gate opens, star, neighbour comes out | 90% |
| 1.5 to 3 min | An upgrade bought, Buzzy changes | Prices in §6 |
| 6 to 9 min | District finale party | Six gardens |

Rule: never more than **6 s** without a reward and never more than **25 s** without a new stimulus (a kind of
thing not seen in the last 25 s).

## 6. Progression, upgrades and economy

### 6.1 The three upgrades (ten levels each, level 0 to 9)

| Upgrade | What changes on screen | Level 0 | Level 9 | Price of level n+1 |
|---|---|---|---|---|
| **Deck** (width W) | The deck visibly widens; from level 5 it grows side wings | 1.20 m | 2.40 m | 50 x 1.72^n |
| **Engine** (speed S) | Bigger chimney, faster puffs, a second headlamp ring | 3.0 m/s | 4.8 m/s | 40 x 1.72^n |
| **Baler** (bale size B and pickup reach) | The baler grows; bales get bigger and rounder; reach 1.5 m to 4 m | 30 m2 | 192 m2 | 30 x 1.72^n |

Prices rounded to 5: Deck 50, 85, 150, 255, 440, 755, 1295, 2225, 3830. Engine 40, 70, 120, 205, 350, 600,
1035, 1780, 3065. Baler 30, 50, 90, 155, 265, 450, 775, 1335, 2300.

**Where upgrades are bought.** On the lane after every gate stand three low pads, one per upgrade, each showing
its icon, its level as pips and its price. An affordable pad glows softly and bobs. Driving onto it and staying
0.6 s (a ring fills) buys it: a workshop cloud covers Buzzy for 0.8 s and it drives out changed (cinematic beat
on the first purchase only). The same three choices are behind the workshop button in the HUD (§17) for players
who want it mid-garden. No pad ever blocks the way to the next gate.

### 6.2 Other things coins buy

| Sink | Price | Unlock |
|---|---|---|
| Paint for Buzzy (8 two-tone schemes) | 150 to 900 | From garden 3 |
| Stripe tint (6: classic, mint, clover, gold-tip, lilac, sunset) | 200 to 800 | From garden 5 |
| Petal trail kind (6) | 200 to 800 | From garden 7 |
| Garden gifts for neighbours (a bench, a birdbath, lantern posts: stay in that garden for good) | 300 to 1500 | From garden 6 |

Hats and outfits for Nilo are **found**, never bought: one gift box in each garden (§9).

### 6.3 Pacing table, minutes 0 to 15 and beyond

From `pace-model.py` (a greedy bot that stops at two stars, eff 0.65, Flow x1.15, buys the cheapest upgrade it
can afford). A real child is slower and wanders; a perfectionist stays 30 to 60 s longer per garden. The
build replaces this model with the real bot of §24 and retunes.

| Minute (end of garden) | Garden, area | Job time | Coins earned | Upgrades bought after it | New this garden |
|---|---|---|---|---|---|
| 0.0 | | | | | First frame: Buzzy already cutting in the feed card |
| 0.7 | 1 Hedgehog's Patch, 60 m2 | 30 s | 96 | Baler 1, Engine 1 | Drive, cut, first bale, first friend, gate. No card |
| 1.7 | 2 Rabbit's Yard, 110 m2 | 46 s | 172 | Baler 2, Deck 1, Engine 2 | Upgrade pads, the first receipt, flower beds |
| 3.0 | 3 Duck's Pond Garden, 170 m2 | 63 s | 262 | Deck 2, Baler 3 | Pond and curves, ducklings follow Buzzy, paint shop |
| 4.5 | 4 Mole's Hills, 240 m2 | 77 s | 367 | Engine 3, Deck 3, Baler 4 | Molehills that pop toys, gentle bumps |
| 6.2 | 5 Squirrel's Orchard, 320 m2 | 87 s | 486 | Engine 4, Deck 4 | Trees, falling apples to catch, stripe tints |
| 8.0 | 6 Fox's Maze Meadow, 400 m2 | 95 s | 606 | Baler 5, Engine 5 | Extra-tall grass maze, **District 1 party** |
| 9.9 | 7 Sheep's Slope, 480 m2 | 106 s | 726 | Deck 5 (side wings) | District 2: pattern bubbles, sheep that follow |
| 12.0 | 8 Goat's Terrace, 560 m2 | 114 s | 845 | Baler 6, Engine 6 | Terraces and ramps, windmill shadow |
| 14.2 | 9 Frog's Sprinkler Lawn, 640 m2 | 122 s | 965 | Deck 6 | Sprinklers: wet grass sparkles, rainbows |
| 16.6 | 10 Owl's Lantern Lawn, 740 m2 | 131 s | 1114 | Baler 7 | District 3 at dusk: headlamps, fireflies |
| 19.3 | 11 Fawn's Glade, 860 m2 | 150 s | 1292 | Engine 7 | Mushroom rings, glowing night flowers |
| 22.3 | 12 Badger's Grand Lawn, 1000 m2 | 166 s | 1500 | Deck 7 | The grand lawn, **Lantern Lake party** |
| 22+ | Garden of the Day, three-star replays, levels 8 and 9, gifts | | | | Endless |

Balance rules the tests enforce: an upgrade is affordable after every garden up to garden 12; no upgrade is
ever more than 2.5 gardens away; a player who never buys anything can still finish every garden (it only takes
longer); a job never exceeds 180 s at two stars for the model bot.

## 7. World and level structure

- **One continuous lane per district.** Gardens are plots on both sides of a winding lane; a gate joins each
  garden to the lane. Only the current garden, the lane piece and the next garden's front are fully detailed;
  the rest are simple far versions (§21).
- **Three districts at launch**, each with its own time of day, palette, plants and music key:
  1. **Clover Lane**, fresh morning: picket fences, apple trees, daisies, laundry lines.
  2. **Windmill Hill**, golden afternoon: stone walls, terraces, a turning windmill, sunflowers, sheep.
  3. **Lantern Lake**, dusk: paper lanterns, willows, fireflies, glowing mushrooms, a still lake.
- **Lane map**: a button opens a picture of the lane with each garden as a round badge with its stars. Tapping
  one drives Buzzy there in a short wipe (leaves sweep across the screen). No world map menus beyond this.

### 7.1 Garden generator

Each garden is built from a seed and a recipe in `config.js`:

1. Outline (rectangle, L, or rounded) and size from the recipe.
2. Solids: house wall side, shed, trees, rocks; then beds, paths, pond; all from the district kit.
3. The garden's special feature (§8).
4. Grass types: normal, clover patches, wildflower tufts, and a few extra-tall clumps that hide finds.
5. Finds placed by the seeded `rng()` with minimum spacing, the gift box in the far third.
6. Validation: 100% of grass reachable by the smallest deck; start and gate clear; no find under a solid.

Gardens 1 to 12 use fixed seeds chosen by hand from generated candidates, so the first experience is authored.
The Garden of the Day uses the date as seed and rotates the district kits.

## 8. Gardens and their one new idea

| # | Neighbour | New idea | What it teaches or adds |
|---|---|---|---|
| 1 | Hedgehog | A tiny patch, grass taller than Buzzy | The whole loop in 30 s |
| 2 | Rabbit | Flower beds, upgrade pads | Steering around things; buying |
| 3 | Duck | A pond with a curved edge; ducklings follow in a line | Curved stripes; a parade behind you |
| 4 | Mole | Molehills: bump one and a toy pops out | Looking for things on purpose |
| 5 | Squirrel | Orchard trees drop apples when brushed; catch them for coins | Play around obstacles |
| 6 | Fox | A maze cut into extra-tall grass; the player cuts their own way through | Mystery and discovery; the party |
| 7 | Sheep | Pattern bubble (lengthwise); sheep trot after Buzzy and munch the edges | Stripes as a goal |
| 8 | Goat | Terraces joined by ramps | Height and views |
| 9 | Frog | Sprinklers turn in arcs; wet grass sparkles and pays +25% | Timing, gently |
| 10 | Owl | Dusk; Buzzy's headlamps light the grass; fireflies rise from each cut | Light as a toy |
| 11 | Fawn | Mushroom rings that chime in sequence when circled | Music play |
| 12 | Badger | The grand lawn: chequer pattern bubble, a fountain, everything together | Mastery; the party |

## 9. Collections

- **Friends album (24).** Twelve neighbours join when their garden gets its first star. Twelve small friends
  hide in the grass: ladybird, snail, butterfly (3 kinds), frog, field mouse, cricket, bumblebee, dragonfly,
  caterpillar, firefly. A found friend pops out, does a happy turn, and from then on rides on Buzzy's bonnet or
  flutters beside it (up to three at once, chosen in the album).
- **Lost and Found shelf (36).** Toys and treasures lost in the gardens: a ball, a kite, a toy boat, a spinning
  top, a teacup, a boot, a watering can, marbles, a tiny crown and more, six per pair of gardens. Each garden
  shows how many it still hides. Golden versions (1 in 12) trigger a rare-find beat.
- **Wardrobe (12 looks).** One gift box per garden: a hat or outfit for Nilo or a bonnet ornament for Buzzy.
  The gift is fixed per garden, visible as a silhouette on the lane map. No random draws.
- **Stickers.** Ribbons (Gentle, Style, Flow) per garden fill a sticker page.

The album button shows a small dot when something new is inside. Opening the album never pauses the world for
more than the sheet's own slide.

## 10. Controls (one thumb, portrait)

| Input | Action |
|---|---|
| Touch and drag anywhere below the top HUD band | A soft floating stick appears under the thumb. Buzzy drives in the dragged direction on screen. Distance from the first touch sets speed up to full at 48 px |
| Release | Buzzy stops |
| Tap Buzzy | Honk: nearby friends jump, the neighbour waves (pure toy) |
| Tap a friend, a toy or the gift box | Collect it early, with a hop |
| Tap a HUD button | Opens that sheet |
| Keyboard | WASD or arrows drive, Space honks, M mute, Tab album |
| Mouse | Hold and drag drives, click taps |

- The screen-space direction equals the world direction because the camera never turns (§11). Up is always
  "away".
- No second stick, no camera control, no action button: one thumb plays the whole game.
- Dead zone 6 px; input buffer 120 ms; the stick re-centres if the thumb drifts more than 96 px, so a small
  hand never runs out of reach.
- Touch handlers let events reach `document` (the platform counts gestures there). A second finger never
  steals or breaks the first.
- The first frame shows a ghost thumb sliding on the grass in front of Buzzy (the FTUE's first step).

## 11. Camera and guidance

### 11.1 Camera

- A fixed-direction 3/4 follow camera: pitch 50 degrees, field of view 38 degrees, no rotation ever.
- Buzzy sits at 58% of the screen height from the top, with 1.5 m of look-ahead in the driving direction, eased
  over 0.4 s.
- Distance grows with deck width and speed (9 m at level 0 to 13 m at level 9) and pulls back 10% at full Flow.
- Framing rule from our own lessons: at this pitch the top of a portrait frame is far ground, not sky. The top
  20% of the frame is therefore composed on purpose: the garden's back fence, trees and the house, then two
  layers of hills in soft haze. It must never be empty fog.
- The camera never enters an object: tall things near the camera fade to 25% (dither), and the camera is tested
  at the four far corners of every garden with Buzzy in frame (§24).
- Cinematic beats borrow the camera (§13) and always return it within the beat time.

### 11.2 Guidance: always from the hero to the goal

- **Missed grass**: after 4 s without progress above 85%, the nearest uncut patch sparkles, and a dotted petal
  trail runs **from Buzzy to that patch**, redrawn as Buzzy moves.
- **Gate, pads, gift box when off screen**: a small arrow on Buzzy's side of the screen edge, pointing from
  Buzzy toward the target. Never an arrow hanging over the target pointing down at it.
- **Next garden**: the lane lights up with stepping petals from Buzzy to the next gate.
- One guide at a time, by priority: FTUE target, missed grass above 90%, open gate, affordable pad.

## 12. FTUE: the interactive spotlight

The screen dims to 55% except a soft-edged cutout around the current target; an icon-first hint (a moving ghost
thumb or a pulsing ring) sits beside it. A step ends when the player does the real thing. The cutout follows
moving targets every frame, respects safe areas, and never blocks input anywhere (the dim layer ignores
touches). Steps already done are skipped. A small skip button (an X in a 40 px circle) sits in the top right
during the FTUE. Completion is saved and never repeats.

| Step | Target in the spotlight | Hint | Ends when |
|---|---|---|---|
| 1 Drive | Buzzy and 2 m of grass ahead | Ghost thumb drags upward | Buzzy has moved 2 m |
| 2 Cut | A tall clump ahead | Sparkle on the clump | 10% cut |
| 3 Bale | The first bale (forced at 15 m2) | Ring pulses on the bale | Bale collected |
| 4 Friend | The first friend (forced: a ladybird at about 40%) | Ring on the wiggling grass | Friend collected |
| 5 Gate | The open gate, with a trail from Buzzy | Petal trail | Buzzy passes the gate |
| 6 Upgrade | The affordable pad in garden 2's lane | Ring on the pad with the coin icon | An upgrade is bought |
| 7 Album | The album button, when the dot first shows | Ring on the button | The album is opened |

Steps 1 to 5 fit inside garden 1 (about 30 to 45 s). The FTUE is the game: no step stops the action.

## 13. Cinematic key moments

A director module owns the camera for short beats through a priority queue with a 20 s cooldown between beats
of the same priority and never more than one at a time. Input is never blocked: Buzzy keeps driving and any
drag over 24 px hands the camera back at once. Each beat: ease to a framing, a short slow-motion or hit-stop,
letterbox bars or a soft vignette, a VFX burst and an audio sting, then ease back.

| Beat | Priority | Length | Framing and effects |
|---|---|---|---|
| First bale ever | 2 | 0.8 s | Push in on the bale's bounce, 60 ms hit-stop, coin fan |
| Friend found | 2 | 0.9 s | Push in on the friend's happy turn, sparkle ring, squeak |
| Gate opens at 90% | 3 | 1.2 s | Glide to the gate swinging, bars in, the neighbour's door opens |
| Three stars, 100% | 4 | 1.8 s | Rise to a top view of the whole striped lawn, 0.4 s at half speed, stars stamp in |
| Upgrade bought (first of each kind, and levels 5 and 9) | 3 | 1.2 s | Low angle on Buzzy leaving the workshop cloud, a proud shake |
| Rare golden find | 4 | 1.4 s | Orbit a quarter turn, gold dust column |
| Gift box opened | 3 | 1.2 s | Nilo holds the hat up (anatomical reach pose), puts it on |
| District party | 5 | 2.0 s, then free roam inside the party | Crane up over the lane, petal fireworks, all six neighbours |
| Garden finale timelapse | 3 | 1.6 s | See §14 |

With reduced motion on: no camera travel, a vignette and the sting only.

## 14. The receipt and the finale (the "one more" moment)

- **Garden 1 has no card at all.** The fence drops, a stamp pops beside the gate, and the lane continues. Our
  rule: no card, menu or stop before second 60.
- From garden 2, reaching the gate with at least one star starts the **finale**: the camera rises for 1.6 s
  while flowers bloom across the lawn in the order it was mown (a fast replay of the player's own path, drawn
  from the cut order). The neighbour runs out and plays.
- The **receipt** is a small paper card that slides into the top third (never the centre, never over Buzzy):
  the neighbour's face, the % in big digits, up to three stars stamped one by one, ribbons, and the tip counting
  into the coin pill. It needs no tap. It folds away by itself after 3 s or at once when the player drives.
- A share button sits on the receipt when three stars are earned (§22).
- While the receipt is up, the next neighbour is already waving at the next gate, the trail from Buzzy points
  there, and the upgrade pads glow. The player is never asked "play again?": the next thing is simply in view.

## 15. Characters: models, rig and animation

### 15.1 Nilo (hero), on the chibi base

- `buildChibi(look)` from `prototypes/chibi-base/chibi.js`, default `build: 'chibi'` (head about 40% of the
  height). Look: warm skin, blush, short hair, cream top, denim-blue overalls (top and bottom colours plus a
  bib piece), yellow boots, garden gloves on the mittens.
- **New look pieces to add to the module** (built like the existing beanie and coat): a woven straw sun hat with
  a ribbon, an overall bib with two buttons, and eleven gift looks (a flower crown, a bee cap, a raincoat and
  rain hat, a pirate bandana, a knitted bear hood, a little crown and others).
- **Rig**: the 31-bone anatomical skeleton, unchanged: pelvis, three spine bones, neck, head, clavicles,
  shoulders, elbows with forearm twist, wrists, two-joint thumbs, finger mass, hips, knees, ankles, toes;
  `clampToLimits` every frame.
- **Seated driving pose** (new, the main pose): hips flexed about 85 degrees, knees about 80, feet on the foot
  plate, spine upright with a small lean into turns, both hands on the wheel with the forearm twist doing the
  pronation and the wrists only flexing and deviating. The wheel turns up to 40 degrees and the hands follow it
  by simple two-bone IK inside the joint limits.
- **Stress poses to render and check before the rig ships in this game**: seated straight, full left and right
  lock, lean at full Flow, wave from the seat, cheer (the V, as the chibi's reach allows), reach to hold up a
  gift, look around, hop off and stand, plus the base set (arms up, squat, reach). Check hand, thumb and sleeve
  close-ups in each; no mitten through the wheel, hat through the seat back, or knee through the bonnet.
- Build cost: about 130 to 170 ms on a throttled phone. Build after the first frame if the load budget needs it
  (§21): in the first frame Nilo is hidden behind the tall grass beside Buzzy and hops on in the first half
  second.

### 15.2 Buzzy (the mower)

Built from lathed and extruded profiles with bevels, never raw boxes: a pill-shaped body in two-tone enamel
(teal and cream by default), a domed bonnet with two round headlamps (eyes with lids and a moving glint), a
short chimney, a padded seat with stitching, a small steering wheel, four fat rubber tyres with tread and
cream hubs, the cutting deck with a rounded skirt and a spinning disc seen through a slot, the clippings chute,
and the baler drum at the back. About 6k triangles, 6 draw calls with shared materials.

Animation: body bobs on its springs with speed; lean into turns (up to 8 degrees); tyres squash on bumps;
eyes look toward the driving direction and blink; chimney puffs in rhythm with the engine; the baler swells
from 0.8 to 1.15 as it fills, then snaps back when the bale pops; a shiver of delight at full Flow; a yawn and
drooping lids after 6 s idle.

### 15.3 Neighbours and small friends

- Twelve neighbours share one soft "toy animal" body family: a lathed body, a head with the same big glossy
  eyes as Nilo, species ears, snout, tail and markings, on a light 9-bone rig (pelvis, spine, head, four limbs,
  tail, ears). Standing height 0.8 to 1.2 m. About 2.5k triangles each; only the current and next neighbour are
  in the scene.
- Shared animation set: idle (breathing, ear flicks), wave, point at the bubble, cheer, run out, dance on the
  lawn (three variants), sleep on the porch at dusk.
- Small friends are single meshes with vertex-shader motion (wing flap, crawl, hop), instanced.

### 15.4 Animation list (complete)

| Subject | Animations |
|---|---|
| Nilo | Seated idle, steer left/right (blend), lean, bump, wave, cheer, look at find, hold up gift, put on hat, hop on, hop off, blink, breathing |
| Buzzy | Bob, lean, tyre squash, eye look and blink, puff, baler swell and pop, deck spin, delight shiver, yawn, workshop exit shake, honk squash |
| Neighbour | Idle, wave, point, cheer, run out, three dances, porch sleep |
| Friends | Pop out, happy turn, ride on bonnet, flutter beside, jump at honk |
| Grass | Wind sway (two frequencies), bend away from Buzzy's body, fall on cut, clump wiggle over a hidden find |
| World | Tree sway, leaf fall, laundry flap, windmill turn, water ripple, cloud shadows, butterflies and birds on paths, smoke from chimneys, lantern swing, fireflies |
| UI | See §17.4 |

## 16. Art direction, lighting and post (rich, never glaring)

### 16.1 Style

"A sunny toy garden": soft, rounded, slightly oversized forms; enamel, rubber, felt, painted wood and lush
plants; everything looks touchable. Shapes come from profiles (lathe, extrude, bevel, bend), not from bare
boxes, spheres and cones. Every prop has at least a secondary form (a rim, a seam, a cap, a moulding) and a
material break.

### 16.2 Palette

| Role | Colour | Use |
|---|---|---|
| Tall grass | deep green #2F7D32 to tip #7BC24A | Uncut lawn |
| Cut lawn light / dark stripe | #8FD05A / #6DB647 | Stripes differ by lightness (about 12%), not hue |
| Hero accent | teal #2BB3A3 and cream #FFF1D6 | Buzzy; nothing else in the world uses this teal |
| Warm accent | sunflower #F6B93B, coral #F47C5D | Coins, flowers, gifts |
| Cool shadow | blue-violet #5B6FB5 at low strength | Shadow tint, never grey or black |
| Wood and stone | #B98A5E, #C9C2B4 | Fences, paths, walls |

Value plan: the lawn sits in the middle values; Buzzy and Nilo are the lightest and most saturated things on
screen; the HUD uses cream panels with dark teal text. No pure white and no pure black anywhere in the world.

### 16.3 Materials (one shared kit)

Six shared materials for the whole world, each a tuned standard material with small shader additions: enamel
(soft clearcoat-like highlight), rubber, felt and fur (rim fuzz), painted wood (procedural grain in the
shader), foliage (wrap lighting and a little light through the leaf), and water (animated normals, soft edge
foam). Procedural detail comes from tiny generated textures (noise, grain, weave) built at start in a canvas,
each 64 or 128 px, shared by all.

### 16.4 The grass (the star of the show)

- One **mask texture** per garden (one texel per 0.125 m cell) holds height, cut direction and bloom timer. It
  is the single source of truth for the look, the % and the save.
- **Blades**: one instanced mesh of tapered, slightly curved blades (three segments), placed by the seeded
  `rng()`. The vertex shader reads the mask to set each blade's height (tall, or cut and tilted along the cut
  direction), sways it in the wind, and bends it away from Buzzy. Tip-to-root colour gradient, a little light
  through the tips, soft shadow from the sun.
- **Ground**: a lawn shader under the blades draws the same stripes from the same mask, so the lawn still looks
  right at low blade counts and at a distance.
- **Cut edge**: a thin darker band and a few fallen blades along the border between tall and cut.
- **Extras**: clover patches, daisies and wildflower tufts as instanced cards that are cut like grass (they
  burst into petals); they come back as blooms in the finale.

### 16.5 Environment kit per district

Each built once from profiles and instanced: picket fence, gate, stone wall, hedge, apple tree, willow,
sunflower, flower bed (six flower kinds), pond with reeds and lily pads, shed, cottage front with porch and
door, bench, birdbath, laundry line, mailbox, lamp post, lantern string, windmill, terrace wall and ramp,
sprinkler, fountain, mushroom ring, rocks, molehill, stepping-stone path. Far layers: neighbouring gardens as
simple blocks of colour with trees, then two hill bands.

### 16.6 Lighting

- One warm directional sun with a single soft shadow map (1024 on high), fitted to the camera's view, updated
  every second frame. A hemisphere light (sky above, bounced green below). No other real-time lights, except
  Buzzy's headlamps in District 3: two small spot cones done in the grass and ground shaders, not as real
  lights.
- Per district: morning (sun 35 degrees, cool shadows), golden afternoon (sun 22 degrees, long shadows, warm
  rim), dusk (sun under the hills, sky glow, lanterns and fireflies as emissive points with a soft glow).
- Cloud shadows drift slowly across the lawn. Contact shadows under small things are soft blobs.
- Ambient occlusion: baked into vertex colours for props and the grass root gradient. Screen-space AO at half
  resolution only on the high tier.

### 16.7 Post-processing

In order: selective bloom (only emissive sparkles, lanterns, fireflies and coin glints; threshold above the
brightest lit surface so sunlit enamel never blooms), tone mapping (a filmic curve, exposure 0.92), colour
grading (gentle lift, gamma, gain per district, a little more saturation in the mid-tones), a coloured vignette
at 0.10 or less, and anti-aliasing. All levels are config values and step down with the quality tier.

### 16.8 Comfort limits (hard limits, measured with `glare()` on every scene and every beat)

| Limit | Value |
|---|---|
| Near-white pixels (all channels above 245) | 1.5% of the frame or less |
| Bright pixels (luma above 200) | 12% or less |
| Mean luma | 165 or less; dusk scenes 60 or more, so nothing is murky |
| Full-screen flashes | None. Feedback uses a coloured vignette at 0.12 or less |
| Additive effects | Small and short; no large additive sheets |
| Flicker | Nothing blinks faster than once a second; nothing strobes |
| Camera shake | 6 px at most, decaying, off with reduced motion |
| Water and enamel highlights | Clamped below the bloom threshold |

## 17. UI and HUD

### 17.1 Principles

Icon first, numbers second, words last. Cream paper panels with rounded corners, dark teal ink, coral for the
one thing to press. The HUD looks like part of the garden's stationery (seed packets, plant labels, stamped
paper), not like a website. Nothing sits in the bottom half of the screen during play: that is the thumb's.

### 17.2 Grid (design size 720 x 1280, scaled; checked at 360 x 640, 390 x 844, 430 x 932 and 768 x 1024)

- One spacing unit: **8 px**. Safe-area margin: **16 px** on all sides, added to the device's safe insets.
- One height for every pill and button: **40 px** (48 px touch target with invisible padding). One corner
  radius: 20 px. Gaps between HUD items: 8 px. Icons: 24 px. Numbers: one size, tabular digits.
- **Top row**, centres on one line, 16 px below the safe top:
  - left: the **coin pill** (coin icon, number), left edge on the margin;
  - centre: the **progress pill** (a bar with three star ticks at 90, 97 and 100, the % in digits at its right
    end), centred on the screen;
  - right: a column of **two square buttons** on the right margin: album (book icon) and workshop (spanner
    icon); below them, 8 px apart, mute. All three share the same right edge.
- **Second row** (only when needed, 8 px under the top row, centred): the neighbour's request chip (face,
  pattern icon) for 3 s at garden start, then it folds into the progress pill as a small face.
- World bubbles, trails and arrows are clipped to stay below the top band and are never drawn under a HUD item.
- Right-to-left languages mirror the row (coins right, buttons left); digits stay left-to-right.
- A tablet keeps the same sizes and margins; the row does not stretch beyond 560 px wide and stays centred.

### 17.3 Screens and flow

There is no title screen and no start menu. The game opens in play.

| Screen | How it opens | What it holds |
|---|---|---|
| Play | Always | The HUD above |
| Receipt | Finale (from garden 2) | §14; top third, closes itself |
| Album sheet | Album button | Three tabs as icons: Friends, Lost and Found, Stickers; a bottom sheet up to 70% of the height; the world keeps moving above it |
| Workshop sheet | Workshop button | The three upgrades as cards with pips and prices; paint, tints and trails as swatches |
| Lane map | Map icon inside the album sheet header, and at the lane's signpost | The district lanes with badges and stars; Garden of the Day badge |
| Settings | Long row inside the workshop sheet | Sound, music, reduced motion, language (auto, with flags as icons), left-hand mirror, reset tutorial |
| Welcome back | On return with a save | No screen: Buzzy starts in the saved garden, a small "welcome" wave from the neighbour |

### 17.4 Motion

Every panel arrives with a 220 ms spring and leaves in 160 ms. Numbers count up with a tick sound. Coins fly
along curves from the world into the coin pill, which bumps once per batch. Stars stamp with a squash and a
puff of ink. Buttons press down 2 px with a soft click. The progress bar fills smoothly and flashes its star
tick in coral, never white. No animation lasts longer than 600 ms except the receipt's stamps.

## 18. VFX and transition catalogue

Each gameplay effect is layered in five beats (anticipation, impact, burst, trail, settle), pooled, and scaled
by the quality tier (§21). Colours come from the palette; no effect uses pure white.

| Event | Layers |
|---|---|
| Cutting (continuous) | Blades fall and tumble (instanced), a clippings arc into the baler, a fine green mist at the deck edge, a light or dark stripe revealed, blades at the border bend |
| Wildflower cut | Petal burst in the flower's colour, two petals float up and drift |
| Flow rising and full | Petal ring under Buzzy fills; at full a ribbon trail of petals from the rear tyres, tiny sparkles on the deck rim, speed lines of leaves at the screen edge (soft) |
| Bale pop | Baler squeeze (anticipation), pop with a ring of dust, the bale bounces twice with squash, straw bits settle |
| Bale collected | Coin fan, coins curve to the pill, a +N in ink above the bale |
| Find: friend | Grass wiggle (anticipation), leaf burst, sparkle ring, the friend's hop arc with a short trail |
| Find: toy | Dust puff, the toy flips up with a spin trail and lands on Buzzy's bonnet for a second before flying to the shelf icon |
| Rare golden find | Gold dust column, slow rising motes, a soft shockwave ring across the grass (blades bow outward) |
| Molehill bump | Earth crumbs, a spring pop, the toy launches |
| Apples falling | Leaf shake, apples drop with squash, a juicy splash if they hit the pond |
| Flower bed touched | Flowers bow, six petals lift, a soft "oops" puff; flowers spring back |
| % milestone | A ribbon unrolls along the progress bar, a ring pulses once around Buzzy |
| Gate opens | Latch sparkle, swing with dust at the hinge, bunting drops into place, petals blow through |
| Star stamp | Ink squash, ink flecks, paper ripple |
| Finale bloom | A wave of flowers opens across the lawn along the mown path, butterflies arrive, light warms a little |
| Upgrade bought | Workshop cloud (soft, swirling, with spanner and bolt silhouettes), a ring shockwave on the ground, Buzzy drives out with a gleam sweep across the enamel |
| Sprinkler | Arcing droplets, a small rainbow, wet grass sparkles for 8 s |
| Dusk cutting | Fireflies rise from each cut metre and drift to the lanterns |
| District party | Petal fireworks (bursts of petals, not light), lantern or bunting strings rising, confetti leaves |
| Honk | A ring of rounded sound waves, nearby grass bows, friends jump |
| Environment reactions | Grass parts around Buzzy, butterflies scatter and return, birds take off from the fence, ducklings splash, laundry flutters when Buzzy passes |

**Transitions**

| Transition | Design |
|---|---|
| First frame | The feed card is the game: Buzzy idles on tall grass, a ghost thumb slides. On the first touch the dim lifts in 200 ms |
| Garden to lane to garden | No cut: the fence drops, Buzzy drives through, the next garden's grass rises from flat to tall in a wave as it comes into view |
| Lane map travel | A sweep of leaves wipes across the screen (600 ms) and uncovers the target garden |
| District change | The road passes under an arch; the time of day blends over 3 s as Buzzy drives (sun angle, sky, grading) |
| Sheets | Slide up with a paper rustle; the world behind blurs slightly and dims to 80% |
| Welcome back | A slow push-in from a wide view of the saved garden to the play framing in 1.2 s; input works from the first frame |
| Feed handover (`run('edit')` then `run('play')`) | The same scene continues without a reset; time step clamped to 0 or more |

## 19. Retention and session-length design

### 19.1 The honest frame

No game in our data has a 10-minute median. Our best is 119 s; the platform prior is that 27% of first plays
pass 90 s. A median counts everyone, including the visitor who swipes away after 15 s. So the plan does two
separate jobs: (a) lose as few players as possible in the first 40 s, and (b) make sure nobody who stays ever
meets a reason to stop before minute 15. The staged targets are in module C.

### 19.2 Job (a): the first 40 seconds

| Second | What happens |
|---|---|
| 0 | First frame within the load budget: tall grass, Buzzy with its eyes on the player, a ghost thumb. Something is already moving (wind, puffs, a butterfly) |
| 0 to 1 | Any touch drives. The first tap or drag cuts grass with sound and particles |
| 3 | The first clump gives a coin burst |
| 10 | 25% ribbon; the first bale pops (forced early) |
| 20 | The first friend pops out and rides on the bonnet |
| 30 | 75% ribbon; the tune has gained two layers |
| 35 to 45 | 90%: the gate swings open, the first star stamps, the next garden rises into view |
| 60 | The player is in garden 2 and is offered the first upgrade. No card has appeared yet |

### 19.3 Job (b): no reason to stop

1. **No exit doors.** No "level complete" screen, no "play again?", no menu between jobs. The receipt is a
   paper slip that needs no tap.
2. **Overlapping open goals.** At every moment the player holds a goal measured in seconds (this stripe, this
   bale), one in minutes (this garden's star, the next upgrade), and one in tens of minutes (the district
   party, the album page). The game never lets all three finish at once: the pacing tests assert that when one
   closes, the others are between 30% and 90% done.
3. **Near-complete pulls.** After each garden, at least one upgrade is within 60% of its price, and the album
   shows a row with one gap.
4. **A new idea every garden** (§8) and a new district look every six.
5. **The upgrade is felt, not read.** A wider deck is a wider stripe on the very next pass.
6. **Mastery without pressure.** Flow, three stars and the ribbons give older children something to chase;
   nothing is taken from those who ignore them.
7. **Variety inside a job.** The reward clock (§5.4) guarantees a different kind of event at least every 25 s.
8. **Comfort.** Sessions end early when eyes or ears tire: the comfort limits (§16.8), a tune that changes key
   per district, and a mix that never fatigues (§23).
9. **Endless tail.** After garden 12: Garden of the Day, three-star replays with new hiding places, upgrade
   levels 8 and 9, the shop's cosmetics and garden gifts.

### 19.4 Coming back

Garden of the Day, album gaps, star outlines on the lane map, the gift silhouettes, and updates on days 3, 6
and 9 (§27). Nothing expires; nothing is lost by staying away.

## 20. Accessibility and localization

**Accessibility**

- One thumb, either hand; the left-hand setting mirrors the HUD's button column.
- No time pressure, no fail, no precision demands (edge help, finish help).
- Colour is never the only signal: tall and cut grass differ in height and lightness; stripes differ in
  lightness; prices that cannot be paid are also crossed with a small lock.
- Reduced motion (the system setting or the game's own): no camera travel, no shake, no speed lines.
- Flashes: none at full screen; nothing flickers faster than once a second.
- Touch targets 48 px or more; HUD text 16 px or more at 360 px width; contrast 4.5 to 1 or more on panels.
- Sound is never required: every audio cue has a visible twin.
- Language-free play: the whole core loop can be learned from pictures.

**Localization**

- Seven languages: English, Arabic, Spanish, Vietnamese, Hindi, Bengali, Indonesian. Detected from the device
  through the dev guide's device API, with a manual choice in settings.
- The game needs about 40 short strings (two to four words each): names of gardens and friends, upgrade names,
  settings. All in `strings.js`; none in code. Numbers use Latin digits in every language.
- Arabic is right-to-left: mirrored HUD row, mirrored chevrons, digits left-to-right, text anchors flipped.
  Hindi and Bengali need taller line boxes; test for clipped marks above and below the line.
- Fonts: system fonts only (no downloads), with a rounded stack first.
- Every string is checked for fit at 360 px in all seven languages with `data-fit`.
- Names (Nilo, Buzzy, the neighbours' species) are simple and translate cleanly; no puns that break.

## 21. Technology, performance and load

### 21.1 Stack and file layout

Plain JavaScript modules, Three.js vendored (minified core and only the add-ons used), no build step beyond
the repo's own tools. Planned files in `prototypes/mow-mow-meadow/`:

| File | Holds |
|---|---|
| `index.html` | Inline boot guard, import map, module preloads |
| `game.js` | `window.run`, the loop, scene wiring, `destroy()` |
| `config.js` | Every tuning value with min, max, step; seeds; garden recipes; quality tiers |
| `strings.js` | Seven languages |
| `logic.js` | Pure rules with no Three.js: mask, coverage, Flow, economy, stars, save, generator, daily seed |
| `lawn.js` | Mask texture, blades, ground shader, cutting effects |
| `world.js` | Garden and lane building from kits, far layers, lighting per district |
| `buzzy.js`, `cast.js` | The mower; Nilo (on the chibi base), neighbours, friends |
| `fx.js` | Pooled particles, trails, shockwaves, the cinematic director |
| `ui.js` | HUD, sheets, receipt, spotlight FTUE, layout grid |
| `audio.js` | Synth engine, tune, mix |
| `tests/` | Unit tests, bot playtest, look and layout checks |

### 21.2 Frame budget (60 FPS target on a mid-range phone; never below 40)

| Item | High | Medium | Low |
|---|---|---|---|
| Device pixel ratio cap | 2.0 | 1.5 | 1.25 |
| Grass blades (instances in view) | 48,000 | 28,000 | 14,000 |
| Triangles on screen | 250k | 160k | 100k |
| Draw calls | 120 | 100 | 80 |
| Shadow map | 1024, every 2nd frame | 512, every 3rd | Blob shadows only |
| Post | Bloom, AO (half res), grade, vignette, AA | Bloom, grade, vignette | Grade and vignette in the output pass |
| Particles alive | 600 | 350 | 180 |
| Neighbours and friends animated | All in view | All in view | Neighbour at half rate |

- **Adaptive quality**: start at a tier guessed from the device, measure frame time from second 5, step down
  after 2 s over budget, step up after 10 s well under. Changes are hidden in a moment of motion.
- **Pooling and instancing**: blades, flowers, particles, coins, bales, fence pieces, trees and friends are
  instanced or pooled; no allocation and no DOM writes per frame.
- **Shared materials**: the six-material kit; one shader program per material.
- **Expensive effects wait**: bloom and AO switch on only after 30 smooth frames.
- **Mask updates**: the texture is updated in small dirty rectangles; the % is counted incrementally.
- **Memory**: one garden's blades and mask live at a time; geometry is reused between gardens; everything is
  released in `destroy()`, with `forceContextLoss()`.

### 21.3 Load budget (measured with `tools/load-time.js` on a 4G, 4x CPU profile; reported with every build)

| Stage | Budget |
|---|---|
| Transfer size, all files, compressed | 350 KB or less (Three.js core is most of it) |
| First picture (grass, Buzzy, sky) | 1.5 s |
| Playable first frame (touch drives) | 2.0 s |
| Everything else ready (Nilo's full look, neighbour, far layers, audio graph, post) | by 4 s, in idle slices |

How: module preloads to flatten the import chain; no unminified builds; the first frame compiles only the lawn
and enamel shaders; garden 1 is tiny; Nilo, the neighbour, post and far layers are built in slices after the
first frame; audio is created on the first gesture; nothing is downloaded after start.

## 22. Astrocade: feed, listing, share, save, analytics

- **Feed card and first 3 s.** The game renders live in the muted card (`run('edit')`): Buzzy idles, grass
  sways, the ghost thumb slides, and a tap already drives. Check with `tools/feed-card-test.js` and the bundle
  test's handover case (`run('edit')` then `run('play')`, intro on, time step clamped).
- **Theme row target**: Simulation (where Zombie Miner and the construction simulator sit). Title and
  description are written for it, and they avoid the wording of the dead mowing games.
- **Working title**: "Mow Mow Meadow". Alternates if the owner prefers: "Clover Lane Mower", "Buzzy's Meadow".
  Note: a small game called "Mow Mow Madness" (about 800 plays) exists; if look-alike dedup is a worry, use an
  alternate. No brand names.
- **Description** (141 characters): "Ride a cute mower through wild gardens! Cut perfect stripes, find friends
  hiding in the tall grass and tidy up for your animal neighbours."
- **Leaderboard**: one number, total square metres mown, sent quietly at each garden end with a `.catch`. It
  shows nothing competitive in the HUD.
- **Share**: `lib.share({ title, text })` with no image, so the card shows the owner's live thumbnail. Offered
  at three stars ("I mowed Rabbit's Yard 100%!"), at each district party and at album milestones. The button
  appears only if the host provides sharing.
- **Save and resume** through `lib.saveUserGameState` only (no `localStorage`): version, coins, upgrade levels,
  per-garden best % and stars and ribbons, the current garden and its cut mask (run-length packed, a few KB),
  album, shelf, wardrobe, cosmetics, FTUE steps done, settings, Garden of the Day (`YYYYMMDD`, done or not),
  lifetime stats. Saved at every bale, star and purchase and every 10 s while cutting. Rules from
  `ASTROCADE.md` §6: no write before the first read succeeds, a late-arriving save is merged once, numbers are
  rounded and clamped, old saves without new fields load cleanly, a clock set backwards pays nothing.
- **Analytics** (no network of our own): the owner's creator analytics give p50, p75, the share over 5 minutes,
  time to first interaction, FPS band and CTR. In the game, a dev-only overlay (stripped from the upload) shows
  the reward clock, Flow, tier and frame time for tuning.
- **What is uploaded** talks only about the game. Thumbnail: the owner's.

## 23. Audio

All sound is made in the browser with the Web Audio API: no audio files. Audio starts on the first gesture; the
muted feed card shows everything visually.

**Music: the lawn plays the tune.** Each district has a short tune in a major pentatonic key at a walking
tempo (92, 100 and 84 beats a minute). Four soft layers: a warm pad, a plucked melody, a round bass and light
percussion (shakers, woodblock). Each square metre cut plays the melody's next note, so driving "plays" the
song; the layers come in with Flow and thin out when Buzzy rests. District 3 swaps the pluck for a music-box
voice. No loop is shorter than 32 bars; variation is generated, so nothing repeats exactly within 10 minutes.

**Sound effects (each with small pitch and timing variation, 10% or so)**

| Event | Sound |
|---|---|
| Engine | A soft purr (filtered noise and a low tone) whose pitch follows speed; a happy flutter at full Flow |
| Cutting | A crisp, quiet "shrrk" in short grains, brighter on wildflowers |
| Bale | A stretch creak, then a round "pomp", two soft bounces |
| Coins | Short bell ticks rising in pitch within a batch |
| Friend found | A leaf rustle, a two-note squeak per species family, a small harp run |
| Toy found | A spring "boing" and a toy rattle |
| Rare find | A slow glitter swell and a warm chord |
| Milestone | One chime of the tune's chord |
| Gate | Latch click, wooden swing, a rising three-note call |
| Star stamp | A soft thump on paper |
| Upgrade | Ratchet, puff, a proud two-note horn from Buzzy |
| Flower bed touched | A soft "oop" and a leaf brush |
| Honk | A friendly rubber horn |
| UI | Paper rustle for sheets, a felt click for buttons |
| Ambience | Birds, a breeze, distant bees (morning); crickets, a far windmill creak (afternoon); frogs, soft wind chimes (dusk) |

**Mix and comfort.** Music sits under effects; loud events duck the music slightly; a limiter on the output;
no sound above a comfortable peak; no high, piercing tones; the same effect never plays more than six times a
second. Mute and separate music control in settings and one mute button in the HUD.

## 24. Test plan

| Kind | What | Pass rule |
|---|---|---|
| **Unit** (`logic.js`, no browser) | Coverage maths and rounding; swept cutting leaves no gaps at top speed; edge and finish help; Flow rise and fall; star thresholds; coin formulas; price curve; save packing, migration and merge; daily seed; generator validity (100% reachable for 500 seeds per recipe); seeded `rng()` determinism | All pass; each new test proven to fail without its fix |
| **Bundle and feed** | `tools/astrocade-bundle-test.js` on the upload set: runs as the host runs it, `run('edit')` then `run('play')`, a second `run()`, frozen config, `feed.gpu` and `feed.pixels` | No errors; the lawn and Buzzy are visible in the feed frame |
| **Lint and rules** | `bash tools/ci-checks.sh`, `tools/lint-game.mjs`, platform-rule greps, `node --check` | Clean |
| **Bot playtest: pacing** | Three seeded pilots on the real game at 4x speed: a tidy "stripe" bot (eff 0.8), the model bot (0.65) and a "toddler" random walker (0.4) | Toddler reaches 90% of garden 1 within 90 s; no gap over 6 s without a reward and over 25 s without a new stimulus; no card before second 60; an upgrade affordable after every garden to 12; job time 180 s or less at two stars for the model bot |
| **Bot playtest: the 10-minute run** | The model bot plays 15 minutes of game time | At minutes 5, 10 and 15 it still has three open goals, one within 60 s; no dead end; no error; frame time flat (no leak) |
| **Input like a player** | Real pointer events: drag, second finger down, tap on every button with a finger and a mouse, 600 random inputs, focus loss | No stuck stick, no missed button, no error |
| **No-clip** | Buzzy pushed at every solid from eight directions in every garden; the camera at the four far corners and during every beat; Nilo's stress poses (§15.1) | No body inside a solid; camera never inside an object; hero always in frame; no self-intersection |
| **Look: screenshots and scorecard** | Phone portrait JPGs of every garden start, mid-cut, finale, each sheet, each beat, the FTUE steps, three districts, at 360 x 640, 390 x 844, 430 x 932 and 768 x 1024, in English, Arabic and Bengali | The `threejs-aaa-graphics-builder` 10-category scorecard at 8 of 10 or more per screen; every screenshot viewed at full size |
| **Comfort** | `glare()` on every scene and beat | Inside every limit of §16.8 |
| **HUD layout** | `layout.js` measures margins, heights, centres and gaps on the four sizes and RTL | Exact to the grid in §17.2; nothing clipped; no world bubble under the HUD |
| **Performance** | Throttled phone profile, frame loop that yields to the browser, 3 minutes in garden 6 and garden 12 | 60 FPS median on the high tier in the test profile, never under 40; the tier steps down correctly when forced |
| **Load** | `tools/load-time.js`, 4G and 4x CPU | Inside §21.3; reported in the build report |
| **Soak** | 14 minutes of random play, garden changes, sheets | No errors, no growth in GPU objects, saves intact |
| **Save** | Late, failed, corrupt and old-version saves; resume mid-garden | The lawn comes back as it was; nothing lost; nothing paid twice |
| **Languages** | All seven, every string, fit at 360 px | No clipping; RTL mirrored correctly |
| **Draft check** | The uploaded draft's own files pulled back through the Astrocade tools and run in the bundle test | The same build passes |

Per round: unit, lint, bundle, a short smoke run and screenshots. The full set runs once, before the single
publish, and again only if pacing changes. What only a person on a phone can judge (sound, touch feel, real
FPS, colour, translations) is listed honestly in the report.

## 25. Milestones

Each ends with a report, screenshots saved to `production/qa/evidence/mow-mow-meadow/` and
`/mnt/project-files/mow-mow-meadow/`, and the coordinator's visual review before the next begins.

| Milestone | Builds | Done means |
|---|---|---|
| **M0 Lawn spike** | The mask, blades, ground stripes and cutting on one flat garden with a placeholder-free Buzzy body; tier switch; load measure | 60 FPS at the medium tier on the throttled profile with 28,000 blades; first frame inside 2 s; stripes read clearly in a phone screenshot; a go or no-go on the grass approach, with the fallback (ground shader plus fewer blades) measured |
| **M1 The first minute** | Garden 1 and 2 complete: controls, camera, Buzzy, Nilo seated on the anatomical rig, Flow, bales, finds, gate, the spotlight FTUE, sound engine and the tune, HUD grid, save | A new player with no text reaches garden 2 in under 60 s in the toddler bot; the FTUE passes; the stress poses pass; scorecard 8 of 10 on every screen; comfort limits pass |
| **M2 District 1** | Gardens 3 to 6, generator and validation, upgrades and pads, workshop, receipt and finale, album, shelf, wardrobe, cinematic director, the party, lane map | The 10-minute bot run passes on District 1 content; the economy tests pass; every beat reviewed in motion frames |
| **M3 Districts 2 and 3** | Gardens 7 to 12, pattern bubbles, sprinklers, dusk lighting and headlamps, Garden of the Day, cosmetics, seven languages, share, leaderboard | The pacing table holds in the real bot within 15%; all languages fit; RTL correct |
| **M4 Polish and proof** | Full VFX and transition pass, audio mix, adaptive quality tuning, accessibility settings, the complete test plan, bug hunt from zero, upload set, Astrocade draft | Every row of §24 passes; the honest "still plain" list is empty or accepted; draft saved and verified by pulling it back |
| **Publish** | One publish by the coordinator or owner after the owner sets the thumbnail | Reported as "sent, waiting for review" |

## 26. Risks

| Risk | Why it matters | Answer |
|---|---|---|
| The 10-minute median is not reached | No precedent on the platform | Staged targets (module C); design for the tail; measure at 200 plays; two tuning updates planned inside the first 9 days |
| Grass is too heavy for phones | It is the whole picture | M0 decides before anything else is built; three tiers; the ground shader carries the look when blades are few |
| The first frame misses 2 s | Feed players leave | Budget table; tiny garden 1; Nilo and extras built after the first frame |
| Looks like the dead mowing games on the card | Low click-through, dedup | A character mower with eyes, animals, tall jungle grass in the first frame; title and description avoid "lawn mowing simulator" |
| Too easy for older players, too fiddly for the youngest | A wide age range | Edge and finish help below; Flow, three stars, ribbons and patterns above |
| Repetition by garden 5 | Coverage is one verb | One new idea per garden, finds every 6 to 10 s, the tune that grows, upgrades that change the feel |
| Motion comfort | A moving lawn fills the screen | Fixed camera direction, no rotation, gentle look-ahead, reduced-motion setting |
| Glare from bright greens and enamel | The owner's standing complaint | Hard limits measured on every scene; bloom only on emissive things |
| Economy runs dry or floods | Either ends the session | Automated balance rules; the bot buys every garden; sinks beyond upgrades |
| Save loss | A child's album gone is the end | The save rules of `ASTROCADE.md` §6 and the save tests |
| Same-creator overlap with Wonder Sprout (gardens) | Dedup within three slots | Different verb, look and wording; no publish on the same day |

## 27. What you don't know you don't know

Things that are easy to miss and change the result:

1. **A median counts the people who leave at once.** Session length is won in the first 40 s as much as in the
   content after them.
2. **A tap on the muted feed card is already a play**, and a play with no gesture is not counted at all. The
   first frame must invite a touch and answer it.
3. **The ranker grades the game on strangers on their first day**: a play over 90 s, a second play, a return.
   Fans do not move it.
4. **Players' Choice only opens at 50,000 plays**, and then rewards the share of sessions over 5 minutes and
   retention, which is exactly what this design aims at.
5. **Updates only boost a game in its first 30 days**, with a half-life of 3 days. Updates for days 3, 6 and 9
   are planned before launch: (a) District 4 "Seaside Gardens" with six gardens, (b) a home garden the player
   decorates with found toys, (c) a pattern pack and new friends.
6. **Every publish waits in a manual review**, so everything goes out in one publish per round.
7. **The listing text is live without a publish**; the title and description can be tuned one change a day.
8. **Haptics do nothing on the web.** All feel must come from picture and sound.
9. **Children's thumbs cover a third of the screen.** Nothing that matters may sit under the lower half during
   play, and the stick must re-centre under a drifting hand.
10. **Children cannot read "90%".** The bar's star ticks, the gate and the neighbour's face carry the meaning.
11. **A result screen is an exit door.** Every card that needs a tap loses players; this game has none.
12. **Coverage games die at 95%**: hunting the last blade is the most common complaint in the genre. Edge
    help, finish help and the trail from Buzzy to the last patch remove it.
13. **A wider deck makes small gardens trivial.** Garden size grows with the expected upgrade level, and
    replayed early gardens are meant to feel powerful: that is a reward, not a bug.
14. **Stripes need a fixed light and camera to read.** A turning camera would make them shimmer; ours never
    turns.
15. **Synth audio differs between phones**; some cheap speakers have no bass. The mix must work on a phone
    speaker, and every cue has a visible twin.
16. **Android web on a slow GPU is the real target**, not a desktop. Tests run on a throttled profile with a
    frame loop that yields to the browser, or stalls are invented.
17. **Right-to-left is more than mirrored text**: digits, chevrons, anchors and the HUD column all change.
18. **Staff can watch recorded guest sessions.** A broken first minute is seen.
19. **Leaderboards change the theme row** for toy-like games; here one quiet number keeps Simulation.
20. **Still unknown** and worth learning from this launch: the competitors' medians, how cold-start games are
    picked, and whether a calm simulator gets enough day-0 traffic to reach 50,000 plays quickly.

## 28. Open choices for the owner

Defaults are chosen so work can start at once on approval; each can change without redesign.

1. **Title**: "Mow Mow Meadow" (default) or an alternate from §22.
2. **Launch size**: three districts and twelve gardens (default), or District 1 first with Districts 2 and 3 as
   the day-3 and day-6 updates (faster to market, uses the update boost).
3. **Hero**: Nilo as described (default), or another look from the chibi base.

---

## E. QUALITY BAR

- **Looks**: 8 of 10 or more on every screen of the 10-category visual scorecard; no primitive-looking model;
  no empty part of the frame; the top 20% composed; comfort limits never exceeded.
- **Feel**: every input answered within one frame by sound, motion and particles; no reward gap over 6 s.
- **Clarity**: a child who cannot read reaches garden 2 without help.
- **Structure**: HUD exact to the 8 px grid on four screen sizes and RTL; one height, one margin, aligned
  centres.
- **Performance**: 60 FPS target, never under 40; playable first frame in about 2 s.
- **Honesty**: reports separate "works" from "looks and feels good", and list what only a phone can show.

## F. OUTPUT FORMAT (per milestone report, to the coordinator)

1. Result in one line, then what was built.
2. Measured numbers: load time, FPS and tier, draw calls and triangles, the bot's pacing rows, `glare()` values.
3. Test results: passed, failed, and bugs found and fixed.
4. Screenshots: paths of the phone-portrait JPGs in the repo and in the shared project files, with the
   scorecard per screen.
5. What is still plain, what was cut and why, and what only the owner can judge on a phone.
6. The next milestone's first step.

## G. DONE-WHEN

- The owner has approved this plan before any code.
- All five milestones meet their "done means".
- Every row of the test plan passes on the exact build in the Astrocade draft.
- The coordinator's visual review has passed on every screenshot.
- The game is published once, after the owner's thumbnail is set, and reported as waiting for review.
