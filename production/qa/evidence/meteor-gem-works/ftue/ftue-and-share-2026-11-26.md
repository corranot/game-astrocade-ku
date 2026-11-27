# Meteor Gems: FTUE spotlight, hero-to-goal guide, live-thumbnail share card (2026-11-26)

## Share card
- The host's `lib.share` sends `SHARE_REQUEST` to the page; the page's share sheet (`ShareDrawer`) shows
  `gameShare.image` when one is sent and uploads, and otherwise the game's current `thumbnailUrl` at size
  "large" (SEEN in the web app's share-sheet chunk, read 2026-11-26).
- The game now calls `lib.share({ title, text })` with no image, so the card always shows the thumbnail the owner
  set last, with no game update and no network request from the game.
- A game cannot read its own thumbnail at run time: `lib` has no metadata call, the game runs in a sandboxed
  iframe, and `/v3/games` answers 401 to direct requests.

## Guide
- The floor chevrons used to point back at the hero (their tip is the shape's local -z); they now point at the goal,
  start at the hero's feet, are deep orange and larger (`look.trailScale`, `look.trailStep`).
- The bobbing down-arrow over the goal is removed; the goal keeps its pulsing ring and badge.
- The off-screen edge arrow now starts from the hero's position on screen.

## FTUE
- Steps: mine, pick up, polish, sell, grab coins, build, hatch (`logic.js` `FTUE`). A step spotlights only while the
  guide points at its kind of stop and completes on the real action (events), never on a tap.
- Done steps are a bit mask saved as `ft`; saves made before the tutorial count what they show (`ftueFromSave`).
  The skip button sets every bit. Chapter 2 shows none.
- Unit tests: the bot completes every step, each step gets its spotlight, no step shows after it is done; save
  migration cases.

## Screenshots (432x960)
ftue-1-mine, ftue-2-pick-up, ftue-3-polish, ftue-4-sell, ftue-5-grab-coins, ftue-6-build, ftue-7-hatch,
guide-hero-to-goal.

## Not proven
- Real-phone look and FPS. The full playtest was not re-run (no pacing change).
