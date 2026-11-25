# Soap Carving: Satisfying ASMR — Astra wish

- Game id: `01M7XNBZ4G6HXCWJ8QW902Q4ES` · first published 2026-11-22 (age 3.3 days on 2026-11-25) · 578 plays, ~150–240/day (passed the gate, slower), shares 5.2 per 1,000
- Source read: repo source `prototypes/soap-carving/` (`README.upload.md`, `soap.js` per-pixel 2.5D canvas, `make.js` 12-step making), which matches the shipped version.
- Order: #48 of 53 live games, oldest first.

## What the game already has (seen in code)

2.5D canvas soap carving for kids: a marbled bar with a dotted shape; drag the knife to peel curly shavings that
pile up, loose pieces drop with a thud; rub edges smooth and glossy with a damp sponge, glitter and gems, then a
bath bowl where it fizzes while the customer gives 1–3 stars. From soap 2 the player makes the soap from scratch
(cut, color, stir, scent, pour PERFECT, cool, unmold). 8 shapes, 8 marbles, 6 glitters, 6 gems, golden soaps,
hidden charms and a charm album, a shelf of the last 12 soaps, free carve after 6 orders, gift box every 3 soaps,
no fail, helper hand, 7 languages, saves, total-stars leaderboard.

## Team call

Passed the first test, early in its window (about 27 days left), shares low. Audit: one meaningful update this week,
a share card plus a new shape set. The look is painted 2.5D, not Three.js; a full 3D rewrite is a big risk while it
is climbing, so keep it for after the window. Title stays.

## Wish (paste into Astra)

```
GOAL
Let players share every finished soap in Soap Carving with one tap, and add a new set of 4 winter soap shapes, while keeping the game exactly as players know it.

KEEP (do not change)
- Do not change the thumbnail.
- Keep the title, carving with the knife and its curly shavings, smoothing with the sponge, glitter and gems, the bath bowl and customer stars, making soap from scratch from soap 2 with all its steps, the 8 existing shapes, marbles, glitters and gems, golden soaps, hidden charms and the charm album, the shelf, free carve, gift boxes, the helper hand, no fail, the painted art style and all 7 languages.
- Keep the leaderboard exactly as it is.
- Keep every player's saved progress. Only add new save fields with safe defaults; never rename or reset existing ones.

CHANGE
1. Soap share card: when the customer gives stars, show the finished soap big and glossy with its glitter and gems, the stars and the customer's happy face, and a "Share" button that shares this picture using the game's built-in share feature. Also add the Share button when a soap is opened on the shelf. One tap; never blocks play.
2. Winter shapes: add 4 new shapes (snowman, penguin, mitten, snowflake) that appear in orders and free carve after the player's 6th soap, with a "NEW" badge the first time each appears; plus 2 new winter marbles (frosty blue-white, candy-cane red-white).
3. All new words in all 7 languages.

VISUAL / VFX
- Snowy sparkle glitter for winter shapes, a soft frost shimmer on the winter marbles, a gentle glow on the share card soap.

AUDIO
- Keep the carving and sponge sounds; add a tiny jingle when a winter shape is finished. Respect the existing settings.

PERFORMANCE
- Stable 60 FPS on mid-range phones; the share picture is made only when the player taps Share. No new external requests while playing.

DO NOT
- Do not change the thumbnail. Do not change scores, coins, existing shapes or the leaderboard. Do not reset saves. Do not add ads, energy limits or timers.

ACCEPTANCE CHECK
- An existing save loads unchanged.
- Every finished soap shows a working Share button with a picture of that soap.
- The 4 winter shapes appear after soap 6 and can be carved with a fair shape score.
- No console errors; looks right on a phone-sized screen in English, Indonesian and Arabic.
```

## Why (Indonesian)

Game ini baru lolos uji tapi share-nya rendah, jadi wish ini menambah tombol share sabun jadi, plus 4 bentuk musim dingin baru (manusia salju, penguin, sarung tangan, kepingan salju). Tidak dirombak ke 3D selama sedang naik.
