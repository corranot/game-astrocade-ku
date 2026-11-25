# Mega Aura: Kubo's Schoolyard Adventure — Astra wish

- Game id: `01M5KVG20QW86AQWDCWKFQVZJH` · first published 2026-10-26 (age 30.3 days on 2026-11-25) · 394 plays, ~0/day (dead per audit)
- Source read: published version on 2026-11-25 (README, `search_game_files`).
- Order: #26 of 50 live games, oldest first.

## What the game already has (seen in code)

Voxel 3D (Three.js inline) schoolyard adventure: help Kubo's friends, playground tasks, collect aura, open five school
zones, six boss mini-games with adaptive difficulty, outfits, album collection, daily rewards with a grace day, Aura
Score leaderboard, Pause with music, sound, vibration, reduced motion and FPS, staged first-session disclosure.

Gaps (seen): no `lib.share` call.

## Team call

Dead (failed the first-day test; the audit says a new version is very unlikely to revive it). Keep the wish small
and aimed at the first 40 seconds and the look, in case it gets served again. No rule changes. Title stays.

## Wish (paste into Astra)

```
GOAL
Make the first minute of Mega Aura instantly fun and the schoolyard look bright and alive, so a brand-new player gets a big "wow" in the first 40 seconds. Keep the game exactly as players know it.

KEEP (do not change)
- Do not change the thumbnail.
- Keep the title, the controls, helping friends, playground tasks, aura, the five zones and gates, the six boss mini-games and their adaptive difficulty, outfits, the album, daily rewards and the streak grace day, the Pause settings and all languages.
- Keep the leaderboard exactly as it is.
- Keep every player's saved progress. Only add new save fields with safe defaults; never rename or reset existing ones.

CHANGE
1. Faster first wow: on the very first play, after "Tap to Play", the first friend to help is right next to Kubo with a bouncing marker; helping them gives a big aura burst within 10 seconds, the first zone gate glows open by 30 seconds, and the first boss mini-game is offered before 60 seconds.
2. Aura glow-up: the aura around Kubo visibly grows and changes color with each aura tier, with a short "AURA UP!" moment.
3. Aura share card: when a new aura tier or a boss win happens, show Kubo glowing in his outfit with the tier name, and a "Share" button that shares this picture using the game's built-in share feature. One tap; never blocks play.

VISUAL / VFX
- Helping: hearts and stars pop, the friend jumps for joy, aura particles fly into Kubo.
- Aura: a soft glowing ring, rising sparkles and light trails when running; bigger tiers add wings of light.
- Schoolyard life: swings moving, balls bouncing, kids playing tag in the background, leaves blowing, birds, a flag waving, soft shadows, gentle bloom on aura and sparkles only, bright cheerful voxel colors. Keep tasks and markers clearly readable; reduced motion turns extra motion off.

AUDIO
- A rising chime for aura gains, a cheerful "AURA UP!" sting, playground ambience with laughter. Respect the existing sound settings.

PERFORMANCE
- Target a stable 60 FPS on mid-range phones. Pool and reuse all particles; use instancing for voxel props and background kids; reuse materials.
- Do not add new external network requests while the game runs.

DO NOT
- Do not change the thumbnail. Do not change rewards, boss rules or the leaderboard. Do not reset saves. Do not add ads or energy limits.

ACCEPTANCE CHECK
- An existing save loads unchanged.
- A brand-new player gets an aura burst within 10 seconds and sees a gate open within 30 seconds.
- Aura tiers visibly change Kubo's glow; the share card works.
- No console errors; smooth on a phone-sized screen in English, Indonesian and Arabic.
```

## Why (Indonesian)

Game ini sudah "mati" di tes hari pertama dan menurut audit update jarang menghidupkannya, jadi wish ini sengaja kecil: 40 detik pertama dibuat langsung seru (aura meledak di 10 detik, gerbang terbuka di 30 detik) plus aura yang terlihat tumbuh dan bisa di-share.
