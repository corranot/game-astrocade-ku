# Meteor Gem Works — game plan (v2)

**Status:** approved by the owner on 2026-11-25. M1 merged; M2 in this build.
**v1:** 2026-11-25, PR #198. **v2:** 2026-11-25, a full upgrade the owner asked for.

The v2 brief, in the owner's words: target **kids**; a **median session of 10+ minutes**; a detailed objective loop
that is **very addictive and very interactive**; visuals that feel **alive, special and luxurious, but not glaring**;
every effect and transition **richly animated**; and "what I don't know that I don't know".

**Evidence:**
- Traffic: astrotopper snapshot `production/market/2026-11-25T1244/`. The proxy is 7- and 30-day gain, because
  daily plays are not exposed. One creator's four 3D arcade idle tycoons total ≈3.6M plays.
- Genre teardown: `production/market/competitors/01M7B4YM0Q5XFDCXS4CXG8Y74X/analysis.md`.
- Platform facts: `ASTROCADE.md` §2–5.

We share the genre and its mechanics. The theme, world, characters, story and every asset are ours.

---

## 0. Team review: what changed from v1 and why

We ran one review per discipline over v1. Each lead names the biggest problem they found and the fix that went into
this plan. Every item is tagged **P0** (must ship in the first upload), **P1** (ship if it fits, otherwise update 1)
or **P2** (named update later). §13 lists all of them in one table.

| Lead | Problem found in v1 | Fix in v2 |
|---|---|---|
| Creative director | v1 ends with an end card at ~10 min. An end card is an exit door, which works against a 10+ min median. | The finale hands straight into **Chapter 2**: a second meteor streaks across the sky during the celebration. No exit screen until much later (§4). |
| Game designer (retention) | One loop (carry and pay) for 10 min gets samey for kids. A good design moves the player's job up the chain every ~2 min. | Five nested goal layers (§2.1), a **critter egg** every 60–90 s, **orders** with a face, a **Crystal Rush** event every ~2.5 min, and a **town star meter**. |
| Child psychologist / kids UX | v1 has impatient red faces, text banners and a lot of walking. Kids 5–10 read little, dislike being "told off", and tire of long walks. | No angry faces (customers only wait happily). Icon-first banners with a voice-like jingle. Short walks (the deck is compact; helpers take over the long trips). Big pads. Nothing can be lost. |
| Art director | "Luxurious" needs a material story, not more glow. | Gems are rendered as real cut jewels (env-mapped, faceted, coloured refraction look). Warm desert against cool crystal. A strict **glare budget** that is measured, not guessed (§5.6). |
| VFX lead | v1 lists effects but does not layer them. | Every effect has three layers (anticipation, impact, afterglow) and a budget (§6). |
| Animation / transitions | v1 has hops and a camera showcase, but no designed transitions. | A tween and spring kit, squash-and-stretch rules, a transitions table (§6.3), a living-world list (§5.7). |
| Audio director | One loop for 10+ minutes fatigues kids and parents. | Adaptive music in 4 stems that join as the town grows; pitch-randomised SFX; quiet hours (no loud bursts in a row) (§7). |
| UI lead | A web-style NEXT panel with text. | A diegetic, icon-first HUD on a carved wood and brass frame, a sticker album and a chapter map (§8). |
| Tech / performance | More content means more risk on cheap Android phones (very common among kids). | Shared-asset kit, 4 quality tiers, a hard budget table, context-loss recovery, and a soak test (§9). |
| Producer | v2 is much bigger than v1. | Scope is split into P0/P1/P2 with a clear first upload (§12, §13). |

---

## 1. Concept

- **Pitch:** a giant glowing crystal meteor crashes into a sleepy desert canyon town. You mine it, polish its
  crystals into jewels, sell them to the tourists who flock in, hatch the cute **crystal critters** hidden inside, and
  rebuild the town. Then the next meteor lands.
- **Fantasy for kids:** "I found a magic rock, I have pet crystal friends, and I made the whole town happy."
  Ownership (my town, my critters, my hat), discovery (what's in the next egg?) and being the hero everyone cheers.
- **Audience:** kids 5–11 and casual players. Portrait phone, one finger, 7 languages including Arabic (24% of the
  platform's audience; the layout works right to left). Zero reading needed to play.
- **Session target:** median 10+ minutes.
  - The first chapter takes ~9–10 min.
  - Chapter 2 starts at once and gives about 8 more minutes.
  - Collecting critters and stars gives a reason to stay after that, and to come back.
- **Hook in one image:** a tiny hero with a pickaxe next to a cracked meteor glowing from inside, a baby crystal
  critter at their feet, and a cheering crowd on the crater rim.

## 2. Core loop

### 2.1 Five goal layers (always one visible at each layer)

| Layer | Time | What the kid does | What they get |
|---|---|---|---|
| **Micro** | 1–3 s | Hit the meteor, pick up, drop, collect | Sound, sparkle, a number pops, the stack grows (reward every 3–6 s) |
| **Short** | 15–40 s | Fill the next price pad, or serve an **order** (a tourist kid's bubble shows the gem they want) | A new machine, character or place; a heart and a sticker for the order |
| **Medium** | 1–3 min | A **district goal** from a town character (for example "light the ghost town": 3 deliveries) shown as a portrait and 3 icon slots; a **Crystal Rush** event; a **critter egg** hatch | Story beat, new district, a critter that follows you and helps |
| **Long** | 8–10 min | Finish the chapter: the meteor's heart (finale) | A celebration, the chapter's crown critter, the next meteor arrives |
| **Meta** | across sessions | Fill the **sticker album** (critters, hats, town stars), unlock chapters on the **chapter map** | Hats, a prettier town, bragging rights (`lib.share` card) |

### 2.2 The second-by-second loop (same as v1, tightened for kids)

1. **Mine.** Stand in the circle and the hero swings automatically. **Glints** (sparkling spots) appear on the
   meteor. Tapping one, or walking into it, gives a **Perfect Strike**: a big burst and 3× chunks. This keeps hands
   busy and rewards attention. Glints are optional; missing one costs nothing. (P0)
2. **Carry.** The stack of chunks grows on the hero's chest (up to 20, then 30 and 40 with upgrades or critters).
3. **Polish.** Drop chunks at a polisher: 3 chunks make 1 gem.
   - Optional: tap the wheel to "boost" it, with a sparkly ASMR spin and faster polishing. (P1)
4. **Sell.** Put gems on the stands. Tourists buy them and the cash flies onto a pile.
5. **Build.** Collect the cash and walk onto a pad. The money flows in and the thing unlocks with a show.
6. **Orders.** A tourist kid with a big bubble asks for a specific gem shape or colour. Deliver it for a heart, a
   tip and a sticker. There is one order at a time, every ~45 s, never with a timer. (P0)

### 2.3 Recurring events (the "something just happened!" beats)

- **Critter egg:** one every 60–90 s. It drops out of a fresh crack in the meteor and wobbles. Walk over it and it
  hatches with a show: shake, crack, light burst, the critter's reveal pose, a name jingle, and it joins the album.
  - Critters follow the hero in a little parade and each one has one light perk, for example: carries 5 more,
    bigger magnet radius for cash, polishes faster, walks faster, attracts tourists.
  - 12 critters in chapter 1, in 4 rarities (common, shiny, rare, legendary).
  - The odds are generous and fixed. A pity counter guarantees a rare by the 6th egg. (P0)
- **Crystal Rush:** about every 2.5 min the meteor flares. For 15 s, chunks rain on the deck and coins fizz out of
  the ground, and the kid runs around scooping them up. It has its own music sting and a light golden tint. (P0)
- **Tour bus arrival:** about every 2 min after the road is fixed, a bus honks in with a wave of tourists. The queue
  surges and the stands empty fast. (P0)
- **Small surprises** (P1): a lost puppy to return (a sticker), a hat blowing in the wind to chase, a tumbleweed
  to kick for a coin.

### 2.4 Rules that keep it kind

- No fail state, no timer, no lives, no punishment, no money loss.
- Every wait is under ~30 s, and there is always something active nearby: a glint, an order, a pile to scoop.
- Stations never jam (fix A, §11).
- Helpers take over the long walks, so the kid's job moves to fun choices.

## 3. Controls

| Action | Touch | Keyboard / mouse |
|---|---|---|
| Move | Drag anywhere: a floating joystick appears under the finger | WASD or arrow keys |
| Mine | Stand in the circle (automatic) | Same |
| Perfect Strike | Tap a glint on the meteor, or walk into it | Click, or walk |
| Pick up / drop / collect / pay / hatch | Walk onto it (automatic) | Same |
| Boost polisher (P1) | Tap the wheel | Click |
| Album, chapter map | Tap the book or map icon (bottom corners) | B / M |
| Music on/off | ♫ button | Same |
| New game | ↻ button, tap twice to confirm | Same |

- Big touch targets (≥ 64 px at 720 px width), placed away from the joystick zone.
- Taps that hit nothing still give a tiny sparkle and a sound, so the screen always answers a kid's finger.
- Haptics are not used: the platform reports them as unsupported on the web.

## 4. Progression

### 4.1 First 30 seconds (decides "significant plays", see §14)

- **0.0–3.0 s:** the cold open plays **while it already looks like the game**.
  - The meteor streaks across the sky, clips the bridge and lands in the square: a dust ring, a soft (not jarring)
    shake, townsfolk with "!" bubbles.
  - At 1.5 s a pulsing finger icon appears on screen. Any touch skips the rest at once.
- **3 s:** control is handed to the player. The mining circle pulses, and a glint is already sparkling on the meteor.
- **≤ 5 s:** the first hit gives sparkle, a chime and 3 chunks hopping out.
- **≤ 12 s:** the first gem is polished.
- **≤ 20 s:** the first sale, and coins fly to the kid.
- **≤ 25 s:** the first pad (Drill Rig, $25) is full and unlocks with a show.
- **≤ 40 s:** the first critter egg hatches. Its timing is fixed, so every kid sees one early.

The opening is skipped for a returning save, which goes straight to the CONTINUE card.

### 4.2 Chapter 1 — "The Crystal Meteor" (desert canyon, noon to night)

| # | Unlock | Price | What is new | Target time |
|---|---|---|---|---|
| 1 | Drill Rig | $25 | A robot drill arm mines for you; a second wound opens | 0:25 |
| 2 | Chunk Conveyor + Polisher 2 | $70 | Chunks ride to the wheels | 0:55 |
| 3 | Display Stand 2 + Lantern Rope | $90 | More buyers; the crater rim lights up | 1:20 |
| 4 | Hire Shopkeeper (a friendly armadillo) | $120 | Gems go to the stands by themselves | 1:45 |
| 5 | Fix the Canyon Road | $160 | Townsfolk rebuild the bridge; the first tour bus | 2:15 |
| 6 | Ring Workshop | $200 | New product: rings; orders can now ask for rings | 2:50 |
| 7 | Laser Cutter | $230 | Triple laser: wider cuts, more eggs exposed | 3:25 |
| 8 | Mine Cart + Ghost Town | $260 | District goal "Light the ghost town": each delivery brings one building back | 4:05 |
| 9 | Drill Rig 2 | $290 | A second arm on the far side feeds the ring workshop | 4:45 |
| 10 | Canyon Cable Car | $320 | Twice the tourists; a ride view of the canyon | 5:35 |
| 11 | Stargazer Deck | $360 | Evening starts; fireflies; tourists stay | 6:30 |
| 12 | Crown Jeweler | $420 | New product: crowns, sent by cable car to the museum | 7:30 |
| 13 | Neon Main Street | $480 | Lamps and signs light up one by one at dusk | 8:30 |
| 14 | The Heart of the Meteor | $540 | Finale (§4.3) | ~9:30 |

Prices are first-draft values in `config.js`, tuned by the bot run. Critters, orders and Rush add income, so prices
are tuned with them switched on.

### 4.3 Finale → next chapter (no exit door)

- **Finale (~15 s):**
  - All lasers fire. Crack lines race over the shell, and the pieces fall away in slow motion with dust.
  - The **heart gem** rises and glows. The chapter's **crown critter** (legendary) hatches out of it.
  - Gems rain on the stands, and fireworks go up over each district while the camera tours them.
- **Hand-off (~5 s):**
  - The camera tilts up. A second meteor, an icy blue comet, streaks across the night sky toward the far mesa.
  - Banner icon: a comet with a "!". A star burst appears on the chapter map icon.
  - A pad appears: **"Follow the comet!"** at $0. One step and the cable car carries the hero to chapter 2.
- **Celebration card (P0):** shown **only when the kid stops at the album or the map**, never on its own. It shows
  stars earned, critters and gems, and a `lib.share` "show my town" button.

### 4.4 Chapter 2 — "The Frost Comet" (P1; first named update if it doesn't fit the first upload)

- A snowy mesa top next to the canyon, with an aurora at night.
- The kit is reused with new skins: ice crystals, a hot-cocoa stand, a sled line, an ice palace district.
- 10 unlocks, about 8 min. 10 new critters.
- The heart is a frozen star; its finale reveals the next meteor (lava, chapter 3, P2).

### 4.5 Meta and returning players

- **Town stars:** up to 3 per chapter, earned from orders served, critters found and the town fully lit. They
  unlock hats for the hero: cowboy, crown, astronaut, bunny ears, and more. (P0, 6 hats)
- **Sticker album:** critters, hats, special orders. Empty slots show silhouettes, which pulls kids to find them.
  (P0)
- **Welcome-back gift:** a returning kid's helpers have filled a cash pile while they were away, capped at a small
  amount. They walk over it for a big, satisfying collect. (P1)
- **Free play after the last chapter:** the stands keep selling, eggs keep coming until the album is full, and Rush
  keeps happening.

### 4.6 Ethics guardrails (kids)

- No real-money anything, no ads, no external links, no chat, no personal data.
- No streak punishment.
- Egg odds are generous and fixed, with a pity counter.
- No "come back or lose it" messages.

## 5. Art and 3D direction (Game Quality Standard, luxury without glare)

### 5.1 Style
- Polished, toy-like stylised 3D, in the spirit of a premium kids' animated film set: rounded chunky forms, soft
  bevels everywhere, readable silhouettes.
- No bare primitives. Every prop gets trim, a secondary shape and wear. For example, a water tower has planks,
  bands, a ladder, a drip, a painted logo and a bird on top.

### 5.2 Palette and lighting story
- **World:** warm desert. Terracotta, apricot sand, bleached wood, sage plants, turquoise accents.
- **Meteor and gems:** cool crystal. Magenta, violet and cyan. These are the only cool, glowing colours, so a kid's
  eye always finds the treasure.
- **Machines:** mint-teal with brass.
- **People and critters:** candy accents.
- **Time of day as progress:** noon (unlocks 1–4) → afternoon (5–8) → golden hour (9–10) → dusk (11–13) → night
  (finale).
  - The sun's colour, angle, shadow softness, fog colour and sky gradient follow a curve in `config.js`.
  - The town gets prettier as you progress.

### 5.3 The meteor (hero object)
- A charred, cratered rock shell over a faceted crystal interior.
- **Persistent cuts:** a cut-field texture stores the depth of each cut. The vertex shader pushes the shell inward
  and the fragment shader blends rock to glowing crystal, with a cooling ember rim.
- The more you mine, the brighter the crystal glow (it feeds the bloom mask).
- Shards break off as instanced, faceted pieces. Eggs are visibly lodged in the cracks before they drop, which
  builds anticipation.
- A low-poly proxy casts the shadow.

### 5.4 Gems that look expensive
- Real cut shapes: brilliant, emerald cut, heart, star, pear. Each gem shape has its own colour, so kids who can't
  tell colours apart can tell gems by shape.
- Material:
  - A small prefiltered environment map, baked once from a procedural gradient "jewellery studio" scene, for
    sparkle.
  - A facet-normal pattern plus a fake inner-refraction look: a dispersion tint by view angle.
  - A tiny star twinkle sprite on the highest facet, drawn with a soft falloff (no hard white).
- The same material is used on rings, crowns and the heart gem, so everything precious reads as one family.

### 5.5 Characters and critters
- **People:** rigged low-poly characters (CC0 or our own, with the source recorded) in several outfits.
  - The hero prospector has 6 hats.
  - Others: the armadillo shopkeeper, the mayor (a tortoise with a sash), the bus driver, tourist families.
  - Animations: walk, run, carry, idle, mine, cheer, wave and a little dance.
  - The crowd is instanced (≤ 300), with idle variety: waving, taking photos, kids on parents' shoulders.
- **Crystal critters:** chunky, cute animals with a crystal body part. For example: a gem-backed armadillo pup, a
  quartz bunny, a geode turtle, a crystal fox, an opal owl, a ruby lizard.
  - Each has a blink, a bounce walk and a happy spin. Shiny and rare versions have an animated iridescent shader.
  - They follow the hero in a parade with a slight lag and spring.

### 5.6 Glare budget (luxury, not dazzling)
- Bloom applies **only** to a selective mask: the meteor crystal, gems, lasers, neon and lamps. The threshold is
  high, the radius is wide and soft, and the intensity is capped.
- ACES tone mapping and a gentle warm grade. No pure white anywhere in the scene. Specular highlights are clamped.
- **Measured:** the existing `glare()` / `contrast.js` checks from the repo's audit (ASTROCADE.md §5) run on every
  evidence screenshot.
  - Pass rule: under 2% of pixels near white, and no bloom halo over a pad or the HUD.
  - The exact numbers are set in M1 and stored in `config.js`.

### 5.7 A world that is alive (P0 unless marked)
- **Always moving:** windmills, bunting and flags in the wind, cactus flowers swaying, cloud shadows sliding over
  the canyon, birds that take off when the hero runs near (P1), dust devils, a tumbleweed now and then.
- **Townsfolk vignettes:** kids playing ball, a dog chasing its tail, a photographer setting up, a band on the
  stargazer deck at dusk (P1).
- **Reactions:** people point and cheer at each unlock. Critters react to Rush (dance) and to eggs (gather round).
- **Night:** a starry sky that turns slowly, fireflies, lit windows, a soft aurora from the meteor's heart.

### 5.8 Camera
- A fixed 3/4 view, portrait-framed, with the meteor on a diagonal at the top. It follows the hero smoothly with a
  little look-ahead in the direction of movement.
- **Showcase moves:** 1.5–2.5 s eased pans and zooms, with a subtle letterbox (6% bars), then control comes back.
  Kids can skip any showcase with a tap.
- **Shake:** short, decaying and small. The crash and the finale are the biggest. Never long or nauseating.

## 6. VFX and animation

### 6.1 Layering rule
Every gameplay effect has three layers:
- **Anticipation:** 50–150 ms, for example a squash before a hit or a glow build-up.
- **Impact:** a burst, light, sound, a 40–80 ms hit-stop on big moments only.
- **Afterglow:** sparkles drifting, a ring fading, a number floating.

### 6.2 Per interaction

| Interaction | Effect |
|---|---|
| Pickaxe hit | Squash on the hero, crystal sparkle, a rock dust puff, shards hopping to the pile, a tick |
| Perfect Strike (glint) | A star-shaped flash, a ring shockwave, 3× shards, a rising chime, a tiny hit-stop |
| Drill / laser | Spinning bit or beam, a heat glow at the contact point, a spark stream, glowing cut lines that cool |
| Chunk lands on a stack | A squash-and-settle bounce, a glint |
| Polishing | A spark fan; the gem pops out with a twinkle and a pitch-up chime |
| Sale | A coin and bill arc to the pile, a "+$" float, a happy bubble, a heart |
| Order served | A heart burst, a sticker flies into the album icon (the icon bounces), the tourist kid jumps |
| Cash collect | A stream of bills flying to the hero's back, with a climbing tick |
| Paying a pad | Bills arc in, a green fill sweeps up, the pad pulses on each payment |
| Unlock | A ground shockwave, a soft light column, confetti, the new object rises with an overshoot, a showcase, an icon banner |
| Egg hatch | The egg wobbles faster, cracks with light leaking out, bursts, the critter's reveal pose with a spotlight, a name jingle, a rarity aura |
| Crystal Rush | The meteor flares, a golden tint eases in, chunks rain, coins fizz out of the ground, a sting and a faster music stem |
| Finale | Cracks race over the shell, the shell falls in slow motion, god rays, the heart rises, a legendary hatch, gem rain, fireworks per district |
| Hand-off | The comet streaks across with a shimmering tail, a star burst on the map icon |
| Idle hint (no input for 6 s) | The goal arrow bounces bigger, and a critter runs to the target and waves |

### 6.3 Transitions and UI motion
- **Tween and spring kit:** every number counts up like an odometer. Panels spring in with a slight overshoot.
  Icons bounce when something reaches them.
- **Chapter change:** an iris wipe in the shape of a gem, a ribbon title card with a hand-drawn chapter icon, and the
  new place assembling with pieces dropping in.
- **Showcases:** the letterbox eases in and out over 0.25 s, and the banner slides in with a bounce.
- **Album and map:** a book-opening animation and page flips; stickers peel and stick.
- **Pads:** they pop up out of the ground with dust, then breathe gently while waiting.
- **Squash-and-stretch rules:** a scale budget of ±15% on hits, ±8% on idle breathing. Items always land with a
  settle.

### 6.4 Effect budgets
- All particles come from pooled InstancedMeshes or one GPU point system, with a fixed count per tier. Nothing is
  allocated in play.
- At most 1 big effect (shockwave plus light column) at a time. Further ones queue for 0.3 s so the screen never
  turns to white noise.

## 7. Audio

- **Adaptive music (4 stems of one generated piece, made with Astrocade `generate_music` and cut into loops):**
  - Base groove: guitar and light percussion.
  - Chimes join after unlock 3.
  - Strings and bass join after unlock 8.
  - The dusk/night layer takes over from unlock 11.
  - Crystal Rush raises the tempo-feel with an extra percussion stem.
  - Stems cross-fade over 2 s. The ♫ toggle mutes only the music.
- **SFX** (made in code with WebAudio, plus a few generated ones):
  - Pickaxe tink, drill whir and laser hum (pitched to speed).
  - Polisher zing, gem chime on a pentatonic ladder (never off-key).
  - Coin ticks that climb while collecting; a pad fill swell.
  - Unlock fanfares in 3 sizes; an egg wobble, crack and per-rarity jingle.
  - Critter chirps, crowd cheer, bus horn, cable car clank, the crash rumble, the finale crack and choir pad,
    fireworks.
- **Voice-like barks (P1):** short gibberish "yay!" and "ooh!" from the mayor and critters, so meaning comes without
  text.
- **Kid and parent comfort:**
  - ±8% pitch randomisation on repeats.
  - At most 1 tick per 35 ms.
  - Big sounds are limited to 1 every 2 s.
  - The master level sits under the platform's usual loudness.
  - Audio starts on the first gesture and pauses when the page is hidden.
  - The feed preview is muted, so the opening must read without sound.

## 8. UI

- **Style:** a diegetic premium kit. Carved wood with brass trim and crystal insets, warm cards with soft inner
  shadows. No plain web buttons, no clutter.
- **HUD:**
  - Top-left: the cash counter with a coin icon (odometer count-up, bumps on collect).
  - Under it: a NEXT card made only of icons (the upgrade's icon, a fill bar, the coin amount).
  - The current district goal shows as a portrait plus 3 slots when one is active.
  - Top-right: small ♫ and ↻ buttons.
  - Bottom corners: the album book and the chapter map. Each gets a badge dot when there is something new.
- **In world:** the mining circle, pickup rings, price pads (icon, price, fill), a bouncing goal arrow, a chevron
  trail to an affordable pad, a "MAX" tag, glints, order bubbles, egg markers.
- **Banners:** icon-first (a big icon plus at most 3 words), shown up to 2 s, in a fixed place that never covers the
  hero.
- **Screens:**
  - The CONTINUE / NEW GAME card (stars, critters, chapter).
  - The album, with silhouettes for unfound stickers.
  - The chapter map (1 lit, 2 glowing "new", 3 locked with a "?").
  - The celebration card.
  - A loading state that stays until the restored scene has drawn.
- **7 languages, including Arabic:** one string table, and layout mirroring where it matters (UI only, not the
  world).
- **Readability:** text has outlines and sits on dark plates. A contrast check runs on every evidence screenshot
  (`contrast.js`).

## 9. Performance plan (stable 60 FPS on mid-range phones, playable on cheap ones)

- **Budgets per tier (tier 2 = mid phone):** ≤ 120 draw calls, ≤ 350K triangles, ≤ 60 live textures, ≤ 150 MB GPU
  memory, 1 shadow-casting light at 1024², pixel ratio ≤ 1.5.
- **Instancing and pooling:** the crowd (≤ 300), critters (≤ 24 on screen, skinned, with animation LOD: idle
  critters update at half rate), bills, chunks, gems, rings, crowns, shards, sparks, dust, confetti and fireworks.
- **Geometry:** static districts are merged per material when built. Districts that are off-screen during a chapter
  are hidden. The meteor shadow comes from a proxy.
- **Shared kit:** one material per palette role, a vertex-colour atlas for props, one gem material with instance
  colour, one env map (128 px, baked once).
- **Lighting:** a single sun with a shadow. Lamps are glow sprites plus ground decals, not real lights.
- **Adaptive quality, 4 tiers (tuning in `config.js`):** picked at start and dropped live when the frame time stays
  above budget. Tier 0 always holds 60.
  - Tier 3: selective bloom, ACES and grade, soft shadows, heat haze, full crowd.
  - Tier 2: no heat haze, lower pixel ratio.
  - Tier 1: no bloom pass (emissive does the job), shadow every 2nd frame, 70% crowd.
  - Tier 0: pixel ratio 1.0, no shadow map (contact discs remain), half crowd, fewer particles.
- **Ambient occlusion:** contact-shadow discs plus baked vertex AO. No real-time SSAO on phones.
- **Canvas textures:** a fixed pool; floating text on one atlas; pads redraw in place (fix B).
- **Robustness:**
  - WebGL context-loss recovery: rebuild from the current state.
  - `run()` may be called more than once.
  - Edit mode draws a live scene with no input and no save.
  - `console.error` is reserved for real faults.

## 10. Test plan

**Automated (in CI):**
- `logic.js` is pure (no three.js): the economy, stacks, unlock order, prices, orders, egg rolls with the pity
  counter, Rush timing, chapter flow and the guide's target choice. Unit tests (`logic.test.mjs`) check:
  - The guide never points at a target that accepts nothing (fix A).
  - Every egg roll stays within the fixed odds, and the pity counter works.
  - Save → load round-trips through chapter boundaries.
  - A full headless simulation of chapters 1 (and 2) finishes with no stall over 20 s, and with every wait under
    30 s.
  - A **session pacing check:** a "reward event" (unlock, hatch, order, Rush, bus) happens at least every 45 s
    across the whole run.
- **Bot playthrough** (Playwright, `?bot`, deterministic `__step`):
  - Plays from the crash through the chapter 2 hand-off.
  - Records the time of each unlock against §4.2.
  - Fails on a page error, a stall, or more than 60 live textures (fix B).
  - Saves one screenshot per unlock and per event.
- **The repo's audit order** (ASTROCADE.md §5): `playtest.js` (full flow, random input, edit mode, `run()` twice,
  late/failed/corrupt saves, second finger, 7 languages), `soak.js` (leaks), `ci-checks.sh`, the bundle test, and
  one fresh bug hunter.

**By play and screenshots (retained in `production/qa/evidence/meteor-gem-works/`):**
- Every screen and event: opening, first strike, first hatch, order, Rush, each district, dusk, finale, hand-off,
  album, map, CONTINUE card, Arabic layout.
- Glare and contrast checks pass on all of them (§5.6).
- A **no-text check:** play with the language set to one the tester can't read. Is every step still clear?
- 60 FPS at a mobile viewport (390×844), from a real GPU: the owner's phone or the Astrocade draft analytics showing
  "Optimal". SwiftShader numbers are not FPS evidence.
- **A kid playtest if possible (recommended, the owner's choice):** watch one child play for 10 minutes without
  helping, and note where they stop, look lost or smile.

## 11. Fixes for the two Giant Salami Saw flaws

**A. The guide never dead-ends.**
- The guide only picks a target that can accept something now. Otherwise it points to the cash, an order or the
  next pad.
- Stations never block: an overflow crate takes extra chunks for a small payment.
- Tested by a unit test and the stall check.

**B. No texture leak.**
- Pooled sprites on one text atlas, and pads redraw in place.
- The bot run fails if live textures exceed 60.

## 12. Milestones

| # | Milestone | Done means |
|---|---|---|
| M1 | **Visual sample** (look approval) | Crater square at noon and a dusk variant; the meteor with the carve shader and glow; the hero mining with a glint strike; 1 polisher and stand with tourists; one egg hatch with one critter; the gem material; the HUD frame; tone map and grade; selective bloom; glare and contrast checks passing. Screenshots go to the owner. **Her yes on the look is needed before M2.** Tier 0 holds 60 at a mobile viewport. |
| M2 | **Core loop, unlocks 1–7** | Mine, polish, sell and pay; glints; orders; eggs with the first 6 critters; Rush; the bus; the guide (fix A); save/continue; `logic.js` and its tests. Bot reaches unlock 7 by ~3:30, with a reward event at least every 45 s. |
| M3 | **Chapter 1 complete** | Unlocks 8–14, ghost town goal, the day-to-night curve, 12 critters, album, hats, town stars, finale and the hand-off into chapter 2 (at least the comet and the map). Adaptive music stems. Bot finishes chapter 1 in ~9–10 min with no stall and no texture leak (fix B). |
| M4 | **Polish and first upload** | All VFX, transitions and SFX from §6–7, 7 languages with the Arabic layout, 4 tiers tuned, the full audit (§10), evidence retained, a 60 FPS check. Then upload as an Astrocade draft with `/astrocade-ship`. It is not published; the owner sets the thumbnail. |
| M5 | **Chapter 2, "The Frost Comet"** (P1) | Ships in the first upload if M1–M4 land on time; otherwise as **named update 1**. A named update gives a second test on the platform (ASTROCADE.md §2). |
| M6 | **Chapter 3 "Lava Meteor", more critters and hats** (P2) | Named update 2. |

**Build rules:**
- Code lives in `prototypes/meteor-gem-works/`.
- Three.js is vendored for local play. The Astrocade upload set follows the platform's multi-file rules
  (ASTROCADE.md §4).
- All tuning values are in `config.js`.
- Commits reference this plan.

## 13. Priority list (everything new in v2)

| Priority | Item |
|---|---|
| **P0** | Interactive 3 s cold open with a skip on any tap · glints and Perfect Strike · orders (no timer) · critter eggs every 60–90 s with 12 critters, pity counter and parade perks · Crystal Rush · bus waves · day-to-night curve · finale → chapter 2 hand-off (no end-card exit) · album · chapter map · town stars · 6 hats · icon-first HUD and banners · no angry faces · adaptive music stems · glare and contrast budget · tween/spring kit and transitions · living-world loop (§5.7 P0 items) · 7 languages + Arabic layout · fixes A and B |
| **P1** | Chapter 2 Frost Comet · polisher tap-boost · welcome-back gift · voice-like barks · birds and townsfolk vignettes · small surprises (puppy, hat, tumbleweed) · `lib.share` town card |
| **P2** | Chapter 3 Lava Meteor · more critters and hats · seasonal decorations as named updates |

## 14. What you might not know you don't know

1. **The first 30 seconds decide whether the game lives.** Astrocade counts a "significant play" from 30 s, and our
   own data shows the pass line is about 80% significant plus "Optimal" FPS. That is why the plan hands over control
   by 3 s, makes the first hit by 5 s and the first unlock by 25 s, and keeps the cold open skippable.
2. **The feed preview is silent and runs before any touch.** The opening must look like play and read without
   sound. A tap anywhere in the preview starts play.
3. **End screens cause exits.** A "you won" card in the middle of a session is the most common place a kid leaves.
   v2 replaces it with a hand-off into the next chapter.
4. **Kids replay for collection and surprise, not for numbers.** Critters, silhouettes in an album and eggs with a
   reveal hold kids much longer than a bigger cash total.
5. **Negative signals stick with kids.** Red angry faces, "you lost" moments and timers reduce play time for young
   players. v2 removes all of them.
6. **Glare is a measurable bug, not a taste question.** Bloom that looks fine on a laptop washes out on a cheap phone
   screen. v2 measures it on every screenshot.
7. **About a quarter of the audience reads Arabic.** Icon-first UI and a right-to-left layout matter more than
   translating long text.
8. **Cheap Android phones are common among kids.** The tier 0 floor and context-loss recovery are not optional.
9. **Named updates are a second chance.** A game that stalls can get a new test on the platform after an update,
   which is why chapter 2 is planned as an update if it doesn't fit the first upload.
10. **Ethics are a design rule.** No pay-to-win, no fear of missing out, generous fixed odds: this keeps the game
    safe for kids and keeps parents happy.
11. **Haptics don't exist on the web version of the platform.** All "feel" must come from sight and sound.
12. **Scope is the main risk.** The P0/P1/P2 split and the M1 look approval are there so the first upload ships with a
    complete, polished chapter instead of two half-finished ones.

## 15. Distribution fit (added 2026-11-25, from `docs/astrocade-distribution-playbook.md`)

The ranker scores a game on day-0 strangers: share of sessions over 90 s, second plays and returns, with session
length weighted five times more than click rate. Theme rows need p50 ≥ 40 s and p75 ≥ 75 s. These changes fold
that into M2–M4 without adding complexity to play.

### 15.1 Hook-dense first 40 s (timeline test, playbook §9)

- **Act within 1 s.** Any touch or key during the cold open skips it and hands over control at once; the drag that
  skipped it already walks the hero. No start menu for a new player; the CONTINUE card shows only with a save.
- **First tap in the muted preview does something visible:** the skip snaps the camera in with a dust puff.
- **Reward beats at about 10, 20, 30 and 40 s**, checked by the bot test: first hit and chunks (≤ 5 s), first gem
  (≤ 12 s), first sale with flying coins (≤ 20 s), Drill Rig unlock (≤ 25 s), first egg hatch (≤ 40 s).
- No result card, menu or loss before second 60, ever.

### 15.2 Replay and return hooks

- **Second play:** save/continue (M2) puts a returning kid back in their own town in one tap.
- **Return reasons:** eggs on a timer with silhouettes in the album (M3), town stars and hats (M3), the
  welcome-back gift (P1 → M3 stretch).
- **Share at the peak:** `lib.share` with a canvas image of the town at a new critter, the laser unlock and the
  chapter finale. Moved from P1 to M3 P0. Optional capability; nothing breaks when it is missing.

### 15.3 Target theme row: **incremental** (secondary: simulation)

- The game is "number goes up": coins, price pads, helpers that work on their own. No fail state, no timer, no
  leaderboard.
- Not Toys: it has currency and upgrades, which the Toys definition excludes. We don't fight that.
- Title, description and mechanics must all say "build up and earn". No combat words, no score to beat.

### 15.4 Post-launch updates (the update boost halves every 3 days, only in the first 30 days)

Have all three ready before first publish:

1. **Day 3:** 6 more critters and 3 hats (album fills further).
2. **Day 6:** Chapter 2 "The Frost Comet" (M5).
3. **Day 9:** a seasonal decoration set and the welcome-back gift tuned from real session data.

### 15.5 Listing text (English, game-only, no workflow or brand words)

- **Title:** "Meteor Gems" (11 characters). The in-game title card keeps "METEOR GEM WORKS". Check the title against
  the live feed for echoes before upload.
- **Description (124 characters):** "Mine, polish, sell & build! Dig glowing gems from a fallen meteor, hatch cute crystal
  pets and grow a sparkling desert town."
- The upload set is built with `tools/astrocade-upload-set.sh`, which strips repo and workflow mentions from code
  comments and fails on workflow words.

### 15.6 Milestone changes

- **M2:** adds the "act within 1 s" skip rule and the 10/20/30/40 s reward checks to the bot test.
- **M3:** adds `lib.share` at peak moments (P0) and the day-3 critter/hat drop content.
- **M4:** adds the playbook's pre-publish checklist (§10) as part of done.
