<!-- PROTOTYPE - NOT FOR PRODUCTION -->
# NEKO ZOOMIES: The Great Toyroom Caper (prototype)

3D kitten toyroom sandbox for ages 5–12, built from the user's full spec (2026-11-24) on the engine code of
`../paws-and-chaos/` (collision, toy physics, kitten rig, camera, particles, synth). Design and the places it
departs from the spec: `brief.md`.

- Run locally: serve this folder and open `index.html?local` (the dev block stands in for the host).
- Single file: `node build-single.js` writes `neko-zoomies.html` (committed: it is the one-file deliverable) (page, config and code in one file; Three.js
  from unpkg through an import map; save in this browser).
- Tests: `node playtest.js <out>`, `node soak.js 10`, `node ../../tools/astrocade-bundle-test.js .`.

Status: in progress. Not yet proven: real phone FPS, sound on real speakers, translations by native speakers.
