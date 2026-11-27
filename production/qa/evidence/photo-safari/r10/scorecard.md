# Snowy Snapshot, round 10 scorecard: HUD precision (28 Nov)

This round is UI only; gameplay is unchanged from round 9. "Before" is round 9 (`../r9/scorecard.md`). The `hud-*.jpg`
files show the same five states at 360x640, 390x844, 430x932 and 768x1024, with round 9 in the top row and round 10
below it. The `r10-*.jpg` files are from the full playtest.

## Audit method

A browser script measured every visible HUD box at the four sizes, in English and Hindi (the longest tab label). It
recorded each box's margins, its size, and any text overflow. The states were the first tutorial step, play, book,
shop and Today.

## Found and fixed

| Finding | Cause | Fix |
|---|---|---|
| Book and sound icons filled their whole circle, the round buttons had no cream rim (the pills did), the Skip button had no side padding (35 px wide at every size) and the close "x" was tiny. | The reset rule `.hud button {padding:0; border:0; font:inherit}` outweighed each button's own class (specificity 0,1,1 against 0,1,0), so no button in the HUD got its designed padding, border or font size. | The reset is now `:where(.hud) button`. Every button gets its designed values again: round buttons have a 14-unit icon inset and the same rim as the pills, and Skip, the treat and moon buttons, the close button and the share button get their padding and font sizes. |
| The book tabs' text touched the tab edges and overflowed by 2 px at 360 wide. | No padding, 34-unit font. | 12-unit side padding, 32-unit font, nowrap. No tab overflows at any size in English or Hindi. |
| At 360 wide the "Snowy Snapshot" title touched the Skip button. | The title started inside row 2, where Skip sits. | The title starts below row 2 (st + 2h + 2g). |

Two new playtest checks guard these fixes: the round buttons keep their icon padding at all four sizes, and the
title sits below Skip. The playtest now has 80 checks, and all pass.

## Grid (measured, 390x844, u = 0.54)

| | value |
|---|---|
| margins top / left / right / bottom | 13.0 / 13.0 / 13.0 / 13.0 px |
| pill and round-button height | 47.7 px (one height) |
| top-row gaps (pill-pill, book-sound) | 8.7 / 8.7 px |
| sound button and shutter, right edge | 13.0 / 13.0 px (one column) |
| treat or moon button and shutter centre line | the same (sb + 88 units) |
| book sheet: tabs, close button and lists, left/right | 13.0 / 13.0 px (on the HUD margin) |

## Measured

| | Round 9 | Round 10 |
|---|---|---|
| colorEntropyBits / dominantColorShare / edgeDensity | 4.69 / 0.215 / 0.230 | 4.72 / 0.216 / 0.239 |
| 4G first frame (6 runs each, interleaved, beside a parallel playtest) | median 2.12 s | median 2.13 s |
| full playtest | 75/75 | 80/80 |

The load is the same for both builds. These runs shared the machine with a playtest, so both read slower than the
quiet round 9 runs (1.90 s).

## Categories

| Category | R9 | R10 | Evidence |
|---|---|---|---|
| UI/HUD | 2.75 | 3.0 | One rim and inset for every pill and button, aligned margins, no overflow at 4 sizes in 2 scripts (hud-*.jpg). |
| Others | as R9 | as R9 | Unchanged. |
| **Average** | **2.68 (8.9/10)** | **2.70 (9.0/10)** | |

Every screen scores at least 8/10, except the tutorial spotlight steps. Those stay at 7, unchanged and by design, because the spotlight dims everything except the target.
