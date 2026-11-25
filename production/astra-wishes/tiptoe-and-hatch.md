# Tiptoe & Hatch: Dino Egg Escape — Astra wish

- Game id: `01M3MERZT2D8D0W7914322WGEX` · first published 2026-09-29 (age 57.5 days on 2026-11-25) · 86,498 plays, ~97/day, 31.7 shares per 1,000
- Source read: published version on 2026-11-25 (README, `search_game_files`).
- Order: #11 of 50 live games, oldest first.

## What the game already has (seen in code)

3D (Three.js + Rapier) stealth-chase: sneak into dino nests, grab eggs, outrun the mama dinos, hatch and collect
30 dinos across 6 biomes with mutations (Gold, Diamond, Rainbow, Galaxy) and a 25-hatch pity timer. Gates, rebirth,
"Dino Power" leaderboard, incubator timers, daily streak, quests, vault, first-run and comeback assist, weekend
coins ×2 and Lucky Wednesday, heartbeat as a mama closes in, adaptive quality, haptics, 7 languages.

Gaps (seen): no `lib.share` call.

## Team call

Healthy (~97/day), past its boost. The hatch reveal is the peak moment; make it a showpiece and shareable. A rare
"dino parade" of the player's collection gives a reason to come back and show off. No rule changes. Title stays.

## Wish (paste into Astra)

```
GOAL
Make sneaking, escaping and hatching in Tiptoe & Hatch feel more magical and exciting, let players share their rarest dinos, and give them a fun reason to come back. Keep the game exactly as players know it.

KEEP (do not change)
- Do not change the thumbnail.
- Keep the title, the core loop (sneak into nests, grab eggs, outrun the mama dinos, deposit and hatch), all 30 dinos and 6 biomes, mutations and the pity timer, gates, rebirth, incubators, daily streak, quests, the vault, the beginner and comeback assist, weekend and Lucky Wednesday events, the creator settings and all 7 languages.
- Keep the "Dino Power" leaderboard exactly as it is.
- Keep every player's saved progress (coins, dinos, mutations, gates, rebirths, incubators, streak, quests, settings). Only add new save fields with safe defaults; never rename or reset existing ones.

CHANGE
1. Hatch share card: when a dino hatches, especially a rare or mutated one, show a "Share" button on the reveal card. It shares a picture of the baby dino with its rarity glow, its name and the collection count (for example 14/30), using the game's built-in share feature. One tap; never blocks play.
2. Dino Parade: once per day, the player's hatched dinos walk in a little parade around the base, and tapping the parade gives a small coin gift. Purely a fun visit, optional.
3. Instant start: a new player can move within 1 second with no text to read, and grabs the first egg within 20 seconds.

VISUAL / VFX
- Hatch: the egg wobbles, cracks glow from inside, shell pieces fly off with sparkles, a light beam in the rarity color, a sunburst for mutations (gold shimmer, diamond facets, rainbow trail, galaxy stars).
- Chase: the mama's stomps shake leaves and dust, footprints stay on the ground, roar shockwave ring, branches snapping, the hero leaves a dust trail when sprinting.
- Sneaking: a soft tiptoe sparkle trail, fireflies and butterflies near nests, a gentle vignette when hidden.
- Biomes: swaying ferns and vines, drifting pollen, waterfalls with mist, light shafts through the canopy, soft shadows, gentle bloom on eggs, mutations and glowing plants only, lush color grading per biome. Keep paths and mamas clearly readable.

AUDIO
- Soft tiptoe steps, a cute crack-crack-POP on hatch with a special chord for each rarity, mama roars and stomps that get louder as she closes in (keep the heartbeat), jungle ambience with birds and insects. Respect the existing sound settings.

UX / HUD
- Share button and the parade gift match the current style, are thumb-sized and fit the screen in all 7 languages. No extra clutter during chases.

PERFORMANCE
- Keep the adaptive quality and target a stable 60 FPS on mid-range phones. Pool and reuse shell, dust and sparkle particles; use instancing for plants, rocks and parade dinos; reuse materials. On low quality, drop extra particles first.
- Do not add new external network requests while the game runs.

DO NOT
- Do not change the thumbnail.
- Do not change mama speed rules, hatch chances, prices or the leaderboard.
- Do not reset saves.
- Do not add ads, energy limits or paywalls.

ACCEPTANCE CHECK
- An existing save loads with the same coins, dinos, mutations, gates and rebirths.
- A new player moves within 1 second and grabs the first egg within 20 seconds.
- A hatch shows the crack, burst and rarity effects, with a working Share button and a picture.
- The Dino Parade appears once per day and gives its gift once.
- No console errors; smooth on a phone-sized screen in English, Indonesian and Arabic.
```

## Why (Indonesian)

Momen menetas adalah puncak game ini, jadi wish ini bikin penetasan jadi pertunjukan (retak bercahaya, pecahan cangkang, sinar warna rarity) yang bisa di-share, plus Parade Dino harian. Aturan kejar, peluang menetas dan leaderboard tidak diubah.
