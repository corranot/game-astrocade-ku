<!-- PROTOTYPE - NOT FOR PRODUCTION -->
# Paws & Chaos: Sunbeam Kingdom (prototype)

3D kitten sandbox for ages 5–11, built from the user's full spec (2026-11-23), adapted to the Astrocade rules in
`ASTROCADE.md`: no blocking PLAY screen (the PLAY card floats over a live attract show and any tap starts and acts),
`lib` save instead of browser storage, 7 languages, Three.js r187 via import map.

- Run locally: serve this folder and open `index.html?local` (the dev block stands in for the host).
- Tests: `node playtest.js <out>` (74 checks), `node soak.js 14`, `node ../../tools/astrocade-bundle-test.js .`.
- Single-file page: `node build-single.js <out.html>` (inlines config, code and a browser-only save).

Status: in progress. Not yet proven: real phone FPS, sound on real speakers, translations by native speakers.
