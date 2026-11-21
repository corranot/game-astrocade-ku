# Jelly Bump Party: 1-4 Player Sumo

Genre: local multiplayer party game, sumo / bumper brawl. Ages 5–12. One button per player, 1 to 4 players on one
screen (one phone or tablet on the table, each player at a corner).

Four glossy jelly blobs on a giant cake island in a bright sea. Each blob's aim arrow spins by itself: hold your
button to stop it and charge, let go to dash and bump the others off the cake. The last blob on the cake wins the
round and a crown; three crowns win the match.

## How to play
- Tap anywhere to start: you are red, the other three are computer blobs.
- Hold your button to aim and charge, let go to bump. A quick tap is a small dash.
- Friends join any time: tap the **+** on a corner and that blob is yours.
- Grab the candy to grow giant, or the star for a super push.
- The cake shrinks after a few seconds, so every round ends.

Rounds change the cake: plain, icy (slippery), spinning, or tiny. Coins from bumps and wins unlock hats (crown, top
hat, chef, propeller, bunny, viking, halo). The result card offers Play Again and a share button. 7 languages
(English, Arabic, Spanish, Vietnamese, Hindi, Bengali, Indonesian) follow the device; change it under the coin button.

## Code
- `index.html` — page, HUD styles, Three.js r187 from the CDN.
- `game.js` — game flow, seats and touch, HUD, sound (made in code), save, hats.
- `logic.js` — rules: floor, blobs, bumps, rounds, power-ups, computer players.
- `scene.js` — the 3D cake island, blobs, hats and effects.
- `game_config.json` — tuning values and all player text in 7 languages; leaderboard of total knock-outs.
