# Sprint Past the Tsunami — Astra wish

- Game id: `01M3DQF68CG2FXDE3FNBQJ39M7` · first published 2026-09-26 (age 60.6 days on 2026-11-25) · 5,184 plays, ~10/day, 12.0 shares per 1,000
- Source read: published version on 2026-11-25 (README, `search_game_files`).
- Order: #10 of 50 live games, oldest first.

## What the game already has (seen in code)

3D (three.js) endless runner: outrun a tsunami, grab collectible characters and speed orbs, jump pads, barriers,
combo up to x5, near miss and close call slow-mo, tsunami surges every 24 s and a MEGA TSUNAMI boss every 3rd
surge, power-ups (shield, mega magnet, wave surf), adaptive music, sliding barriers past 250 m, 6 trail skins,
15 achievements, 3 daily missions, upgrades and rebirth, staged unlocks, "Only N m to your record!" result,
Screen effects toggle, haptics, 7 languages.

Gaps (seen): no `lib.share` call. The collectible name in the code is a popular meme term; the wish keeps the
in-game term as it is (renaming items could confuse players) but does not repeat it in new text.

## Team call

Small game (~10/day), past its boost. The wave is the star: make it terrifying and beautiful (it also sells the live
preview). Share card on a new record. Title stays.

## Wish (paste into Astra)

```
GOAL
Make the tsunami in Sprint Past the Tsunami look massive, beautiful and scary, make every close escape feel thrilling, and let players share their record runs. Keep the game exactly as players know it.

KEEP (do not change)
- Do not change the thumbnail.
- Keep the title, the controls, lanes, jumps, the collectibles and speed orbs, combo up to x5, near miss and close call, surges and the MEGA TSUNAMI, all power-ups, sliding barriers, trail skins, achievements, daily missions, upgrades and rebirth, the staged unlocks, the Screen effects setting and all 7 languages.
- Keep the leaderboard exactly as it is.
- Keep every player's saved progress (coins, upgrades, rebirths, skins, achievements, missions, best distance, settings). Only add new save fields with safe defaults; never rename or reset existing ones.

CHANGE
1. Record share card: on the result screen, add a "Share" button that shares a picture of the hero running with the giant wave right behind, the distance and "NEW RECORD!" when it is one, using the game's built-in share feature. One tap; never blocks running again.
2. Daily Wave: each day the wave has a different look and a one-time bonus goal (for example "Survive a MEGA TSUNAMI today"). Optional.
3. Instant start: a new player starts running on the first tap with no text to read; the wave is visible behind them from the first second.

VISUAL / VFX
- The wave: a tall curling wall of water with a foam crest, spray and mist blowing forward, debris tumbling in it (crates, beach chairs, palm leaves), and a shadow that falls over the hero when it gets close. MEGA TSUNAMI is darker and taller with a red sky tint.
- Close call: slow-mo with water droplets frozen in the air, then a burst forward with speed lines.
- Running: footstep splashes on wet ground, a trail behind the hero, coins and orbs that pop with sparkles.
- World: a seaside town with palms swaying in the wind, birds fleeing, umbrellas flying, flags flapping, soft shadows, dramatic sky with sun rays, gentle bloom on orbs and power-ups only. Keep obstacles clearly readable.
- Respect the Screen effects setting (less shake and flashes when off).

AUDIO
- A deep rumbling roar that grows as the wave closes in, crashing water, wind, a heartbeat on close calls, an uplifting sting on a new record. Keep the adaptive music. Respect the existing sound settings.

UX / HUD
- Share button and the Daily Wave chip match the current style, are thumb-sized and fit the screen in all 7 languages. No extra clutter while running.

PERFORMANCE
- Target a stable 60 FPS on mid-range phones. Pool and reuse water spray, debris and coin particles; use instancing for buildings, palms and props; reuse materials. On low-end phones, reduce spray and debris first.
- Do not add new external network requests while the game runs.

DO NOT
- Do not change the thumbnail.
- Do not change speeds, surge timing, rewards, prices or the leaderboard.
- Do not reset saves.
- Do not add ads, energy limits or paywalls.

ACCEPTANCE CHECK
- An existing save loads with the same coins, upgrades, skins and best distance.
- A new player runs on the first tap and sees the wave immediately.
- The wave shows foam, spray, debris and its shadow; the result screen has a working Share button with a picture.
- The Daily Wave appears once per day and pays once.
- No console errors; smooth on a phone-sized screen in English, Indonesian and Arabic.
```

## Why (Indonesian)

Ombak adalah bintang game ini, jadi wish ini bikin tsunami jauh lebih besar dan dramatis (buih, puing, bayangan ombak) dan kabur tipis lebih menegangkan, plus share rekor dan Ombak Harian. Kecepatan, hadiah dan leaderboard tidak diubah.
