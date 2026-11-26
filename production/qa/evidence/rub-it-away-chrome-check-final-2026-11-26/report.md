# Rub It Away: final pre-publish check on the real Astrocade page (2026-11-26)

Draft version `01M8CTYY8EBHJHGWBM5B5X6EZ2` (PRs 248/250), owner signed in, desktop Chrome
(window maximized; phone-size resize is ignored by this browser, so the host's desktop
layout with a ~318x565 game slot was tested).

| Item | Result | Note |
|---|---|---|
| Page load | PASS | Reload: DOMContentLoaded 0.9 s, load 1.4 s (desktop, cached, no throttle). |
| Menu, map, world tabs | PASS | |
| L1 payoff | PASS | Cloud rubbed away, sun, light rays, rainbow, confetti, then the result card. |
| "N more to the gift" row | PASS | Shown at "4 more", then "Next level: a gift!". |
| Session gift | PASS | SURPRISE box on the L2 result card, opens on tap. |
| Today's picture | PASS | Plays, "Picture of the day collected!", pill shows TOMORROW after reload (saved). |
| World end NEXT + SHARE | PASS | L6; NEXT goes to Kitchen L7. |
| SHARE | PASS | Host share card with live thumbnail; nothing posted. |
| Settings | PASS | All toggles flip and return. |
| NEW RECORD placement | PASS | Now sits in the prompt slot, not over scene art. |
| Console | PASS* | No errors besides host Statsig analytics. *The game runs in a cross-origin iframe, whose console may not be captured. |

Findings:
- Minor: when hints are already at the cap (9), the gift still shows "+2 hints" but adds
  nothing (`S.hints = Math.min(HINT_MAX, ...)`). Same for today's picture bonus.
- Host: the first click on the host play overlay right after page load was sometimes
  ignored; the second worked. Host page behaviour, not game code.
- Host: this draft version shows a different save than the previous draft version (180 vs
  216 stars). Looks like the host keeps saves per draft version; not game code.

Not verifiable here: audio output, phone-size host layout, FTUE on a fresh save (owner save
not reset), real phone performance.
