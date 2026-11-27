# After-publish live check (27 Nov 09:15–09:30 UTC)

All 10 games published today were opened as a guest on their public page (phone 390×844, headless Chromium),
the served code was searched for each version's change, the game was tapped once, and console errors were collected.
Script: `livecheck.js`. Screenshots: `load-sheet.jpg` (15 s after load) and `tap-sheet.jpg` (after one tap).

| Game | New version serving | Share call served | Errors |
|---|---|---|---|
| Reel & Hatch | yes | title + text, no image | none from the game |
| Pin & Bloom | yes | title + description + text, no image | none |
| Paws & Chaos | yes | title + text, no image | none |
| NEKO ZOOMIES | yes | title + description + text, no image | none from the game |
| Ice Cream Roll Art | yes | title + description, no image | none |
| Grab and Park | yes (no snapshot wait) | title + description + text, no image | host focus-policy warning only |
| +1 Mega Hammer | yes (`wallDt` intro) | text only, no image | none |
| Voxel Wonderland | yes ("Sky Island Builder") | no share | none |
| Draw It Alive | yes (Snowy Day) | text only, no image | none |
| Soap Carving | yes ("Carve away the outside!") | title + text, no image | none |

"None from the game": the only console errors were the host's own analytics timeouts.
Pin & Bloom showed its loading bar at 56 % after 18 s on the software renderer, and the title screen by 38 s; a
real phone with a GPU is much faster, but its first load is the slowest of the ten.
