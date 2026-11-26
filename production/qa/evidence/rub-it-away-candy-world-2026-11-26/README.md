# Rub It Away: Candy World (levels 67–72), 26 Nov 2026

The owner asked for six more levels so the map's world tabs form a full grid. Candy World is the 12th world, so the tabs are now 4-4-4.

## What is in it
- **67:** gingerbread kid with sprinkles on his face.
- **68:** cupcake with a sour lemon on top.
- **69:** a lost puppy behind one of three cotton candy trees. The other two trees hide a frog and a mouse.
- **70:** gummy bear stuck in caramel.
- **71:** candy train stopped by a grumpy rain cloud.
- **72:** bear buried in cotton candy (world finale).
- Every level has two candy decoys with funny reactions.
- **Rub tool:** a new icing spatula that throws sprinkles while you rub. Each solve plays a candy chime and gives a sprinkle burst.
- **Ambience:** drifting sprinkle confetti. The world poster and fireworks at the end of the world reuse the existing system.
- **NEW badge:** now only on Candy World, removed once level 67 is opened. Snow World no longer shows it.
- **Save:** one new field, `candyWorldSeen`, defaulting to false. Old saves extend to 72 levels with zero progress.
- **Translations:** all 8 languages. New strings are checked against the font subset, and none falls back.
- **Art:** 21 new images in the same flat-sticker style. Each "after" sprite was generated with its "before" sprite as the reference.

## Checks
- **Unit tests** (`tests/core.test.mjs`): pass, covering 72 levels, assets, translations, save migration and the daily cycle.
- **Bundle test:** started true, no errors, no fails.
- **Candy-only play run:** 6/6 solved, 0 errors.
- **Full play audit:** all 72 levels in order at 390x844 with real pointer drags. 72/72 solved, 0 errors, 0 failed saves.
- **Load to menu** (4x CPU, 9 Mbps profile): 2.17–2.24 s across two clean runs, the same as before this update. The audit run itself measured 2.58 s, but it shared the machine with other browser runs.

## Files
- `candy-map-candy-tab-*.jpg`: the map at 4 viewports.
- `candy-L67…72-start/result.jpg`: start and result of each level.
- `candy-L70-spatula-sprinkles.jpg`, `candy-L71-spatula.jpg`: the new rub tool.
- `candy-L72-world-end.jpg`: the world-end card.
- `candy-levels-*.jpg`: contact sheets of the levels.
