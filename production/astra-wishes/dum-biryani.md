# Dum Biryani: Cooking Simulator — Astra wish

- Game id: `01M4B3C16EP0FEHXZXR0ANT07A` · first published 2026-10-08 (age 48.3 days on 2026-11-25) · 51,816 plays, ~35/day, 26.3 shares per 1,000
- Source read: published version on 2026-11-25 (README, `search_game_files`).
- Order: #16 of 50 live games, oldest first.

## What the game already has (seen in code)

Portrait 3D (three.js) biryani cooking: fry birista, cook masala, layer rice, seal the handi, manage dum heat, open
the lid and taste. Six regional dishes on the same five-step loop, star ratings, combos, wishes, upgrades, daily
special and streak, Chef Rush time bonus, leaderboard, 7 languages, haptics with hold rumble, camera comfort
settings, creator HUD layout editor.

Gaps (seen): no `lib.share` call.

## Team call

Past its boost, ~35/day. The lid-open reveal is the peak moment: make the food look irresistible and the reveal
shareable. Give each regional dish one small visual signature so they feel distinct without new mechanics. Title stays.

## Wish (paste into Astra)

```
GOAL
Make cooking in Dum Biryani look and sound irresistibly delicious, turn the lid-open moment into a showpiece players want to share, and give them a reason to cook again tomorrow. Keep the game exactly as players know it.

KEEP (do not change)
- Do not change the thumbnail.
- Keep the title, all five cooking stages and their controls (fry birista, cook masala, layer rice, seal the handi, manage dum heat, open the lid and taste), all six regional dishes, star ratings, combos, wishes, upgrades, the daily special and streak, Chef Rush, the comfort settings, the creator layout editor and all 7 languages.
- Keep the leaderboard exactly as it is.
- Keep every player's saved progress (coins, upgrades, dishes unlocked, stars, streak, settings). Only add new save fields with safe defaults; never rename or reset existing ones.

CHANGE
1. Lid-open share card: after tasting, show a close-up of the steaming biryani with its star rating and dish name, and a "Share" button that shares this picture using the game's built-in share feature. One tap; never blocks cooking again.
2. Dish signatures: give each of the six regional dishes one visual touch of its own (for example saffron swirls, boiled eggs, golden potatoes, fresh mint, fried cashews, rose petals), purely visual, same steps and timing.
3. Instant start: a new player can start frying within 1 second with no text to read, and opens the first lid within 60 seconds.

VISUAL / VFX
- Frying: onions turn golden with bubbling oil, little oil splatters and sizzling sparks.
- Masala: spices fall in colorful clouds, the sauce bubbles and darkens, steam curls up.
- Layering: rice grains fall in soft streams, saffron milk drizzles, herbs flutter down.
- Sealing and dum: dough seal squishes around the lid, heat shimmer and glowing coals under the handi, a gentle steam leak.
- Lid open: a big steam cloud bursts out with warm light from inside the pot, saffron-orange glow, sparkles, a slow camera push-in.
- Kitchen life: copper pots shining, hanging spices swaying, a window with soft daylight, flickering stove flame, soft shadows, gentle bloom on flames and steam highlights only, warm appetizing color grading. Keep the gauges and timing bars clearly readable.

AUDIO
- Sizzling oil, spice pours, bubbling masala, soft rice fall, a dough squish, the crackle of coals, a deep "whoosh" of steam when the lid opens, a happy "mmm!" on tasting, warm traditional-inspired music. Respect the existing sound settings.

UX / HUD
- Share button matches the current style, is thumb-sized and fits the screen in all 7 languages. No extra clutter while cooking.

PERFORMANCE
- Target a stable 60 FPS on mid-range phones. Pool and reuse steam, spice, oil and rice particles; use instancing for rice grains and garnish; reuse materials. If FPS drops, reduce steam and particles automatically first.
- Do not add new external network requests while the game runs.

DO NOT
- Do not change the thumbnail.
- Do not change cooking timing, scoring, Chef Rush rules, rewards or the leaderboard.
- Do not reset saves.
- Do not add ads, energy limits or paywalls.

ACCEPTANCE CHECK
- An existing save loads with the same coins, upgrades, dishes and stars.
- A new player starts frying within 1 second.
- Opening the lid shows the steam burst and glow, with a working Share button and a picture.
- Each of the six dishes shows its own signature garnish.
- No console errors; smooth on a phone-sized screen in English, Indonesian and Arabic.
```

## Why (Indonesian)

Wish ini bikin masakan terlihat sangat menggugah (bawang keemasan, rempah berhamburan, uap meledak saat tutup dibuka), menambah share foto biryani, dan memberi tiap hidangan daerah ciri visual sendiri. Waktu masak, skor dan leaderboard tidak diubah.
