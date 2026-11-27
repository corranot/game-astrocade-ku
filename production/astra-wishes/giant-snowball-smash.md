# Giant Snowball Smash — Astra wish

- Game id: `01M6FH7M1V415Q031Q3ZJG9RBN` · first published 2026-11-04 (age 21.3 days on 2026-11-25) · 289 plays, ~1/day (dead per audit)
- Source read: published version on 2026-11-25 (README, `search_game_files` on `game.js`).
- Order: #28 of 50 live games, oldest first.

## What the game already has (seen in code)

3D (Three.js, bundled in `game.js`, renderer `antialias: false`, pixel ratio 1) arcade runner: steer a snowball
through bonus gates (×3, −5…), dodge hazards, grow huge and smash icy castles. Flakes for upgrades, skins and hats,
Pip Dash penguin challenge, creator themes (sunset, aurora, frost, candy), snowfall, worker pool, quality watchdog,
leaderboard.

Gaps (seen): no `lib.share` call. Audit: shares "Snowball" with Winter Toy-Box: Snowball Arena.

## Team call

Dead, inside its window (about 9 days left). Winter season is coming, which helps a snow game if it is served again.
The castle smash is the payoff: make it huge, and make the ball's growth obvious. No rule changes. Title stays.

## Wish (paste into Astra)

```
GOAL
Make rolling and growing the snowball in Giant Snowball Smash feel huge and satisfying, make every castle smash spectacular, and pack the first 40 seconds with wow moments. Keep the game exactly as players know it.

KEEP (do not change)
- Do not change the thumbnail.
- Keep the title, drag-to-steer and keyboard controls, the bonus gates, hazards, growing, smashing icy castles, Flakes, upgrades, skins and hats, Pip Dash, the creator themes and snowfall, and all languages.
- Keep the leaderboard exactly as it is.
- Keep every player's saved progress. Only add new save fields with safe defaults; never rename or reset existing ones.

CHANGE
1. Packed first 40 seconds: on a first play, the first gate is an easy "x3" right in front, the ball visibly doubles in size by 10 seconds, and the first castle smash happens before 35 seconds.
2. Smash share card: after a castle smash, show the giant snowball in the ruins with its size and score, and a "Share" button that shares this picture using the game's built-in share feature. One tap; never blocks the next run.
3. Winter Festival look: string lights, snowmen with scarves and little pine trees with ornaments along the track, purely decoration.

VISUAL / VFX
- Rolling: the ball picks up snow in visible layers, leaves a deep track with snow spray at the sides, and things stuck on it (twigs, gifts, penguin hats) spin with it.
- Gates: a bright pop and a size-up shockwave ring for good gates, a puff and shrink for bad ones.
- Castle smash: a short slow-mo on impact, ice blocks shatter into chunks and glittering ice dust, a snow shockwave, towers topple, the camera pulls back to show the destruction.
- World: falling snow, aurora or sunset skies by theme, sparkling snow surface, soft shadows, gentle bloom on ice glints and lights only, crisp winter color grading. Keep gates, numbers and hazards clearly readable.

AUDIO
- A crunchy rolling sound that gets deeper as the ball grows, a bright "pop" on good gates, a huge icy crash for castles, cheerful winter music with bells. Respect the existing sound settings.

PERFORMANCE
- Keep the quality watchdog and target a stable 60 FPS on mid-range phones. Pool and reuse ice chunks, snow spray and sparkles; use instancing for trees, snowmen and castle blocks; reuse materials.
- Do not add new external network requests while the game runs.

DO NOT
- Do not change the thumbnail. Do not change gate math, scoring or the leaderboard. Do not reset saves. Do not add ads or energy limits.

ACCEPTANCE CHECK
- An existing save loads unchanged.
- A brand-new player sees the ball double by 10 seconds and smashes a castle before 35 seconds.
- Castle smashes show slow-mo, shattering ice and a camera pull-back; a working Share button appears with a picture.
- No console errors; smooth on a phone-sized screen in English, Indonesian and Arabic.
```

## Why (Indonesian)

Game ini "mati" tapi masih di 30 hari pertama dan musim salju segera datang. Wish ini bikin bola salju terlihat jelas membesar, penghancuran kastil es jadi spektakuler, 40 detik pertama penuh momen, plus share dan dekorasi Festival Musim Dingin.
