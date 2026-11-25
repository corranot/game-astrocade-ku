# Hero Bridge Royale: Build & Race — Astra wish

- Game id: `01M49RBJM0T3XWR29RPNDY2CT7` · first published 2026-10-06 (age 49.7 days on 2026-11-25) · 97,338 plays, ~21/day, 75.4 shares per 1,000 (best on the account)
- Source read: published version on 2026-11-25 (README, `search_game_files`).
- Order: #14 of 50 live games, oldest first.

## What the game already has (seen in code)

3D (Three.js inline) single-player arcade racer: a superhero races 33 rivals, collects bricks in their own color,
builds bridges over sky gaps and qualifies through 3 stages to chase the crown. Hero Plaza, evolutions, upgrade
shop, daily missions, global leaderboard, 7 languages, Reduce screen shake setting, haptics, tutorial with a short
countdown.

Gaps (seen): no `lib.share` call in the code; its high share rate comes from the host prompts, so an in-game crown
card should add more.

## Team call

The best share rate on the account but almost no daily plays now (~21/day). Give it a crown-moment share card and
make the race spectacle bigger (bridges, falls, the crown). No rule changes. Title stays.

## Wish (paste into Astra)

```
GOAL
Make every race in Hero Bridge Royale look and feel like a superhero spectacle, let players share their crown wins, and give them a daily reason to race. Keep the game exactly as players know it.

KEEP (do not change)
- Do not change the thumbnail.
- Keep the title, the controls, collecting bricks in your own color, building bridges over sky gaps, the 3 qualifying stages, the crown, the rivals, the Hero Plaza, evolutions, the upgrade shop, daily missions, the tutorial, the Reduce screen shake setting and all 7 languages.
- Keep the leaderboard exactly as it is.
- Keep every player's saved progress (heroes, evolutions, upgrades, coins, missions, settings). Only add new save fields with safe defaults; never rename or reset existing ones.

CHANGE
1. Crown share card: when the player wins the crown or qualifies first, show their hero on a podium with the crown and a "Share" button that shares this picture with the placing, using the game's built-in share feature. One tap; never blocks racing again.
2. Daily Sky Course: each day one special course layout with a unique sky theme (sunset, candy clouds, storm) and a one-time coin bonus for qualifying. Optional.
3. Instant start: a new player is running and picking up bricks within 2 seconds of the countdown, with no text to read.

VISUAL / VFX
- Bricks: picked bricks stack visibly on the hero's back with a little bounce; each placed bridge brick snaps in with a color flash and a tiny dust puff.
- Bridges: a glowing outline shows the next brick spot; finishing a bridge sends a light wave across it.
- Falls: rivals tumble off with cartoon spin and a cloud poof; the player's fall has a quick whoosh and respawn sparkle.
- Crown: confetti cannons, fireworks over the sky islands, a light beam on the winner, a slow camera orbit.
- Superhero flair: capes that flutter, speed trails on boosts, hero-colored aura on evolutions.
- Sky world: floating islands, drifting clouds below, birds, balloons, sun rays, soft shadows, gentle bloom on auras, fireworks and the crown only, bright color grading. Keep brick colors and paths clearly readable.

AUDIO
- Crisp brick pickup ticks rising in pitch with the stack, satisfying clacks when placing, a whoosh for falls, crowd cheers and a fanfare for the crown, upbeat heroic music. Respect the existing sound settings.

UX / HUD
- Share button and the Daily Sky Course chip match the current style, are thumb-sized and fit the screen in all 7 languages. No extra clutter during races.

PERFORMANCE
- Target a stable 60 FPS on mid-range phones with 34 runners on screen. Use instancing for bricks and runners where possible, pool all particles and confetti, reuse materials. If FPS drops, reduce particles and shadow quality automatically first.
- Do not add new external network requests while the game runs.

DO NOT
- Do not change the thumbnail.
- Do not change race rules, rival skill, rewards or the leaderboard.
- Do not reset saves.
- Do not add ads, energy limits or paywalls.

ACCEPTANCE CHECK
- An existing save loads with the same heroes, evolutions and upgrades.
- A new player picks up bricks within 2 seconds of the countdown.
- Bricks stack on the hero's back, bridges glow when finished, and the crown win shows a working Share button with a picture.
- The Daily Sky Course appears once per day and pays once.
- No console errors; smooth on a phone-sized screen in English, Indonesian and Arabic.
```

## Why (Indonesian)

Share rate game ini paling tinggi di akun, jadi kartu share mahkota di dalam game tinggal menambah dorongan itu. Balapannya juga dibuat lebih spektakuler (bata menumpuk di punggung, jembatan bercahaya, kembang api), plus Lintasan Langit harian.
