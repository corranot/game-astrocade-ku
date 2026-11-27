# Meteor Gems: Astrocade metadata and guide compliance (2026-11-26)

Checked the draft against the Astrocade game dev guide (MCP `get_game_dev_guide`) and the
distribution playbook. Before = draft 01M8CWSD8CYQGR41EYW4R4H0KQ.

| Item | Before | After |
|---|---|---|
| Listing title | Meteor Gems | Meteor Gems (kept; plan §15.5) |
| `<title>` in index.html | Meteor Gem Works | Meteor Gems (matches the listing) |
| Description | empty on draft | plan §15.5 text, game-only |
| `lib.showGameParameters` (required when tunables exist) | missing | 4 sliders: walk speed, carry limit, camera tilt, camera height |
| Haptics on physical moments | none | `lib.haptics.play`: hit tap, perfect thud, unlock and hatch success (off in bot/edit runs) |
| Touch targets >= 96 px (720x1280 frame) | top chips/buttons 88, share 92, coach skip 56, album close 70, hat tiles ~62 | `--h` 96 (8 px grid), share 96, skip and close get a 96+ invisible hit area, hat grid 5 columns x 96 |
| Required files (README, index.html, game.js, game_config.json, asset_map.json) | present | present |
| dt clamp <= 0.11, `run(mode)` | present | present |
| Leaderboard / `persistent_storage_config` | none | none (theme incremental, plan §15.3) |
| Thumbnail | owner's job | owner's job (not set) |

Checks: `node logic.test.mjs` pass, `bash tools/ci-checks.sh` pass, bundle test `started: true`,
no errors, empty `fail`, `movesBeforeTouch: true`. `hud-360x640.jpg`: HUD row on the 96 grid at the
smallest phone.
