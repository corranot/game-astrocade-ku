# Snowy Snapshot (photo safari), PROTOTYPE - NOT FOR PRODUCTION

A one-finger 3D wildlife photo game for Astrocade, built from `plan.md` (milestones M1 to M4).
Game-only text for the upload is in `README.upload.md`.

## Run

- Local: serve this folder and open `index.html?local` (stands in for the host; `&lang=ar`, `&tier=0..2`,
  `&mode=edit`, `&bot` work).
- Rules: `node --test logic.test.mjs` (24 tests).
- Quick playtest with screenshots: `node playtest.js <out folder>` (Playwright + swiftshader).
- Frame-time self-check on a mid and a low-end phone profile: `node perf-check.js [seconds]` (reads the game's own
  frame-time ring, game-code time per frame and quality tier changes; dev builds expose them as `__game.frames()`).
- Repo checks: `bash tools/ci-checks.sh prototypes/photo-safari/`, `node tools/astrocade-bundle-test.js prototypes/photo-safari`,
  `node tools/load-time.js prototypes/photo-safari`.

## What is built (M1 to M4)

- M1 core loop: walk (drag stick or tap-to-walk), the viewfinder opens near an animal (first person, smart zoom
  frames the subject at `photo.aimCover`), snap, the polaroid develops, stars rate it, it flies into the book.
- M2 collection: 3 photo slots per species, 24 species in 3 areas, stamps open the lake (10) and caves (25) with an
  ice-gate cinematic, shy animals and treats, the shop (treats, zoom 2x/3x, night flash, slow shutter, outfits).
- M3 day/night: a 6-minute day with dusk, aurora night and dawn; night animals; a daily rare visitor and three daily
  requests (seeded by date); morning mail.
- M4 polish: FTUE spotlight (walk, snap, book, treat, pose, gate; advances on the real action; skippable; saved),
  cinematic beats through a queue with a cooldown, paw-print trail and edge arrow from the hero to the goal,
  7 languages incl. Arabic RTL, adaptive quality tiers, save via the host only.

## Decisions made while building

- **First-person viewfinder**: the over-the-shoulder view hid the subject behind the hero; the camera now moves to
  the hero's eyes and the hero hides while it is up.
- **Smart zoom instead of a zoom chip**: the lens picks the fov that frames the animal; owned zoom lenses only allow a
  tighter fov and a longer range. Portrait screens are narrow, so framing uses the horizontal fov.
- **Personal space**: animals never walk closer than `photo.personalM` plus their radius, so a close-up never fills
  the screen.
- **See-through pines**: pines between the camera and the hero dissolve with an ordered dither
  (`camera.seeThroughM`), so the hero stays visible at the edges of each area.

## Load and performance (27 Nov round 3, `tools/load-time.js`, 390x844 dpr 2, 4x CPU, 4G, software GL)

| | Transferred | Game ready (JS) | First frame |
|---|---|---|---|
| Round 2 build, same session | 248 kB | 1.48-1.67 s | 2.23-2.61 s |
| Round 3 build | 248 kB | 1.34-1.53 s | 2.13-2.24 s |

What changed: shaders compile once against the target they draw into (they were compiled for the screen and rebuilt
on the first frame), the first 1.2 s render at device pixel ratio 1, terrain colours without allocations, only the 3
nearest animals before the first frame (the rest one per frame after boot), the root box read once per resize.
The last ~0.7 s is SwiftShader building each shader's pipeline at its first draw; phone GPUs compile in parallel
(`KHR_parallel_shader_compile`), so a phone lands near the "game ready" figure. A tree-shaken three.js was measured
(-44 kB gz, about -0.2 s cold) but not shipped: the shared cdnjs copy is cached across games on the same host, and
inlining it into the bundle made the load slower (920 kB inline script, no streaming compile).

Frame self-check (`perf-check.js`, software GL): game code takes 20-27 ms a frame at 4-6x CPU (about 5 ms on a phone);
frames are GPU-bound on SwiftShader (100-117 ms at tier 0). The adaptive quality now counts real seconds: before,
under 20 fps it never stepped down within 24 s; now it drops tier 1 -> 0 after about 7 s. Draw calls: about 170 at
tier 1, 110-120 at tier 0.

## Status

In progress: M1 to M4 built, Astrocade draft saved (not published). Next: U1 to U3 per `plan.md` after the first
live data.
