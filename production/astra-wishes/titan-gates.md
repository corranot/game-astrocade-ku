# Titan Gates: Army Merge Run — Astra wish

- Game id: `01M6KGGVV2BT4KYPTXHA73B569` · first published 2026-11-06 (age 19.2 days on 2026-11-25) · 311 plays, ~1/day (dead per audit)
- Source read: published version on 2026-11-25 (README, `search_game_files`).
- Order: #29 of 50 live games, oldest first.

## What the game already has (seen in code)

3D (three.js, minified core) one-finger gate runner: steer an army through number gates; ten soldiers fuse into a
knight, a giant and a titan; the titan smashes the boss each stage (side-slam and twin-edge-sweep patterns with a
dodge overlay). Eggs hatch into a Squad Book, Barracks income, Ascend with a permanent bonus, 12 badges, music,
sound, haptics and reduced-motion controls.

Gaps (seen): no `lib.share` call.

## Team call

Dead, inside its window (about 11 days left). The merge into a titan is the hook: make it a showpiece and get there
fast. No rule changes. Title stays.

## Wish (paste into Astra)

```
GOAL
Make the army in Titan Gates feel huge and powerful, make every merge into a knight, giant and titan a showpiece, and pack the first 40 seconds with wow moments. Keep the game exactly as players know it.

KEEP (do not change)
- Do not change the thumbnail.
- Keep the title, one-finger steering and keyboard controls, number gates, merging ten soldiers into a knight, giant and titan, the boss each stage and its patterns and dodge, eggs and the Squad Book, Barracks income, Ascend, badges, the comfort settings and all languages.
- Keep the leaderboard exactly as it is.
- Keep every player's saved progress. Only add new save fields with safe defaults; never rename or reset existing ones.

CHANGE
1. Packed first 40 seconds: on a first play, the first gates are easy multipliers so the army reaches ten soldiers and merges into a knight within 10 seconds, a giant by about 25 seconds, and the first boss smash happens before 40 seconds.
2. Titan share card: after a boss smash, show the titan towering over the defeated boss with the army size and stage number, and a "Share" button that shares this picture using the game's built-in share feature. One tap; never blocks the next stage.

VISUAL / VFX
- Gates: a bright flash and a burst of new soldiers spawning with little hops.
- Merge: soldiers run together into a glowing spiral, a light pillar and shockwave, then the bigger unit lands with a ground crack and dust.
- Army: banners flapping, footstep dust, shields glinting, a crowd that visibly fills the road.
- Boss smash: slow-mo impact, debris and sparks, the boss tumbling, confetti and a camera shake (reduced with reduced motion).
- World: a bright fantasy road with castles, flags, birds, drifting clouds, soft shadows, gentle bloom on merges and gates only, bold color grading. Keep gate numbers clearly readable.

AUDIO
- Marching footsteps that get louder with the army, a rising chord on each merge, a deep boom when the titan lands, a heroic fanfare on boss defeat. Respect the existing sound settings.

PERFORMANCE
- Target a stable 60 FPS on mid-range phones with a big army. Use instancing for soldiers and props, pool all particles and debris, reuse materials. If FPS drops, reduce particles and shadows automatically first.
- Do not add new external network requests while the game runs.

DO NOT
- Do not change the thumbnail. Do not change gate math, boss rules, rewards or the leaderboard. Do not reset saves. Do not add ads or energy limits.

ACCEPTANCE CHECK
- An existing save loads unchanged.
- A brand-new player merges into a knight within 10 seconds and smashes a boss before 40 seconds.
- Merges show the spiral, light pillar and landing crack; a boss smash shows a working Share button with a picture.
- No console errors; smooth on a phone-sized screen in English, Indonesian and Arabic.
```

## Why (Indonesian)

Game ini "mati" tapi masih di 30 hari pertama. Wish ini bikin penggabungan prajurit jadi ksatria, raksasa dan titan jadi pertunjukan, dicapai cepat dalam 40 detik pertama, plus share titan menghancurkan bos.
