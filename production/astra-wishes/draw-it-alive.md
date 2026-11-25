# Draw It Alive: Draw the Missing Part — Astra wish

- Game id: `01M7S3R108GQ3T2VKX5P9412MT` · first published 2026-11-20 (age 5.4 days on 2026-11-25) · 4,655 plays, ~1.3–2.2K/day and rising (alive), shares 0.4 per 1,000 (Rub It Away: 20)
- Source read: repo source `prototypes/draw-it-alive/` (`README.upload.md`, `levels.js`: 4 chapters of 5; `game.js` 2D canvas, no `WebGLRenderer`), which matches the shipped version.
- Order: #46 of 53 live games, oldest first.

## What the game already has (seen in code)

2D canvas drawing puzzle for young kids: a picture has a part missing (dashed outline), the player traces it from a
pink dot, and the scene comes alive using the player's own line (a chick walks the bridge, a snail wears the shell).
20 levels in 4 chapters (later ones need two parts), mirrored round two (21–40), a wall of the player's own pictures
per chapter, padlocks, a paint-drop jar that opens sticker boxes (24 stickers in 4 sets), a daily gift of drops,
up to 3 stars and no losing, 7 languages with a globe button. No leaderboard.

## Team call

Alive and inside its window (about 25 days left). The cheapest lever we have is sharing: the player's own drawing
coming alive is the most shareable picture in our account, yet shares are 50× below Rub It Away. Wish 1: a share
card plus a new chapter. Wish 2 about 3 days later: another chapter. No 3D rewrite during the window (the sticker
look is working). Title stays.

## Wish 1 — My Drawing share + Snowy Day chapter (paste into Astra now)

```
GOAL
Let players share the picture they brought to life in Draw It Alive with one tap, and add a new fifth chapter, "Snowy Day", with 5 new drawing puzzles in the same style. Keep the game exactly as players know it.

KEEP (do not change)
- Do not change the thumbnail.
- Keep the title, tracing from the pink dot, the dashed outline, the player's own line becoming the part and coming alive, the 20 levels and 4 chapters and their order, the mirrored round two, the picture wall, padlocks, stars, the paint-drop jar and sticker boxes, the 24 stickers and sticker book, the daily gift, the helper hand, no losing, the sticker art style and all 7 languages with the globe button.
- Keep every player's saved progress. Only add new save fields with safe defaults; never rename or reset existing ones.

CHANGE
1. My Drawing share card: right after a picture comes alive, show that finished picture with the player's own line glowing softly, the stars, and a "Share" button that shares this picture using the game's built-in share feature. Also add the same Share button when a picture is opened big on the picture wall. One tap; never blocks the Next button.
2. Snowy Day chapter: 5 new puzzles after chapter 4, opened like the others: draw a scarf for a cold snowman, a sled hill for a sliding penguin, a chimney so smoke can rise from a cozy house, a string of lights between two trees, a frozen pond line where a duck can skate. Each comes alive using the player's line.
3. A new sticker set "Winter friends" (6 stickers) for the jar, and the mirrored round two includes the new chapter.
4. All new words in all 7 languages, short like the existing ones.

VISUAL / VFX
- The player's line draws with a soft shine that follows the finger; a sparkle burst and a happy bounce when the picture comes alive; falling snow and frosty sparkles in Snowy Day.

AUDIO
- A gentle crayon scratch while drawing, a rising "ta-da" when the picture comes alive, soft jingle bells in Snowy Day. Respect the existing settings.

PERFORMANCE
- Stable 60 FPS on mid-range phones; the share picture is made only when the player taps Share. No new external requests while playing.

DO NOT
- Do not change the thumbnail. Do not change existing levels, stars or the jar. Do not reset saves. Do not add ads, energy limits, timers or anything before the first stroke.

ACCEPTANCE CHECK
- An existing save loads unchanged; a player who finished chapter 4 can open Snowy Day.
- After every solved picture, a working Share button shares a picture with the player's own line in it.
- No console errors; looks right on a phone-sized screen in English, Indonesian and Arabic.
```

## Wish 2 — Under the Sea chapter (send about 3 days after Wish 1)

```
GOAL
Add a sixth chapter, "Under the Sea", with 5 new drawing puzzles to Draw It Alive in the same style. Keep the game exactly as players know it.

KEEP (do not change)
- Do not change the thumbnail.
- Keep the title, tracing, the player's line coming alive, every existing level and chapter including Snowy Day, the mirrored round two, the picture wall, padlocks, stars, the jar, stickers and sticker book, the daily gift, the My Drawing share button, no losing, the art style and all 7 languages.
- Keep every player's saved progress. Only add new save fields with safe defaults.

CHANGE
1. Under the Sea: 5 new puzzles after Snowy Day: draw a shell for a hermit crab, bubbles for a fish to ride up, seaweed for a shy seahorse to hide in, a treasure chest lid that opens, a path for a turtle to swim home. Levels 4 and 5 need two parts.
2. A new sticker set "Ocean friends" (6 stickers); the mirrored round includes the new chapter.
3. All new words in all 7 languages.

VISUAL / VFX
- Light rays through the water, floating bubbles, swaying seaweed, a sparkle burst when the picture comes alive.

AUDIO
- Soft bubbly sounds and a gentle wave hum. Respect the existing settings.

PERFORMANCE
- Stable 60 FPS on mid-range phones. No new external requests while playing.

DO NOT
- Do not change the thumbnail. Do not change existing levels, stars or the jar. Do not reset saves. Do not add ads or energy limits.

ACCEPTANCE CHECK
- An existing save loads unchanged; Under the Sea opens after Snowy Day.
- Each new puzzle comes alive with the player's own line.
- No console errors; looks right on a phone-sized screen in English, Indonesian and Arabic.
```

## Why (Indonesian)

Game ini sedang naik, tapi share-nya 50× lebih rendah dari Rub It Away, padahal gambar anak yang jadi hidup itu paling layak di-share. Jadi wish pertama menambah tombol share gambar pemain plus bab baru Snowy Day, lalu bab Under the Sea ±3 hari kemudian.
