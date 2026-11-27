# Gift at the hint cap (26 Nov 2026)

Bug: when hints were already 9 (HINT_MAX), the session gift still showed
"+2 hints" but added nothing.

Fix: every hint reward now adds only what fits under the cap, and the gift's
label shows what it really added: "+2 hints", "+1 hint" or "Hints full!". The
"+1" bulb on a world's result card shows only when the hint was really added.
The golden-picture and today's-picture rewards show no number, so only their
code path changed. New strings `gift_got1` and `hints_full` are in all 8
languages, and the glyph check passes.

Checks: core tests pass. capgift.js ran at 390x844 en, 360x640 en and 390x844 ar
with 9 hints (label "Hints full!", stays 9) and 7 hints (level 67 is golden today
and pays +1 on solve, so the gift adds +1 and shows "+1 hint"). 0 JS errors.
