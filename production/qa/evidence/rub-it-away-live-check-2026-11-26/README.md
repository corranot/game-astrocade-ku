# Rub It Away: live draft check (2026-11-26)

Draft version `01M8CR6PAF67JP4QZCM8MZK1MP` (current draft, unpublished), pulled read-only with `pull_game` (sync_token `82d25ac418b7c4242085f928da5b375e`).
The owner-only draft URL could not be opened (no signed-in browser), so the pulled files were played locally.

## Draft vs repo
All 22 pulled files are byte-identical to `prototypes/rub-it-away/` at PR #241 (`diff -rq`: no differences).

## Play run (pulled build, lib stubbed, real CDN art, real pointer drags, @2x)
`harness.js` here. 26/26 checks pass at 390x844 and at 360x640, 0 console errors, `lib.log` empty:
- First-time tour: spotlight on level 1, SKIP button, guide line after a miss, NEXT spotlight.
- Levels 1-10 solved in order; world-end card at level 6: NEXT and SHARE in one row, same 100 px height, 16 px gap, 64 px equal side margins, no hit-area overlap.
- World share and finale share: title and text only, no `image` (live thumbnail rule).
- Surprise gift after 10 solves, SURPRISE pill readable over the glass; opens.
- Map (4-4-4 tabs, CANDY WORLD NEW badge), menu returning, settings ON/OFF inside switches, today's picture (opens, solves, "Picture of the day collected!", menu pill moves to tomorrow).
- Level 72, world end, end screen with SHARE ("I finished 72 levels!"), MAP and MENU.
- Feed handover: `run('edit')` then `run('play')` returns to the menu and play works.
- Sticker icon: a wrong rub on level 3 finds a sticker; the HUD counter and map show the real sticker picture, not a placeholder (`20-hud-sticker-found`, `21-map-sticker-icon`).

## Notes (not blocking)
- HUD sticker counter pill (for example "1/2") sits across the play card's top-right border, just under the stars pill. Unchanged by PR #241.
- Load to menu locally 0.46-0.58 s unthrottled; no throttled measure in this check.
