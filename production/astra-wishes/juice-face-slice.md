# Juice Face Slice: Fruit Frenzy — Astra wish

- Game id: `01M6ENMAWWN2K2F7VZSYPWNG5V` · first published 2026-11-03 (age 21.9 days on 2026-11-25) · 312 plays, ~0/day (dead per audit)
- Source read: published version on 2026-11-25 (README, `search_game_files`).
- Order: #27 of 50 live games, oldest first.

## What the game already has (seen in code)

Portrait 3D (Three.js inline) fruit-slicing arcade: swipe through cute fruit, avoid flies and bombs, fill the juice
glass to level up, SPECIAL, giant melon boss, six blade cosmetics, daily missions, ranked and unranked leaderboard
rules, keyboard controls, reduced motion, 7 languages.

Gaps (seen): no `lib.share` call.

## Team call

Dead, but still inside its 30-day window (8 days left), so an update gets a small boost if it is served at all.
Slicing is pure feel: make every slice juicy and the first 40 seconds packed. No rule changes. Title stays.

## Wish (paste into Astra)

```
GOAL
Make every slice in Juice Face Slice feel incredibly juicy and satisfying, and pack the first 40 seconds with fun moments for a brand-new player. Keep the game exactly as players know it.

KEEP (do not change)
- Do not change the thumbnail.
- Keep the title, swipe-to-slice and the keyboard controls, the cute fruit faces, flies and bombs and their warnings, the juice glass and levels, SPECIAL, the giant melon boss, blade cosmetics, daily missions, ranked and unranked rules, reduced motion and all 7 languages.
- Keep the leaderboard exactly as it is.
- Keep every player's saved progress. Only add new save fields with safe defaults; never rename or reset existing ones.

CHANGE
1. Packed first 40 seconds: on a first play, the first fruits come in easy, slow arcs right away (no text to read), a 3-fruit combo is easy to hit within 10 seconds, the juice glass fills to the first level-up by about 25 seconds, and a mini melon boss appears before 40 seconds.
2. Juice share card: at the end of a run, show the full juice glass with the score, best combo and the blade used, and a "Share" button that shares this picture using the game's built-in share feature. One tap; never blocks playing again.

VISUAL / VFX
- Slices: fruit splits into two halves with visible flesh and seeds, juice splashes in the fruit's color, droplets and pulp fly and stick to the screen edge for a moment, the fruit face makes a funny "oof" face.
- Blade: a bright trail in the blade's color with sparkles; combos make it longer and brighter.
- Combos: big bouncy combo numbers, a quick slow-mo on 5+ combos (off with reduced motion).
- Juice glass: the juice level sloshes and bubbles as it fills; a level-up makes it overflow with a sparkle fountain.
- Bombs: a cartoon smoke puff and a screen-edge flash. Boss: a big melon wobble with each hit and a juicy explosion at the end.
- Background: a sunny tropical beach stand with swaying palms, waves, floating fruit balloons, soft shadows, gentle bloom on juice highlights and the blade only, bright fruity color grading. Keep fruit, flies and bombs clearly readable.

AUDIO
- Crisp slice swishes, wet juicy splats with pitch rising per combo, a funny squeak from fruit faces, a glug when the glass fills, keep the tropical loop. Respect the sound toggle.

PERFORMANCE
- Target a stable 60 FPS on mid-range phones. Pool and reuse fruit halves, droplets and splats; use instancing for fruit; reuse materials. If FPS drops, reduce particles automatically first.
- Do not add new external network requests while the game runs.

DO NOT
- Do not change the thumbnail. Do not change scoring, ranked rules or the leaderboard. Do not reset saves. Do not add ads or energy limits.

ACCEPTANCE CHECK
- An existing save loads unchanged.
- A brand-new player hits a combo within 10 seconds and levels up the juice glass by about 25 seconds.
- Slices show halves, juice splashes and pulp; the run end has a working Share button with a picture.
- No console errors; smooth on a phone-sized screen in English, Indonesian and Arabic.
```

## Why (Indonesian)

Game ini "mati" tapi masih di dalam 30 hari pertama (sisa sekitar 8 hari), jadi update masih dapat sedikit boost kalau tersaji lagi. Wish ini bikin tiap potongan buah sangat juicy dan 40 detik pertama penuh momen seru, plus share gelas jus.
