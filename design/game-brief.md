# Game Brief: Toy City Stomp: Giant Monster Smash

<!-- The project's current game. Written after the fact (2026-11-20) from the owner's requests over stages 1–9
and from the code in prototypes/toy-city-stomp/. Earlier games keep their own README.md in prototypes/. -->

## In your words
- (stage 6) "aku mau cel shading game ini semuanya toon secara keseluruhan, tapi stroke/outline garis hitamnya harus sangat tipis semuanya"
- (stage 8) "gak bisa jurus pas lagi jalan2 / aku mau: fontnya lucu (pastikan bagus), semua emoji diganti pake icon hasil generate (pastikan relevan), gerakan jurus harus sesuai dengan masing2 aksinya, semua 3d bentuknya harus bener2 realistis, masih banyak kekurangan game ini supaya pemain merasa seru mainin game ini biar gak boring banget"
- (stage 9) "ada loading screen yang sangat menarik, semua anggota tubuh realistis bentuknya, keseluruhan game ini super ekspresif & super interaktif supaya seru banget & satisfying agar pemain gak boring & betah mainin game ini lama banget" · "pergerakan rigging animation cinematic gameplay super istimewa"
- After play: "bonbon harus selalu keliatan"

**Pitch:** A cute gummy kaiju stomps through a toy-block city with one finger, growing bigger with every building it knocks down. *(inferred (strong))*

**Genre:** smash/chaos sandbox with light arcade progression *(inferred (strong))*

**Controls:** drag anywhere to walk; tap a car to throw it; tap Bonbon to tickle it; the big round button (works with a second finger) fires the equipped move.

**Question:** do young children keep smashing for many rounds once the city changes every round? *(guessed)*

**Hooks:** Bonbon grows through 8 sizes; dominoes of toppling towers; ten moves from a shop; a robot boss per city.

## Look and references
- Look: bright toon cel shading (three hard bands) with a very thin ink outline everywhere; toy-block voxel buildings; chubby pink gummy dinosaur with jointed limbs and big expressive eyes; cute rounded Baloo font; generated icons instead of emoji.
- References: Si1ver's Smash Everything and Kaiju City on Astrocade (smash/chaos is the fastest-growing type). *(inferred (strong))*
- View: 3D · Camera: behind and above Bonbon, low in the frame; short cinematic shots with letterbox bars that always keep Bonbon in view.

## First minute
The loading screen hops Bonbon over a toy tower while real loading runs. The game plays itself behind a "Swipe!" hint until the first touch; then the child walks into small houses, sees blocks fly with comic words, grows to size 2 within about 10 s (a framed close-up of Bonbon), and topples the first domino within about 30 s.

## Challenge
From about a minute in, a toy army with wanted stars chases Bonbon (too much damage makes it dizzy for a moment, never a loss). A robot boss arrives in each city. Bigger buildings need a bigger Bonbon.

## Core loop
- Walk and smash → points, coins, growth.
- Coins → moves and costumes in the shop; stickers from residents → album.
- Finish a city → a new themed city opens (6 cities), plus a Daily City and a daily gift.

## Goal & fail state
- Flatten the city (the city bar empties); stars on the result screen come from the time taken.
- No hard loss: dizzy spells and the boss only slow Bonbon down.

## Features
- [x] One-finger walking, 8 growth stages, toppling dominoes
- [x] Toy army, wanted stars, a robot boss per city
- [x] Move shop (10 moves, each with its own pose and effect), costumes, sticker album
- [x] 6 themed cities, Daily City, daily gift streak, missions
- [x] Golden building, giant candy (MEGA), FEVER
- [x] Toon look, generated icons, Baloo font, 7 languages
- [x] Loading screen, jointed rig, reactions and cinematic shots

## Your systems
- shop · in the slice
- costumes · in the slice
- sticker album · in the slice
- daily gift · in the slice
- boss per city · in the slice

## Keep
- Toon cel shading with very thin outlines *(you said)*
- Bonbon always visible *(you said)*

## Avoid
- Emoji as art (generated icons instead) *(you said)*
- Dark or neon colours, a game with no words, hard losses *(from ASTROCADE.md)*

## Out of scope
- Publishing without the owner's word and an owner-made GIF thumbnail
- Multiplayer and accounts beyond Astrocade's save slot and leaderboard

## Build order
1. One-finger smash with growth and dominoes (done, stage 1)
2. Army, boss, shop (stage 1) → missions, Rainbow Mode (stage 2) → sound, 7 languages (stage 3)
3. New city every round, HUD, result screen (4) → themed cities, costumes, stickers (5) → toon look, throwing cars (6)
4. Daily gift, Daily City, bosses (7) → moves while walking, icons, shapes, events (8) → loading, rig, reactions, cinematic camera (9)

---
**Kill condition:** if real-phone FPS stays below 30 on mid-range phones after quality tiers. *(guessed)*

**Who it's for / what they feel:** young children on phones who want to feel big, strong and silly.

**Games you love / don't:** Smash Everything (Si1ver) *(inferred (strong))*
