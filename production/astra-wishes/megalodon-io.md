# Megalodon.io: Eat & Evolve — Astra wish

- Game id: `01M4G7RFBHSTXHGB5NWW9EDBMG` · first published 2026-10-09 (age 47.1 days on 2026-11-25) · 21,640 plays, ~20/day, 41.0 shares per 1,000
- Source read: published version on 2026-11-25 (README, `search_game_files`).
- Order: #18 of 50 live games, oldest first.

## What the game already has (seen in code)

3D (Three.js) underwater eat-and-grow arcade: start as a Guppy, eat smaller fish, avoid bigger rivals, evolve through
eight stages to Megalodon and Leviathan. Bot rivals with pack hunting and a nemesis, eight event types rotating every
30 s, bosses, kill-cam with slow-mo, upgrades, 3 daily missions, 6 skins, first-run shield, leaderboard, 7 languages,
haptics with boost rumble.

Gaps (seen): no `lib.share` call (high share rate from host prompts).

## Team call

Past its boost, ~20/day. Make the ocean gorgeous and the evolve moment epic, share the final form. A daily "Deep
Dive" ocean variant for return visits. No rule changes. Title stays.

## Wish (paste into Astra)

```
GOAL
Make the ocean in Megalodon.io breathtaking and alive, make every bite and every evolution feel powerful, and let players share the biggest creature they became. Keep the game exactly as players know it.

KEEP (do not change)
- Do not change the thumbnail.
- Keep the title, the controls, eating smaller fish and avoiding bigger ones, all eight evolution stages to Megalodon and Leviathan, the bot rivals with pack hunting and the nemesis, the eight rotating events, bosses, the kill-cam, upgrades, daily missions, skins, the first-run shield and all 7 languages.
- Keep the leaderboard exactly as it is.
- Keep every player's saved progress (coins, upgrades, skins, missions, best score, settings). Only add new save fields with safe defaults; never rename or reset existing ones.

CHANGE
1. Final form share card: on the post-run screen, show the biggest creature the player reached in a dramatic pose with its name, mass and rank, and a "Share" button that shares this picture using the game's built-in share feature. One tap; never blocks playing again.
2. Daily Deep Dive: each day the ocean has a different mood (Coral Reef, Kelp Forest, Midnight Trench, Sunken Ship) with a one-time coin bonus for reaching Megalodon there. Optional.
3. Instant start: a new player is swimming and eating the first fish within 1 second, with no text to read.

VISUAL / VFX
- Eating: a bite chomp with bubbles and small fish-scale sparkles; eating a rival gives a bigger burst, a ring shockwave in the water and the existing kill-cam.
- Evolution: the creature glows, spins inside a whirl of bubbles and light, and grows into the new form with a shockwave that pushes nearby fish away.
- Boost: a bubble trail and water streaks.
- Ocean life: god rays from the surface, moving caustics on the sand, swaying kelp and coral, schools of tiny fish that swirl away from the player, jellyfish glowing in the deep, floating particles, depth fog that gets bluer further away, soft shadows, gentle bloom on glowing creatures and caustics only, rich ocean color grading. Keep prey and danger markers clearly readable.

AUDIO
- Underwater muffled ambience, a crunchy chomp scaled by size, a deep roar and rising swell on evolution, bubble bursts on boost, a tense low tone when a boss appears. Respect the existing sound settings.

UX / HUD
- Share button and the Deep Dive chip match the current style, are thumb-sized and fit the screen in all 7 languages. No extra clutter while swimming.

PERFORMANCE
- Target a stable 60 FPS on mid-range phones. Use instancing for fish schools, kelp and coral; pool bubbles and sparkles; reuse materials. If FPS drops, reduce god rays, fog detail and particles automatically first.
- Do not add new external network requests while the game runs.

DO NOT
- Do not change the thumbnail.
- Do not change growth speed, rival behavior, events, rewards or the leaderboard.
- Do not reset saves.
- Do not add ads, energy limits or paywalls.

ACCEPTANCE CHECK
- An existing save loads with the same coins, upgrades and skins.
- A new player eats the first fish within 1 second.
- Evolving shows the glow, bubble whirl and shockwave; the post-run screen has a working Share button with a picture.
- The Daily Deep Dive appears once per day and pays once.
- No console errors; smooth on a phone-sized screen in English, Indonesian and Arabic.
```

## Why (Indonesian)

Wish ini bikin laut jauh lebih indah dan hidup (sinar dari permukaan, kawanan ikan, kelp bergoyang) dan evolusi terasa epik, plus share wujud terbesar dan Deep Dive harian. Aturan tumbuh, rival dan leaderboard tidak diubah.
