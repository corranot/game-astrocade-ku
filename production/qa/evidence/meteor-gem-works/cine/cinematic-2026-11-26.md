# Meteor Gems: cinematic beats and return reasons (2026-11-26)

Goal: Players' Choice (playbook §11: 50K plays, then 15×D1 + 10×share of sessions over 5 min + p50/p75 seconds).

## Cinematic beats (`moment()` in game.js, tuning in `cine`)
- Camera eases to the moment (existing showcase rig), slow motion `cine.slowK` 0.35 for `cine.slow` 0.5 s on big
  beats, a `cine.stop` 0.08 s hit-stop on builds, hatches, stars and perfect strikes, letterbox bars and a vignette
  under the HUD, a whoosh sting. Input keeps working; the tutorial spotlight waits until the beat ends.
- Priority: 2 = story beat (first gem, first sale, every build, hatch, district, finale), 1 = big (rush, egg drop,
  ghost town light), 0 = small (next pad shows, bus). Lower beats wait for `cine.gap` 6 s after the last one.
- Screenshots ~0.7 s into each beat: cine-1-first-gem, cine-2-first-sale, cine-3-drill-rig (build), cine-4-new-friend
  (hatch), cine-6-new-stand, cine-7-egg-drop, cine-8-shiny (rare hatch).

## Return reasons and session length
- The welcome-back gift (coins + a sooner egg once a day after 8 h away) no longer waits for the festival drop.
- A "come back tomorrow" banner shows once per session after `tomorrow.after` 240 s.
- Already in the game: Crystal Rush at 1:40 and every 2:30 (mid-session surprise), the NEXT card (next unlock always
  visible), the share button after hatches, stars, the laser and the finale (share sends no image: live thumbnail).

## Not proven
- Real-phone feel and FPS; D1 and session length are only measurable after publish.
