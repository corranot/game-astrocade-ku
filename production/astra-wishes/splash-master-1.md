# Splash Master #1: Waterpark Dive — Astra wish

- Game id: `01KZKHJZ4JD9K79DZW8V8CGZ4B` · first published 2026-08-09 (age 107.9 days on 2026-11-25) · 217,444 plays (our biggest), ~340/day, 32.8 shares per 1,000
- Source read: published version on 2026-11-25 (README, file list, `search_game_files` on `index.html`, 1.19 MB inline Three.js module).
- Order: #3 of 50 live games, oldest first.

## What the game already has (seen in code)

Eat snacks to grow giant, climb towers (7 tower tiers, 150 → 220K coins), charge and dive, splash class sweeps the
resort. Worlds, rebirth (towers kept), pets and eggs, quests, daily gifts, rival NPC divers with speech bubbles,
leaderboard on lifetime coins (`S.total`), best splash on the result card, haptics with charge/fall rumble,
creator settings (character colors, speed, food, coin multipliers), 7 languages.

Gaps (seen): no `lib.share` call. Share rate is already high (host replay prompt), so a share card of the
splash should lift it further.

## Team call

Our biggest game, past its boost, still ~340 plays a day. Protect it: polish only, no rule changes. The splash is the
peak moment: make it spectacular and shareable. Add a light daily challenge for return visits. Leaderboard stays on
lifetime coins. Title stays (the "#1" is part of the series with Splash Master #2).

## Wish (paste into Astra)

```
GOAL
Make the dive and the splash in Splash Master #1 look and feel spectacular, let players share their biggest splash, and give them a small reason to return every day. Keep the game exactly as players know it.

KEEP (do not change)
- Do not change the thumbnail.
- Keep the title, the core loop (eat snacks, grow, climb the tower, charge, dive, splash), all towers and their prices, worlds, rebirth, pets and eggs, quests, daily gifts, the rival divers and their speech bubbles, the creator settings and all 7 languages.
- Keep the leaderboard exactly as it is (lifetime coins).
- Keep every player's saved progress (coins, lifetime coins, towers, pets, worlds, rebirths, quests, best splash, settings). Only add new save fields with safe defaults; never rename or reset existing ones.

CHANGE
1. Splash share card: on the result card after a dive, add a "Share" button. It shares a picture of the player's splash at its peak, with the splash size and the tower name, using the game's built-in share feature. If it is a new best, the card says "NEW BEST!". One tap; never blocks diving again.
2. Daily Splash Goal: each day a target splash size appears on the tower ("Today: make a 50 m splash!"). Hitting it gives a coin chest and an egg once per day. Small, optional, never blocks play.
3. Instant start: a new player can move and eat the first snack within 1 second, with no text to read, and makes the first dive within 30 seconds.

VISUAL / VFX
- Dive: wind streaks and a body trail while falling, a slight camera zoom and FOV push just before impact.
- Splash: layered water crown, a tall water column, foam ring, spray particles, droplets that rain back down, ripples that spread across the whole pool, floating pool toys and swimmers that get pushed outward, and a brief slow-motion frame at the peak for big splashes. Bigger splash class means bigger layers.
- Resort life: palm trees swaying, sparkling caustics on the pool floor, water slides with flowing water, inflatable toys bobbing, sunbathers, seagulls, a soft summer haze in the distance.
- Lighting: warm sunny key light with soft shadows, gentle bloom on water highlights and sparkles only, bright summery color grading. Keep the HUD and the tower clearly readable.

AUDIO
- Rising whoosh while falling, a deep WHOOMPH plus layered splash sound scaled by splash class, crowd cheers and whistles for big splashes, a camera-shutter sound when sharing, a happy jingle for the daily goal. Respect the existing sound settings.

UX / HUD
- Share button and the daily goal sign match the current style, are thumb-sized and fit the screen in all 7 languages. No extra clutter while climbing or falling.

PERFORMANCE
- Target a stable 60 FPS on mid-range phones. Pool and reuse all water particles and droplets; use instancing for repeated props (palms, toys, chairs); reuse materials. If FPS drops, reduce particles and shadow quality automatically first.
- Do not add any new external network requests while the game runs.

DO NOT
- Do not change the thumbnail.
- Do not change the leaderboard, prices, growth speed or splash rules.
- Do not reset saves.
- Do not add ads, energy limits or paywalls.

ACCEPTANCE CHECK
- An existing save loads with the same coins, towers, pets, worlds and rebirths.
- A new player eats a snack within 1 second and dives within 30 seconds.
- A big splash shows the layered water effects, and the result card has a working Share button with a picture.
- The Daily Splash Goal appears once per day and pays once.
- No console errors; smooth on a phone-sized screen in English, Indonesian and Arabic.
```

## Why (Indonesian)

Game terbesar kita (217K plays), jadi wish ini hanya polish: splash berlapis yang spektakuler, tombol share splash terbaik, dan target splash harian. Leaderboard, harga dan aturan tidak diubah supaya pemain lama tetap nyaman.
