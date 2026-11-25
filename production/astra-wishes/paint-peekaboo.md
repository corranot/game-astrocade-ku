# Paint Peekaboo: Hide & Seek — Astra wish

- Game id: `01M5P4XVCSEW5HG1Y6SPZ2EFJV` · first published 2026-10-24 (age 32.2 days on 2026-11-25) · 100,017 plays, ~68/day, 34.0 shares per 1,000
- Source read: published version on 2026-11-25 (README, `search_game_files`).
- Order: #25 of 50 live games, oldest first.

## What the game already has (seen in code)

3D (Three.js inline) hide-and-seek: paint yourself to match the walls and hide, then swap roles and find the painted
kids with soap balloons. Daily gifts, missions, collection of styles and parks, weekly park with rotating palette and
a 250-star prize, close-call heartbeat and pink vignette, music layers that crossfade, first-session coach, creator
layout editor, Less Motion setting, keyboard support, 46 localized UI variants, leaderboard, save.

Gaps (seen): no `lib.share` call.

## Team call

Just past 100K plays and just out of its window (~68/day). The paint-camouflage reveal is the funny peak; share it.
Make the paint and soap effects juicier. No rule changes. Title stays.

## Wish (paste into Astra)

```
GOAL
Make painting, hiding and soap-balloon splashing in Paint Peekaboo juicier and funnier, make the parks feel alive, and let players share their sneakiest hiding spots. Keep the game exactly as players know it.

KEEP (do not change)
- Do not change the thumbnail.
- Keep the title, the controls, painting yourself to match walls, hiding, the role swap, finding hiders with soap balloons, daily gifts, missions, the collection of styles and parks, the Weekly Park and its prize, the close-call heartbeat, the music layers, the first-session coach, the creator layout editor, the Less Motion setting, keyboard support and all languages.
- Keep the leaderboard exactly as it is.
- Keep every player's saved progress (stars, styles, parks, missions, weekly progress, settings). Only add new save fields with safe defaults; never rename or reset existing ones.

CHANGE
1. Hiding spot share card: when the player survives a round hidden, show a picture of their painted character blending into the wall, with an arrow and "Can you find me?", and a "Share" button that shares it using the game's built-in share feature. One tap; never blocks the next round.
2. Daily Color: each day one paint color is "Color of the Day"; surviving a round while painted in it pays bonus stars once. Optional.
3. Instant start: a new player is moving within 1 second with no text to read, and paints themselves within 15 seconds.

VISUAL / VFX
- Painting: a paint splash that wraps around the character with wet drips, a shimmer as the color matches the wall, tiny paint droplets on the ground.
- Soap balloons: a wobbly flight with a bubble trail, a big foamy splat with soap bubbles drifting up, a funny "found you!" pop with stars when a hider is hit, and the hider's paint washing off with suds.
- Close calls: keep the heartbeat and pink vignette, add the seeker's shadow stretching closer.
- Parks: swaying trees and flowers, butterflies, kites, a splashing fountain, puddles that ripple, soft shadows, gentle bloom on bubbles and sparkles only, bright playful color grading. Wall colors and painted kids must stay fair to find (no extra camouflage for bots).

AUDIO
- Wet paint splats, a soft shimmer when matched, a balloon "fwip" and a foamy splash, giggles when found, keep the crossfading music. Respect the existing sound settings.

UX / HUD
- Share button and the Color of the Day chip match the current style, are thumb-sized and fit the screen in all languages. No extra clutter during rounds.

PERFORMANCE
- Target a stable 60 FPS on mid-range phones. Pool and reuse paint drops, bubbles and suds; use instancing for trees, flowers and walls; reuse materials. If FPS drops, reduce particles and shadows automatically first; Less Motion also reduces effects.
- Do not add new external network requests while the game runs.

DO NOT
- Do not change the thumbnail.
- Do not change hiding or seeking rules, bot skill, rewards or the leaderboard.
- Do not reset saves.
- Do not add ads, energy limits or paywalls.

ACCEPTANCE CHECK
- An existing save loads with the same stars, styles and parks.
- A new player paints themselves within 15 seconds.
- Painting and soap splashes show the new effects; surviving a round shows a working Share button with a picture.
- The Color of the Day appears once per day and pays once.
- No console errors; smooth on a phone-sized screen in English, Indonesian and Arabic.
```

## Why (Indonesian)

Momen lucu game ini adalah kamuflase cat, jadi wish ini menambah kartu share "Bisa temukan aku?", efek cat dan balon sabun yang lebih juicy, serta Warna Harian. Aturan sembunyi, cari dan leaderboard tidak diubah.
