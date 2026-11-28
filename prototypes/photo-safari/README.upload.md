# Snowy Snapshot

Sneak up on shy snow animals and catch their silliest poses! A little photographer in a red parka explores a snowy
valley with a camera. Walk close to an animal and the viewfinder opens; tap the big button to take a photo. Every
photo develops into a polaroid and flies into your photo book.

Each animal has three photos to collect: a hello photo, a photo of its funny pose (watch for the sparkle, then snap
while it yawns, hops, slides or sneezes) and a three-star photo. Shy animals hide in snow mounds until you toss them
their favourite treat. Photos pay snowflakes, which buy treats, zoom lenses, a night flash, a slow shutter and new
outfits. Stamps in the book open new places: Pine Meadow, the Frozen Lake and the Crystal Caves, 24 animals in all.

The day turns to dusk and then an aurora night, when night animals come out. Every day brings a rare visitor and
three small photo requests. When only night animals are left to find, tap the moon button to wait for night.

## Controls

- Touch: drag to walk, or tap the snow to walk there. Swipe the right side to look around; walk and look with
  two thumbs at once. Stand still to aim. Tap the camera button to take a photo, the carrot button to toss
  a treat, the book button to open the photo book.
- Keyboard: WASD or arrows to walk, Space takes a photo, T tosses a treat, B opens the book.

## Code structure

- `index.html`: page and HUD styles; loads Three.js, then `game.js`.
- `game.js`: `run(mode)`, the loop, input, HUD, photos, the book and shop, the tutorial, moments and saving.
- `logic.js`: the rules (no 3D, no page): areas, the clock, photo stars, rewards, stamps, the shop, daily visitors.
- `world.js`: the 3D valley, lighting, sky with aurora, falling snow, the glow pass and quality levels.
- `critters.js`: every animal and the photographer, built from rounded, vertex-coloured parts, with their poses.
- `fx.js`: pooled particles, rings, debris, footprints and the paw-print trail.
- `audio.js`: sounds and a music box made in code.
- `game_config.json`: all tuning values and the strings in 7 languages.
- `asset_map.json`: the rounded Baloo font files (SIL Open Font License 1.1).
