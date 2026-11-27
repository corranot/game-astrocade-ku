# Snowy Snapshot evidence (27 Nov 2026)

Screens from `node prototypes/photo-safari/playtest.js` (Playwright + swiftshader, 390x844 unless named). All checks
passed: the tutorial played with real taps, photo, book, shop, treat, pose, the area-unlock cinematic, the hero framed at
three far corners, the edit -> play handover, HUD grid on 360x640 / 390x844 / 430x932 / 768x1024, Arabic RTL, tier 0
(124 draw calls).

Load (`tools/load-time.js`, 390x844, 4x CPU slowdown, software GL): 4G first frame 2.16-2.41 s (game ready 1.44-1.64 s),
slow 4G 3.16-3.35 s; 247 kB transferred.

The Astrocade draft pulled back through the MCP is byte-identical to the upload set and passes
`tools/astrocade-bundle-test.js` (started, no errors, moves before touch, tap changes the screen).

## Round 2 (visual review, 27 Nov)

`r2/`: warmer grade, printed-photo look, vignette instead of letterbox bars, full-screen world (tablets too), focus pill
under the animal, ~60% framing, hero and first fox spotlit together. Playtest all passed; HUD grid equal at all 4 sizes.
Load 4G first frame 2.26-2.33 s. The re-saved draft pulled via the MCP is byte-identical and passes the bundle test.
