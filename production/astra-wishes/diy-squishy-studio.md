# DIY Squishy Studio — Astra wish

- Game id: `01M5P88BV7Y5BGK91533QJMFMV` · first published 2026-10-24 (age 32.3 days on 2026-11-25) · 1,078 plays, ~6/day, 22.3 shares per 1,000
- Source read: published version on 2026-11-25 (README, `search_game_files`).
- Order: #24 of 50 live games, oldest first.

## What the game already has (seen in code)

Portrait 3D (Three.js inline) toy maker: choose a squishy shape, paint it (optional two-color blend), place, move,
rotate and resize up to three stickers, then press it (combo chains, hold-for-DEEP ×2) to earn coins and sell to a
customer with a wish. Shapes, paints, stickers, shelf toys, album, upgrades, studio themes (Mint, Sunshine,
Lavender), Low Motion setting, English/Indonesian first-run tips.

Gaps (seen): no `lib.share` call.

## Team call

Small (~6/day), past its boost. DIY/ASMR is a favored cohort, so the squish itself must look and sound amazing,
and the finished toy is a natural share. Title stays.

## Wish (paste into Astra)

```
GOAL
Make every squishy in DIY Squishy Studio look softer, cuter and more satisfying to squeeze, and let players share the squishies they make. Keep the game exactly as players know it.

KEEP (do not change)
- Do not change the thumbnail.
- Keep the title, the full flow (choose a shape, paint with the optional two-color blend, place and edit up to three stickers, squeeze with combo chains and hold-for-DEEP, sell to a customer), customer wishes and bonuses, shapes, paints, stickers, the shelf, the album, upgrades, studio themes, the Low Motion setting and the first-run tips.
- Keep every player's saved progress (coins, unlocks, shelf, album, studio theme, settings). Only add new save fields with safe defaults; never rename or reset existing ones.

CHANGE
1. Squishy share card: after a sale, show the finished squishy on a pastel pedestal with its name, colors and the customer's happy face, and a "Share" button that shares this picture using the game's built-in share feature. One tap; never blocks making the next one.
2. Daily Order: each day one special customer asks for a themed squishy (for example a strawberry cat or a galaxy cloud) that pays double once. Optional.
3. Instant start: a new player is choosing their first shape within 1 second and squeezes their first squishy within 40 seconds.

VISUAL / VFX
- Squeeze: the squishy deforms softly where the finger presses, slowly rises back with a jiggle, tiny sparkles and hearts puff out; DEEP squeezes flatten it further with a satisfying slow return and a soft ring wave on the table.
- Painting: paint spreads in a smooth wet sheen, the blend swirls marbled colors.
- Stickers: they stick on with a little shine and a wobble.
- Sale: coins and stars burst, the customer does a happy hop.
- Studio life: soft window light, floating dust motes, a swaying plant, shelf toys that wiggle when tapped, soft shadows, gentle bloom on sparkles only, pastel color grading that follows the studio theme. Keep the toy and buttons clearly readable; Low Motion reduces the extra motion.

AUDIO
- Soft squish and slow-rise "fwoomp" sounds (ASMR style), a wet brush stroke for paint, a sticker "pip", a coin chime and a happy customer giggle, soft lo-fi music. Respect the existing sound settings.

UX / HUD
- Share button and the Daily Order card match the current pastel style, are thumb-sized and fit the screen in English and Indonesian. No extra clutter while squeezing.

PERFORMANCE
- Target a stable 60 FPS on mid-range phones. Deform the squishy with a light vertex method, pool sparkles and hearts, reuse materials. If FPS drops, reduce particles and shadows automatically first.
- Do not add new external network requests while the game runs.

DO NOT
- Do not change the thumbnail.
- Do not change prices, combo rules, rewards or customer logic.
- Do not reset saves.
- Do not add ads, energy limits or paywalls.

ACCEPTANCE CHECK
- An existing save loads with the same coins, unlocks, shelf and album.
- A new player picks a shape within 1 second and squeezes within 40 seconds.
- Squeezing visibly deforms the toy and it slowly rises back; a sale shows a working Share button with a picture.
- The Daily Order appears once per day and pays once.
- No console errors; smooth on a phone-sized screen.
```

## Why (Indonesian)

Pemain DIY/ASMR suka momen pencet, jadi wish ini bikin squishy terlihat benar-benar empuk (melesak di bawah jari lalu naik pelan) dengan suara ASMR, plus share hasil squishy dan Pesanan Harian. Harga dan aturan combo tidak diubah.
