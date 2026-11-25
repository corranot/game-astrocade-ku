# Splash Master #2 — Astra wish

- Game id: `01KZYC4AF96QEJVYP7GYNRN5QJ` · first published 2026-08-18 (age 98.7 days on 2026-11-25) · 152,871 plays, ~101/day, 50.8 shares per 1,000
- Source read: published version on 2026-11-25 (README, file list, `search_game_files` on `index.html` 1.39 MB inline Three.js).
- Order: #5 of 50 live games, oldest first.

## What the game already has (seen in code)

3D pool game: eat snacks to grow, climb towers, rides (cannon, trampoline), cannonball for huge splashes. Shop,
missions, Rush, pets, stages, NPC divers, 14 badges, rebirth after the Mega Spire (+50% coins, +10% splash per
rebirth), day/night cycle (night ×1.25 coins), rainbow event ×2, progressive HUD (Missions after 1 dive, Badges
after 2, Rush after 3), leaderboard, haptics, 7 languages, creator tuning.

Gaps (seen): no `lib.share` call. It already has the best share rate of the older games, so a picture card of the
splash should add more.

## Team call

Healthy older game, past its boost. Polish only, and make it look clearly different from Splash Master #1 so the two
do not blur together: lean into the rides and the day/night party. Share card at the splash; a daily ride challenge
for return visits. Title stays (series name).

## Wish (paste into Astra)

```
GOAL
Make the rides, the cannonball and the splash in Splash Master #2 look and feel spectacular, let players share their biggest splash, and give them a reason to come back every day. Keep the game exactly as players know it.

KEEP (do not change)
- Do not change the thumbnail.
- Keep the title, the core loop (eat snacks, grow, climb, use rides, cannonball into the pool), the shop, missions, Rush, pets, stages, NPC divers, the 14 badges, rebirth, the day/night cycle and its night bonus, the rainbow event, the progressive HUD (Missions, Badges and Rush appear step by step), the creator settings and all 7 languages.
- Keep the leaderboard exactly as it is.
- Keep every player's saved progress (coins, upgrades, towers, pets, stages, badges, rebirths, settings). Only add new save fields with safe defaults; never rename or reset existing ones.

CHANGE
1. Splash share card: on the splash result, add a "Share" button. It shares a picture of the player's splash at its peak, with the splash size, using the game's built-in share feature. Mark a new best with "NEW BEST!". One tap; never blocks playing again.
2. Daily Ride Challenge: each day one ride (cannon, trampoline or a tower) is the "Ride of the Day" and gives double coins for its first 3 splashes. A small glowing marker shows which ride it is. Optional; never blocks play.
3. Pool Party at night: at night, add colorful floating lanterns, pool lights under the water and a few dancing NPCs at the poolside. Purely visual; keep the existing night bonus.
4. Instant start: a new player can move and eat the first snack within 1 second, with no text to read, and makes the first splash within 30 seconds (keep the existing coach hand and arrows).

VISUAL / VFX
- Rides: cannon blast with smoke ring and confetti, trampoline stretch with a bounce shockwave, speed lines and a body trail in the air.
- Splash: layered water crown, tall column, foam ring, spray, droplets raining back down, ripples across the pool, floating toys pushed outward, a short slow-motion frame at the peak of big splashes.
- World life: swaying palms, caustics on the pool floor, bobbing inflatables, birds by day, stars and lanterns by night, soft haze in the distance.
- Lighting: warm sun with soft shadows by day, colorful pool lights by night, gentle bloom on water highlights, lanterns and sparkles only, bright color grading. Keep the HUD readable.

AUDIO
- Cannon BOOM, springy trampoline boing, rising whoosh in the air, a deep layered splash sound scaled by splash size, crowd cheers for big splashes, a camera-shutter sound when sharing, soft party music at night. Respect the existing sound settings.

UX / HUD
- Share button and the ride marker match the current style, are thumb-sized and fit the screen in all 7 languages. Keep the progressive HUD; no extra clutter while flying.

PERFORMANCE
- Target a stable 60 FPS on mid-range phones. Pool and reuse all water, smoke and confetti particles; use instancing for palms, lanterns and pool toys; reuse materials. If FPS drops, reduce particles and shadows automatically first.
- Do not add any new external network requests while the game runs.

DO NOT
- Do not change the thumbnail.
- Do not change prices, growth speed, splash rules, rebirth math or the leaderboard.
- Do not reset saves.
- Do not add ads, energy limits or paywalls.

ACCEPTANCE CHECK
- An existing save loads with the same coins, upgrades, pets, badges and rebirths.
- A new player eats a snack within 1 second and splashes within 30 seconds.
- A big splash shows the layered water effects, and the result has a working Share button with a picture.
- The Ride of the Day appears once per day and pays double for its first 3 splashes.
- Night shows lanterns, pool lights and dancing poolside NPCs.
- No console errors; smooth on a phone-sized screen in English, Indonesian and Arabic.
```

## Why (Indonesian)

Wish ini menambah share foto splash, Ride of the Day, dan pesta kolam di malam hari, plus efek wahana dan splash yang lebih megah. Sengaja dibedakan dari Splash Master #1 (fokus ke wahana dan malam) supaya kedua game tidak terlihat sama.
