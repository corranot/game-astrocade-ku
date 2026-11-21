# Ice Cream Roll Art: DIY ASMR Maker

Genre: step-by-step food maker, rolled ice cream (Thai stir-fried ice cream) ASMR. Ages 5–12. One finger.

Make rolled ice cream on an ice-cold steel plate for cute animal customers: pour the milk, add the fruit, chop it
with two spatulas, spread it thin, draw on it with syrup, freeze it, then scrape it into real spiral rolls that carry
your drawing inside. Stand the rolls in a cup, add toppings and serve for stars and coins.

## How to play
1. **Pour** — hold on the plate; let go in the yellow zone for PERFECT.
2. **Fruit** — tap the fruit the customer asked for.
3. **Chop** — tap fast; the fruit bursts into juicy chunks.
4. **Spread** — drag to spread the cream into a thin sheet.
5. **Draw** — draw with syrup, or tap a heart, star or smile.
6. **Freeze** — hold the ❄️ button.
7. **Roll** — swipe up each lane; every roll stands up with its spiral on top.
8. **Toppings** — whipped cream, chocolate, sprinkles, cherry and more, then Serve.

After the last roll, the camera looks down into the spirals so you can see your drawing inside.

The first cup is ready to roll, so the fun starts at once. Every third customer is a VIP who pays double, and once a
day there is a Today's Special order, the same for everyone. My Cups (🍨) keeps a photo of every cup you serve and lets
you pick paper cup designs. Coins unlock new flavours (matcha, ocean, taro), fruit,
toppings and syrups; anything locked can be tried for free in the current cup. Gift box every 3 cups and a daily gift.
No losing and no timers. 7 languages (English, Arabic, Spanish, Vietnamese, Hindi, Bengali, Indonesian) follow the
device, with a 🌐 button to change.

## Code
- `index.html` — page, HUD styles, loading bar, Three.js r187 from the CDN.
- `game.js` — game flow, input, HUD, sound, save.
- `scene.js` — the 3D stall: plate, fruit, spatulas, rolls, cup, toppings, effects.
- `sheet.js` — the cream sheet painted on canvas (pour, juice, spread, syrup art, frost).
- `roll.js` — the spiral math that turns a lane of the sheet into a roll.
- `logic.js` — orders, stars, coins, unlocks, gifts.
- `game_config.json` — tuning values and all player text in 7 languages.
