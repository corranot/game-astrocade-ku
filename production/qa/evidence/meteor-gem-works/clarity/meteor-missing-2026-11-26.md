# Meteor missing on phones: root cause (2026-11-26)

**Reproduced** with the page as Astrocade runs it (game.js bundled inline) when the host first starts the game as
the muted feed preview (`run('edit')`) and then starts it again for play (`run('play')`), which is what happens when
a player opens the game from the feed. `meteor-missing-before.jpg` is the draft build before this fix: crater,
sparkle and stations are there, the meteor is not.

**Cause.** The new run starts its loop and keeps `last = performance.now()`. The first animation frame after the
restart can carry a timestamp older than that, so the first step was negative (about -0.5 s). The landing intro
added that to its timer, finished at once without ever reaching the impact, and left the meteor parked high in the
sky (out of view) for the rest of the game. Local checks always used `?nointro` or a single run, so they never hit it.

**Fix.** The loop never steps backwards (`Math.max(0, …)` in `frame` and at the top of `scene.update`), and the
intro always ends with the meteor in its crater (`introImpact` when the timer runs out before the impact).
`meteor-feed-after.jpg` is the same feed run after the fix.

The earlier vertex-attribute change (no texture reads in the meteor's vertex shader) and the plain-material fallback
stay as extra safety; they were not the cause.
