<!-- PROTOTYPE - NOT FOR PRODUCTION -->
# Meteor Gem Works

A crystal meteor has crashed next to a little frontier town. Kids play the miner: drag to walk, swing at the meteor
for crystal chunks, carry the stack to the polisher, bring the cut gems to the glass stand, and tourists buy them.
Scoop the coins and pay a price pad to build a drill rig that mines on its own. A sparkle on the meteor is a
Perfect Strike when tapped. An egg falls out of the meteor and hatches a crystal pup that follows you (+5 carry).

Plan: [plan.md](plan.md) (v2, approved by the owner on 2026-11-25).

## Milestone 1: visual sample (this build)

What M1 must show, so the owner can approve the look before M2 (plan.md §11):

- The crater square at noon, golden hour and dusk (time-of-day keys in `game_config.json` `tod`).
- The meteor: lumpy lat-long sphere, crystal seams that glow, and a cut map (DataTexture) that digs the rock in and
  reveals glowing crystal where it is mined (hand, Perfect Strike, drill rig).
- The hero mining with a pickaxe swing, a glint strike, chunks flying to the pile, the carried stack.
- One polisher, the counter, the glass stand with tourists who buy and cheer, the crowd behind the rope.
- One price pad (drill rig), its build-up bounce, the rig drilling the meteor.
- One egg: lodged, falls, hatches; one critter (the crystal pup) that follows the hero.
- Gem material (faceted, tinted emissive), HUD frame (wood and brass), tone mapping and grade, selective bloom.
- Glare and contrast checks, tier 0 (no shadow map, no glow pass, blob shadows) for 60 FPS on phones.

M1 does not save progress, has no music loop yet (sound effects are made in code), and has one unlock. Those come
in M2 to M4.

## Controls

- Touch: drag anywhere to walk (a joystick ring appears under the finger). Tap the sparkle on the meteor.
- Keyboard: WASD or arrows to walk, Space taps the sparkle.

## Run it

- `?local` serves as the host (stub `lib`, reads `game_config.json`). Other parameters: `tier=0..3`,
  `tod=0..1` (0 noon, 0.5 golden hour, 1 dusk), `bot` (the guide plays), `lang=en|ar|es|vi|hi|bn|id`.
- `node --test logic.test.mjs`: rules (polish, carry cap, the guide never dead-ends, bot pacing, quality, tod).
- `node playtest.js <out>`: plays with the bot and real input, saves the M1 screenshots, checks glare per shot,
  live textures after a long run, and that no module touches THREE on import.

## Code structure

- `index.html`: page, HUD styles, loads Three.js r187 from cdnjs, then `game.js`.
- `game.js`: `run(mode)`, loop, input, HUD, sound made in code, event to effect wiring, debug hooks (`__game`).
- `logic.js`: pure rules (no THREE, no DOM), the guide bot, adaptive quality, time-of-day blend.
- `scene.js`: the 3D world, meteor shader and cut map, items (instanced), pooled effects, camera, glow pass, tiers.
- `models.js`: every prop and character, built in code from rounded, vertex-coloured parts.
- `game_config.json`: all tuning values and the 7-language strings.
- `asset_map.json`: the Baloo font files (SIL Open Font License 1.1), shared with the studio's other games.

## M1 evidence

Screenshots from `playtest.js` (tier 2 unless named, 405 x 720 at 2x) are in
`production/qa/evidence/meteor-gem-works/`: noon start, mining close-up, Perfect Strike, stand with tourists,
polisher and counter, egg hatching, new friend, drill rig, critter following, busy noon after 3 minutes, golden
hour, dusk, tier 0, Arabic HUD. Every shot is under 0.25% near-white pixels (limit 2%). Live GPU textures stay at
15 after a 3-minute run. Frame times come from swiftshader (CPU raster), so the 60 FPS check on a real phone is
still open: tier 0 draws about 100 calls and 106k triangles, tier 2 about 180 calls and 230k triangles.
