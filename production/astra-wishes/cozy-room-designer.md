# Cozy Room Designer: Heart Home — Astra wish

- Game id: `01M1SCRT4KPGXM6TFVYAN6CKNX` · first published 2026-09-05 (age 80.7 days on 2026-11-25) · 33,020 plays, ~428/day (steady), 29.9 shares per 1,000
- Source read: published version on 2026-11-25 (README, `search_game_files` on `src/app.js`).
- Order: #6 of 50 live games, oldest first.

## What the game already has (seen in code)

2D isometric canvas room decorator (`canvas.getContext('2d')` in `src/app.js`, no Three.js). Drag furniture onto
the floor, wall decor, floor/wall/lighting changes, inspiration cards, framed photo mode, several rooms in a house.
Visiting guests (Mochi, bunny, fairy…) bring wishes and pay hearts; hearts unlock furniture, sets and Dream Star
upgrades. XP levels, staged tool unlocks, daily streak, events, combos, sticker album, weekly theme, tomorrow's
parcel, leaderboard, 7 languages incl. Arabic, haptics, fireflies and petals.

Gaps (seen): 2D only; no `share(` call (the photo mode makes a framed picture but does not share it).

## Team call

The quality standard asks every 2D game to become real 3D. This game is steady at ~428 plays a day at day 80, so
the conversion is the biggest risk on the list: do it as its own wish, keep every item and save, and check the
draft carefully before it goes live. Then a second wish connects the photo mode to sharing (the cheapest share
lever: players already frame their room). Title stays.

## Wish 1: 3D room (paste into Astra)

```
GOAL
Turn Cozy Room Designer into a beautiful, fully 3D cozy room (Three.js) while keeping every feature, item and player save exactly as it is. Players should feel they are decorating a real little dollhouse room.

KEEP (do not change)
- Do not change the thumbnail.
- Keep the title, every furniture and decor item, sets, floor, wall and lighting options, inspiration cards, photo mode, all rooms of the house, the visiting guests and their wishes and rewards, hearts, Dream Star upgrades, XP levels and the step-by-step tool unlocks, daily streak, events, combos, sticker album, weekly theme, tomorrow's parcel, the leaderboard and all 7 languages including right-to-left Arabic.
- Keep the same controls: drag an item from the tray onto the floor or wall, tap to select, the same buttons in the same places.
- Keep every player's saved rooms and progress. Every item a player has placed must appear in the same spot in the new 3D room. Only add new save fields with safe defaults; never rename or reset existing ones.

CHANGE
1. Render the room in 3D with Three.js: a cut-away dollhouse room seen from the same angle as now (isometric-style camera), with real floor, two walls, a window and soft depth.
2. Rebuild every furniture and decor item as a detailed, rounded, cozy 3D model (soft bevelled edges, fabric and wood textures, cushions, legs, handles), not plain boxes. Same colors and style as the current art.
3. Guests (Mochi, the bunny, the fairy and the others) become cute 3D characters that walk in, look around, and do a happy bounce when their wish is met.
4. Placing: the item drops in with a squash-and-stretch bounce and a soft shadow appears under it; a gentle grid glow shows where it will land.

VISUAL / VFX
- Lighting that changes with the lighting option: warm lamp light, soft daylight through the window with light rays and dust motes, night with glowing lamps and fireflies. Soft shadows everywhere.
- Heart burst and sparkles when a guest is happy, a soft dust puff when an item lands, confetti on level-up.
- Gentle life: curtains sway, plants sway, a cat or pet item blinks, petals drift by day.
- Tasteful bloom on lamps and sparkles only, warm cozy color grading. Keep items and buttons easy to see.

AUDIO
- Soft wooden "tok" when placing hard items, a soft "puff" for fabric items, a sweet chime for happy guests, a cozy lo-fi music bed. Respect the existing sound settings.

UX / HUD
- Keep the current tray, buttons and cards, restyled to match the new 3D look (soft rounded panels, consistent icons). No new clutter.

PERFORMANCE
- Target a stable 60 FPS on mid-range phones. Share materials, use instancing for repeated items, pool particles, keep shadows to one light. If FPS drops, lower shadow and effect quality automatically.
- Do not add new external network requests while the game runs.

DO NOT
- Do not change the thumbnail.
- Do not remove or rename any item, guest, room or feature.
- Do not reset or move anything in a player's saved rooms.

ACCEPTANCE CHECK
- An existing save opens with every placed item in the same place, now in 3D.
- A new player can drag the first item within 1 second, and the first guest arrives soon after, as before.
- Every tray item can be placed, moved and removed in 3D.
- Photo mode still works and shows the 3D room.
- No console errors; smooth on a phone-sized screen in English, Indonesian and Arabic.
```

## Wish 2: share the photo (send after Wish 1 is live and works)

```
GOAL
Let players share the rooms they are proud of, and give them a fresh decorating reason each day. Keep everything else exactly as it is.

KEEP
- Do not change the thumbnail.
- Keep all items, guests, rooms, progress, the leaderboard and saved rooms exactly as they are. Only add new save fields with safe defaults.

CHANGE
1. Share from photo mode: after taking a framed photo, show a "Share" button that shares that photo (with the room name and the date stamp) using the game's built-in share feature. One tap.
2. Guest thank-you card: when a guest is very happy, show a small card with the guest holding a heart and the player's room behind them, with a Share button.
3. Daily Mood: each day one guest asks for a "mood" (for example Rainy Day Reading Nook, Birthday Party, Beach House). Meeting it gives bonus hearts and a sticker. Optional.

VISUAL / VFX
- Camera flash and polaroid slide-out when taking a photo; hearts float up on the thank-you card.

AUDIO
- Camera shutter on photo, a soft "whoosh" when sharing.

PERFORMANCE
- Keep 60 FPS on mid-range phones; no new external requests.

DO NOT
- Do not change the thumbnail. Do not reset saves.

ACCEPTANCE CHECK
- Taking a photo shows a working Share button with that photo.
- The Daily Mood appears once per day and pays once.
- No console errors; smooth on a phone-sized screen.
```

## Why (Indonesian)

Game ini masih 2D, jadi Wish 1 mengubahnya jadi rumah boneka 3D yang cozy tanpa mengubah item, tamu atau save. Wish 2 menyambungkan mode foto ke tombol share dan menambah Mood Harian. Cek draft Wish 1 dengan teliti sebelum live, karena game ini masih stabil di sekitar 430 plays per hari.
