# Wonder Sprout HUD precision pass (28 Nov)

Screens audited at 360x640, 390x844, 430x932 and 768x1024: FTUE title, play HUD + goal chip,
welcome toast, share toast, hatchery, kingdom and evolution drawers, language sheet, Arabic play HUD.
Before shots: `/mnt/project-files/wonder-sprout/hud/before/`. After shots: this folder.

## Fixes (layout only, no gameplay change)

| Issue found | Fix |
|---|---|
| Toast (448 wide) overlapped the Skip pill by 8 px | Toast 400 wide, 16 px gap to Skip; text centred in the space between icon and share tile |
| Skip pill 56 tall vs goal chip 64 on the same row | Skip 128x64, radius 32, same row height as the goal chip |
| Kingdom tiles 40 px left / 48 px right margin | Tiles on 40/40 margins, 20 px gaps both ways; Fill-it button 20 px under the grid |
| Drawer close button right edge at 696, content at 680 | Close button right edge on the 40 px content margin |
| Odd 7th language tile hung on the left | Lone last tile centred |
| Short screens (360x640): title crowded the Skip pill | Title scaled 0.88 when the screen has no spare height |
| FTUE plant hint covered a tile label inside the drawer | Drawer-step hints sit just above the drawer panel |

Tablet (768x1024): HUD, secondary row, toasts and dock share one centred 720 column, so all
clusters keep the same left/right edges. Kept on purpose.

## Scorecard (UI/UX lead, art director, QA; 10 = flawless)

| Screen | Score | Note |
|---|---|---|
| Play HUD + goal chip | 9 | 24 margins, 16 gaps, one 72 pill height, chip on the left margin |
| FTUE title + Skip | 9 | Skip row = chip row; title clear of Skip on all sizes |
| Welcome / share toast | 9 | Centred, 16 px under HUD, no overlap with Skip |
| Hatchery drawer | 9 | 40/40 cards and critter grid, close on content margin |
| Kingdom drawer | 9 | Symmetric 3x2 grid, centred Fill-it |
| Evolution drawer | 9 | Rows on 40/40 margins |
| Language sheet | 9 | 2-column grid, lone tile centred |
| FTUE drawer steps | 8 | Hint above the panel, labels readable |
| Arabic mirror | 9 | Every cluster mirrors on the same margins |
| Tablet 768x1024 | 8 | One centred column; edges aligned with the dock |

Checks: 26/26 unit tests, 54-screen shots run with 0 errors, ci-checks pass, first frame 661 ms on 4G.
