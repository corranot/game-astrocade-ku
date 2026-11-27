<!-- PROTOTYPE - NOT FOR PRODUCTION -->
# Wonder Sprout

A cozy sky-garden game for kids. Fling your little critter into mushrooms, geodes and a piñata to collect
star gems, grow six landmarks on your floating island, hatch eggs into new friends and evolve them.
Genre: casual, idle, farm, slingshot, creature collector. Ages: young children and up, no reading needed.

## How to play

1. Pull back on your critter and let go: it bounces around the garden and every bump sends gems flying.
2. When a gold ring shrinks onto a geode or the piñata, tap it right on the ring for a SUPER NOVA burst.
3. Gems fly into the glowing landmark spot and it pops up: Honey Bakery, Jelly Grove, Star Observatory,
   Ferris Wheel, Prism Fountain and Sky Lighthouse. Each one makes the garden better.
4. Tap an egg in the nest three times to hatch a new friend. Friends play in the garden and collect gems too.
5. Tap the glowing critter button to evolve your hero into a bigger, stronger form.
6. Sky pirates fly in now and then: hit their three glowing lanterns before they get away for a big treat.

## What is inside

- One floating island (Sunlit Meadow) with six landmarks to grow.
- Three critters to hatch and evolve through three forms: Puff-Fox, Cloud-Bunny and Sprout-Dragon.
- Eggs from the piñata, the nest shop, sky pirates and a morning gift egg each new day.
- A "Garden Stars" leaderboard for every gem you have ever collected.
- Short words in English, Indonesian, Spanish, Vietnamese, Hindi, Bengali and Arabic, picked from the
  device language, with a globe button to change it. Arabic mirrors the layout.
- Your garden is saved automatically, and the Ferris Wheel keeps collecting a few gems while you are away.

## Code structure

- `index.html`: one canvas; loads `game.js`.
- `game.js`: wiring, game parameters, input, frame loop and render order. `window.run(mode)` is the entry
  point (`play` and `edit`).
- `m0-orchestrator.js`: event bus, game state with validation, save and load through `lib`, seeded random,
  canvas fit and the adaptive quality tier.
- `m1-art-bakery.js`: every picture is painted in code once into sprites (sky, island, landmarks, critters).
- `m2-audio-engine.js`: music box tune and every sound, made with Web Audio.
- `m3-physics-gameplay.js`: slingshot, bouncing, targets, gold-ring timing, helpers and sky pirates.
- `m4-kingdom-critters.js`: gems, landmarks, eggs, hatching, evolution and the leaderboard score.
- `m5-vfx-kinematics.js`: particles, flying gems, camera moments, critter animation.
- `m6-kids-portrait-ui.js`: top bar, bottom buttons, drawers, guide hand and language sheet.
- `m7-garden-goals.js`: small garden goals, one at a time, with gem rewards and gift eggs.
- `strings.js`: every word in the seven languages.
- `game_config.json`: all tuning values and the leaderboard setting.
