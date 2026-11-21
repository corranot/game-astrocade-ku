<!-- PROTOTYPE - NOT FOR PRODUCTION -->
# Jelly Bump Party: 1-4 Player Sumo (prototype)

**Hypothesis:** the Astrocade `local_multiplayer` category is one creator's 20-game "X Party" series (standardcombo,
1.5–5.3K plays each, one shared Canvas-2D kit). A same-screen party game that starts playing at once (no 1-2-3-4
menu), is fun alone against computer blobs, lets friends drop in by tapping a corner, and looks like a glossy 3D toy
can do better than the series in its first 10 seconds and keep kids for rounds.

**Status:** in progress (2026-11-21). Draft on Astrocade, no thumbnail, not published.

## What was learned from the series (bedah 21 Nov, all 20 games' context files read)
- One kit (`kit/localk_*`: shell, seats, touch, joystick, dramatic camera, share, telemetry) reskinned 20 times; each
  README is a full rules spec and the tuning comes from simulated drivers (child, careful player, spammer).
- Layout: the playfield is a rounded rectangle that fills the frame (Snake Party: half 340×496, corner 256); each
  player's round button sits 98 units from its corner on the sea the round corner leaves; a press anywhere within
  300 units of the player's edge counts; small score badges on the frame edge.
- Weak spots we answer: a 1-2-3-4 menu before any action, English only, no save or progress, 45–60 s then back to the
  menu, small flat sprites. Strong spots we copied: corner seats turned to face each player, computer fill-ins,
  medals, a share button (`lib.share`), tuning by simulation.

## Run
- Local: serve this folder (`.js` as `text/javascript`) and open `/?local` (`&mode=edit`, `&speed=3`).
- Tests: `node --test logic.test.mjs` (rules + simulated players), `node playtest.js <out>` (`ONLY=bugs` for the bug
  checks), `node soak.js 10`, `node look.js <out>` (7 languages × 5 screens).

## Findings so far
- A random-tapping child lost every round until the rim was made to bounce blobs that slide there on their own (only
  a bump drops you); then aim assist (±0.4 rad towards the nearest blob in reach) and a hidden bias (computer blobs pick
  people 1.5× less) made aiming pay: tapper ≈35% of rounds, aimer ≈50%, first round ≈52% for the tapper.
- Moving to the series' full-frame layout put the bottom pair close together (instant duels); balanced starts and a
  0.8 s computer wait at round start fixed it.
