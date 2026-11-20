# Crazy Hair Salon: Cut & Color

A hair salon makeover game for kids (ages 6-10): makeover, creative, casual, ASMR. A cute customer with wild,
messy hair sits in the salon chair. The player washes, cuts, dyes, blow-dries and decorates the hair with one
finger, then the customer looks in the mirror and gives 1-3 stars.

## How to play
- Wash: rub the hair to make foam; the rinse runs by itself.
- Cut: drag the scissors across the hair along the dotted line; cut strands fall.
- Dye: tap a paint pot, then paint the hair. Two-colour orders keep each colour in its half.
- Dry: hold a finger on the hair; the dryer blows and fluffs it.
- Decorate: tap bows, flowers, crowns and more; tap one on the head to take it off.
- Each customer brings an order card (length, colour, accessory). Stars say how close the result is; there is no losing.

## Features
- Real swinging hair strands that fall when cut, take colour where painted and fluff when dried.
- Four children (Maya, Leo, Hana, Kofi), painted close up, each with four moods that change as you work.
- Coins from stars buy new dyes (lavender, mint, coral, rainbow) and accessories (heart, tiara, cherries); the next order asks for the new item.
- The salon wall keeps photos of the last nine customers.
- Leaderboard of total stars. Progress is saved.
- 7 languages picked from the device (English, Arabic, Spanish, Vietnamese, Hindi, Bengali, Indonesian), with a globe button on the wall.
- Touch and mouse. Haptics on snips, finished steps and the reveal.

## Code structure
- `index.html` loads `game.js`.
- `game.js` defines `run(mode)`: the five steps, orders and stars, the tray and shop, the wall, sound (Web Audio), save and leaderboard, languages; ends with `window.run = run;`.
- `hair.js` the hair: strands of points (follow-the-leader with stiffness), cutting, foam, dye, drawing, and a compact copy for photos.
- `sprites.js` the painted art from `asset_map.json`: the salon room, the children's mood sheets (crop boxes and skull circles in `game_config.json` under `sprites`), accessories and tools.
- `art.js` everything drawn in code: HUD icons, paint pots, the helper hand, and stand-ins used while an image cannot load.
- `game_config.json` tunable numbers, all text in seven languages, and the leaderboard declaration.
- `asset_map.json` the seven painted images (room, four children, accessories, tools).
