# Meteor Gems: post-launch updates

Three updates for the first 30 days after first publish, one every 3 days (the update boost halves every 3 days and
stops at day 30, `docs/astrocade-distribution-playbook.md` §4.2). Each one is something a player notices in the first
minute after Continue. Day 0 is the first publish; the dates below move with it.

Chapter 1 already ships 12 critters (5 common, 4 shiny, 2 rare, 1 legendary) and 6 hats, so plan §15.4's
"day 3: 6 more critters and 3 hats" adds to those: 18 critters and 9 hats after day 3.

Every update keeps the save version (`save.version`); new fields restore to a fresh value when missing, so old saves
load. Bumping the version would start every player over, so it is never done.

**Built and switched off (2026-11-25).** Updates 1 and 3 are in the code now, behind `drops` in `game_config.json`
(`night`, `festival`, both `false`). The live game behaves exactly like chapter 1 until a switch is flipped.
Shipping an update = set its switch to `true`, run the checks, build the upload set, save the draft, and publish on
the owner's word. Locally, `?drops=night,festival` turns them on for a look (that switch is stripped from the upload
set). `node drops.js <outDir>` is the browser check for both.

## Update 1, day 3: "Night Critters" (built, `drops.night`)

**What the player sees:** eggs start again (also for kids who found all 12), six new critters hatch, three new hats,
and the album shows 18 critters in a 6-wide grid.

- **6 critters** (`critters` with `drop: "night"`, the same 3-draw body as the others, new fur and crystal colours):
  - 3 common: Ember (tip +2), Pebblet (smaller, carry +3), Dune (coin magnet +0.4).
  - 2 shiny: Lumen (polish ×0.9), Frosty (tourists ×0.9, a chapter 2 teaser).
  - 1 rare: Comet Pup (bigger, swing ×0.9).
  - Perks are the existing ones at mild values, so the economy does not run away.
- **3 hats** (`hats` with `drop: "night"`): miner lamp (15 critters), star antenna (25 kid orders), desert bandana
  (1,000 gems sold). By the bot's pace they come at about 14, 17 and 21 minutes of play: reasons to keep going.
- **Parade cap:** at most `critter.show` (12) walk behind the miner: the newest ones, with Nova always in it. The
  rest stay home and keep their perks. This holds the draw budget and keeps the parade on the deck.
- **Finished saves:** a save with all 12 critters gets its next egg within about 25 s of Continue (restore already
  schedules one), so returning players see a new critter in the first minute.
- **Names** in all 7 languages.
- **Tests:** `logic.test.mjs` (drop on/off counts and names; the bot hatches all 18 and earns the 3 hats; an old
  finished save hatches a night critter within 40 s); `drops.js` (album 18 + 9 tiles fit, parade cap, budgets).
- **Listing text (version history):** "Six night critters, three new hats and a bigger sticker album".

## Update 2, day 6: Chapter 2 "The Frost Comet" (built, `drops.ch2`)

**Built (M5):** as planned in `plan.md` §16, which replaced the sketch below: the cable car pad after the finale
rides to the Frost Comet valley (10 frost pads, 8 frost critters, 3 hats, its own stars and finale). To ship it,
flip `drops.ch2`, run `logic.test.mjs` and `ch2.js`, then save the draft.

**What the player sees:** the comet at the end of chapter 1 lands; the "Chapter 2 · soon" tile in the album opens.

- A second area reached by the cable car: an ice crater next to the town, with its own meteor (frost crystals),
  its own polisher and 6 to 8 new price pads (ice saw, snow stand, penguin shopkeeper, ice rink, aurora tower,
  frost heart finale).
- The chapter 1 town keeps running and earning while the player is in chapter 2, as the town already does.
- This is new content on the same loop, not a new mode, but it is the size of a milestone (M5). It gets its own
  section in `plan.md` (§16: pads, costs, reward gaps ≤ 45 s, draw-call budget for the second area) before code.
- **Tests:** the same playtest moments as chapter 1 for the new pads, soak 15 minutes across both areas,
  tier 0 draw calls ≤ 160 in the crater view.
- **Listing text:** "Chapter 2: the Frost Comet has landed! A new ice crater to mine and build".

## Update 3, day 9: "Desert Festival" and the welcome-back gift (built, `drops.festival`)

**What the player sees:** a flower arch over the front of the deck with strings of paper lanterns to both corners,
fireworks over the meteor once the town reaches dusk, and a "WELCOME BACK!" gift of coins on return.

- **Decoration set:** `buildFestival` in `models.js`: a terracotta arch with a flower garland and two strings of
  ribbed paper lanterns with tassels. Baked with the other statics: +1 draw call (the glowing lanterns).
- **Fireworks:** every `festival.fireworks` s (±30 %) while the lamps are on (`festival.lampsMin`), a round burst of
  sparks and a ring over the meteor, with a soft pop. Pooled particles, no new draws.
- **Welcome-back gift:** on Continue after `gift.awayH` (8) hours away: `gift.base` + `gift.perPad` × pads built
  coins, capped at `gift.cap` (30 + 12 per pad, max 240), flown to the cash pile with a banner; and once per
  calendar day the next egg comes within `gift.eggIn` s. Tune from the first week of session data.
- **Save fields:** `seen` (time of the last save, written by the page) and `giftDay`.
- **Tests:** `logic.test.mjs` (no gift without the drop or under 8 h, the cap, one egg a day, `giftDay` round trip);
  `drops.js` (gift on Continue after 10 h, its egg hatches, night fireworks and day shots, budgets).
- **Listing text:** "Desert Festival: lanterns and fireworks over the town, plus a gift when you come back".

## Order of work

1. Updates 1 and 3 are built and switched off. On day 3 and day 9: flip the switch, run the checks, save the draft,
   publish on the owner's word.
2. Chapter 2 is a milestone of its own (M5): its plan section first, then the build, aimed at day 6. If it is
   not ready on day 6, swap the order (festival on day 6, chapter 2 on day 9) so the 3-day rhythm holds.
3. Each update goes through the same ship steps as chapter 1: checks, bug hunt, bundle test, clean upload set,
   draft, and publish only on the owner's word.
