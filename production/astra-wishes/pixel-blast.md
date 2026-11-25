# Pixel Blast — Astra wish

- Game id: `01M70NSXY1A0T8XMZJMM0TS67Q` · first published 2026-11-11 (age 14.2 days on 2026-11-25) · 217 plays, ~2/day (dead per audit)
- Source read: published version on 2026-11-25 (README, `search_game_files`: `canvas.getContext('2d')` in `src/render.js`, no WebGLRenderer).
- Order: #36 of 53 live games, oldest first.

## What the game already has (seen in code)

2D canvas neon synthwave shooter: drag to steer a ship that auto-fires; pixel-art invaders chip apart pixel by pixel,
each pixel plays a note on a pentatonic melody synced to the track tempo; combo ×1–×5, Bullet Time every 80 combo,
Pixel Nova, 3 bosses with phases, 12 stages in 3 sectors, Endless, Daily, Weekly, Boss Rush, Ranked Arcade, perks,
dash, Hangar ships and upgrades, trails, badges, missions, codex, login streak, options (reduce flashes, CRT,
colorblind bullets, left-handed), adaptive quality.

## Team call

Dead and off the kid identity (audit lists it as an optional unpublish candidate). The quality standard still asks
for 3D, and this game has a natural 3D form: invaders made of voxels that chip off cube by cube. One wish. Title stays.

## Wish (paste into Astra)

```
GOAL
Turn Pixel Blast into a dazzling 3D neon voxel shooter (Three.js) where invaders are built from glowing cubes that chip off one by one, while keeping every rule, mode and player save exactly as it is.

KEEP (do not change)
- Do not change the thumbnail.
- Keep the title, drag and keyboard steering, auto-fire, pixel-by-pixel damage, the note-per-pixel music sync, combo and multiplier, Bullet Time, Pixel Nova, dash, all enemy types, all 3 bosses and their phases, the 12 stages and 3 sectors, Endless, Daily, Weekly, Boss Rush and Ranked Arcade, perks, the Hangar, trails, badges, missions, the codex, the login streak and all options (reduce flashes, CRT, colorblind bullets, left-handed).
- Keep the leaderboard and the ranked rules exactly as they are.
- Keep every player's saved progress. Only add new save fields with safe defaults; never rename or reset existing ones.
- Keep the same top-down play view and the same hit areas, so the game plays exactly the same.

CHANGE
1. Render the game in 3D with Three.js, seen from a slightly tilted top-down camera: invaders become voxel models made of small glowing cubes (one cube per pixel), the ship becomes a sleek neon voxel ship, and the background becomes a 3D synthwave world (glowing grid floor, distant neon city, sun, stars) for Neon City, Deep Space and Glitch.
2. Each hit knocks a cube off the invader, which tumbles away glowing and fades; kills burst the remaining cubes outward with the chain shockwave.
3. Death share card: at the end of a run, show the ship in front of the last boss reached with the score and best combo, and a "Share" button that shares this picture using the game's built-in share feature.

VISUAL / VFX
- Neon bloom on shots, cubes and the grid only; Bullet Time tints the world and slows tumbling cubes; Nova sends a ring of light across the grid; boss WARNING strobe respects "reduce flashes".
- Keep it readable: enemy bullets stay high-contrast, colorblind mode still works.

AUDIO
- Keep the pixel-note melody and tracks; add a deeper 3D-feeling boom on big kills.

PERFORMANCE
- Target a stable 60 FPS on mid-range phones. Use one instanced mesh for all cubes, pool every bullet and particle, reuse materials. Keep the adaptive quality: drop bloom and extra cubes first.
- Do not add new external network requests while the game runs.

DO NOT
- Do not change the thumbnail. Do not change scoring, hit areas, ranked rules or the leaderboard. Do not reset saves. Do not add ads or energy limits.

ACCEPTANCE CHECK
- An existing save loads with the same coins, ships, upgrades, stars and badges.
- Every mode plays the same as before, now in 3D, and each hit knocks off a cube.
- The run end shows a working Share button with a picture.
- No console errors; smooth on a phone-sized screen.
```

## Why (Indonesian)

Game ini masih 2D, "mati", dan di luar identitas game anak kita, jadi prioritasnya rendah. Kalau tetap mau di-update, wish ini mengubahnya jadi shooter voxel neon 3D: tiap tembakan merontokkan satu kubus dari musuh, dengan aturan dan mode yang sama persis.
