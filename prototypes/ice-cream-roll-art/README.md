<!-- PROTOTYPE - NOT FOR PRODUCTION -->
# Ice Cream Roll Art: DIY Rolled Ice Cream Maker (prototype)

Step-by-step rolled ice cream maker for kids, Three.js r187, multi-file Astrocade game. The upload copy of this
README (no working notes) is `README.upload.md`.

**Hypothesis.** The rolled-ice-cream maker genre is proven on Astrocade (Ice Cream Roll Shop: 680k plays in ~37 days,
17k shares; Poké Ice Cream Rolls: highest share rate seen). A version that fixes that game's weaknesses — slow entry,
invisible white milk on a white plate, rolls that are plain cylinders, a freeze step with no visible change, a
"Too slow!" fail after minutes of work, English only — and adds one new verb (draw with syrup, and the drawing really
winds into the spiral) can pass the day-one test (significant plays ≥ 80 %, FPS Optimal).

**Run.** Serve this folder (`.js` as `text/javascript`, `.mp3` as `audio/mpeg`) and open `index.html?local`
(`&speed=2` speeds it up, `&mode=edit` shows edit mode).

**Tests.**
- `node logic.test.mjs` — rules and spiral math.
- `node playtest.js <out>` — first cup + a full cup with real finger input, screenshots of every step.
- `node soak.js 14` — 14 cups in one page: saves, payouts, gifts, flat GPU memory.
- `node look.js <out> [langs]` — every screen in 7 languages, text inside the screen.
- `node layout.js` — spacing: HUD margins and gaps, rating and gift cards.

**Status.** In progress (2026-11-21): playable end to end; artifact https://claude.ai/artifact/7M1bGkY1o7Ykc6qFE9rNUH; Astrocade draft `01M7Y5W8MM2NWA5KPRQN4GNRC8` (private, no thumbnail yet, not published).

**Findings so far.**
- Seen from above, a lying roll reads as a flat block. Standing each roll on its end as soon as it is scraped shows
  the spiral, which is the money shot.
- The spiral end cap needs its inner edge shaded (vertex colour) or the layers blend into one disc.
- A `setPointerCapture` on the game root steals the click of every HUD button under the finger; buttons must be
  skipped before capturing.
- A finger still down when a step ends carried its gesture into the next step (spread finished the drawing step
  by itself); every step change now clears gestures.
- Mid-line `//` comment inserted by a script swallowed the cup reset (cup stayed at 25 % size): same class as
  ASTROCADE.md §0.5. Covered by a playtest check.
- A fresh-eyes bug hunt found 10 bugs the tests missed (late save paying the daily gift twice, the PERFECT band
  mirrored wrong in Arabic, a re-rendered tray moving the highlight, a listener kept per `run()`, a canvas made per
  fruit because cache arguments were evaluated on every call, the mute icon, the hint hand over a still finger,
  coins spent on a tap that did nothing). `playtest.js` `bugChecks` covers them; each check failed before its fix.
- Upgrade in 4 stages (gate, feel, retention, clarity): see ASTROCADE.md section 9. A second bug hunt found 8 more
  (draw tray in the guest sign-in zone, stale "TRY!" labels after a late save, today's special back on a clock moved
  back, the gift card never moving on, a lost pointerup locking the plate, a leaked sauce tube); each has a check in
  `bugChecks` that failed before its fix.
- Finishing an order (owner's report): the cherry floated without cream. Toppings now rest on what is there (roll tops,
  or the cream once added; adding cream later rebuilds the cherry and sprinkles). Extra toppings no longer cost a star,
  the rating card lists the customer's own items, and the frozen sheet reads clearly on a darker steel plate.
- Rating and gift cards (owner's report: the Next button margins were off): the card had no padding, so content taller
  than its min-height pushed the button onto the bottom edge and clipped its shadow. Cards now size to their content
  with 2 x margin padding (button shadow counted), every gap = margin, stars drawn as SVG (a font glyph's ink sits
  differently in every fallback font), badges and shadows counted in their row. `layout.js` measures both cards. A fresh bug hunt found the cup-style
  prize tiny and white-on-white on the new plate (outline on a wrapper: a clip-path clips its own filter); Arabic
  coin amounts read "60+" (now left to right everywhere).
