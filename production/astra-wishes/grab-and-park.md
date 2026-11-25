# Grab and Park: Car Tycoon — Astra wish

- Game id: `01M5E0WJN48YN5H2H0979RMT4P` · first published 2026-10-23 (age 33.5 days on 2026-11-25) · 24,983 plays, ~705/day (window just closed), 34.3 shares per 1,000
- Source read: published version on 2026-11-25 (README, `search_game_files`).
- Order: #22 of 50 live games, oldest first.

## What the game already has (seen in code)

Low-poly 3D car-collector idle tycoon: grab cars, park them in your garage, earn coins, raid rivals, upgrade and
rebirth. The core is a prebuilt Rust/WASM module (inline base64) with no source in the game files; a JS bridge
forwards sound and game events (`window.__sacFx(id)`) and state (`window.__sacFrame(M)`). Outer JS layers add
haptics, shake/flash/confetti, chase vignette, engine rumble, daily missions, streak and achievements (7 languages,
Arabic RTL) and first-play guidance.

Gaps (seen): no `lib.share` call. The core driving, parking, economy and police cannot be changed without the
original source, so a wish must stay in the outer layer.

## Team call

Still ~700 plays a day just after its 30-day window: protect it. Ask Astra only for what the outer layer can do:
overlay effects driven by the existing event ids, a share card from the existing state, and a mission tweak. A full
3D remake is out of reach because the core is compiled. Title stays.

## Wish (paste into Astra)

```
GOAL
Make Grab and Park feel more exciting and rewarding with extra effects, sounds and a share moment around the existing game, without touching the core game itself.

KEEP (do not change)
- Do not change the thumbnail.
- Do not modify, rebuild or replace the built-in core game module or how it is loaded. Keep driving, grabbing, parking, the garage, coins, raids, police, upgrades, rebirth, the save and the leaderboard exactly as they are.
- Keep the existing daily missions, streak, achievements, first-play guidance, haptics, effects and all 7 languages including Arabic.
- Keep every player's saved progress. Only add new fields to the extra (non-core) save data, with safe defaults.

CHANGE
1. Garage share card: when the player parks a new car or reaches a coin milestone, show a small "Share" button for a few seconds that shares a snapshot of the game screen with the car count and coins, using the game's built-in share feature. One tap; it must never cover the controls or block play.
2. Collector milestones: add celebration banners at 10, 25, 50 and 100 cars parked (confetti, a gold flash, a fanfare), using only the existing game events and state.
3. Daily mission polish: make the daily mission card more exciting with progress bars that fill with a sparkle, a chest that opens when all three are done, and a streak flame that grows each day.

VISUAL / VFX (overlay layer only)
- On grab: a quick spark ring and a "GRAB!" pop at the screen center.
- On park: a coin fountain overlay, a soft gold screen-edge glow.
- On raid and police chase: keep the existing vignette, add speed lines at the screen edges.
- On rebirth: a full-screen light burst and confetti.
- Keep all overlays light and short so the game stays readable; respect the reduced-motion preference.

AUDIO
- A crisp grab whoosh, a satisfying coin cascade on park, a short fanfare for milestones and the mission chest, using the existing sound system. Respect the existing sound settings.

UX / HUD
- New buttons and banners match the current mission UI style, are thumb-sized, never cover the joystick or action buttons, and fit the screen in all 7 languages.

PERFORMANCE
- Keep overlays cheap: pool and reuse particles, use CSS or a single small canvas, no per-frame layout work. Target a stable 60 FPS on mid-range phones.
- Do not add new external network requests while the game runs.

DO NOT
- Do not change the thumbnail.
- Do not touch the core game module, its economy or its controls.
- Do not reset saves or change the leaderboard.
- Do not add ads, energy limits or paywalls.

ACCEPTANCE CHECK
- An existing save loads with the same cars, coins and upgrades.
- Grabbing and parking show the new effects; the share button appears after parking a new car and shares a snapshot.
- Milestone banners appear at 10, 25, 50 and 100 cars.
- No console errors; smooth on a phone-sized screen in English, Indonesian and Arabic.
```

## Why (Indonesian)

Inti game ini modul jadi (compiled) tanpa source, jadi wish ini sengaja hanya menambah lapisan luar: efek saat grab dan parkir, tombol share, banner milestone, dan kartu misi harian yang lebih seru. Game ini masih sekitar 700 plays per hari, jadi intinya tidak disentuh sama sekali.
