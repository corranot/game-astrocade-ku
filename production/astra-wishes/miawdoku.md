# Miawdoku: Cat Logic Puzzle — Astra wish

- Game id: `01M4E7SKMRNT12Z4DXXSCQ4WHZ` · first published 2026-10-08 (age 47.7 days on 2026-11-25) · 881 plays, ~2/day, 14.8 shares per 1,000
- Source read: published version on 2026-11-25 (README, `search_game_files`).
- Order: #17 of 50 live games, oldest first.

## What the game already has (seen in code)

2D Phaser logic puzzle (no Three.js): place one cat in every row, column and color region, cats never touching,
even diagonally. Mark X, hints, hearts, skill-adapting levels, daily puzzles and gifts, gold levels, combos,
leaderboards, a nine-cat collection, weekly 9×9 event with costumes, save/resume of unfinished rounds, Undo, big
text and reduced motion, keyboard support, 7 languages.

Gaps (seen): 2D only; no `lib.share` call.

## Team call

Very small (~2/day, under the dead-game line since launch per the audit). The audit says a new version does not
revive a dead game, so expect little. The quality standard still asks for 3D: a cozy 3D cat-café board where the
grid stays perfectly readable from above. Keep it a single wish; a share card of a solved board comes with it.
Title stays.

## Wish (paste into Astra)

```
GOAL
Turn Miawdoku into a cozy, fully 3D cat-café puzzle (Three.js) while keeping every puzzle rule, level and player save exactly as it is. The board must stay perfectly clear to read, and solving a puzzle should feel warm and rewarding.

KEEP (do not change)
- Do not change the thumbnail.
- Keep the title, the puzzle rules (one cat per row, column and color region; cats never touch, even diagonally), Mark X and Place cat, tap, double-tap and swipe gestures, Undo, hints, hearts, skill-adapting levels, daily puzzles and gifts, gold levels, combos, the nine-cat collection, the weekly 9x9 event and its costumes, save and resume, big text, reduced motion, keyboard play and all 7 languages.
- Keep the leaderboards exactly as they are.
- Keep every player's saved progress and any unfinished round. Only add new save fields with safe defaults; never rename or reset existing ones.

CHANGE
1. Render the board in 3D with Three.js: a soft wooden puzzle board on a café table, seen from almost straight above so the grid reads exactly like now. Color regions become soft colored cushions or rugs with their existing patterns. Cats become cute 3D cats that hop onto their cell and curl up; X marks are little paw-print tiles.
2. Solved board: all cats stand up, stretch and purr together, then a "Share" button shares a picture of the solved board with the level number and time, using the game's built-in share feature. One tap; never blocks the next puzzle.
3. The café around the board: a window with soft rain or sunshine, plants, a teapot with steam, a sleeping cat on a shelf. Purely decoration, never covering the board.

VISUAL / VFX
- Placing a cat: a soft hop with a tiny dust puff and a heart pop. Wrong placement: the cat shakes its head and the conflicting cells pulse gently (keep the existing rule feedback).
- Solve: a wave of sparkles across the board, floating hearts and a warm light sweep.
- Gentle life: cats blink and swish their tails, steam rises from the teapot, curtains sway, rain drops on the window.
- Soft shadows, gentle bloom on sparkles only, cozy warm color grading. Region colors and patterns must stay clearly distinct, and reduced motion turns the extra motion off.

AUDIO
- A soft "mrrp" when placing a cat, a paper tap for X marks, a gentle chime and a chorus of purrs on solve, rain or café ambience, keep the cozy music. Respect the existing sound settings.

UX / HUD
- Keep the current buttons, restyled to match the 3D café look. Big text still works. No new clutter around the board.

PERFORMANCE
- Target a stable 60 FPS on mid-range phones, even on 9x9 boards. Use instancing for cats, cells and paw marks; share materials; pool particles. If FPS drops, lower shadows and decoration first.
- Do not add new external network requests while the game runs.

DO NOT
- Do not change the thumbnail.
- Do not change the puzzle rules, puzzle generation, hints or scoring.
- Do not reset saves or lose an unfinished round.

ACCEPTANCE CHECK
- An existing save loads with the same progress, and an unfinished round resumes exactly.
- Every board from 4x4 to 9x9 is fully readable from the 3D view on a phone.
- Solving a board plays the cat celebration and shows a working Share button with a picture.
- Big text and reduced motion still work.
- No console errors; smooth on a phone-sized screen in English, Indonesian and Arabic.
```

## Why (Indonesian)

Game ini masih 2D, jadi wish ini mengubahnya jadi papan puzzle di kafe kucing 3D yang tetap jelas dibaca dari atas, plus perayaan kucing dan share saat puzzle selesai. Game ini kecil dan menurut audit update jarang menghidupkan game yang sudah mati, jadi harapannya jangan tinggi.
