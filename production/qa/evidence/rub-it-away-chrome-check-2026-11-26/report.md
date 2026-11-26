# Rub It Away: real Astrocade draft page check in Chrome (2026-11-26)

Draft: version `01M8CS8J95TT4TZJ9MDP8H8QQF` (PR 244 build), opened signed in as the owner
in desktop Chrome (window maximized, so the desktop page layout; resizing to a phone
window was ignored by the browser). Game iframe is 720x1280, scaled into a ~290x515 slot.

| Item | Result | Note |
|---|---|---|
| Page + game load | PASS | Page DOMContentLoaded 2.4 s, load 3.2 s (desktop, no throttle); game menu already rendered behind the host play overlay at ~3 s. Not a phone 4G measurement. |
| Start from host play button | PASS | Menu shows at once, no blank frame. |
| FTUE | NOT RUN | Owner save has 216 stars; FTUE is saved as done. Not reset, to keep her progress. Covered by the earlier live check (`rub-it-away-live-check-2026-11-26`). |
| Play a level (L1, L6) | PASS | Rubbing works with mouse drag; reveal, NEW RECORD burst, stars. |
| Result card | PASS | Normal level: NEXT only (by design). World end (L6): NEXT + SHARE side by side. |
| SHARE | PASS | Opens the host share card with the live thumbnail and "Copy link". Nothing posted. Closed with Escape. |
| NEXT after world end | PASS | Goes to Kitchen L7. |
| Settings | PASS | Music/Sound/Vibration/Less motion toggles flip and return; back returns to the result card. |
| Sound | NOT VERIFIED | Tools cannot hear audio; host sound button present. |
| Page wrapper | PASS | No clipping; HUD, goal pill and bottom row inside the slot; host side rail does not overlap the game. |
| Console | PASS | Only host Statsig analytics fetch errors (host side, likely a blocker); none from the game. |

Minor observations (no fix needed for publish):
- The NEW RECORD burst text sits over the sun for ~1 s on L1 (transient celebration).
- SETTINGS title is centred on the screen, not between the back button and right edge; looks slightly right-shifted.
