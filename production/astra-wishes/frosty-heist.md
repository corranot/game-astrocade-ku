# Frosty Heist — Astra wish

- Game id: `01M7A427YW89MNWHDZK8X8V3GR` · first published 2026-11-13 (age 12.2 days on 2026-11-25) · 217 plays, ~3/day (dead per audit)
- Source read: published version on 2026-11-25 (README).
- Order: #38 of 53 live games, oldest first.

## What the game already has (seen in code)

3D (three.js r149 from jsDelivr) heist arcade: steal glowing eggs from rival snow-fort nests, carry them home, dodge
snowman and penguin guards' vision cones, freeze them with snowballs, shop pad upgrades, golden aurora egg on the
central fountain, counter-steal, Blizzard Aurora Event every 90 s with a Mythic Rainbow Egg, 5-minute rounds,
leaderboard, penguin companion, camera-shake and haptics toggles.

Risk (audit): a near-duplicate of Aurora Heist: Egg Snatcher (same day, same eggs, guards, fountain and Blizzard
Aurora event). Two look-alike games from one creator are exactly what `creator` and `bigram`/description dedup target.
The audit's first cleanup candidate is to unpublish this one.

## Team call

The best move for this game is not an update: it is to keep it as is or unpublish it (reversible), as the audit says.
If Larisha still wants an update, the wish must make it clearly different from Aurora Heist instead of better at the
same thing: turn it into a snowball team battle around forts. Title stays.

## Wish (paste into Astra only if you keep it published)

```
GOAL
Give Frosty Heist its own clear identity as a fast snowball fort battle, so it feels like a different game from other egg-collecting games, while keeping its controls and player saves.

KEEP (do not change)
- Do not change the thumbnail.
- Keep the title, the controls (joystick, Dash, Snowball, Ice Shield), the snow-fort island, the guards and their vision cones, eggs and nests, the shop pad, upgrades, the penguin companion, the settings, the leaderboard and every player's saved progress. Only add new save fields with safe defaults.

CHANGE
1. Fort battle focus: rounds become 3-minute team battles, the player's blue team plus 2 friendly penguins against the red team; each team defends its egg nest inside a snow fort.
2. Snow forts: players can push snow to build short walls (one tap on BUILD) that block snowballs and guards for a few seconds, then crumble with a puff.
3. Snowball variety: big snowballs (hold to charge) knock rivals down; a giant snow boulder appears once per round to roll through enemy walls.
4. Victory share card: after a won round, show the team on top of the fort with the score, and a "Share" button using the game's built-in share feature.
5. Make the Blizzard Aurora event a "Snowstorm" instead: heavier snow and a 15 s double-snowball frenzy, without the rainbow egg.

VISUAL / VFX
- Snowball hits burst into powder and ice shards, walls crumble into chunks, charged throws leave a frosty trail, players fall into the snow with a comic flop.
- Keep the clear vision cones and readable teams (blue and red with shapes, not only color).

AUDIO
- Crunchy snow steps, a "thwump" on hits, walls collapsing, a team cheer on victory. Respect the existing settings.

PERFORMANCE
- Keep the mobile quality profile and pooled effects; target a stable 60 FPS on mid-range phones. No new external requests.

DO NOT
- Do not change the thumbnail. Do not reset saves. Do not add ads or energy limits.

ACCEPTANCE CHECK
- An existing save loads unchanged.
- A round is a 3-minute fort battle with walls, charged snowballs and a snow boulder.
- A won round shows a working Share button with a picture.
- No console errors; smooth on a phone-sized screen.
```

## Why (Indonesian)

Game ini hampir sama persis dengan Aurora Heist, dan menurut audit langkah terbaik adalah dibiarkan atau di-unpublish (bisa dibatalkan). Kalau tetap mau di-update, wish ini membuatnya jelas berbeda (perang bola salju antar benteng), bukan versi lebih bagus dari game yang sama.
