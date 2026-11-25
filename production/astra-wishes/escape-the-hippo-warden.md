# Escape the Hippo Warden: Sneak & Chase — Astra wish

- Game id: `01M6M019TGZY9M9A561W4FFKY7` · first published 2026-11-07 (age 18.2 days on 2026-11-25) · 297 plays, ~2/day (dead per audit)
- Source read: published version on 2026-11-25 (README, `search_game_files`).
- Order: #30 of 50 live games, oldest first.

## What the game already has (seen in code)

3D (three.js r187 from cdnjs, ES modules) escape platformer: stick, camera swipe and JUMP; hop the giant snoring Z
platforms, sneak past the sleepy Hippo Warden and his lamp, hide under a blanket, spring pillows, stars and
checkpoint shards, HONK chase, three-phase Alarm-Clock Mech boss. Speedrun timer, alert meter, comic barks, daily
gift and streak, end celebration, leaderboard rival, settings for sound, haptics, shake and timer, 46 languages.

Gaps (seen): no `lib.share` call.

## Team call

Dead, inside its window (about 12 days left). Platformers often lose strangers in the first 40 seconds; make the
first stage short, funny and rewarding. No rule changes. Title stays.

## Wish (paste into Astra)

```
GOAL
Make the first minute of Escape the Hippo Warden funny, easy and rewarding, make the sleepy Warden and his world look charming and alive, and let players share their escapes. Keep the game exactly as players know it.

KEEP (do not change)
- Do not change the thumbnail.
- Keep the title, the stick, camera swipe and JUMP controls, the snoring Z platforms, the sleepy Hippo Warden, his lamp and HONK chase, the blanket hide, spring pillows, stars and checkpoint shards, the Alarm-Clock Mech boss, the speedrun timer, the alert meter, barks, daily gift and streak, the end celebration, the leaderboard rival, all settings and all languages.
- Keep the leaderboard exactly as it is.
- Keep every player's saved progress and best times. Only add new save fields with safe defaults; never rename or reset existing ones.

CHANGE
1. Easy, funny first stage: on a first play, the first 20 seconds are a short safe path with a big bouncy Z platform, a star right after the first jump and a spring pillow launch; the first sneak past the snoring Warden happens before 30 seconds with an obvious blanket to hide under, and the first stage ends with a celebration before 60 seconds.
2. Escape share card: at the end of a stage, show the kid waving next to the still-snoring Warden with the time and stars, and a "Share" button that shares this picture using the game's built-in share feature. One tap; never blocks the next stage.

VISUAL / VFX
- Snoring: the Warden's belly rises and falls, big Z letters float up and wobble when you land on them, little snot bubbles grow and pop.
- Jumps and springs: landing dust, a squash and stretch on the kid, a ring launch from spring pillows with feathers puffing out.
- Lamp: a soft volumetric cone with dust motes; when it sweeps near, the screen edge dims gently.
- HONK chase: a cartoon shockwave from the honk, papers and pillows flying.
- World: a cozy night bedroom-castle with moonlight, fireflies, swaying curtains, ticking clocks, soft shadows, gentle bloom on Z letters, stars and the lamp only, bold color grading. Keep platforms and the path clearly readable.

AUDIO
- Deep comic snores that sync with the Z letters, boingy springs, a feather poof, a loud HONK, tiptoe steps, a happy sting on stage clear. Respect the existing sound settings.

PERFORMANCE
- Target a stable 60 FPS on mid-range phones with the existing graphics watchdog. Pool and reuse dust, feathers and Z letters; use instancing for repeated props; reuse materials.
- Do not add new external network requests while the game runs.

DO NOT
- Do not change the thumbnail. Do not change the Warden's chase rules, boss rules, timer logic or the leaderboard. Do not reset saves or best times. Do not add ads or energy limits.

ACCEPTANCE CHECK
- An existing save loads with the same progress and best times.
- A brand-new player gets a star within 20 seconds and sneaks past the Warden before 30 seconds.
- The Warden's snoring Z letters wobble when landed on; a stage clear shows a working Share button with a picture.
- No console errors; smooth on a phone-sized screen in English, Indonesian and Arabic.
```

## Why (Indonesian)

Game platformer sering kehilangan pemain baru di 40 detik pertama, jadi wish ini bikin tahap pertama pendek, lucu dan cepat memberi hadiah (bintang di 20 detik, lolos dari Warden sebelum 30 detik), plus dunia yang lebih hidup dan share hasil kabur.
