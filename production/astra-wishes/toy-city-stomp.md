# Toy City Stomp: Giant Monster Smash — Astra wish

- Game id: `01M7T76RT3XB9F68N8FGRWHRWG` · first published 2026-11-21 (age 4.3 days on 2026-11-25) · 156 plays, ~30–40/day (trickle, below the 200-play test)
- Source read: repo source `prototypes/toy-city-stomp/` (README; `game.js` has `WebGLRenderer`), which matches the shipped version.
- Order: #47 of 53 live games, oldest first.

## What the game already has (seen in code)

Full 3D toy-diorama smash: Bonbon, a giant gummy dino, walks through a toy-block city with one finger; blocks fly,
houses pancake, towers topple like dominoes, cars squash and pop back, residents float off on balloons; points fill
the grow bar over 8 stages; combo, Tail Spin at stage 3, toy army with wanted stars, Wind-Up Robot boss (3 phases),
Spirit (no game over), a shop with 10 moves, missions, Rainbow Mode, result screen with stars and PLAY AGAIN,
7 languages with Arabic right-to-left, sound made in code, saves, leaderboard.

## Team call

Still a trickle inside its window, and still before the play test, so the first 40 seconds decide everything. The
game already meets the 3D bar. The wish makes the first stomp happen instantly and the first growth feel huge, and
adds a share moment. No rule changes. Title stays.

## Wish (paste into Astra)

```
GOAL
Make the first 40 seconds of Toy City Stomp an explosion of fun: a brand-new player knocks down a tower within 5 seconds and grows Bonbon at least twice before 40 seconds. Keep the game exactly as players know it.

KEEP (do not change)
- Do not change the thumbnail.
- Keep the title, one-finger movement, Bonbon, Block Town, all 8 growth stages, combo, dominoes, Tail Spin, cars, trees, residents with balloons, the toy army and wanted stars, the Wind-Up Robot boss, Spirit with no game over, the shop and its 10 moves, missions, Rainbow Mode, the result screen with PLAY AGAIN, sound settings and all 7 languages.
- Keep the leaderboard exactly as it is.
- Keep every player's saved progress. Only add new save fields with safe defaults; never rename or reset existing ones.

CHANGE
1. Instant first stomp: on a first play, Bonbon starts right next to a wobbly tower of small blocks with a glowing arrow; the first drag topples it in a domino chain within 5 seconds, and the first growth happens within about 15 seconds with a big "GROW!" moment.
2. Grow moment: each growth stage pauses for half a second in slow motion while Bonbon puffs up with a happy roar and the camera pulls back to show the bigger city.
3. Stomp share card: on the result screen, show Bonbon at its biggest towering over the ruined toy city with the score and stage, and a "Share" button that shares this picture using the game's built-in share feature. One tap; never blocks PLAY AGAIN.

VISUAL / VFX
- Toppling: blocks bounce and scatter with dust puffs, a ring shockwave on every stomp, cracks before a fall, glass sparkles, residents giggling as they float away.
- City: toy clouds drifting, flags waving, little trains moving, soft shadows, gentle bloom on Rainbow Mode only. Keep Bonbon and the army clearly readable.

AUDIO
- Plastic clacks and thuds that stack into a big crash on dominoes, a gummy "boing" stomp, a cute roar on growing, bouncy toy music. Respect the existing settings.

PERFORMANCE
- Keep the instanced city and pools; target a stable 60 FPS on mid-range phones with adaptive quality. No new external requests while playing.

DO NOT
- Do not change the thumbnail. Do not change scoring, prices, growth rules or the leaderboard. Do not reset saves. Do not add ads or energy limits.

ACCEPTANCE CHECK
- An existing save loads unchanged.
- A brand-new player topples a tower within 5 seconds and grows twice before 40 seconds.
- The result screen shows a working Share button with a picture.
- No console errors; smooth on a phone-sized screen in English, Indonesian and Arabic.
```

## Why (Indonesian)

Game ini belum lolos uji 200 plays, jadi 40 detik pertama paling menentukan. Wish ini membuat menara pertama roboh dalam 5 detik, Bonbon tumbuh dua kali sebelum 40 detik, plus share foto Bonbon raksasa di layar hasil.
