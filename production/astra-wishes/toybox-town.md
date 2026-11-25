# Toybox Town: Block Tower Mayhem — Astra wish

- Game id: `01M49NYWF6S2F0AD8FSGGQFWMT` · first published 2026-10-06 (age 49.7 days on 2026-11-25) · 26,657 plays, ~136/day, 31.8 shares per 1,000
- Source read: published version on 2026-11-25 (README, `search_game_files`).
- Order: #15 of 50 live games, oldest first.

## What the game already has (seen in code)

3D (Three.js + Rapier) toybox physics arcade: 90-second score round or Free Play; push, grab and throw props,
topple a 7-level bonus Mega tower (+500), chain knockdowns, fever finale with double points, drive toy cars, build,
find 24 hidden stars across the Playroom and Kitchen. Six toys, upgrades, daily goals and rewards, save, global
leaderboard, Reduce motion setting, creator layout editor, haptics, 7 languages.

Gaps (seen): no `lib.share` call. Audit note: the title shares "Toybox" and "Mayhem" with Tiny Town Mayhem
(bigram dedup risk); the default is to keep the title, so no rename is advised here.

## Team call

Steady (~136/day). Smash fans are a favored cohort: make the Mega tower collapse a showpiece, and share the round
score. A third room keeps it fresh. No rule changes. Title stays.

## Wish (paste into Astra)

```
GOAL
Make every knockdown in Toybox Town feel huge and satisfying, make the toy rooms feel alive, let players share their best round, and add one new room to explore. Keep the game exactly as players know it.

KEEP (do not change)
- Do not change the thumbnail.
- Keep the title, the controls, the 90-second Round and Free Play, push/grab/throw, the Mega tower and its bonus, knockdown chains, the fever finale, toy cars, building, the 24 hidden stars in the Playroom and Kitchen, the six toys, upgrades, daily goals and rewards, the Reduce motion setting, the creator layout editor and all 7 languages.
- Keep the leaderboard exactly as it is.
- Keep every player's saved progress (coins, toys, upgrades, stars found, daily goals, best score, settings). Only add new save fields with safe defaults; never rename or reset existing ones.

CHANGE
1. Round share card: at the end of a Round, show the score, the biggest chain and a snapshot of the mess the player made, with a "Share" button that shares this picture using the game's built-in share feature. Mark a new best. One tap; never blocks playing again.
2. New room, the Garden: a backyard toy room with a sandbox, a wooden fort tower to topple, a garden hose toy and 8 new hidden stars (24 → 32). Unlocks after finding 12 stars, using the same rules as the other rooms.
3. Instant start: a new player can move and knock something over within 2 seconds, with no text to read.

VISUAL / VFX
- Knockdowns: blocks tumble with little dust puffs and wood chips, a ring shockwave on heavy hits, score numbers that pop with the combo, a camera bump on big chains (respect Reduce motion).
- Mega tower collapse: a short slow-mo as it starts to fall, blocks scatter with sparks and confetti, a big "MEGA!" pop and a light flash.
- Fever: a pink glow, rainbow trails on thrown props, sparkles on every hit.
- Toy cars: tire skid marks, tiny exhaust puffs, bumps that bounce.
- Room life: dust motes in sunbeams through the window, a ceiling fan turning, curtains swaying, a toy train looping, a cat peeking, soft shadows, gentle bloom on stars and fever effects only, warm toy-colors grading. Keep props and the player clearly readable.

AUDIO
- Wooden clacks and tumbling block cascades, plastic boinks, a satisfying crash for the Mega tower, a toy-horn for cars, a star chime, playful music that speeds up in the fever. Respect the existing sound settings.

UX / HUD
- The share card and the Garden unlock match the current style, are thumb-sized and fit the screen in all 7 languages. Keep the folded top-row menu; no extra clutter.

PERFORMANCE
- Target a stable 60 FPS on mid-range phones even when the Mega tower falls. Pool and reuse dust, chips and confetti; use instancing for blocks and repeated props; reuse materials; let resting physics bodies sleep. If FPS drops, reduce particles and shadows automatically first.
- Do not add new external network requests while the game runs.

DO NOT
- Do not change the thumbnail.
- Do not change scoring, round length, rewards or the leaderboard.
- Do not reset saves.
- Do not add ads, energy limits or paywalls.

ACCEPTANCE CHECK
- An existing save loads with the same coins, toys, upgrades and stars.
- A new player knocks something over within 2 seconds.
- The Mega tower collapse shows slow-mo, scatter and the MEGA pop; the round end has a working Share button with a picture.
- The Garden unlocks at 12 stars and holds 8 new stars.
- No console errors; smooth on a phone-sized screen in English, Indonesian and Arabic.
```

## Why (Indonesian)

Pemain suka menghancurkan, jadi wish ini bikin runtuhnya menara Mega jadi pertunjukan (slow-mo, serpihan, konfeti), menambah share skor ronde, dan membuka ruangan baru Taman dengan 8 bintang. Skor dan leaderboard tidak diubah.
