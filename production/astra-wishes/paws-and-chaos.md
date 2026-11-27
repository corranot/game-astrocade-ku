# Paws & Chaos: Sunbeam Kingdom — Astra wish

- Game id: `01M864715VW2G1XCCDYA262YEZ` · first published 2026-11-24 (age 1.4 days on 2026-11-25) · 178 plays, ~50–100/day and slowing (in its first-day test, likely failing)
- Source read: repo source `prototypes/paws-and-chaos/` (README; Three.js r187, `WebGLRenderer` present), which matches the shipped version.
- Order: #51 of 53 live games, oldest first.

## What the game already has (seen in code)

3D cozy pet sandbox for ages 5–11: a fluffy kitten in a giant sunny house; knock toys off tables, chase the red laser
dot, push yarn into the basket, bounce on the sleeping dog, climb the bookshelf tower for golden fish; mischief star
bar; the magic mirror sells 6 fur skins and 5 hats; 15 fish open the pet door to the garden (butterflies, fountain,
daisies, treehouse); no game over; joystick, jump, meow/pounce; saves; 7 languages; fish leaderboard.

## Team call

**First, decide on the fix draft that is already waiting** (soft bounce + window light, tested). If it is published,
let it run about a day before sending this wish. This wish is for after that: it makes the first mischief happen in
seconds and adds a share moment. Title stays.

## Wish (paste into Astra after the fix version has had about a day)

```
GOAL
Make Paws & Chaos funny from the very first seconds: a brand-new player knocks a toy off a table within 5 seconds and earns the first golden fish within 30 seconds. Keep the game exactly as players know it.

KEEP (do not change)
- Do not change the thumbnail.
- Keep the title, the kitten and its controls (joystick, jump, meow and pounce, drag to turn the camera), the house and garden, every toy and activity (red dot, yarn basket, sleeping dog, bookshelf tower, butterflies), the mischief star bar, fish, the magic mirror with all skins and hats, the pet door at 15 fish, no game over, settings and all 7 languages.
- Keep the leaderboard exactly as it is.
- Keep every player's saved progress. Only add new save fields with safe defaults; never rename or reset existing ones.

CHANGE
1. Instant mischief: on a first play, the kitten starts on a table next to a wobbly stack of toys with a soft glowing paw print; one tap pounces and sends them tumbling within 5 seconds; the red dot appears right after and leads to the first golden fish within 30 seconds.
2. Mischief share card: when the kitten gets a new skin or hat, or opens the pet door, show the kitten posing in its outfit in the sunbeam with the fish count, and a "Share" button that shares this picture using the game's built-in share feature. One tap; never blocks play.

VISUAL / VFX
- Toys bounce and roll with little dust puffs, a star pop on every mischief, fur that ruffles on landing, sunbeams with floating dust, curtains that sway, butterflies with sparkle trails. Soft shadows, gentle bloom on sunbeams and fish only.

AUDIO
- Cute meows and purrs, toy clatters, a chime for fish, cozy playful music. Respect the existing settings.

PERFORMANCE
- Keep the quality steps for slower devices; target a stable 60 FPS on mid-range phones. No new external requests while playing.

DO NOT
- Do not change the thumbnail. Do not change fish values, prices or the leaderboard. Do not reset saves. Do not add ads or energy limits.

ACCEPTANCE CHECK
- An existing save loads unchanged.
- A brand-new player knocks toys over within 5 seconds and gets a golden fish within 30 seconds.
- A new outfit shows a working Share button with a picture.
- No console errors; smooth on a phone-sized screen in English, Indonesian and Arabic.
```

## Why (Indonesian)

Game ini kemungkinan gagal uji. Langkah murah pertama adalah draft perbaikan yang sudah siap; wish ini baru dipakai ±1 hari setelah itu, supaya kenakalan pertama terjadi dalam 5 detik, ikan emas sebelum 30 detik, plus share kostum kucing.
