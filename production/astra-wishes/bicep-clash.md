# Bicep Clash: Arm Wrestling Clicker — Astra wish

- Game id: `01KZFXPKRZM322JPN7PTFTAJ89` · first published 2026-08-08 (age 108.8 days on 2026-11-25) · 36,166 plays, ~54/day, 21.2 shares per 1,000
- Source read: published version on 2026-11-25 via `list_game_files`, `read_game_file` (README, `game_config.json`), `search_game_files` on `index.html` (1.75 MB, all code inline).
- Order: #2 of 50 live games, oldest first.

## What the game already has (seen in code)

3D arm-wrestling clicker (Three.js build wrapped as `AW3`, renderer kept conservative: `antialias: false`).
Tap to train, combos and frenzy, timing duels against a 10-boss ladder (Gym Novice → God of Arms, with tiers),
rookie-easy first duel, clutch slow-mo at 82%, pets with golden 4% variant and evolve, rebirth, weekly ×3 boss,
offline training (max 8 h), player titles, My Records, leaderboard on lifetime power, Vibration and Reduce Shake
settings, 7 languages.

Gaps (seen): no share button (`lib.share` absent); no bloom/post-processing pass found.

## Team call

Past its 30-day boost, steady ~54 plays a day. Best levers: the duel win is the peak moment, so add a share card
there; make the duel itself look and sound heavier (it is the whole fantasy); a daily reason to return. Leaderboard
metric and saves stay untouched (README says entries depend on lifetime power). Title stays. One wish.

## Wish (paste into Astra)

```
GOAL
Make every arm-wrestling duel in Bicep Clash feel huge, cinematic and satisfying, and give players a reason to share their wins and come back daily. Keep the game exactly as players know it.

KEEP (do not change)
- Do not change the thumbnail.
- Keep the title, tap-to-train, combos, frenzy, the timing duels, the full boss ladder and tiers, the easy first duel, the clutch slow-mo, pets (including golden pets and evolving), rebirth, the weekly x3 boss, offline training, player titles, My Records and all 7 languages.
- Keep the leaderboard exactly as it is (it ranks lifetime power). Do not change how power is counted.
- Keep every player's saved progress (power, coins, wins, pets, bosses beaten, rebirths, records, settings). Only add new save fields with safe defaults; never rename or reset existing ones.

CHANGE
1. Victory share card: after beating a boss, show a "Share" button on the win screen. It shares a picture of the player's arm slamming the boss's arm down, the boss name and the player's title, using the game's built-in share feature. One tap; it must never block continuing.
2. Daily Rival: once per day, one random already-beaten boss returns with a crown and pays a bonus chest of coins and an egg. A small "Daily Rival" badge on the boss list shows when it is ready. Optional, never blocks the ladder.
3. Instant start: a new player lands directly in the gym and can tap to train within 1 second, with no text to read. Their first boss duel starts within the first 30 seconds.

VISUAL / VFX
- Duel moments: sweat drops and chalk dust when gripping, a rising energy glow along the arm as progress grows, screen-edge speed lines and a gentle zoom during the clutch, and a big slam impact with a table crack decal, wood splinters, a ring shockwave and a crowd camera-flash burst when someone wins.
- Training taps: muscle pulse squash on each tap, small spark bursts on crits, floating numbers that pop and fade.
- Gym atmosphere: warm spotlights over the table with soft shadows, light haze in the beams, a cheering crowd that bounces, neon sign flicker, confetti on boss wins.
- Add tasteful bloom on glowing things only (neon, energy, golden pets) and warm color grading. Keep the timing zone and HUD numbers perfectly readable.

AUDIO
- Deep heartbeat and rising strain tone during duels, crowd that gets louder near the end, a heavy wooden SLAM on win, a punchy "pop" on training taps with pitch rising with combo, a golden shimmer for golden pets. Respect the existing volume setting.

UX / HUD
- Share button and Daily Rival badge match the current button style, are thumb-sized and fit the screen in all 7 languages.
- No extra clutter during duels.

PERFORMANCE
- Target a stable 60 FPS on mid-range phones. Pool and reuse all particles and floating numbers; reuse materials; keep the renderer light. If FPS drops, reduce effects automatically (fewer particles, no bloom) before anything else.
- Do not add any new external network requests while the game runs.

DO NOT
- Do not change the thumbnail.
- Do not reset saves or change the leaderboard metric.
- Do not make the first duel harder.
- Do not add ads, energy limits or paywalls.

ACCEPTANCE CHECK
- An existing save loads with the same power, coins, wins, pets and bosses beaten.
- A new player taps to train within 1 second and wins the first duel.
- Winning a duel shows the slam effects and a working Share button with a picture.
- Daily Rival appears once per day and pays its chest.
- No console errors; smooth on a phone-sized screen in English, Indonesian and Arabic.
```

## Why (Indonesian)

Wish ini bikin momen duel (inti game) jauh lebih sinematik: slam, retak meja, keringat, penonton, dan menambah tombol share kemenangan plus Rival Harian. Leaderboard dan save tidak disentuh supaya peringkat lama tetap sah.
