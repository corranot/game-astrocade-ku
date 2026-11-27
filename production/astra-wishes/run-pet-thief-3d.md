# RUN! Pet Thief 3D — Astra wish

- Game id: `01KZP4G80SRT1BPK5D91XD3VKR` · first published 2026-08-10 (age 106.7 days on 2026-11-25) · 113,107 plays, ~28/day, 22.0 shares per 1,000
- Source read: published version on 2026-11-25 (README, `docs/ROADMAP.md`, file list, `search_game_files` on `index.html` 3.36 MB inline Three.js + Rapier).
- Order: #4 of 50 live games, oldest first.

## What the game already has (seen in code)

Steal rare pet statues from temple ruins, outrun the Stone Golem over collapsing bridges, deposit at a coin-earning
base. 5 temples/biomes, 30 pets with buddy abilities, upgrades, rebirth, daily streak, quests, leaderboard, cloud
save, 8 languages. Golem emotes, adaptive assist after losses (never faster than the hero), perfect-escape +25%,
collection X/30 on the result card, Head Start consumable, Star/Aurora trails, Everglow Planter decor, danger
vignette + heartbeat, Less shake setting, adaptive quality levels.

Gaps (seen): no `lib.share` call. Base decor beyond one planter is listed as "Next" in its own roadmap.

## Team call

The "steal and run" genre is hot platform-wide (audit), but this game is past its boost and slow (~28/day). Cheap,
high-value levers: make the chase more thrilling to watch (live preview sells it), a share card for a perfect
escape or a new rare pet, and a daily heist event. No rule or balance changes. Title stays.

## Wish (paste into Astra)

```
GOAL
Make every chase in RUN! Pet Thief 3D feel more thrilling and cinematic, let players share their best escapes and rare pets, and give them a reason to come back every day. Keep the game exactly as players know it.

KEEP (do not change)
- Do not change the thumbnail.
- Keep the title, the core loop (sneak into the temple, grab a pet statue, outrun the Stone Golem, deposit at the base), all 5 temples, all 30 pets and their buddy abilities, upgrades, rebirth, daily streak, quests, Head Start, trails, the Everglow Planter, Golem emotes, the adaptive assist (the Golem is never faster than the hero), the perfect-escape bonus and all 8 languages.
- Keep the leaderboard exactly as it is.
- Keep every player's saved progress (coins, level, pets, collection, upgrades, rebirths, streak, cosmetics, stats, settings). Only add new save fields with safe defaults; never rename or reset existing ones.

CHANGE
1. Escape share card: on the result card, add a "Share" button. It shares a picture of the hero holding the stolen pet with the angry Golem behind, the pet's rarity and the collection count (for example 12/30), using the game's built-in share feature. Highlight it with a glow when the run was a perfect escape or the pet is new. One tap; never blocks RUN AGAIN.
2. Daily Golden Heist: once per day, one temple holds a golden pet statue that pays triple coins when delivered. A small golden marker on the temple select shows where it is. Optional, never blocks normal runs.
3. More base decor: add 3 new one-time coin decor items for the base (for example a pet fountain, glowing lanterns, a little trophy shelf that shows collected pets). They appear in 3D at the base without blocking the deposit pad.
4. Instant start: a new player can move within 1 second with no text to read, and makes the first steal within 30 seconds.

VISUAL / VFX
- Chase: the Golem's footsteps crack the ground and throw rock chunks and dust, the camera shakes gently with each stomp (respect "Less shake"), bridges crumble with falling stones and dust clouds, the hero leaves a dust trail when sprinting, and leaves and pebbles scatter on close calls.
- Steal moment: the statue lifts off its pedestal with a light beam, sparkles and a temple rumble; the Golem's eyes light up as he wakes.
- Deposit: coins burst out of the pad and fly into the HUD counter, a ring shockwave and confetti for new pets.
- Temples: drifting mist, swaying vines, glowing runes, fireflies, light shafts through ruins, soft shadows, gentle bloom on glowing runes and pets only, rich color grading per biome. Keep paths and the Golem clearly readable.

AUDIO
- Heavy stone stomps that get louder as the Golem closes in, crumbling bridge sounds, a whoosh on near misses, a magical chime when grabbing the statue, a coin shower on deposit, a heroic sting on a perfect escape. Respect the existing sound settings.

UX / HUD
- The share button, the golden marker and the new decor in the shop match the current style, are thumb-sized and fit the screen in all 8 languages. No extra clutter during the chase.

PERFORMANCE
- Target a stable 60 FPS on mid-range phones with the existing adaptive quality levels. Pool and reuse all rocks, dust and coin particles; use instancing for repeated ruins and plants; reuse materials. On low quality, drop extra particles first.
- Do not add any new external network requests while the game runs.

DO NOT
- Do not change the thumbnail.
- Do not change Golem speed rules, prices, rewards or the leaderboard.
- Do not reset saves.
- Do not add ads, energy limits or paywalls.

ACCEPTANCE CHECK
- An existing save loads with the same coins, pets, collection, upgrades and cosmetics.
- A new player moves within 1 second and steals the first pet within 30 seconds.
- The chase shows stomp cracks, debris and crumbling bridges; the result card has a working Share button with a picture.
- The Daily Golden Heist appears once per day and pays triple once.
- The 3 new decor items can be bought once each and show at the base.
- No console errors; smooth on a phone-sized screen in English, Indonesian and Arabic.
```

## Why (Indonesian)

Genre "curi lalu kabur" sedang ramai, jadi wish ini bikin kejaran Golem lebih seru dilihat (retak tanah, jembatan runtuh), menambah tombol share kabur sempurna, Golden Heist harian, dan 3 dekorasi base baru. Aturan Golem, harga dan leaderboard tidak diubah.
