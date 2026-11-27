# Blueprint Builder: Cozy House Puzzle — Astra wish

- Game id: `01KYWAC2F1ZG47ESZSFDRE2JZG` · first published 2026-07-31 (age 116.8 days on 2026-11-25) · 122,091 plays
- Source read: `pull_game` of the published version on 2026-11-25 (README, `src/*.js`, `game_config.json`, search of `src/main.js`).
- Order: #1 of 50 live games, oldest first (`production/market/2026-11-25T1648-account-audit/my-games.json`).

## What the game already has (seen in code)

Three.js 3D portrait game, bloom post-processing, RoundedBox pieces. Drag pieces onto a glowing
blueprint, bottom parts first; combos and "perfect" snaps; events (gold, rush, night, rainbow);
Mega Build every 10th house; egg every 5th house hatches a buddy pet (rarity + coin perks); Workshop
upgrades and Town decor; My Town grows with every house; Client Orders from level 3; daily gift;
leaderboard rival; 7 languages incl. Arabic; haptics; Calm motion setting. Save `v: 2` with
`level, coins, stars, up, pets, houses, best, decor, streak, lastDay, seed`.

Gaps (seen): no share button (`lib.share` absent); Three.js loaded from public CDNs at start.

## Team call

The game is past its 30-day update boost, so an update will not add a boost. The upside is
retention and sharing: a share card at the peak moment (house finished) and a daily reason to
return. Visual polish stays inside the current style. Title stays. Two wishes, sent in order;
send Wish 2 only after Wish 1 is live and plays well.

## Wish 1 (paste into Astra)

```
GOAL
Make Blueprint Builder feel more premium and more alive, and give players a reason to share and to come back every day. Keep the game exactly as players know it.

KEEP (do not change)
- Do not change the thumbnail.
- Keep the title, the core mechanic (drag pieces onto the glowing blueprint, bottom parts first), combos, perfect snaps, events (gold, rush, night, rainbow), Mega Build every 10th house, eggs every 5th house, buddy pets and their coin perks, Workshop upgrades, Town decor, My Town, Client Orders, daily gift and the leaderboard.
- Keep every player's saved progress: level, coins, stars, upgrades, pets, houses, best, decor, streak and settings must load exactly as before. Only add new save fields with safe defaults; never rename or reset existing ones.
- Keep all 7 languages, including right-to-left Arabic, the portrait layout and the Settings (Vibration, Calm motion).

CHANGE
1. House Done share card: when a house is finished, show a "Share" button on the complete card. It shares a picture of the player's finished house with their little town behind it, the house number and stars, using the game's built-in share feature. One tap, no extra screens. It must never block "Next".
2. Daily Dream House: once per day, offer one special blueprint with a fun theme (for example Candy Cottage, Snow Cabin, Treehouse, Lighthouse). Finishing it gives bonus coins and a small badge shown in My Town. Show a gentle "New Daily House!" ribbon on the title screen when it is ready. It is optional and never replaces the normal next level.
3. Instant start: on first launch, go straight into house #1 with the hand hint, with no menu or text to read first. The first piece must be draggable within 1 second.
4. Small rewards early: within the first 40 seconds of a new player, make sure they see at least three satisfying moments (first snap, first combo or perfect, first house finished with confetti and coins).

VISUAL / VFX
- Richer snap feedback: a soft dust puff and a ring shockwave on the ground when a piece lands, a short sparkle trail while dragging, and a gold burst for perfect snaps that grows with the combo.
- House finished: the house does a little "boing" squash, windows light up one by one, the chimney puffs smoke, confetti and a warm light sweep.
- Living world: clouds drifting, trees swaying, birds flying by in the day, fireflies and window lights at night, butterflies near flower decor.
- Warmer lighting: soft shadows, a golden-hour sky gradient, gentle fog in the distance, tasteful bloom on glowing parts only. Keep pieces and the blueprint clearly readable.

AUDIO
- Satisfying wooden "clack" on snap with pitch rising with the combo, a bright chime on perfect, a cheerful jingle when a house is finished, and a soft camera-shutter sound when sharing. Keep the existing music and ambience, and respect the existing sound and music toggles.

UX / HUD
- The share button and the Daily House ribbon match the existing card and button style, are large enough for thumbs, and fit inside the portrait frame in every language.
- No new clutter on the HUD during building.

PERFORMANCE
- Target a stable 60 FPS on mid-range phones. Pool and reuse all particles; use instancing for repeated town objects; reuse materials. If FPS drops, lower effects automatically (fewer particles, cheaper shadows) before anything else.
- Do not add any new external network requests while the game runs.

DO NOT
- Do not change the thumbnail.
- Do not reset or wipe any saved progress.
- Do not add ads, timers that block play, energy systems, or fail screens.
- Do not make the first houses harder.

ACCEPTANCE CHECK
- An existing save loads with the same level, coins, pets, houses and decor.
- A brand-new player can drag the first piece within 1 second and finishes house #1 in under 40 seconds.
- Finishing a house shows a working Share button with a picture of the house.
- The Daily Dream House appears once per day and gives its badge.
- No console errors, and the game stays smooth on a phone-sized screen in English, Indonesian and Arabic.
```

## Wish 2 (send after Wish 1 is live)

```
GOAL
Add one more reason to keep playing Blueprint Builder: a collection players want to complete. Keep everything else as it is.

KEEP
- Do not change the thumbnail.
- Keep all current mechanics, levels, pets, Town, Daily Dream House, share card and saved progress exactly as they are. Only add new save fields with safe defaults.

CHANGE
1. House Style Album: every 10 houses unlock a new house style for My Town (for example Beach, Snowy, Candy, Castle, Space). The player picks a style in the Workshop Town tab, and new houses in their town use it. Show the album as a grid with locked silhouettes, so players see what is next.
2. Neighbour visits: now and then a buddy pet walks between town houses and waves, and tapping it gives a few coins (at most a few times per day).

VISUAL / VFX
- Each style has its own colors, roof shapes and small props. Unlocking one plays a short reveal with a light beam and sparkles.

AUDIO
- A short fanfare for a new style, a cute squeak when tapping a pet.

PERFORMANCE
- Keep 60 FPS on mid-range phones; reuse meshes and materials for styles; no new external requests.

DO NOT
- Do not change the thumbnail, the title or the core building mechanic. Do not reset saves.

ACCEPTANCE CHECK
- An existing player with 25 houses sees 2 styles unlocked right away.
- Switching style changes only new town houses' look, never progress.
- No console errors; smooth on a phone-sized screen.
```

## Why (Indonesian)

Wish 1 menambah tombol share foto rumah jadi, rumah harian, efek snap/selesai yang lebih memuaskan, dan dunia yang lebih hidup, tanpa ubah mekanik atau save. Game ini sudah lewat 30 hari jadi update tidak dapat boost; yang bisa naik adalah share dan pemain yang kembali tiap hari.
