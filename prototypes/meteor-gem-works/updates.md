# Meteor Gems: post-launch updates

Three updates for the first 30 days after first publish, one every 3 days (the update boost halves every 3 days and
stops at day 30, `docs/astrocade-distribution-playbook.md` §4.2). Each one is something a player notices in the first
minute after Continue. Day 0 is the first publish; the dates below move with it.

Chapter 1 already ships 12 critters (5 common, 4 shiny, 2 rare, 1 legendary) and 6 hats, so plan §15.4's
"day 3: 6 more critters and 3 hats" adds to those: 18 critters and 9 hats after day 3.

Every update keeps the save version (`save.version`) unless the save shape changes; new fields restore to a fresh
value when missing (`restore()` already does this), so old saves load.

## Update 1, day 3: "Night Critters"

**What the player sees:** a "NEW" sticker on the album button; eggs can now hatch six night critters; three new hats.

- **6 critters** (config `critters`, same 3-draw body as the others, new colours and one shape detail each):
  - 3 common: Ember (orange glow tail), Pebblet (tiny grey), Dune (sand-striped).
  - 2 shiny: Lumen (glows at night only), Frosty (ice tips, a teaser for chapter 2).
  - 1 rare: Comet Pup (a small comet trail).
  - Each has one perk from the existing perk list (carry +1, walk speed, coin magnet, polish speed, stand
    restock); no new perk code.
- **3 hats** (config `hats`): miner lamp (unlocks at 15 critters), star antenna (25 kid orders), desert scarf
  (open the album 5 days in a row). The first two use the existing star counters; the third needs a day counter
  in the save (`days`, `lastDay`).
- **Album:** the critter grid grows from 12 to 18 tiles (3 more rows fit; check that the card still fits at
  1120u, and with the touch scroll it is reachable either way).
- **Egg rule:** a save with all 12 chapter 1 critters gets a free egg on the first Continue after the update, so
  players who finished still see a new critter in the first minute.
- **Size:** config plus models.js colour variants, the day counter and the free egg; no new systems.
- **Tests:** logic tests for the free egg, the new hat conditions and the day counter; the album screenshot in 7
  languages; playtest bot reaches 18 critters.
- **Listing text (version history):** "Six night critters, three new hats and a bigger sticker album".

## Update 2, day 6: Chapter 2 "The Frost Comet"

**What the player sees:** the comet at the end of chapter 1 lands; the "Chapter 2 · soon" tile in the album opens.

- A second area reached by the cable car: an ice crater next to the town, with its own meteor (frost crystals),
  its own polisher and 6 to 8 new price pads (ice saw, snow stand, penguin shopkeeper, ice rink, aurora tower,
  frost heart finale).
- The chapter 1 town keeps running and earning while the player is in chapter 2, as the town already does.
- This is new content on the same loop, not a new mode, but it is the size of a milestone (M5). It gets its own
  section in `plan.md` (pads, costs, reward gaps ≤ 45 s, draw-call budget for the second area) before code.
- **Tests:** the same playtest moments as chapter 1 for the new pads, soak 15 minutes across both areas,
  tier 0 draw calls ≤ 160 in the crater view.
- **Listing text:** "Chapter 2: the Frost Comet has landed! A new ice crater to mine and build".

## Update 3, day 9: "Desert Festival" and the welcome-back gift

**What the player sees:** lanterns, bunting and a small fireworks show over the town; a gift box on return.

- **Decoration set:** strings of paper lanterns between the stands, bunting on the bus stop, a festival arch,
  fireworks over the mesa at dusk. Built into the existing baked statics and the neon shader (no new draw calls
  beyond 4).
- **Welcome-back gift:** on Continue after at least 8 hours away, a gift box drops next to the miner: coins
  equal to a few minutes of the town's own earnings (capped), plus an egg once per day. Tune the amount from the
  first week of session data (median session length and return rate).
- **Size:** decoration props in models.js and scene.js, one gift event in logic.js and game.js, two save fields
  (`lastSeen`, `giftDay`).
- **Tests:** logic tests for the gift amount, cap and the once-per-day egg; screenshots at day and dusk; draw-call
  budget unchanged.
- **Listing text:** "Desert Festival: lanterns and fireworks over the town, plus a gift when you come back".

## Order of work

1. Update 1 and Update 3 are small and can be built and saved as drafts before first publish, then published on
   day 3 and day 9.
2. Chapter 2 is a milestone of its own (M5): its plan section first, then the build, aimed at day 6. If it is
   not ready on day 6, swap the order (festival on day 6, chapter 2 on day 9) so the 3-day rhythm holds.
3. Each update goes through the same ship steps as chapter 1: checks, bug hunt, bundle test, clean upload set,
   draft, and publish only on the owner's word.
