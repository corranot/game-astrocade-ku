# Candy Mine Vacuum: Candy Collector — Astra wish

- Game id: `01M5HDVA3PBW60BKV28WYS4KWT` · first published 2026-10-23 (age 33.3 days on 2026-11-25) · 2,168 plays, ~17/day, 37.8 shares per 1,000
- Source read: published version on 2026-11-25 (README, `search_game_files`).
- Order: #23 of 50 live games, oldest first.

## What the game already has (seen in code)

Portrait 3D (Three.js) casual arcade: steer Kubo's vacuum, collect sweets, unload at the factory, upgrade through ten
themed candy lands. First-time guide, world decorations and unlock celebrations, combo streaks, Golden Hour, mini
missions, upgrades, power-ups, candy rain, treasure, stickers and garage, daily gifts, save, leaderboard, Calm and
Haptics toggles, event multipliers capped at ×20.

Gaps (seen): no `lib.share` call.

## Team call

Small, past its boost. The suck-up is the ASMR moment: make the vacuum feel powerful and the candy look delicious;
add a share card for a new land unlock. Title stays.

## Wish (paste into Astra)

```
GOAL
Make vacuuming candy in Candy Mine Vacuum feel powerful and deliciously satisfying, make every candy land feel alive, and let players share each new land they unlock. Keep the game exactly as players know it.

KEEP (do not change)
- Do not change the thumbnail.
- Keep the title, the controls, steering Kubo's vacuum, collecting and unloading at the factory, all ten candy lands and their unlock celebrations, combo streaks, Golden Hour, mini missions, upgrades, power-ups, candy rain, treasure, stickers and the garage, daily gifts, the Calm and Haptics settings and all languages.
- Keep the leaderboard exactly as it is.
- Keep every player's saved progress (coins, upgrades, lands, stickers, garage, missions, settings). Only add new save fields with safe defaults; never rename or reset existing ones.

CHANGE
1. New land share card: when a new candy land unlocks, show Kubo and the vacuum in front of the new land with its name and the land number (for example 4/10), and a "Share" button that shares this picture using the game's built-in share feature. One tap; never blocks play.
2. Daily Sweet: each day one candy type is the "Sweet of the Day" and is worth double when collected, once per day up to a cap. A small chip shows which one. Optional.
3. Instant start: a new player is vacuuming candy within 1 second with no text to read.

VISUAL / VFX
- Vacuum: a visible swirling suction cone with sparkles, candies that stretch and spin as they fly into the nozzle, a little bulge in the hose for each one, the tank filling with colorful candies you can see.
- Combos: a rainbow trail on the vacuum that grows with the streak; Golden Hour turns the trail gold with glitter.
- Unloading: candies pour out into the factory with a sweet waterfall, the factory chimney puffs cotton-candy clouds, coins pop.
- Lands: lollipop trees swaying, chocolate rivers flowing, gummy bears bouncing, sprinkles falling like snow, soft shadows, gentle bloom on candy highlights and sparkles only, bright candy-color grading per land. Keep candies and obstacles clearly readable.

AUDIO
- A satisfying vacuum hum that rises with suction, cute pops as each candy goes in (pitch rising with combo), a sweet cascade when unloading, a happy jingle on land unlock. Respect the existing sound settings.

UX / HUD
- Share button and the Sweet of the Day chip match the current style, are thumb-sized and fit the screen. Keep price labels and the combo lane clear. No extra clutter.

PERFORMANCE
- Target a stable 60 FPS on mid-range phones. Use instancing for candies and decorations; pool all particles; reuse materials. If FPS drops, reduce particles and shadows automatically first; Calm mode also reduces motion.
- Do not add new external network requests while the game runs.

DO NOT
- Do not change the thumbnail.
- Do not change candy values, prices, the multiplier cap or the leaderboard.
- Do not reset saves.
- Do not add ads, energy limits or paywalls.

ACCEPTANCE CHECK
- An existing save loads with the same coins, upgrades, lands and stickers.
- A new player vacuums candy within 1 second.
- Candies visibly swirl into the nozzle and fill the tank; a new land unlock shows a working Share button with a picture.
- The Sweet of the Day appears once per day.
- No console errors; smooth on a phone-sized screen in English, Indonesian and Arabic.
```

## Why (Indonesian)

Wish ini bikin sedotan vacuum terasa kuat dan memuaskan (permen berputar masuk, tangki terisi terlihat, jejak pelangi), dunia permen lebih hidup, plus share tiap negeri baru dan Permen Harian. Nilai permen, harga dan leaderboard tidak diubah.
