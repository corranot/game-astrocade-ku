# 3D Date Stylist: Fashion & Romance — Astra wish

- Game id: `01M4RAG8B50E91E68TGC657XF3` · first published 2026-10-13 (age 43.2 days on 2026-11-25) · 69,989 plays, ~54/day, 36.8 shares per 1,000
- Source read: published version on 2026-11-25 (README, `search_game_files`).
- Order: #19 of 50 live games, oldest first.

## What the game already has (seen in code)

3D dress-up dating game (Three.js + VRM stage in a worker): style Lumi and Kai, plan the date (venue, time of day,
ride, meal, drink, dessert, gift, song) to match a date request with a theme, main style and palette. 3 acts with
mini-games, a rival couple face-off, stars, hearts, Signature Look combo, collection, daily missions, weekly
challenge, photo album of the last pose of each date (saved JPEGs), career ranks, leaderboard, 7 languages, haptics.

Gaps (seen): no `lib.share` call, although the photo album already makes the picture.

## Team call

Past its boost, ~54/day. The album photo already exists, so a Share button on it is the cheapest win. Make the
date scenes feel like a romantic movie (lighting, petals, camera). No rule changes. Title stays.

## Wish (paste into Astra)

```
GOAL
Make every date in 3D Date Stylist feel like a romantic movie scene, let players share the couple photos they are proud of, and give them a reason to come back for a new look each day. Keep the game exactly as players know it.

KEEP (do not change)
- Do not change the thumbnail.
- Keep the title, styling Lumi and Kai, every outfit and date option (venue, time of day, ride, meal, drink, dessert, gift, song), date requests with theme, style and palette, the 3 acts and their mini-games, the rival couple face-off, stars, hearts, the Signature Look combo, the collection, daily missions, the weekly challenge, the photo album, career ranks and all 7 languages.
- Keep the leaderboard exactly as it is.
- Keep every player's saved progress (hearts, collection, album photos, missions, weekly progress, ranks, settings). Only add new save fields with safe defaults; never rename or reset existing ones.

CHANGE
1. Share the date photo: on the result card and in the photo album, add a "Share" button that shares the couple photo with the date theme and stars, using the game's built-in share feature. One tap; never blocks continuing.
2. Daily Look: each day one style trend is "Today's Look" (for example Pastel Picnic, Neon Night, Garden Party); dates that match it pay bonus hearts once per day. Shown as a small chip on the title screen. Optional.
3. Instant start: a new player is choosing the first outfit piece within 2 seconds, with no text to read first.

VISUAL / VFX
- Outfit picks: a sparkle swirl around the character, the new piece appears with a soft shine, a little pose change.
- Signature Look: a runway-style spotlight, camera flashes and a glitter burst.
- Date scenes: the venue lighting follows the time of day (golden sunset, starry night with fairy lights, soft morning), petals or snowflakes drifting, candles flickering, reflections on water venues, a slow cinematic camera move during each act.
- Face-off and results: heart bursts, confetti and a soft glow for the winning couple; the camera frames them for the photo.
- Soft shadows, gentle bloom on lights, sparkles and hearts only, dreamy romantic color grading. Keep faces, outfits and choices clearly readable.

AUDIO
- A soft shimmer on each pick, a camera shutter on photos, a romantic swell when a Signature Look lands, venue ambience (café chatter, waves, night crickets), keep the chosen date song. Respect the existing sound settings.

UX / HUD
- Share buttons and the Today's Look chip match the current style, are thumb-sized and fit the screen in all 7 languages. No extra clutter during styling.

PERFORMANCE
- Target a stable 60 FPS on mid-range phones. Pool and reuse petals, sparkles, confetti and hearts; reuse materials; keep one shadow light. If FPS drops, reduce particles and shadow quality automatically first.
- Do not add new external network requests while the game runs.

DO NOT
- Do not change the thumbnail.
- Do not change scoring, chemistry rules, rewards or the leaderboard.
- Do not reset saves or delete album photos.
- Do not add ads, energy limits or paywalls.

ACCEPTANCE CHECK
- An existing save loads with the same hearts, collection and album photos.
- A new player picks the first outfit piece within 2 seconds.
- Each date scene shows time-of-day lighting and a cinematic camera; the result card and album have a working Share button with the photo.
- Today's Look appears once per day and pays once.
- No console errors; smooth on a phone-sized screen in English, Indonesian and Arabic.
```

## Why (Indonesian)

Album foto pasangan sudah ada, tinggal disambung ke tombol share, jadi ini kemenangan murah. Wish ini juga bikin setiap kencan terasa seperti adegan film romantis (cahaya senja, kelopak bunga, kamera sinematik) dan menambah Look Harian.
