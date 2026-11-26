# Rub It Away: final pre-publish playtest (26 Nov 2026)

Build: main after PR #248, the same 23 files saved to the Astrocade draft
(version 01M8CTYY8EBHJHGWBM5B5X6EZ2). Re-pulling the draft gave 23 of 23 files
byte-identical to the repo.

Run: the scripted audit plays all 72 levels at 390x844 (phone portrait).

| Check | Result |
|---|---|
| Levels solved | 72 / 72, all 3 stars |
| JS errors | 0 |
| Mean time per level | 3.3 s |
| Level 1 solved | 4.0 s (sun-and-rainbow bloom shown) |
| First frame (local, unthrottled) | 2.2 s |
| Gift countdown | "2 more to the gift" at L66, "4 more" at L72 after the gift at L68 |

The single `errors: 1` on L61 is the scripted rub on the decoy, which is a
game mistake on purpose, not a script error.

Screenshots: menu, the start of level 1, the level 1 result (bloom), the level 12 world end
(gift due, so no countdown row), and the L66 and L72 world-end cards with the countdown. The
white bar on the thumbnail strip is the moving shine sweep.
