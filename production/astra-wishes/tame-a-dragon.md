# Tame a Dragon: Sky Riders — Astra wish

- Game id: `01M4376DX6B79P5T3QBM14YBF9` · first published 2026-10-04 (age 52.1 days on 2026-11-25) · 3,016 plays, ~38/day (uptick: 109/day in the last 4 h of the audit), 26.9 shares per 1,000
- Source read: published version on 2026-11-25 (README, `search_game_files`).
- Order: #13 of 50 live games, oldest first.

## What the game already has (seen in code)

3D (Three.js + Rapier) flight game: fly a dragon across 6 sky islands, hold TAME behind wild dragons to bond, let go
when the button flashes RED for a Perfect. 30 species, evolve to Mythic, tame each island's Elder, dragon
personalities per island, progressive HUD (tier 0: fly/boost/TAME only), 7-day streak, quests, session goal chip,
evolution reveal with sunburst and beam, leaderboard, adaptive graphics quality, haptics with TAME rumble, several
languages, creator settings (difficulty, adaptive, flight speed, gem boost, vibration).

Gaps (seen): no `lib.share` call.

## Team call

Small but showing an uptick. The tame-and-evolve reveal is the peak; make the sky gorgeous and the tame moment
cinematic, and share the new dragon. Title stays.

## Wish (paste into Astra)

```
GOAL
Make flying and taming in Tame a Dragon feel breathtaking and cinematic, let players share their newly tamed and evolved dragons, and give them a reason to come back daily. Keep the game exactly as players know it.

KEEP (do not change)
- Do not change the thumbnail.
- Keep the title, flying controls, boost, the hold-TAME mechanic with the RED Perfect release, all 30 species and their personalities, evolving to Mythic, the island Elders, all 6 islands, the progressive HUD, the 7-day streak, quests, the session goal, the creator settings and all languages.
- Keep the leaderboard exactly as it is.
- Keep every player's saved progress (dragons, evolutions, gems, upgrades, Elders tamed, streak, quests, settings). Only add new save fields with safe defaults; never rename or reset existing ones.

CHANGE
1. New Dragon share card: after a successful tame or an evolution, show a "Share" button on the new-dragon card. It shares a picture of the dragon with its rarity rim, its name and the Dragon-dex count (for example 9/30), using the game's built-in share feature. One tap; never blocks flying.
2. Sky Festival: once per day, a flock of rare glowing dragons passes over one island for a few minutes, with a bonus gem reward for taming one. Optional; a small chip shows where it is.
3. Instant start: a new player is flying within 1 second with no text to read, and attempts the first tame within 20 seconds.

VISUAL / VFX
- Flight: wing-tip trails, wind streaks on boost, clouds that part around the dragon, a gentle FOV push on boost.
- Taming: a glowing bond ribbon between rider and wild dragon that brightens as the bond grows, sparks and a red pulse ring during RED, a golden burst and slow-mo on a Perfect release, the tamed dragon doing a happy loop.
- Evolution: keep the beam and sunburst, add swirling rarity-colored particles and a shockwave.
- Sky: floating islands with waterfalls pouring into the clouds, drifting cloud layers with soft volumetric look, birds, sun rays at golden hour, auroras at night, soft shadows, gentle bloom on magic and gems only, dreamy color grading. Keep wild dragons and the TAME button clearly readable.

AUDIO
- Wing flaps and wind that rise with speed, a magical rising tone while holding TAME, a sharp warning chime on RED, a triumphant roar and choir on a Perfect tame, airy sky music. Respect the existing sound settings.

UX / HUD
- Share button and the Sky Festival chip match the current style, are thumb-sized and fit the screen in all languages. Keep the progressive HUD; no extra clutter while flying.

PERFORMANCE
- Keep the adaptive graphics quality and target a stable 60 FPS on mid-range phones. Pool and reuse trails, sparks and cloud particles; use instancing for clouds, rocks and trees; reuse materials. On low quality, drop extra cloud layers and particles first.
- Do not add new external network requests while the game runs.

DO NOT
- Do not change the thumbnail.
- Do not change tame difficulty, the RED timing, prices or the leaderboard.
- Do not reset saves.
- Do not add ads, energy limits or paywalls.

ACCEPTANCE CHECK
- An existing save loads with the same dragons, evolutions, gems and Elders.
- A new player flies within 1 second and tries a tame within 20 seconds.
- A Perfect tame shows the bond ribbon, golden burst and slow-mo; the new-dragon card has a working Share button with a picture.
- The Sky Festival appears once per day.
- No console errors; smooth on a phone-sized screen in English, Indonesian and Arabic.
```

## Why (Indonesian)

Game ini sedang naik sedikit, jadi wish ini bikin langit dan momen menjinakkan naga jauh lebih sinematik (pita ikatan bercahaya, ledakan emas saat Perfect), plus share naga baru dan Festival Langit harian. Tingkat kesulitan dan leaderboard tidak diubah.
