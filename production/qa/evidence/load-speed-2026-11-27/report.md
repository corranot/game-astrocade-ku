# Load-speed pass over all live games (2026-11-27)

Goal: first playable frame within about 2 s on a mid-range phone over 4G, for every live game.

## Result

- 57 live games measured. 32 fixed, verified, saved and published (all returned approved and live).
- Root cause found in 32 games: the minified cdnjs `three.module.min.js` (r186.1 and r187.0) imports
  `./three.core.js`, the **unminified** core. That adds about 120 KB gzip and extra parse time before the first picture.
- Fix: an importmap entry remaps the `three.core.js` URL to `three.core.min.js`, and
  `<link rel="modulepreload" crossorigin>` for module.min.js and core.min.js is placed after the importmap.
  Same library version, no gameplay or visual change.
- 5 games (Voxel Wonderland, Snip It, Paws & Chaos, Block Smash Crew, NEKO ZOOMIES) also had an early
  modulepreload of `three.core.js` (NEKO: unpkg `three.module.js`) **before** the importmap, so both copies loaded.
  Those lines were removed.
- Average saving: about 118 KB gzip per fixed game. First draw is 100-1050 ms earlier on most of them.
  Paws & Chaos and DIY Squishy are within run-to-run noise.
- 3D Date Stylist streams about 6 MB of VRM models. The lab saw no canvas draw hook (VRM renderer), but the 8 s
  screenshot is identical. It loads more model bytes by 8 s after the fix because the core arrives sooner.
- Kebab and Ambulance show more kB at the first frame because lazy assets now arrive before the earlier first draw.
  Their kB by 8 s is 120 KB lower.

## Method

- Capture the exact served page: `node tools/live-capture.js` opens `astrocade.com/games/x/<id>` as a guest on a phone
  and saves the game iframe's `srcdoc` and the host's `RUN_WITH_CONFIG` message.
- Replay throttled: `node tools/live-load.js <srcdoc.html> <msgs.json> [runs] [shot-prefix]`.
  - Profile: 390x844 phone, 4x CPU slowdown, 4G at 60 ms RTT / 9 Mbps.
  - A local parent page serves the srcdoc gzipped and answers the game library's host requests.
  - "first draw" = first WebGL draw or large-canvas 2D draw. Screenshots are taken at 2 s and 8 s.
  - `HANDOVER=1` sends the edit run first, then play (the feed handover).
- Before and after use the same page with only the fix applied. 8 s screenshots are identical before and after.
  There were no console errors.
- The feed handover (edit then play) passed on Paws & Chaos, Tiptoe & Hatch, +1 Mega Hammer and Splash Master #2.
  Splash Master #2's slow loader is the same before the fix.
- Caveat: headless swiftshader makes the 3D first present 2-4 s later than on a real GPU (shader compile).
  Read "first draw" together with the owner analytics TTFI: old 1-20 Nov games 5-8 s, newer games 1-3 s.
- Safety: none of the 32 had a pending draft before the edit (`unpublished_edits=false` at 16:15 UTC), and
  save_edits refuses ("changed") if anyone saved meanwhile. Each new draft sat directly on the published version.

## Before / after (lab, ms and kB gzip)

| Game | Fixed + published | First draw before (ms) | after (ms) | kB loaded by 8 s before | after |
|---|---|---|---|---|---|
| Grab and Park | no | - | - | 3002 | - |
| 3D Date Stylist | yes | - | - | 6310 | 6468 |
| Bicep Clash | no | 6311 | - | 3196 | - |
| Mega Aura | yes | 5412 | 5017 | 1745 | 1623 |
| Paint Peekaboo | yes | 5145 | 4889 | 2522 | 2401 |
| Prop Heist | yes | 4992 | 4333 | 4904 | 4783 |
| RUN! Pet Thief 3D | yes | 4948 | 4343 | 5481 | 5359 |
| Tame a Dragon | yes | 4892 | 4640 | 5376 | 5255 |
| Toybox Town | yes | 4794 | 4342 | 5115 | 4994 |
| DIY Squishy Studio | yes | 4479 | 4543 | 1240 | 1119 |
| Kebab Street Tycoon | yes | 4324 | 3268 | 3246 | 3121 |
| Reel & Hatch | no | 4127 | - | 3558 | - |
| Tiny Town Mayhem | yes | 4052 | 3833 | 1479 | 1357 |
| Escape the Hippo Warden | no | 3988 | - | 1667 | - |
| Tiptoe & Hatch | yes | 3859 | 3343 | 5408 | 5287 |
| Miawdoku | no | 3586 | - | 2879 | - |
| Candy Mine Vacuum | yes | 3443 | 3340 | 1243 | 1122 |
| Megalodon.io | yes | 3122 | 2960 | 1223 | 1101 |
| Cozy Room Designer | no | 3082 | - | 6122 | - |
| Punch Tower | yes | 3072 | 2658 | 3030 | 2906 |
| Hero Bridge Royale | yes | 3002 | 2633 | 1223 | 1102 |
| Blueprint Builder | no | 2657 | - | 1001 | - |
| Splash Master #1 | yes | 2571 | 2346 | 2103 | 1982 |
| Ambulance Rush | yes | 2441 | 1884 | 2553 | 2432 |
| Toy City Stomp | yes | 2408 | 1674 | 1082 | 957 |
| Splash Master #2 | yes | 2215 | 2027 | 2614 | 2493 |
| +1 Mega Hammer | yes | 2115 | 1644 | 625 | 501 |
| Sprint Past the Tsunami | yes | 2109 | 1800 | 2237 | 2115 |
| Titan Gates | yes | 2005 | 1600 | 1992 | 1868 |
| Spooky Squad 3v3 | yes | 1990 | 1548 | 1887 | 1766 |
| Mega Hammer Royale | no | 1865 | - | 1040 | - |
| Bus Telolet | yes | 1839 | 1365 | 2194 | 2072 |
| Juice Face Slice | yes | 1776 | 1496 | 1036 | 912 |
| NEKO ZOOMIES | yes | 1714 | 1458 | 738 | 481 |
| Giant Snowball Smash | yes | 1657 | 1258 | 1818 | 1694 |
| Voxel Wonderland | yes | 1544 | 1446 | 621 | 497 |
| Block Smash Crew | yes | 1485 | 1449 | 935 | 811 |
| Frosty Heist | no | 1450 | - | 458 | - |
| Turbo Splash | no | 1367 | - | 1197 | - |
| Pixel Blast | no | 1357 | - | 672 | - |
| Dum Biryani | no | 1354 | - | 1260 | - |
| Asteroid Wars | no | 1322 | - | 747 | - |
| Paws & Chaos | yes | 1298 | 1400 | 620 | 495 |
| Ice Cream Roll Art | yes | 1292 | 1037 | 909 | 784 |
| Winter Toy-Box | no | 1213 | - | 564 | - |
| Aurora Heist | no | 1198 | - | 504 | - |
| Snip It | yes | 1107 | 1063 | 641 | 517 |
| Soap Carving | no | 1020 | - | 2784 | - |
| FLOW STATE | no | 1007 | - | 976 | - |
| Martabak Master | no | 820 | - | 1241 | - |
| Pin & Bloom | no | 786 | - | 326 | - |
| Meteor Gems | no | 785 | - | 692 | - |
| Rub It Away | no | 695 | - | 7761 | - |
| Pet Smile Clinic | no | 522 | - | 370 | - |
| Pinata Maker | no | 418 | - | 6203 | - |
| Draw It Alive | no | 395 | - | 265 | - |
| Fizzy Bath Bomb | no | 377 | - | 4335 | - |


## Not changed, and why

- Already fast (first draw under 1.5 s, mostly 2D): Draw It Alive, Fizzy, Pinata, Pet Smile, Pin & Bloom, Martabak,
  Soap Carving, FLOW STATE, Aurora, Winter Toy-Box, Pixel Blast, Turbo Splash, Asteroid Wars, Dum Biryani, Frosty.
- Meteor Gems: already remapped earlier.
- Rub It Away: fast (695 ms). The owner publishes it herself.
- Wonder Sprout and Snowy Snapshot: excluded (scheduled publish and unpublished build).
- Mega Hammer Royale (1.9 s): r158 UMD `three.min.js`, no split core, nothing to remap.
- Reel & Hatch (4.1 s): r161 single-file module, no split core.

## Still over 2 s: needs rework, not a one-line fix

- Inline Rapier physics wasm (~1.1 MB gzip as base64) plus 300-750 KB of inline multi-script woff2 fonts; boot awaits
  physics before the first picture: Tiptoe & Hatch, RUN! Pet Thief 3D, Tame a Dragon, Toybox Town, Prop Heist.
  Next fix: move the wasm and models to CDN assets and start physics after the first frame. Move non-Latin font faces
  to `url()` with `unicode-range`, so they load only when needed.
- Bicep Clash (6.3 s, 1.09 MB page), Grab and Park (2 MB inline wasm, scene visible at 2 s), Escape the Hippo Warden
  (Three.js bundled inline), Miawdoku, Cozy Room Designer, Blueprint Builder, Kebab, Mega Aura, Paint Peekaboo,
  Candy Mine Vacuum, Tiny Town Mayhem, DIY Squishy: heavy inline assets. Same next fix.
- Miawdoku and Cozy Room hold unpublished 3D-conversion drafts on hold for the owner, so they were not touched.

## Evidence

- `sheet-before-after-8s.jpg`: 8 s frame before and after per game (identical).
- `sheet-2s-a.jpg`, `sheet-slow-2s.jpg`: what players see at 2 s.
- `ho.jpg`: feed handover frames.
- `pair.txt`, `redo.txt`: raw runs.
