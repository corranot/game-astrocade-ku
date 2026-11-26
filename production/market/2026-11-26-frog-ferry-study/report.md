# Frog Ferry study (2026-11-26)

Source: https://frogferry.chirostudio.xyz/ (a portfolio piece by a freelance 3D/motion dev, not an
Astrocade game). Studied for principles only: no assets, names or look are to be copied.

Method: played in headless Chromium on a Pixel 7 viewport (412x915, WebGL2 fallback on
swiftshader, ~2 FPS so real-time feel was judged from code, not from play); read the public
minified bundle; measured load with a slow-4G profile (1.6 Mbps, 150 ms RTT, cache off).
Screenshots: `shots/` (also in project files `frog-ferry-study/`).

## 1. What it is

A cozy 3D arcade toy. You row a small boat around a pond. Frogs wait on lily pads; row near one
and it hops onto your boat and stacks on the frog before it. Each frog wears a coloured hat. Four
home pads (one per colour, in the pond corners) take frogs off the **top** of the stack only, so
stack order matters. Consecutive same-colour drop-offs form a chain scored `n(n+1)/2`. Steering
too hard makes the tower wobble and the top frog falls off ("Plop! Steer gently!"). A run is one
3-minute day that slides from noon to dusk; Zen mode has no timer. A croak button makes nearby
frogs sing a chord and scatters the fish. Four ponds are full art reskins.

## 2. Analysis

| Area | What they do | Verdict |
|---|---|---|
| First 5 s | JS-built loader card (blank page until the bundle lands), then a pond picker with 4 big preview cards, then a title with Day / Zen buttons. Three screens before the first stroke. | Weak. Pretty, but two choices before play. |
| Goal from visuals | Hat colour = home flag colour = HUD pip colour = toast colour. Home pads glow and pulse. | Strong single colour language. |
| FTUE | None. One line on the title: "Tap to start · WASD / Drag to row · Space = Croak". Homes are off-screen in corners with no pointer. The only teaching is the fail toast. | Gap. Our spotlight FTUE rule beats it. |
| Core loop (seconds) | Row, pass a pad, frog hops on, tower grows. Pickup is automatic (radius 2.25), so the only verb is steering. | Very clear, one verb. |
| Core loop (minute) | Plan pickups so the top colour matches the nearest home; chain same colours; carry a tall tower without wobbling it off. | Depth comes from **stack order (LIFO)** plus **physics risk**, not from more buttons. |
| Variety | Spawns every 2.45 s up to 14 waiting; colours random; dusk changes light, adds fireflies and a lantern; 4 themed ponds. No unlocks, no upgrades. | Low meta. Fine for a portfolio, thin for D1. |
| Juice | Hop arcs, ripple sim disturbed by boat/oars/frogs, bow splashes, wake trail, oar-blade splashes, fish scatter, falling frog spin, pulsing home ring, HUD number bump, colour-tinted toasts, rower body animation in sync with oars. | High and cohesive, all small. |
| Camera / cinematics | High follow camera; a tilt-shift blur whose focus point tracks the boat on screen, so the boat is always the sharp centre of a "miniature" diorama. No key-moment camera beats. | Focus trick is great; no cinematics. |
| Art cohesion | Soft toy shapes, saturated teal/coral palette, rounded UI cards in cream with dark-green type, the same palette in UI and world. Each theme swaps geometry style too (toy, clinker, paper). | AAA-indie level. |
| HUD | Top row: one pill with Score / Stack / Best, a timer pill with a clock hand, croak and mute buttons, all one height. Stack pips (colour order) under it. Safe-area insets used. Flaws: a theme chip floats on the right edge over the play area and over the end card; a portfolio avatar sits bottom-right. | Mostly clean grid; two floating extras break it. |
| Audio | 100 % synthesized: oscillators, 30 biquad filters, a convolver reverb, offline-rendered sample bank (`sfx/manifest.json` is empty). Frog croak chorus picks harmonised pitches. Mute button. | Zero audio download, still rich. |
| Session hooks | Three separate bests (tallest tower, best chain, score) saved locally; end card shows 4 stat tiles and a "New Record Tower!" badge; Play Again is the biggest button; Share renders a stat card. | Several "new best" chances per run is a good retry hook. No D1 hook (no daily, no unlocks). |
| Load / size | One JS bundle 1.33 MB raw / 374 KB compressed, CSS 8 KB compressed, system rounded font stack (no web font). No model or texture files: all geometry is procedural. Bulk of bytes is 4 theme preview WebPs (540 KB) and a portrait (137 KB), all non-critical but loaded up front. Slow-4G: loader appears at **3.2 s** (blank before), total transfer 1.08 MB. Shader warm-up is the longest stage (92 to 100 %). | Small code; but first paint waits for JS and non-critical images compete with it. |
| Tech | three.js r187 `WebGPURenderer` with WebGL2 fallback; TSL node post: bloom, boat-tracked tilt-shift, vignette, saturation, grain; ACES tone mapping; PCF shadows; InstancedMesh and BatchedMesh; ripple simulation texture; DPR capped at 2. Staged loader awaits a paint between stages. `prefers-reduced-motion` honoured. URL flags for deterministic capture (`?capture=1&seed=`, `?stack=`, `?day=`). No adaptive quality governor found. | Modern, lean; missing adaptive quality. |

## 3. Top 10 lessons, ranked by Players' Choice impact

Players' Choice scores D1 retention, sessions over 5 min, and p50/p75 play time. MG = Meteor
Gems (3D), RIA = Rub It Away (2D).

1. **Order as the hidden puzzle (play time, p75).** Pickup is automatic, yet the LIFO stack and
   colour-matched homes turn every stroke into a small plan. Depth without new inputs.
   - MG: make carried gems stack visibly on the hero, and let stands or orders accept only the
     top gem type; chaining same-type sales pays a triangular bonus.
   - RIA: in later levels, layers of different colours must be rubbed in order (top layer
     first) with a chain bonus for clean sequences.
2. **Several bests per run (D1, sessions).** Tower, chain and score are separate records, so most
   runs beat at least one. The end card celebrates the one you beat.
   - MG: track best haul, best combo, rarest gem per day; show "New record!" on the one beaten.
   - RIA: per level, keep best time, cleanest rub and longest streak; light up whichever is new.
3. **Risk from feel, taught by the failure (skill, play time).** Sharp steering wobbles the tower
   and drops the top frog with a friendly toast that says what to do. No fail screen.
   - MG: a tall gem carry sways on sharp turns; a dropped gem bounces on the ground to pick up
     again (loss is small, lesson is clear).
   - RIA: rubbing too fast leaves a small smudge with a "Gently!" hint; never a hard fail.
4. **One colour language (first 5 s, FTUE).** The same colour marks the item, its goal, the HUD
   pip and the toast. Players match by eye with no text.
   - MG: gem colour = stand awning = order bubble = coin burst colour.
   - RIA: target object outline colour = progress ring colour = success burst.
5. **A free toy button (session length, delight).** Croak does nothing for the score; it plays a
   harmonised chord and scatters fish. Players press it again and again.
   - MG: a "cheer" button that makes nearby critters hop and chirp a chord.
   - RIA: a tap-anywhere sparkle or squeak with pitch that climbs while held.
6. **A visible session clock in the world (sessions >5 min).** The 3-minute day turns to dusk,
   fireflies and a lantern; the run end is foreshadowed by light, not a number. Zen mode has no
   clock for longer sessions.
   - MG: already has day/dusk; tie dusk to a "last orders" rush so the final minute peaks.
   - RIA: a world's levels move through a time of day so a set of levels feels like one journey.
7. **Diorama focus on the hero (visual quality, readability).** A tilt-shift blur centred on the
   boat's screen position keeps the hero crisp and the edges soft. Cheap (two blurs mixed by a
   mask) and makes the whole frame look like a miniature.
   - MG: add hero-tracked tilt-shift in the post chain at mid and high tiers.
   - RIA: a soft radial focus on the active object in 2D.
8. **Load what the first frame needs, procedurally (fast load).** Procedural geometry,
   synthesized audio and a system font keep code to 374 KB compressed. Their mistake: the loader
   is built by JS (blank for 3.2 s on slow 4G) and 680 KB of non-critical images load early.
   - MG: keep the loader in HTML/CSS so it paints before JS; defer non-first-frame images; warm
     shaders in stages with a paint between stages, as they do.
   - RIA: same; synthesize simple SFX instead of loading files where possible.
9. **Stat-line brag on share (virality).** The share text reads "I ferried 12 frogs · tallest
   tower 7". Our rule keeps the live thumbnail as the image, so only the text carries this.
   - MG and RIA: share text built from the run's best stat.
10. **Their gaps are our edge (first 5 s, D1).** No FTUE, no pointer to off-screen homes, two
    choices before the first stroke, no unlocks. Keep our spotlight FTUE, hero-to-goal arrow,
    straight-into-play start and unlock meta. Also note their deterministic capture flags
    (`?capture=1&seed=`): we use the same idea for repeatable test screenshots.

## 4. Do not copy

Frogs on a boat, coloured hats, lily-pad homes, the croak chorus, pond themes, the name, palette
and UI cards. Use the principles above in our own fiction.
