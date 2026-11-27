# Spooky Squad 3v3 — Astra wish

- Game id: `01M431FK2M75DNRYNPS9XXQ320` · first published 2026-10-04 (age 52.2 days on 2026-11-25) · 8,356 plays, ~33/day, 5.7 shares per 1,000
- Source read: published version on 2026-11-25 (README, `search_game_files`).
- Order: #12 of 50 live games, oldest first.

## What the game already has (seen in code)

3D (Three.js inline) single-player Halloween 3v3 arena shooter against monster bots in a haunted graveyard. Collect
candy to level up, revive the squad, SUPER attacks, dash, Monster Bond (×1.1 damage near a teammate), short first
matches (first to 20, then 35, then 50 KOs / 5 min), colour-blind team markers, haptics with Vibration toggle,
7 languages. Online code present but disabled.

Gaps (seen): no `lib.share` call; lowest share rate in this batch (5.7 per 1,000). Halloween theme is now out of
season (late November).

## Team call

Small and seasonal. Do not rename it. Keep the spooky-cute tone but make it feel cozy-spooky all year (moonlit
graveyard, not only Halloween), make SUPER and KO moments punchier, and add an MVP share card after a win. No rule
changes. Title stays.

## Wish (paste into Astra)

```
GOAL
Make every match in Spooky Squad 3v3 feel punchier and more spectacular, make the haunted arena feel alive all year round, and let players share their MVP moments. Keep the game exactly as players know it.

KEEP (do not change)
- Do not change the thumbnail.
- Keep the title, the controls, the 3v3 matches against monster bots, candy level-ups, revives, dash, SUPER attacks, Monster Bond, the short first matches and the full match rule after that, the team markers that do not rely on color, the Vibration setting and all 7 languages.
- Keep every player's saved progress and settings. Only add new save fields with safe defaults; never rename or reset existing ones.

CHANGE
1. MVP share card: after a match, show the player's hero in a victory pose with their KOs and candy, and a "Share" button that shares this picture using the game's built-in share feature. One tap; never blocks the next match.
2. Moonlit nights all year: keep the Halloween spirit, but dress the graveyard as a cozy-spooky moonlit park that fits any month (glowing mushrooms, friendly ghosts, lanterns), with pumpkins kept as decoration.
3. Daily Monster Hunt: each day one monster type is the "Wanted" monster; KO it 5 times for bonus candy once per day. Optional.
4. Instant start: a new player is in a match and can move and shoot within a few seconds, with no text to read first.

VISUAL / VFX
- Shots: bright colorful projectile trails, hit sparks and little candy pops on hits, damage numbers that pop and fade (pink for Monster Bond).
- SUPER: a charge glow around the hero, a big shockwave ring, ground cracks with ghostly light, screen-edge flash and a short slow-mo.
- KO: the monster puffs into purple smoke and candy, a small camera bump.
- Revive: a light pillar and floating sparkles.
- Arena life: drifting fog, swaying dead trees, bats flying across the moon, flickering lanterns, fireflies, gravestones with glowing runes, soft moon shadows, gentle bloom on magic and lanterns only, purple-teal color grading. Keep heroes, bots and teams clearly readable.

AUDIO
- Snappy shot sounds, juicy hit pops, a deep whoom for SUPER, a ghostly poof on KO, a choir swell on revive, spooky-cute music. Respect the existing sound settings.

UX / HUD
- Share button and the Wanted chip match the current style, are thumb-sized and fit the screen in all 7 languages. No extra clutter during matches.

PERFORMANCE
- Target a stable 60 FPS on mid-range phones. Pool and reuse all projectiles, sparks, smoke and candy; use instancing for gravestones, trees and lanterns; reuse materials. If FPS drops, reduce fog and particles automatically first.
- Do not add new external network requests while the game runs, and keep online play off.

DO NOT
- Do not change the thumbnail.
- Do not change damage, match rules, bot difficulty or rewards.
- Do not reset saves.
- Do not add ads, energy limits or paywalls.

ACCEPTANCE CHECK
- An existing save loads with the same progress and settings.
- A new player moves and shoots within a few seconds.
- SUPER and KO show the new effects; the match end has a working Share button with a picture.
- The Wanted monster appears once per day and pays once.
- No console errors; smooth on a phone-sized screen in English, Indonesian and Arabic.
```

## Why (Indonesian)

Tema Halloween sudah lewat musimnya, jadi wish ini membuat arena terasa "seram-imut" sepanjang tahun, plus efek SUPER dan KO yang lebih nendang, kartu share MVP, dan Monster Buruan harian. Aturan match dan damage tidak diubah.
