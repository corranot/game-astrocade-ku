# Martabak Master: Street Food Chef — Astra wish

- Game id: `01M33MSKFT36P0DA6D6Q4B57WT` · first published 2026-09-22 (age 63.7 days on 2026-11-25) · 44,719 plays, ~51/day, 33.3 shares per 1,000
- Source read: published version on 2026-11-25 (README, `search_game_files` on `game.js`).
- Order: #8 of 50 live games, oldest first.

## What the game already has (seen in code)

2D canvas cooking game (`getContext('2d')` in `game.js`, portrait 720×1280). Timer-free: pour, bubble, sugar,
butter, top, fold and cut the sweet martabak with touch gestures; serve customers night after night; tips; unlock
toppings and new stalls (Egg, Bánh Mì, Pani Puri). Daily challenge with streak, celebrity guests (tips ×2.5),
regulars Pak Budi, Sari and Oma Lina with story chapters, scoring by sugar timing and cut precision, kitchen helper
from Chef Lv 3, result-card tips, final-cut slow-mo with "PERFECT CUT!", leaderboard, `lib.saveUserGameState` save,
7 languages, adaptive music, haptics.

Gaps (seen): 2D only; no share call.

## Team call

The quality standard asks for 3D. Cooking games sell on the food looking delicious, so 3D with real steam, melting
butter and gooey toppings is a true upgrade here. Do the 3D conversion as Wish 1 (keep every gesture and score
rule), then Wish 2 adds a share card of the finished martabak. Title stays.

## Wish 1: 3D kitchen (paste into Astra)

```
GOAL
Turn Martabak Master into a mouth-watering, fully 3D street-food stall (Three.js) while keeping every gesture, recipe, customer and player save exactly as it is. The martabak must look so delicious that players want to eat the screen.

KEEP (do not change)
- Do not change the thumbnail.
- Keep the title, the timer-free cooking flow and every touch gesture (pour, bubble, sugar, butter, top, fold, cut), the scoring rules (sugar timing, cut precision, grades), tips, all toppings, all stalls (sweet martabak, Egg, Bánh Mì, Pani Puri), the daily challenge and its streak, celebrity guests, the regulars Pak Budi, Sari and Oma Lina and their story chapters, the kitchen helper, result-card tips, the leaderboard and all 7 languages.
- Keep every player's saved progress (chef level, coins, unlocks, stalls, regulars' chapters, daily streak, settings). Only add new save fields with safe defaults; never rename or reset existing ones.

CHANGE
1. Render the stall in 3D with Three.js, seen from the same top-down-ish angle as now so the gestures feel the same: a real iron pan, a wooden board, a cart with a canopy, string lights and a night street behind it.
2. The martabak itself in detailed 3D: batter that spreads and rises, bubbles that form and pop on the surface, golden-brown underside when lifted, sugar crystals, butter that melts and shines, toppings (chocolate, cheese, peanuts, sprinkles and the rest) as real little 3D pieces, a soft fold and clean cut slices with a gooey filling cross-section.
3. Customers become cute 3D characters at the counter, with happy, wow and hungry reactions. Regulars and celebrities keep their own looks.

VISUAL / VFX
- Rising steam, sizzling bubbles, butter shine, chocolate drizzle, cheese pull when slices separate, crumbs on the board.
- Final cut: keep the slow-motion punch-in and "PERFECT CUT!", add a sparkle sweep, a warm flash and crumbs flying.
- Serve: the plate slides to the customer, hearts and coins pop, tips fly into the counter.
- Night street life: warm string lights, lanterns swaying, motorbikes passing in the background with headlight glow, moths around lamps.
- Soft shadows, gentle bloom on lights and butter shine only, warm appetizing color grading. Keep the batter and cut guides clearly readable.

AUDIO
- Real sizzle that grows as the pan heats, batter pour, bubbles popping, butter melt hiss, a crunchy knife cut, a happy "mmm!" from customers, coin clink on tips, a cozy night-market music bed. Respect the existing sound settings.

UX / HUD
- Keep the current buttons, cards and flow, restyled to match the 3D look. No new clutter while cooking.

PERFORMANCE
- Target a stable 60 FPS on mid-range phones. Pool and reuse steam, crumbs and topping particles; use instancing for toppings and lights; share materials. If FPS drops, lower steam and shadow quality automatically.
- Do not add new external network requests while the game runs.

DO NOT
- Do not change the thumbnail.
- Do not add timers or fail states; keep it timer-free.
- Do not change scoring, prices or the leaderboard.
- Do not reset saves.

ACCEPTANCE CHECK
- An existing save loads with the same chef level, coins, unlocks and stalls.
- A new player can pour batter within 1 second of starting and serves the first order within 40 seconds.
- Every gesture works exactly as before, now in 3D, and scores the same way.
- No console errors; smooth on a phone-sized screen in English, Indonesian and Arabic.
```

## Wish 2: share the martabak (send after Wish 1 is live and works)

```
GOAL
Let players show off the martabak they made, and keep everything else exactly as it is.

KEEP
- Do not change the thumbnail.
- Keep every gesture, recipe, customer, score rule, the leaderboard and saved progress exactly as they are. Only add new save fields with safe defaults.

CHANGE
1. Martabak share card: on the result card, add a "Share" button that shares a close-up picture of the finished, sliced martabak with its toppings, the score grade and the stall name, using the game's built-in share feature. One tap; never blocks the next customer.
2. "Chef's Special" of the day: one topping combo each day pays double tips once. Shown as a small chalkboard sign on the cart. Optional.

VISUAL / VFX
- A camera flash and a little plate spin for the share picture.

AUDIO
- Camera shutter when sharing.

PERFORMANCE
- Keep 60 FPS; no new external requests.

DO NOT
- Do not change the thumbnail. Do not reset saves.

ACCEPTANCE CHECK
- The result card shows a working Share button with a picture of the martabak.
- Chef's Special appears once per day and pays once.
- No console errors; smooth on a phone-sized screen.
```

## Why (Indonesian)

Game ini masih 2D, jadi Wish 1 mengubahnya jadi gerobak martabak 3D yang menggugah selera (uap, mentega meleleh, keju molor) dengan gerakan dan skor yang sama persis. Wish 2 menambah share foto martabak dan Chef's Special harian.
