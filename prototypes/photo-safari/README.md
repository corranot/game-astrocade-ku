# Snowy Snapshot (photo safari), PROTOTYPE - NOT FOR PRODUCTION

A one-finger 3D wildlife photo game for Astrocade, built from `plan.md` (milestones M1 to M4).
Game-only text for the upload is in `README.upload.md`.

## Run

- Local: serve this folder and open `index.html?local` (stands in for the host; `&lang=ar`, `&tier=0..2`,
  `&mode=edit`, `&bot` work).
- Rules: `node --test logic.test.mjs` (24 tests).
- Quick playtest with screenshots: `node playtest.js <out folder>` (Playwright + swiftshader).
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

## Load and performance (27 Nov, `tools/load-time.js`, 390x844, 4x CPU slowdown, software GL)

| Profile | Transferred | Three.js ready | Game ready | First frame |
|---|---|---|---|---|
| 4G | 247 kB | 390-404 ms | 1.44-1.64 s | 2.16-2.41 s |
| slow 4G | 247 kB | 1.46-1.49 s | 2.48-2.64 s | 3.16-3.35 s |

Software GL makes the shader share slower than on a phone GPU. Draw calls: about 176-200 at tier 2 and 124 at
tier 0.

## Status

In progress: M1 to M4 built, Astrocade draft saved (not published). Next: U1 to U3 per `plan.md` after the first
live data.
