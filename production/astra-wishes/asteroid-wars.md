# Asteroid Wars — Astra wish

- Game id: `01M6Z0N143E9KCC04EW25N81NZ` · first published 2026-11-10 (age 15.1 days on 2026-11-25) · 174 plays, ~0/day (dead per audit)
- Source read: published version on 2026-11-25 (README).
- Order: #34 of 50 live games, oldest first.

## What the game already has (seen in code)

3D (Three.js r187 from jsDelivr) space brawler: you and three bot teams each guard an O2 Core on a floating asteroid;
collect minerals, shop, bridge and build, breach cores, last team standing wins. Guns, gadgets, maps, meteor showers,
first/third person, ranks, missions, locker cosmetics, daily challenge, Junior Mode for kids with Bip the robot,
anti-glare comfort settings, 4 languages.

Risks (seen): the game's README describes it with another game's brand name ("…Wars-style"); the platform reads game
files, and brand names cost reach (`ip` dedup) and invite review risk. The audit lists it as a generic arcade game
outside the kid identity and an optional unpublish candidate.

## Team call

Dead and off-identity. Lowest priority. If Larisha still sends a wish, the only high-value change is cleanup: remove
any other game's name from the files and text, and shorten the path to the first fun moment. Title stays.

## Wish (paste into Astra)

```
GOAL
Clean up Asteroid Wars so it only describes itself, and make the first minute of a match fast and fun for a brand-new player. Keep the game exactly as players know it.

KEEP (do not change)
- Do not change the thumbnail.
- Keep the title, the teams and O2 Cores, minerals and generators, the shop, building and bridges, combat, guns and gadgets, all maps, meteor showers, first and third person, ranks, missions, the locker, the daily challenge, Junior Mode with Bip, the comfort settings and all languages.
- Keep the leaderboard exactly as it is.
- Keep every player's saved progress. Only add new save fields with safe defaults; never rename or reset existing ones.

CHANGE
1. Self-description only: remove every mention of other games or brands from the game's files, comments, text and descriptions, and describe the game only in its own words (for example "a 3D space base-defense brawler").
2. Fast first fun: on a first match, the player collects the first minerals within 5 seconds, a short glowing path leads to building a first bridge by about 20 seconds, and a friendly first enemy appears to defeat before 40 seconds.
3. Victory share card: after winning a match, show the player's astronaut next to their glowing O2 Core with the result, and a "Share" button that shares this picture using the game's built-in share feature.

VISUAL / VFX
- Mineral pickups arc into the player with sparkles; bridge blocks pop in with a small light ring; a core breach plays a slow-mo shockwave and shattering shield.
- Keep the anti-glare comfort balance: no harsh flashes.

AUDIO
- Satisfying pickup chimes, a solid "thunk" for each block, a deep boom on a core breach, a victory fanfare. Respect the existing sound settings.

PERFORMANCE
- Keep the existing quality fallback; target a stable 60 FPS on mid-range phones; pool all particles.
- Do not add any new external network requests while the game runs.

DO NOT
- Do not change the thumbnail. Do not change combat balance, bot rules or the leaderboard. Do not reset saves. Do not add ads or energy limits.

ACCEPTANCE CHECK
- No file or on-screen text mentions another game or brand.
- A brand-new player collects minerals within 5 seconds and builds a bridge by about 20 seconds.
- Winning a match shows a working Share button with a picture.
- No console errors; smooth on a phone-sized screen.
```

## Why (Indonesian)

Game ini "mati" dan di luar identitas game anak kita, jadi prioritasnya paling rendah. Yang paling penting dari wish ini adalah bersih-bersih: menghapus nama game lain dari file (nama merek bisa mengurangi jangkauan), lalu mempercepat menit pertama dan menambah share kemenangan.
