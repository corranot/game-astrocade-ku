# Pin & Bloom: Water Puzzle — Astra wish

- Game id: `01M7KYFYEV5SHEP0X8YKQCG2NP` · first published 2026-11-17 (age 8.4 days on 2026-11-25) · 2,446 plays, ~0.8–1.9K/day and rising (alive), shares 31.1 per 1,000
- Source read: published version on 2026-11-25 (README, file list: WebGL2 2D backend `src/gl.js`, particle fluid in a Worker `src/simthread.js`).
- Order: #43 of 53 live games, oldest first.

## What the game already has (seen in code)

Cozy pull-the-pin fluid puzzle: tap gold pins in the right order so water reaches Kubo's sprout; water, mud and lava
are particles (water plus lava makes steam); 40 levels in two worlds (sunny garden, moon garden with a mud sponge and
a frozen gate); gentle misses with a "why" bubble and auto-restart, hand hint after two misses; stars, a gold flower
and rain party every fifth level, a garden of flowers that sing and replay their level; NEW! teaser on the Next
button; star-total leaderboard; saves; code-painted art (~120 KB); English, Indonesian, Spanish, Portuguese.

## Team call

Alive, rising and inside its window (about 22 days left). Shares are already strong. Like Rub It Away: no 3D rewrite
during the window (the fluid look and 60 FPS are working); ship a **named new world about every 3 days**. Each world
adds one gentle new element that the existing NEW! teaser can introduce. Keep the leaderboard exactly. Title stays.

Send Wish 1 now and Wish 2 about 3 days later.

## Wish 1 — Snow Garden (paste into Astra now)

```
GOAL
Add a third world, "Snow Garden", with 20 new levels (41 to 60) to Pin & Bloom, in the same style and rules as the existing 40 levels, with one gentle new element: snow that melts into water. Keep the game exactly as players know it.

KEEP (do not change)
- Do not change the thumbnail.
- Keep the title, the one-tap pin control, Kubo and the sprouts, water, mud and lava and how they mix (water plus lava makes steam), the mud sponge and frozen gate, the 40 existing levels and their order, the "why" bubble and auto-restart on a miss, the hand hint after two misses, stars, gold flowers and rain parties every fifth level, the garden of singing flowers and replay, the NEW! teaser, settings and all languages.
- Keep the leaderboard exactly as it is (the total of all stars).
- Keep every player's saved progress. Only add new save fields with safe defaults; never rename or reset existing ones. A player who finished level 40 sees Snow Garden unlocked.

CHANGE
1. Snow Garden: 20 new levels after level 40 in a winter garden. New element: snow particles that sit still as a soft pile and melt into water drops when warm lava or steam touches them, so the player can use lava on purpose to make water. Introduce it gently: level 41 shows the hand and has only one pin; mix it with the known fluids in later levels.
2. Every fifth Snow Garden level gives a gold flower and a rain party as before (a snow party with soft flakes is fine).
3. The garden screen gets a snowy row for the new flowers.
4. Garden share card: when the player earns a gold flower, show their garden with all their flowers and the star total, and a "Share" button that shares this picture using the game's built-in share feature. One tap; never blocks play.
5. Add all new words in English, Indonesian, Spanish and Portuguese.

VISUAL / VFX
- Snow: soft white piles with a blue shade, little melt drips and a puff of mist when lava touches, steam that curls up, frost on the glass tanks, falling snowflakes in the background, Kubo in a tiny scarf.

AUDIO
- A soft crunch when snow lands, a fizzy hiss on melting, a twinkly chime on a bloom, the existing music style. Respect the existing settings.

PERFORMANCE
- Keep the fluid physics in the background worker and the current renderer; stable 60 FPS on mid-range phones with snow on screen. No new external requests while playing.

DO NOT
- Do not change the thumbnail. Do not change existing levels, star rules or the leaderboard. Do not reset saves. Do not add ads, energy limits or timers.

ACCEPTANCE CHECK
- An existing save loads unchanged; a player past level 40 can play level 41.
- Snow melts into usable water when lava or steam touches it; each new level can be solved.
- A gold flower shows a working Share button with a picture.
- No console errors; smooth on a phone-sized screen in English and Indonesian.
```

## Wish 2 — Rainbow Garden (send about 3 days after Wish 1)

```
GOAL
Add a fourth world, "Rainbow Garden", with 20 new levels (61 to 80) to Pin & Bloom, in the same style and rules, with one gentle new element: colored paint water that blooms flowers in its color. Keep the game exactly as players know it.

KEEP (do not change)
- Do not change the thumbnail.
- Keep the title, the pin control, every fluid and element including snow, every existing level and world, misses and hints, stars, gold flowers and parties, the garden and replay, the garden share card, the NEW! teaser, settings and all languages.
- Keep the leaderboard exactly as it is.
- Keep every player's saved progress. Only add new save fields with safe defaults.

CHANGE
1. Rainbow Garden: 20 new levels after level 60. New element: water in two or three colors; each pot shows the color it wants, and mixing two colors on the way makes a new color (blue plus yellow makes green). Level 61 shows the hand and uses one color; mixing comes later.
2. A rainbow row in the garden where each flower blooms in the color it was watered with.
3. All new words in the four languages.

VISUAL / VFX
- Glossy colored water that blends smoothly where colors meet, a rainbow arc over the garden on a win, petal confetti in the pot's color.

AUDIO
- A different soft note per color on landing, a rising chord on a bloom. Respect the existing settings.

PERFORMANCE
- Stable 60 FPS on mid-range phones. No new external requests while playing.

DO NOT
- Do not change the thumbnail. Do not change existing levels, star rules or the leaderboard. Do not reset saves. Do not add ads, energy limits or timers.

ACCEPTANCE CHECK
- An existing save loads unchanged; Rainbow Garden opens after Snow Garden.
- Colors mix correctly and each new level can be solved.
- No console errors; smooth on a phone-sized screen in English and Indonesian.
```

## Why (Indonesian)

Game ini sedang naik dan share-nya bagus, jadi jangan dirombak; cukup tambah dunia baru tiap ±3 hari (Snow Garden dengan salju yang mencair, lalu Rainbow Garden dengan air warna-warni), plus share foto taman saat dapat bunga emas. Leaderboard tetap sama.
