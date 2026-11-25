# Tiny Town Mayhem: Toybox Sandbox — Astra wish

- Game id: `01M595QGNCARTXYT93FYR71JXN` · first published 2026-10-22 (age 34.5 days on 2026-11-25) · 9,973 plays, ~16/day, 50.6 shares per 1,000
- Source read: published version on 2026-11-25 (README, `search_game_files`).
- Order: #21 of 50 live games, oldest first.

## What the game already has (seen in code)

3D (Three.js inline) toy-town sandbox: explore the plaza, set off authored chain reactions with hydrants, boxes,
trampolines, springs, crates and cars, dodge a gentle cartoon police chase, visit shop/café/station, hide-and-seek
and race minigames, 12 challenges, cosmetics, 24-sticker album, leaderboard. Pause menu with Music, Sound, Calm,
Vibration, Photo and FPS; 7 languages incl. Arabic.

Gaps (seen): no `lib.share` call, although a Photo mode exists. Title shares "Toybox"/"Mayhem" with Toybox Town
(bigram dedup risk, both small); default keeps the title.

## Team call

Just past its boost, small. Chain reactions are the toy: make them spectacular and connect the existing Photo mode
to sharing. No rule changes. Title stays.

## Wish (paste into Astra)

```
GOAL
Make every chain reaction in Tiny Town Mayhem bigger, funnier and more satisfying to watch, make the toy town feel alive, and let players share their best moments. Keep the game exactly as players know it.

KEEP (do not change)
- Do not change the thumbnail.
- Keep the title, the controls, exploring the plaza, every chain-reaction prop (hydrants, boxes, trampolines, springs, crates, cars), the gentle police chase, the shop, café and station, the hide-and-seek and race minigames, the 12 challenges, cosmetics, the 24-sticker album, the pause settings (Music, Sound, Calm, Vibration, Photo, FPS) and all 7 languages.
- Keep the leaderboard exactly as it is.
- Keep every player's saved progress (challenges, stickers, cosmetics, coins, best scores, settings). Only add new save fields with safe defaults; never rename or reset existing ones.

CHANGE
1. Share from Photo mode: after taking a photo, add a "Share" button that shares it using the game's built-in share feature. Also, when a chain reaction reaches a big milestone, show a small "Share this chain!" button for a few seconds with an auto snapshot of the moment. One tap; never blocks play.
2. Daily Mayhem: each day one chain challenge is "Today's Mayhem" (for example "Launch 3 crates with one spring") with a one-time sticker or coin reward. Optional.
3. Instant start: a new player can move and trigger the first chain reaction within 10 seconds, with no text to read first.

VISUAL / VFX
- Chains: each link pops with a colorful spark and a combo number that grows, hydrants shoot water arcs with spray and puddles, crates burst into wood chips, springs launch with a coil wobble and speed trail, cars bump with bouncy squash and tiny skid marks.
- Big chain milestone: a brief slow-motion (off when Calm is on), confetti and a camera pull-back to show the whole chain.
- Police chase: a cartoon siren light, the officer's hat flying off when they trip, dust clouds.
- Town life: toy people walking and waving, a toy train looping, birds, balloons drifting, flags flapping, a fountain, soft shadows, gentle bloom on sparks and lights only, bright toy-color grading. Keep props and the player clearly readable.

AUDIO
- Toy-like boings, plastic clacks, water whooshes and wood crunches for each link, a rising combo jingle, a cartoon siren, a camera shutter for photos. Respect the existing sound settings.

UX / HUD
- Share buttons and the Today's Mayhem chip match the current style, are thumb-sized and fit the screen in all 7 languages. No extra clutter.

PERFORMANCE
- Target a stable 60 FPS on mid-range phones even during big chains. Pool and reuse sparks, chips, water and confetti; use instancing for repeated props and toy people; reuse materials; let resting physics bodies sleep. If FPS drops, reduce particles and shadows automatically first.
- Do not add new external network requests while the game runs.

DO NOT
- Do not change the thumbnail.
- Do not change chain scoring, challenge rules, rewards or the leaderboard.
- Do not reset saves.
- Do not add ads, energy limits or paywalls.

ACCEPTANCE CHECK
- An existing save loads with the same challenges, stickers and cosmetics.
- A new player triggers a chain reaction within 10 seconds.
- Big chains show the slow-mo, confetti and camera pull-back; Photo mode and chain milestones have a working Share button.
- Today's Mayhem appears once per day and pays once.
- No console errors; smooth on a phone-sized screen in English, Indonesian and Arabic.
```

## Why (Indonesian)

Reaksi berantai adalah mainan utama game ini, jadi wish ini bikin setiap rantai lebih heboh (semburan air, peti pecah, slow-mo, kamera mundur), menyambungkan mode Foto ke share, dan menambah Mayhem Harian. Skor dan leaderboard tidak diubah.
