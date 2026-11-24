# Voxel Wonderland: Sky Realms

Genre: 3D voxel sandbox adventure / building game. Ages 6–12. Explore four floating sky islands, mine colourful
blocks, build bridges across the sky, fill glowing Wonder Blueprint pads that build a treehouse, a crystal fountain,
a rainbow bridge and a dragon castle by themselves, and hatch golden eggs into voxel pets that help you mine.

## How to play
- Desktop: mouse to look, WASD or arrow keys to walk, Space to jump, hold left click to mine, right click or E/F to
  place, 1–9 or the mouse wheel to pick a block.
- Phone and tablet: left thumbstick to walk, drag to look, hold a finger on a block to mine, the pickaxe/block button
  switches to building (tap a block to place), the arrow button jumps, tap the hotbar to pick a block.
- Stand on a glowing pad and press BUILD when you have the blocks shown on the button.

Mining fills the pickaxe gauge: Wooden → Crystal (2× speed) → Golden Star (3×, breaks a 3×3 patch) → Cosmic Rainbow
(instant, rainbow shockwave). Glowing ores and finished wonders give golden eggs: Fire Fox, Cloud Bunny, Emerald
Turtle and Starlight Dragon. Up to three pets follow you and mine ores nearby. Clouds are bouncy. Falling off an
island brings you home in a shower of stars. A day goes from sunny morning to golden hour to a starry night with
glowing crystals, lanterns and fireflies. Progress is saved. 7 languages (English, Arabic, Spanish, Vietnamese,
Hindi, Bengali, Indonesian) follow the device; change it with the globe button.

## Code
- `index.html` — page, HUD styles, Three.js r187 from the CDN.
- `game.js` — pixel-art textures painted in code, the voxel world (islands, chunk meshes with ambient occlusion,
  raycast), sound made in code, effects, pets, wonder blueprints, the player and the first-person pickaxe, sky and
  lighting, HUD, save and quality steps for slower devices.
- `game_config.json` — tuning values and all player text in 7 languages.
