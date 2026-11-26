# Rub It Away: analytics update (2026-11-26)

Built from the analytics read of 26 Nov (median session 1:35, 11.6% over 5 min, 23% under 30 s, 14.7% of sessions under 40 FPS).

## Changes
- **Level 1 first bloom.** The first fix (about 3-4 s into level 1 for a scripted child-like scrub) now pays big: longer hit-stop, a rainbow grows behind the sunflower, the sun glows with slow rays, a confetti shower falls over the whole card, win arpeggio. FTUE untouched. `n01`, `n02`, `n03`.
- **Gift paced to minute 5.** The first gift of a session lands on the first solve at or past 300 s (never before solve 4, never after solve 12), then every 8 solves (`rules.giftPlan`, unit-tested). The countdown only goes down.
- **"N more to the gift!"** row on the result card once the gift is 5 or fewer levels away ("Next level: a gift!" at 1), in 8 languages, glyph-checked. `n04`, `n05`, `n06`.
- **Adaptive quality.** When frames run under 40 FPS for 3 s of play, effects drop a step: half the particles, then also a 0.75 resolution canvas (540x960). Down only within a session. Checked with a 30x CPU throttle: quality 2 -> 0, canvas 540x960, no errors. `n07`, `n08`.

Runs: 390x844 en, 360x640 en, 390x844 ar and es: 0 console errors.
