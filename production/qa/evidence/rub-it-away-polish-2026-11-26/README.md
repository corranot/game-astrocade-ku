# Rub It Away: share button and screen polish (2026-11-26)

Sweep of every screen at 360x640, 390x844, 412x915 and 768x1024 (en) plus 390x844 ar, es, vi, hi and 360x640 bn.
`before/` is the Candy World build, `after/` this change. No console errors in any run; the share payload is title and text only.

## Fixes
- World-end result: SHARE left the star row (stars were pushed off centre and the button touched the posters). NEXT and SHARE now share the bottom row: 24 px card margins, 16 px gap, one 100 px height, one label size, share icon. NEXT stays on the reading-start side (mirrored in ar/ur). When the SHARE word is long (es, vi) SHARE becomes an icon-only button so neither label gets tiny (`share-row-languages-b.jpg`).
- End screen (all 72 levels): new SHARE button ("I finished 72 levels!") replaces SETTINGS, which stays on the menu.
- Map sticker counter icon showed a placeholder forever: a placeholder sprite was cached; now only real pictures are cached.
- Surprise gift label sits in its own cream pill so it reads over scene objects; tap area covers the label.
- Menu bottom row on the 8 px grid: 32 px margins, 16 px gaps, one 88 px height.
- Settings ON/OFF text fits inside the switch in every language.
- Today's picture result: shows today's collected scene with a gold frame and a tick instead of a dark "?" square; icon and text centred as one group.

## Follow-up: sticker counter pill (in-level HUD)
The "1/2" sticker pill sat on the card's top-right border under the star pill. It now lives in the free bottom HUD row beside the hint bulb: same 156x84 pill as the star pill, same right edge (x 540-696), centred on the bulb's line. See `hud-sticker-pill/` (top row before, bottom row after).
