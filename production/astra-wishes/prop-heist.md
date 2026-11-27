# Prop Heist: 3D Prop Hunt — Astra wish

- Game id: `01M4PYCE06RE08NQTB1STY8ZH3` · first published 2026-10-13 (age 43.0 days on 2026-11-25) · 1,783 plays, ~4/day, 10.7 shares per 1,000
- Source read: published version on 2026-11-25 (README, `search_game_files`).
- Order: #20 of 50 live games, oldest first.

## What the game already has (seen in code)

3D (Three.js + Rapier) prop-hunt heist: as the robber, disguise as a prop, freeze in the guard's light and steal gems;
as the guard, smash the fakes. 3 maps, daily modifier, missions, upgrades, leaderboard, guard double-take with a
warning, suspicion heartbeat and red vignette, rookie guard and assist, left-handed controls, graphics settings,
haptics.

Gaps (seen): no `lib.share` call.

## Team call

Small (~4/day), past its boost; low expectations (audit). Cheapest improvements: a funnier, more readable disguise
moment and a "Best disguise" share card. No rule changes. Title stays.

## Wish (paste into Astra)

```
GOAL
Make sneaking and disguising in Prop Heist funnier, tenser and better looking, and let players share their best disguise escapes. Keep the game exactly as players know it.

KEEP (do not change)
- Do not change the thumbnail.
- Keep the title, both roles (robber disguising as props and stealing gems, guard smashing fakes), freezing in the guard's light, the 3 maps, the daily modifier, missions, upgrades, the guard double-take and its warning, the rookie guard and assist, left-handed controls, the graphics and Vibration settings and all languages.
- Keep the leaderboard exactly as it is.
- Keep every player's saved progress (coins, upgrades, missions, best scores, settings). Only add new save fields with safe defaults; never rename or reset existing ones.

CHANGE
1. Escape share card: after a successful heist, show the prop the player disguised as, standing proudly with a gem bag, plus the gems stolen, and a "Share" button that shares this picture using the game's built-in share feature. One tap; never blocks playing again.
2. Daily Disguise: each day one prop type is the "Prop of the Day"; escaping while disguised as it pays a bonus once. Optional.
3. Instant start: a new player is sneaking within 2 seconds with no text to read, and morphs into a prop within the first 15 seconds.

VISUAL / VFX
- Morph: a puff of glittery smoke, a squash-and-pop into the prop, two little eyes that blink on the prop when the guard is not looking.
- Guard light: a soft volumetric flashlight cone with dust motes; the red danger vignette and heartbeat stay as now.
- Gem steal: gems sparkle, fly into the bag with a coin-like trail.
- Smash: when the guard hits a fake, it shatters into wood chips or ceramic pieces with a dust puff; a wrong guess makes a cartoon "bonk" star.
- Maps: moonlight through windows, ticking clocks, swaying curtains, flickering lamps, soft shadows, gentle bloom on gems and the flashlight only, moody-but-fun color grading. Keep props, the light cone and the player clearly readable.

AUDIO
- A cartoon "poof" on morph, tiptoe steps, a tense heartbeat in the light, gem chimes, crashes and shatters on smashes, a playful heist tune. Respect the existing sound settings.

UX / HUD
- Share button and the Prop of the Day chip match the current style, are thumb-sized and fit the screen. No extra clutter during play.

PERFORMANCE
- Target a stable 60 FPS on mid-range phones with the existing graphics settings. Pool and reuse smoke, chips and sparkles; use instancing for repeated props; reuse materials. On low graphics, drop the volumetric light and extra particles first.
- Do not add new external network requests while the game runs.

DO NOT
- Do not change the thumbnail.
- Do not change guard behavior, detection rules, rewards or the leaderboard.
- Do not reset saves.
- Do not add ads, energy limits or paywalls.

ACCEPTANCE CHECK
- An existing save loads with the same coins, upgrades and missions.
- A new player morphs into a prop within 15 seconds.
- Morphs, smashes and gem steals show the new effects; a successful heist shows a working Share button with a picture.
- The Prop of the Day appears once per day and pays once.
- No console errors; smooth on a phone-sized screen in English, Indonesian and Arabic.
```

## Why (Indonesian)

Wish ini bikin momen menyamar lebih lucu dan tegang (asap glitter, mata berkedip di prop, senter bercahaya) plus share kabur terbaik dan Prop of the Day. Game ini kecil, jadi harapannya wajar saja; aturan penjaga dan leaderboard tidak diubah.
