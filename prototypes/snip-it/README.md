# Snip It: Cut to Fix (prototype)

PROTOTYPE - NOT FOR PRODUCTION. Brief: `brief.md`. Status: 50 levels in 10 worlds, level map, sticker book.

- Run: serve this folder and open `/?local` (the tests do it themselves). `?local&mode=edit` for edit mode, `&speed=2` to run fast.
- Rules: `node physics.test.mjs` (Node only): every rope of every level reaches its goal, the worlds' data is whole.
- Play: `node playtest.js <out>` (a child's play in a browser, saves, map, book, 8 languages).
- Look: `node look.js <out> [first] [last]` plays every level and makes one contact sheet per world. Look at them.
- Spacing: `node layout.js [out]` measures the HUD, the map and the book in 8 languages against the one spacing system (margin 20, gap 12, control height 96; tolerance 2). Change the HUD only through the tokens `--m`, `--g`, `--h` in `index.html`.
- Soak: `node soak.js [rounds]` wins all levels in a row and watches GPU objects and frame time.
- Upload text: `README.upload.md`. Evidence: `production/qa/evidence/snip-it/` (a sheet per world).

## Adding a world or a level
A world is one file `w_<id>.js` (wall, scenery models, five levels), listed in `levels.js`. Model names are shared by
all worlds: prefix new ones with the world id. Level fields are described at the top of `levels.js`; helpers are in
`palette.js`. After a change: `physics.test.mjs`, then `look.js` on the changed levels, then look at the sheet.

## Known gaps
- The edit mode is a still view (no visual editor yet).
- Stickers, world icons and the hint hand are emoji: old phones may draw some differently.
- Several levels share an idea (sleeper + bell, animal + its food, balloon cage); see the sheets.
- Not proven here: FPS, touch feel and sound on a real phone; translation quality; whether 50 levels hold a player.
