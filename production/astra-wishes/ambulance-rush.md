# Ambulance Rush: City Rescue — Astra wish

- Game id: `01M2RGTJT86J3JEW95HMVYYX4A` · first published 2026-09-19 (age 66.7 days on 2026-11-25) · 32,484 plays, ~17/day, 8.9 shares per 1,000
- Source read: published version on 2026-11-25 (README, `search_game_files` on `index.html`).
- Order: #7 of 50 live games, oldest first.

## What the game already has (seen in code)

3D Three.js r186 city driving (ACES tone mapping, UnrealBloomPass, PCF shadows, instanced clouds, graphics tiers).
Hold GO to drive, pick up patients and rescue them, turbo, near misses, timed shifts, Code Red, mission events
(golden-hour, payday-run, safe-drive and 8 more), Weekly Hero tiers, 10 medals, daily quests, garage upgrades and
collection, new-best celebration, haptics, 7 languages. Three.js loads from cdnjs.

Gaps (seen): no `lib.share` call; low share rate (8.9 per 1,000).

## Team call

Slow (~17/day), past its boost. Cheap levers only: a hero share card after a rescue shift, more drama in the drive
(sirens, traffic reactions), and a daily rescue goal. No rule changes. Title stays.

## Wish (paste into Astra)

```
GOAL
Make every ambulance run in Ambulance Rush feel more urgent, heroic and alive, let players share their best shift, and give them a reason to come back daily. Keep the game exactly as players know it.

KEEP (do not change)
- Do not change the thumbnail.
- Keep the title, the controls (hold GO to drive), patient pickups and rescues, turbo, near misses, timed shifts, Code Red, all mission events, Weekly Hero, medals, daily quests, the garage and collection, the new-best celebration and all 7 languages.
- Keep the leaderboard exactly as it is.
- Keep every player's saved progress (coins, upgrades, collection, medals, weekly saves, quests, best score, settings). Only add new save fields with safe defaults; never rename or reset existing ones.

CHANGE
1. Hero share card: on the shift report, add a "Share" button. It shares a picture of the player's ambulance with lights flashing, the number of patients saved and the score, using the game's built-in share feature. Mark a new best clearly. One tap; never blocks "Play again".
2. Daily Rescue Goal: each day a simple goal ("Save 8 patients in one shift") pays a coin bonus once. Shown as a small chip on the start screen. Optional.
3. Instant start: a new player starts driving on the first tap with no text to read, and makes the first rescue within 20 seconds (as now).

VISUAL / VFX
- Siren lights that sweep red and blue across nearby buildings and the road, with soft bloom.
- Traffic reacts: cars pull aside with a little hop, pedestrians wave and cheer when a patient is delivered.
- Turbo: speed lines, exhaust flame, a slight camera FOV push. Near miss: a spark streak and a quick slow-mo tick.
- Crash: small bumper debris, a dust puff and a short camera shake.
- Rescue: the patient gets a heart burst and a "SAVED!" pop, the hospital doors glow.
- City life: moving clouds, swaying trees, birds, flickering shop signs at dusk, soft shadows, warm city color grading. Keep the road and patients clearly visible.

AUDIO
- A clear two-tone siren that pans with the camera, engine rise on turbo, a crisp whoosh on near misses, a thud on crashes, a heroic chime and crowd cheer on rescue. Respect the existing sound settings.

UX / HUD
- Share button and the daily goal chip match the current style, are thumb-sized and fit the screen in all 7 languages. No extra clutter while driving.

PERFORMANCE
- Keep the existing graphics tiers and target a stable 60 FPS on mid-range phones. Pool and reuse all particles and debris; use instancing for repeated buildings, trees and cars; reuse materials. On low tiers, drop extra effects first.
- Do not add new external network requests while the game runs.

DO NOT
- Do not change the thumbnail.
- Do not change scoring, rewards, prices or the leaderboard.
- Do not reset saves.
- Do not add ads, energy limits or paywalls.

ACCEPTANCE CHECK
- An existing save loads with the same coins, upgrades, collection and medals.
- A new player drives on the first tap and rescues a patient within 20 seconds.
- Sirens light up the street, traffic pulls aside, and the shift report has a working Share button with a picture.
- The Daily Rescue Goal appears once per day and pays once.
- No console errors; smooth on a phone-sized screen in English, Indonesian and Arabic.
```

## Why (Indonesian)

Wish ini bikin setiap perjalanan ambulans terasa lebih genting dan heroik (sirene menyapu gedung, mobil minggir, warga bersorak), plus tombol share hasil shift dan target penyelamatan harian. Skor, hadiah dan leaderboard tidak diubah.
