# Pinata Maker: Smash Party — Astra wish

- Game id: `01M7QHXBYRP167NRSCKP8M33V7` · first published 2026-11-19 (age 6.3 days on 2026-11-25) · 192 plays, ~0/day (dead per audit)
- Source read: repo source `prototypes/pinata-maker/` (README; `scene.js` has `WebGLRenderer`, Three.js 0.187.0, HUD on a 2D canvas), which matches the shipped version.
- Order: #45 of 53 live games, oldest first.

## What the game already has (seen in code)

Already 3D (Three.js 0.187.0) maker with a smash: pick a shape, stick paper, add eyes and stickers, fill with
candy, smash with hit-stop, flutter, cracks and a slow-motion burst with a shockwave, grab candy for coins, open a
capsule toy. Starts with a ready-made pinata (three taps, burst, first toy). Orders, a 16-toy album in four
rarities, reward bar, stick shop, golden pinata, party round, party themes (beach, snow, candy land), bonus smashes,
a daily gift with a day streak, a top-collectors list.

## Team call

Dead below the 200-play test, never got a second test. The audit says to reuse its parts in the passing maker games
rather than revive it. It is already 3D, so a wish can only sharpen the smash and add sharing. Low expectations. One
small wish. Title stays.

## Wish (paste into Astra)

```
GOAL
Make the pinata smash in Pinata Maker the most satisfying, funny moment in the game, and make it shareable. Keep the game exactly as players know it.

KEEP (do not change)
- Do not change the thumbnail.
- Keep the title, the ready-made first pinata (three taps to burst), every step (shape, paper, eyes and stickers, candy, smash, grab candy, capsule toy), the touch controls, orders, the toy album with rarities and the golden pinata, the reward bar, the stick shop, the party round, party themes, bonus smashes, the daily gift, the top-collectors list and all languages.
- Keep the leaderboard exactly as it is.
- Keep every player's saved progress. Only add new save fields with safe defaults; never rename or reset existing ones.

CHANGE
1. Bigger smash: each hit squashes and swings the pinata harder with a funny face reaction (surprised eyes, wobbly mouth), the last hit bursts it in a slow-motion explosion of paper strips and candy that bounce on the grass and roll.
2. Smash share card: after the burst, show the candy rain with the player's own pinata pieces flying and the toy they got, and a "Share" button that shares this picture using the game's built-in share feature. One tap; never blocks play.

VISUAL / VFX
- Paper fringe that flutters in the wind, confetti and streamers on the burst, candy that shines and spins, a ring shockwave in the grass, balloons bobbing and party lights in the yard. Soft shadows, gentle bloom on candy and lights only.

AUDIO
- Thwacks that rise in pitch with each hit, a paper rip, a big candy-rain clatter, kids cheering, festive party music. Respect the existing settings.

PERFORMANCE
- Keep instancing and pools for candy and paper; target a stable 60 FPS on mid-range phones. No new external requests while playing.

DO NOT
- Do not change the thumbnail. Do not change prices, rewards or the leaderboard. Do not reset saves. Do not add ads or energy limits.

ACCEPTANCE CHECK
- An existing save loads unchanged.
- A brand-new player bursts the first pinata within 10 seconds.
- The burst is slow-motion with bouncing candy; a working Share button appears with a picture.
- No console errors; smooth on a phone-sized screen in English, Indonesian and Arabic.
```

## Why (Indonesian)

Game ini sudah 3D tapi "mati" di bawah 200 plays, jadi harapannya rendah; audit menyarankan bagian-bagiannya dipakai ulang di game maker yang lolos. Kalau tetap mau, wish kecil ini membuat pukulan dan ledakan piñata lebih lucu dan bisa di-share.
