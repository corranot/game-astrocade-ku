# New kids simulator: genre and traffic dig, 28 Nov 2026 07:00 to 07:15 UTC

Requested by the owner (project thread, 28 Nov 06:59 UTC): a new portrait 3D simulator for kids "like One More
Lawn", median session above 10 minutes. Read-only guest reads; nothing on Astrocade was liked, shared, remixed,
published or set. Labels: **SEEN** = in a response, page or screenshot we captured; **INFERRED** = our reading;
**UNKNOWN** = not found. The plan this feeds is `prototypes/mow-mow-meadow/plan.md`.

## Files

| File | What it holds |
|---|---|
| `gain-2026-11-28.txt` | Daily-plays proxy for all 1,762 games in the 24 home rows: plays at 28 Nov 06:52 minus plays at 27 Nov 14:30, scaled to 24 h (16.4 h window), with age, Players' Choice share in 60 draws, likes per 1,000 plays |
| `search-2026-11-28.json` | 187 games from 18 guest searches (`/v3/search?q=`): lawn, mow, grass, simulator, cleaning, power wash, tidy, leaf, vacuum, beach, meadow, restoration, garden and more |
| `*-sheet.jpg` | Our own guest-page screenshots (first seconds, taps, drags) of Zombie Miner, Frost Harbor and My Car Wash!, from `tools/competitor-check.js` |

**Daily plays are not exposed.** The proxy is the play-count gain between our two row crawls
(`../2026-11-27T1420-next-game-dig/games-2026-11-27.json` and `../2026-11-28T0650-traffic/rows-2026-11-28.json`).
Games first seen today have no gain; for them the fallback is lifetime plays divided by age.

## 1. One More Lawn is not an Astrocade game

- It is a PC game on Steam by Superdou, released 12 Nov 2026, $6.99, free demo, Windows only (SEEN, store page).
  Steam shows "Overwhelmingly Positive", 97% of 1,689 English reviews; a fan guide cites the developer's
  announcement of 50,000 copies in week one (SEEN on those pages; we did not verify the sales figure).
- A guest search for "one more lawn" on Astrocade returns no such game (SEEN). Search hides games under 500
  plays, so a tiny copy could exist (UNKNOWN).
- Its tone is adult comedy (a grumpy man who smokes and drinks; drinking blurs the screen). None of that fits a
  kids game. We take the genre mechanics only.

What it does (SEEN on the store page, a fan guide, and two reviews; paraphrased):

| Area | One More Lawn | Why it holds players (INFERRED) |
|---|---|---|
| Verb | Ride a mower over tall grass; stripes follow your driving | A coverage task shows progress in the world itself, every second |
| Machine | A dashboard of toy-like controls: hold-to-start key, blade switch, deck-height lever, lights, radio | The machine is a toy before the job even starts |
| Score | A live "% of the lawn cut" and a client receipt with a perfection % and comments | Two clear numbers; the last 10% is a self-set challenge |
| Chain | Four jobs; the next unlocks at 90%, not 100% | The gate is generous, the perfect score is optional: "one more" without frustration |
| Help | A golden sparkle marks missed grass after a pause in progress | No hunting for the last blade |
| Economy | Full grass bags are sold; a shop sells a faster mower, wider tow-behind decks, bigger bags | The upgrade is felt at once as a wider, faster stripe |
| Replay | Every job can be replayed as a timelapse | A built-in share clip; players spent hours chasing a 100% receipt |
| Social | Co-op for six, comedy radio songs that went viral on short video | Not available to us (single player, no licensed audio) |

## 2. What moves on Astrocade today (proxy, SEEN counts)

Top of the whole platform by gain (16.4 h window): 41 Ragdoll Executions 53.2K a day, Canvas Flow 39.9K, Cheat
Sheet 38.8K, Don't Make a Splash 35.6K, Minecraft Sanbox TNT 34.7K, Burger and Sandwich Runner 32.4K. Full
table: `gain-2026-11-28.txt`.

Simulator, tidy-up, coverage and tycoon games:

| Game | Proxy plays/day | Age | Lifetime | Players' Choice (60 draws) | Loop |
|---|---|---|---|---|---|
| Canvas Flow | 39.9K | 13 d | 118K | 0% | Fill a big outline with a marker: pure coverage, auto-advance |
| Abandoned Waterpark: Restoration Simulator | 23.5K | 1.0 d | 16.6K | 0% (under the 50K floor) | Pressure-wash a whole waterpark back to life, one object at a time |
| Throw Food for Animals | 21.6K | 11 d | 175K | 100% | Throw, discover animals, pets that earn |
| Zoo Zen | 18.8K | 5.6 d | 95K | 90% | Walk a 3D zoo, fill a photo album; no fail |
| Royal Doll Studio | 15.4K | 12 d | 155K | 0% | Scrub and pamper a muddy doll, then dress her |
| Meat converter pizza (new) | about 11K (plays/age) | 3.8 d | 41K | 0% | 3D tycoon: slice, bake, serve, hire, automate |
| Wash The Rug! | 8.9K | 3.2 d | 7.6K | 0% | Vacuum, wash, scrub, squeegee rugs; tool upgrades |
| Frozen Fish Wall | 7.0K | 4.5 d | 12.6K | 0% | Smash a wall, run a camp |
| Frost Harbor: Ice Fishing Tycoon | not in the top table | 21 d | 227K | 85% on 27 Nov | Walk, spear, cook, sell, hire, grow a camp |
| Zombie Miner | under 2.5K now | 100+ d | 1.21M | 0% | Push ore piles into grinders with a bulldozer, unlock rooms, upgrade |
| My Car Wash! | under 2.5K now | about 30 d | 325K | 0% | Blast mud off a car (a coverage % bar), upgrades |
| Harvest Tycoon 3D | under 2.5K now | | 213K | 0% | Drag a chibi farmer over crops, fill a bag, sell, upgrade |
| Grass Cutting Master | 4.7K (plays/age) | 28 d | 134K | 0% | Spin a blade through tall grass, grow, clear goals |

Mowing itself (SEEN, search): eleven straight mowing simulators sit at 500 to 1,300 plays each (Become a Land
Cleaner, Lawn Master 3D, Lawn Makeup 3D, Turf Boss, Lawn Mowing Simulator, Lawn Mow ASMR, Ultimate Grass
Cutter 3D and others). The mowing games with traffic are the spinning-blade ".io" ones (Grass Cutter.io 135K,
Grasscutter.io 74K, Bladegrass.io 35K), which are arena games, not simulators.

Our screenshots (SEEN): Zombie Miner and Frost Harbor both open on a title card with a Play button, then a
fixed-angle 3/4 follow camera, drag-anywhere movement, a coin pill top-left and small square buttons top-right.
My Car Wash! shows a live "Blast off the mud! 38%" bar and one big Upgrades button. Code sizes: 187 KB to
984 KB; Zombie Miner and Frost Harbor use Three.js.

## 3. Reading (INFERRED, whole team)

1. **Coverage clearing is the proven core verb**: wash, colour, push, harvest and cut all show progress in the
   world and a rising %. It carried Canvas Flow to about 40K a day and a restoration simulator to 23.5K a day
   on day one.
2. **Single-object coverage toys never reach Players' Choice** (Canvas Flow, My Car Wash!, Royal Doll Studio,
   every power-wash and salon game: 0%). The draw rewards sessions over 5 minutes and return visits. The
   coverage games that last are the ones with a place to move through, a job chain, upgrades and a collection
   (Zombie Miner 1.21M, Frost Harbor 85% of draws, Zoo Zen 90%, Throw Food for Animals 100%).
3. **The mowing simulator niche is empty at the top, not proven dead.** The eleven dead ones are bare: a flat
   plane, a box mower, no client, no surprise, no collection. The same verb with traffic (Grass Cutting Master,
   Harvest Tycoon 3D) adds growth and goals. Nobody on Astrocade has built One More Lawn's actual hooks:
   stripes that follow your driving, a client receipt, the 90% chain, the sparkle for missed grass, the
   timelapse.
4. **Animals and collections convert best** (27 Nov dig: egg/pet/creature is the cluster with the most
   Players' Choice slots, 7.1 per draw). Animal clients and a friends album put a mowing simulator in that
   cluster without becoming an egg clone.
5. **A 10-minute median has no precedent in our data.** Our best own median is Reel & Hatch at 119 s (p75
   301 s, 22.9% over 5 minutes). The platform prior is that 27% of first plays pass 90 s. Competitors' medians
   are UNKNOWN. A 10-minute median means more than half of all strangers stay 10 minutes; the plan designs for
   it and measures it, but the honest launch targets are staged (plan §19).

## 4. Three concepts, scored

Scores 1 to 5; weights in brackets. Genres and mechanics only; every name, character and look is ours.

| | A. Meadow mowing with animal clients | B. Autumn leaf vacuum park | C. Beach comber treasure tractor |
|---|---|---|---|
| Pitch | Ride a friendly little mower through overgrown gardens for animal neighbours; perfect stripes, surprises in the tall grass, a friends album | Vacuum and blow leaf drifts into piles, jump in them, find critters and toys underneath | Rake a beach in stripes, sift shells and lost toys, build sandcastles for crab clients |
| Traffic fit (x3) | 5: the owner's reference genre; coverage plus chain plus collection; empty at the top | 3: Leaf Blower Garden 27K in 197 days, Leaf Blower Tycoon 1.8K | 3: Treasure Buzz 6K, beach tycoons 15K to 37K, none a coverage sim |
| Kids appeal (x3) | 5: a ride-on machine, animals, hide-and-seek in tall grass | 4: vacuum and jumping in piles | 4: treasure |
| 10+ minute potential (x3) | 5: 12 gardens with a new idea each, upgrades felt on screen, album, daily garden | 3: leaf physics is fun but one-note; fewer natural job variations | 4: collection is strong; the raking itself is plain |
| Procedural feasibility (x2) | 5: one height-mask texture drives instanced grass, stripes and the % | 2: thousands of moving leaves on a phone is the whole budget | 4: sand is a flat shader; treasure models are many |
| Uniqueness on Astrocade (x2) | 4: mowing exists, but none with these hooks; must avoid look-alike titles | 4 | 4 |
| Glare risk (x1, 5 = safe) | 5: greens and warm light | 5 | 2: pale sand and water are the brightest palette there is |
| **Total (max 70)** | **68** | **47** | **51** |

**Pick: A.** It is the genre the owner asked for, it has the strongest session-length design, and its core
technology (a mask texture) is the cheapest of the three, which leaves the budget for looks. Its risks are a
crowded word ("lawn", "mowing") and the description dedup; the title and description avoid the dead games'
wording (plan §22).

## 5. Not checked

- Median session, p75 and retention of any competitor (hidden).
- Whether One More Lawn clones under 500 plays exist on Astrocade.
- The Steam sales and player figures (read from third-party pages).
- Logged-in rows and the swipe feed; this is a guest view from a US header.

## Sources

- Astrocade guest API: `/v4/feed?filter=gallery` rows (27 and 28 Nov crawls), `/v3/search?q=` (28 Nov 07:02 UTC).
- [One More Lawn on Steam](https://store.steampowered.com/app/5378110/One_More_Lawn/)
- [One More Lawn on Discord](https://discord.com/game/one-more-lawn-1565578149314433124)
- [onemorelawn.net fan guide](https://onemorelawn.net/)
- [insertcoins.press review](https://insertcoins.press/en/articles/one-more-lawn-test)
- [pro-gamer.gg article](https://pro-gamer.gg/one-more-lawn-steam-mowing-game-viral-tiktok-instagram-roach-song-superdou/)
