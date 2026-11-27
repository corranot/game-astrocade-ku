# Market fit check for Wonder Sprout, 2026-11-27 12:15 UTC

Read-only guest crawl of every home row (`node tools/row-crawl.js`, 24 rows, 1,819 unique games), done to
check Larisha's "Wonder-Sprout: Royal Sky-Garden" spec against what gets the most daily plays on Astrocade
today. Nothing was liked, shared, published or set.

## Files

| File | What it holds |
|---|---|
| `rows-2026-11-27.json` | Every home row, served order of game ids (US guest, seed 12345) |
| `top-by-daily-gain.json` | One line per game: plays, age, likes and shares per 1,000 plays, leaderboard, rows, `gain1d` and `perDayAge` |

**Daily plays are not exposed.** Two proxies, named per house rule:

- `gain1d`: plays now minus plays in the 26 Nov 17:00 UTC snapshot (`2026-11-26T1700-deep-dig/games-2026-11-26.json`),
  scaled to 24 h. Available for the 686 games present in both crawls. Best proxy.
- `perDayAge`: lifetime plays divided by days since first publish. Used where `gain1d` is missing; it
  overstates old games that peaked early.

## What is fastest today (SEEN, top by proxy)

41 Ragdoll Executions 44K/day, Wildfang Park (grow a dinosaur from hatchling to T-rex) 29K, Ben 10 Ultimate
Aliens 25K, Ice Cream Rolls Cooking 25K, Papercut.io 25K, Zombies vs Humans 23K, Brain Twist 22K, Sneaky
Students 22K, Ragdoll Sandbox 3D 21K, Throw Food for Animals 21K, Zoo Zen 21K.

## Players' Choice pool today (SEEN, 21 games)

- **9 of 21 are pet, egg or creature collection games**: Steal an Egg (three different games), Steal an egg,
  Tame a Dragon, EGG HEIST TYCOON, Forge Beyond ("collect pets"), Throw Food for Animals, Zoo Zen.
- 16 of 21 have a leaderboard.
- Pool median by proxy: 10.3K plays/day.
- 7 of 21 say 3D, voxel, low-poly or blocky in the title or description. Most of the rest also look 3D by
  name (INFERRED, covers not checked). No pool game is clearly a 2D canvas game.

## Closest analogues to the spec (SEEN)

| Game | Proxy/day | Age | Row | Why it is close |
|---|---|---|---|---|
| Throw Food for Animals | 20.9K | 10 d | Players' Choice, Merge | Throw at targets, discover animals, a pet collection that earns |
| Sword Swing Chopper | 18.5K | 11 d | Merge #1 | "Chop groves, hatch pets, rebirth and conquer 3 worlds": the same meta as the spec |
| Steal an Egg family | 10K to 16K each | 20 to 52 d | Players' Choice (4 games) | Hatch rare pets; mutations; base |
| Tame a Dragon | 7.3K | 14 d | Players' Choice | Creature taming, roost |
| Robo-Crash | 13.4K | 46 d | Puzzle | Drag and launch with physics, the spec's slingshot verb |
| Zoo Zen | 20.7K | 5 d | Players' Choice | Cute animals, calm, no fail |

## Theme rows the spec could land in (SEEN sizes)

| Row | Games | Median proxy/day | Top games |
|---|---|---|---|
| Farm | 68 | 366 | +1 FISH IT, Giant Chicken Fry, Drill to Steal an Egg |
| Incremental | 100 | 486 | Mega Mining Empire, Steal a Lava Egg, Nitro Rail Rush |
| Merge | 72 | 115 | Sword Swing Chopper, Steal a Lucky Block, Throw Fruit For Animals |

## Reading (whole team, INFERRED)

1. The spec's meta (hatch, evolve, collect, build, rebirth, 3 worlds) is exactly the meta of today's
   Players' Choice pool. Good fit.
2. The spec's verb (drag and fling with physics bounces) is proven by Robo-Crash and Throw Food for Animals.
3. Risk: the pool is almost all 3D. Larisha's 2D one-finger toys get most of her traffic, so 2D is allowed,
   but the 2D build must look rich (layered parallax, rigged critters) to compete in the same pool.
4. A leaderboard is near standard in the pool (16 of 21). The spec has none; add one.
5. Our own Draw It Alive gained about 20.7K plays in the last day by this proxy, after the 27 Nov update.
