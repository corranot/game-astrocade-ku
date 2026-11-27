# Rub It Away — Astra wish

- Game id: `01M7C5BWPZGS45D5RKJ1JWNDV7` · first published 2026-11-15 (age 10.3 days on 2026-11-25) · 62,991 plays, ~10–16K/day (alive, our biggest earner right now), shares 20.1 per 1,000
- Source read: published version on 2026-11-25 (README, `UPGRADE_META_PROMPT.md`, `modules/levels.js`, `modules/strings.js`; no `WebGLRenderer`: 2D canvas with painted assets).
- Order: #41 of 53 live games, oldest first.

## What the game already has (seen in code)

2D canvas one-touch visual puzzle, 720×1280 portrait: look at the scene, find the thing spoiling it, rub it away,
the scene turns happy. 60 hand-authored levels in 10 worlds of 6 (Garden, Kitchen, Zoo, Town, Space, Beach, Castle,
Sea, Funfair, Jungle), decoys with funny reactions that never cost stars, three stars on every solve, manual Next,
permanent level map and collection of funny reactions, free hints, settings (music, SFX, haptics, reduced motion),
eight languages including Arabic and Urdu right-to-left, creator Edit mode. The 22 Nov version removed auto-next,
daily streaks, timed rewards and the competitive leaderboard on purpose.

## Team call

Alive and inside its window until about 15 Dec. Do not convert it to 3D now: the painted look is what is earning
10K+ plays a day, and a full rewrite during the window risks the hook, load time and FPS gate for the one game that
pays. The 3D conversion can be a separate decision after the window closes. The right lever is a **named content
update about every 3 days** (update boost half-life 3 days), each a new world of 6 levels in the exact same engine
and style. Keep Larisha's 22 Nov choices (no auto-next, no streak, no competitive leaderboard). Title stays.

Send Wish 1 now, Wish 2 about 3 days later, Wish 3 about 3 days after that. Each is self-contained.

## Wish 1 — Snow World (paste into Astra now)

```
GOAL
Add a new world, "Snow World", with 6 new levels (61 to 66) to Rub It Away, in exactly the same style and rules as the existing 60 levels, so returning players have something new to rub away. Keep the game exactly as players know it.

KEEP (do not change)
- Do not change the thumbnail.
- Keep the title, the one-touch rub control, all 60 existing levels and their order, the 10 existing worlds, decoys and their funny reactions, three stars on every solve, free hints, the manual Next button, the level map, the collection of reactions, the settings (music, sound effects, haptics, reduced motion), the creator Edit mode and all eight languages with right-to-left layout.
- Keep the painted art style, colors, fonts, character style and sounds.
- Do not add auto-next, daily streaks, timed rewards or a competitive leaderboard.
- Keep every player's saved progress. Only add new save fields with safe defaults; never rename or reset existing ones. A player who finished level 60 sees Snow World unlocked and ready.

CHANGE
1. Snow World: 6 new levels after level 60, each a cozy winter scene with one clear thing spoiling it and two funny decoys. Ideas: a snowman whose carrot nose is hidden under a pile of snow, a penguin chick shivering under a grey cloud, a frozen pond covered in scribbled frost hiding a sleepy fish, a cocoa mug with a fly in it, a sled stuck behind a snowdrift, a reindeer with a tangled scarf over its eyes. Rubbing the right thing makes the scene happy with the same reveal as other levels.
2. The level map gets a Snow World island in the same style, with a small "NEW" badge until the first Snow World level is played.
3. Add the world name and every new prompt, win line and reaction in all eight languages, short and simple like the existing ones.
4. World share card: when the player finishes the last level of any world, show the happy final scene with the world name and the three stars, and a "Share" button that shares this picture using the game's built-in share feature. One tap; never blocks the Next button.

VISUAL / VFX
- Snow World: soft falling snowflakes, puffs of snow powder while rubbing, a warm glow and sparkles on the happy reveal, frosty breath on characters. Respect reduced motion.

AUDIO
- Soft crunchy snow rub sound, a jingle bell on the happy reveal, the existing music style. Respect the existing settings.

PERFORMANCE
- Same file sizes and loading as the existing worlds; stable 60 FPS on mid-range phones. No new external requests while playing.

DO NOT
- Do not change the thumbnail. Do not change existing levels, star rules, hints or the save format. Do not reset saves. Do not add ads, energy limits, timers or pop-ups before the first rub.

ACCEPTANCE CHECK
- An existing save loads unchanged; a player past level 60 can open Snow World.
- Levels 61 to 66 can each be solved with one clear rub target; decoys only react.
- Finishing a world shows a working Share button with a picture.
- No console errors; looks right on a phone-sized screen in English, Indonesian and Arabic.
```

## Wish 2 — Candy World (send about 3 days after Wish 1)

```
GOAL
Add a new world, "Candy World", with 6 new levels (67 to 72) to Rub It Away, in exactly the same style and rules as the existing levels. Keep the game exactly as players know it.

KEEP (do not change)
- Do not change the thumbnail.
- Keep the title, the one-touch rub control, every existing level and world including Snow World, decoys and their reactions, three stars on every solve, hints, the manual Next button, the map, the reaction collection, the world share card, the settings, the creator Edit mode and all eight languages.
- Do not add auto-next, daily streaks, timed rewards or a competitive leaderboard.
- Keep every player's saved progress. Only add new save fields with safe defaults.

CHANGE
1. Candy World: 6 new levels after level 66 in a sweet candy land, each with one clear thing spoiling the scene and two funny decoys (for example: a gingerbread kid whose smile is hidden under spilled sprinkles, a cupcake with a sour lemon on top, a lollipop tree hiding a lost puppy, a chocolate river blocked by a sticky caramel blob, a candy train stopped by a grumpy cloud, a sleepy bear covered in cotton candy).
2. A Candy World island on the map with a "NEW" badge until first played.
3. All new text in all eight languages.

VISUAL / VFX
- Sprinkle and sugar sparkles while rubbing, a candy confetti burst on the happy reveal. Respect reduced motion.

AUDIO
- Sweet squeaky rub sounds and a happy chime on the reveal. Respect the existing settings.

PERFORMANCE
- Stable 60 FPS on mid-range phones. No new external requests while playing.

DO NOT
- Do not change the thumbnail. Do not change existing levels, star rules or saves. Do not add ads, energy limits or timers.

ACCEPTANCE CHECK
- An existing save loads unchanged; Candy World opens after Snow World.
- Each new level has one clear rub target.
- No console errors; looks right on a phone-sized screen in English, Indonesian and Arabic.
```

## Wish 3 — Dino World (send about 3 days after Wish 2)

```
GOAL
Add a new world, "Dino World", with 6 new levels (73 to 78) to Rub It Away, in exactly the same style and rules as the existing levels. Keep the game exactly as players know it.

KEEP (do not change)
- Do not change the thumbnail.
- Keep the title, the one-touch rub control, every existing level and world, decoys and reactions, three stars on every solve, hints, the manual Next button, the map, the reaction collection, the world share card, the settings, the creator Edit mode and all eight languages.
- Do not add auto-next, daily streaks, timed rewards or a competitive leaderboard.
- Keep every player's saved progress. Only add new save fields with safe defaults.

CHANGE
1. Dino World: 6 new levels after level 72 with friendly baby dinosaurs, each with one clear thing spoiling the scene and two funny decoys (for example: a baby dino egg buried under a mud splat, a long-neck dino with leaves stuck on its eyes, a volcano cloud raining on a picnic, a tiny dino scared of a shadow, a fossil hidden under sand, a sleepy dino woken by a buzzing bug).
2. A Dino World island on the map with a "NEW" badge until first played.
3. All new text in all eight languages.

VISUAL / VFX
- Dust and leaf puffs while rubbing, a happy stomp bounce and sparkles on the reveal. Respect reduced motion.

AUDIO
- Gentle roars and giggles on the reveal, the existing music style. Respect the existing settings.

PERFORMANCE
- Stable 60 FPS on mid-range phones. No new external requests while playing.

DO NOT
- Do not change the thumbnail. Do not change existing levels, star rules or saves. Do not add ads, energy limits or timers.

ACCEPTANCE CHECK
- An existing save loads unchanged; Dino World opens after Candy World.
- Each new level has one clear rub target.
- No console errors; looks right on a phone-sized screen in English, Indonesian and Arabic.
```

## Why (Indonesian)

Ini game kita yang paling hidup (10–16 ribu plays/hari), jadi jangan dirombak ke 3D dulu selama masa boost; cukup tambah satu dunia baru tiap ±3 hari (Snow, Candy, Dino) dengan gaya yang sama persis, plus tombol share saat satu dunia selesai. Pilihan Larisha 22 Nov (tanpa auto-next, streak, leaderboard) tetap dipertahankan.
