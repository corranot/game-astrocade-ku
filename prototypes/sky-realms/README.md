<!-- PROTOTYPE - NOT FOR PRODUCTION -->
# Voxel Wonderland: Sky Realms (prototype)

3D voxel sandbox adventure for kids 6–12, built from the user's full spec (2026-11-24). Four floating sky islands,
an evolving pickaxe, self-assembling Wonder Blueprints and hatchable voxel pets. Everything (textures, meshes, sound)
is made in code; Three.js r187 comes from cdnjs.

## Run
- Multi-file (Astrocade shape): serve this folder and open `index.html?local` (the dev block stands in for the host).
- One self-contained file: `node build-single.js dist/index.html` → open `dist/index.html` directly. Its stand-in
  host saves to `localStorage` (the Astrocade build uses `lib.saveUserGameState`; Astrocade forbids localStorage).

## Files
- `index.html` — page, HUD styles, import map for Three.js, load-failure retry.
- `game.js` — `TextureFactory`, `VoxelWorld`, `SoundEngine`, `VFXSystem`, `PetManager`, `BlueprintSystem`,
  `PlayerController`, `Sky`, `GameApp`, `run()`.
- `game_config.json` — tuning (player, mining, tools, eggs, pets, wonder costs, day length, autosave) and all text
  in 7 languages.
- `build-single.js` — inlines config + code into one HTML file.
- Tests: `logic.test.mjs` (Node, no browser), `playtest.js` (Playwright; `ONLY=<section>`), `soak.js`, `look.js`
  (screens to a folder). Evidence: `production/qa/evidence/sky-realms/`.

## Status
In progress. Proven here: logic tests, playtest sections, soak, screens viewed at 720×1280 and 1280×720.
Not provable here: real-phone FPS, how the sound feels, native-speaker translations, real session length.
