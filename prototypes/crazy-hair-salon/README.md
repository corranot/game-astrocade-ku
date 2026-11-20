<!-- PROTOTYPE - NOT FOR PRODUCTION -->
# Crazy Hair Salon: Cut & Color (repo notes)

Chosen from the market check of 2026-11-20 (`production/market/2026-11-20T0749/strategi.md`): the make/beauty
family is the largest in the weekly top 50, and the highest-share pattern is a recipe of different gestures
ending in a judged reveal and a shelf of results. Our own Rub It Away family was ruled out by the owner so the
new game does not compete with it. Brief: `brief.md`.

- Play locally: serve the folder and open `index.html?local` (stubs the host; images come from the `.webp` copies here, which also serve the artifact).
- Painted art (2026-11-20, owner's request after comparing with DIY Beauty Salon): 7 images from Astrocade's generator, one style sentence; `game_config.json` `sprites` holds each sheet's crop boxes and each child's skull circle, measured once from the images.
- `node playtest.js <evidence folder>` the full check (16 parts: flow, stars, wall, over-cut, shop, two colours,
  every customer and length, random input, edit mode, save merge, second run(), layout, 7 languages, slow CPU,
  platform rules). `node soak.js 14` many customers in one page.
- Upload set: `bash tools/astrocade-upload-set.sh prototypes/crazy-hair-salon <out>` (copies `README.upload.md` as
  `README.md`, leaves out the test scripts).
