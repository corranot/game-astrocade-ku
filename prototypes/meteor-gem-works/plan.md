# Meteor Gem Works — game plan

**Status:** waiting for the owner's approval. No code is written until she says yes (CLAUDE.md, Plan Before
Building). **Date:** 2026-11-25. **Chosen:** option 1 of
`production/market/2026-11-25-next-game/recommendation.md` (owner's pick, 2026-11-25).

**Evidence:** astrotopper snapshot `production/market/2026-11-25T1244/`. Daily plays are not exposed, so the proxy is
7-day and 30-day gain. One creator's four 3D arcade idle tycoons total about 3.6M plays: Giant Salami Factory, Frozen
Harbor, Harpoon Harbor and Giant Salami Saw. The teardown is
`production/market/competitors/01M7B4YM0Q5XFDCXS4CXG8Y74X/analysis.md`. We share the genre and its mechanics. The
theme, world, product chain, story and every asset are our own.

---

## 1. Concept

- **Pitch:** a giant glowing crystal meteor crashes into a sleepy desert canyon town. You cut it open, polish its
  crystals into jewels, sell them to the tourists who flock in to see it, and rebuild the town around the crater.
  At the end you reach the meteor's heart.
- **Fantasy:** "I turned a disaster into the most famous town in the desert." Everything starts with one person, a
  pickaxe and a rock the size of a house. You end up running a glowing, buzzing gem town at night.
- **Audience:** casual mobile players of all ages, portrait phone, one finger, in 7 languages. No reading is needed
  to play.
- **Session:** about 10–12 minutes to the finale for a first-time player. After that, free play.
- **Hook in one image:** a tiny worker next to a cracked meteor that glows from inside, with a crowd at the crater
  rim.

## 2. Core loop

**Every few seconds:**
1. Stand in the mining circle and the hero swings a pickaxe. Crystal chunks break off the meteor and hop onto the
   chunk pile.
2. Walk over the pile to pick up a stack of chunks (up to 20, carried in front of the chest).
3. Drop them at a polishing wheel. 3 chunks make 1 cut gem, which slides onto the display counter.
4. Take the gems to the display stands. Tourists queue, buy, and leave cash.
5. Walk over the cash to collect it. Stand on a price pad and the money flows into it. A full pad unlocks the upgrade.

**Every minute:**
- A new unlock appears about every 15–35 s. Each one adds a **new kind of thing**, not just a bigger number:
  automation (a drill rig, a conveyor, a shopkeeper), a new product (rings, crowns), a new district (ghost town, sky
  deck), or a story beat (the road is repaired, the tour bus arrives).
- Every unlock does the same short sequence: a camera showcase move, a one-line banner saying what it does, and a
  burst of light and sound. After that, control comes back to the player at once.
- Helpers take over the earlier steps, so the player's job moves up the chain: from mining, to carrying, to selling,
  to only collecting cash and building.

**Rules that keep it easy:** no fail state, no timer, no lives, no way to lose money. Prices are small and the
unlock order is fixed. Stations never jam (see §11, fix A).

## 3. Controls

| Action | Touch | Keyboard / mouse |
|---|---|---|
| Move | Drag anywhere: a floating joystick appears under the finger | WASD or arrow keys |
| Mine | Stand in the mining circle (automatic swing) | Same |
| Pick up / drop / collect / pay | Walk onto the pile, station, cash or pad (automatic) | Same |
| Music on/off | ♫ button | Same, or M |
| New game | ↻ button, tap twice to confirm | Same |
| Continue after the finale | "Keep playing" button | Same, or Enter |

- There are no other buttons. Every interaction is "walk there".
- The first touch hint is a drag ring with an animated dot and the label "DRAG TO MOVE". It disappears on the first
  move.
- Haptics: a short pulse on each unlock and on the finale crack, through `lib` haptics if the platform has them, or
  `navigator.vibrate`. Both are optional.

## 4. Progression

**Opening (0–5 s), cinematic and skippable on a returning save:** a streak in the sky becomes a fireball. It
crosses the canyon, clips the old road bridge (planks fly) and slams into the town square. The crater blows a ring
of dust, the camera shakes, and townsfolk run with "!" bubbles. Banner: "A GIANT METEOR!" Then: "STAND IN THE CIRCLE
TO MINE IT!"

**Unlocks** (fixed order; prices are first-draft values in `config.js`, to be tuned by the bot run):

| # | Unlock | Price | What is new | Target time |
|---|---|---|---|---|
| 1 | Drill Rig | $25 | A robot drill arm mines for you; a second wound opens in the meteor | 0:25 |
| 2 | Chunk Conveyor + Polisher 2 | $80 | Chunks ride to the wheels by themselves | 0:55 |
| 3 | Display Stand 2 + Lantern Rope | $100 | More buyers; the crater rim lights up | 1:20 |
| 4 | Hire Shopkeeper | $130 | Gems go to the stands by themselves | 1:40 |
| 5 | Repair the Canyon Road | $180 | Townsfolk you served rebuild the bridge; the first tour bus arrives | 2:10 |
| 6 | Ring Workshop | $210 | New product: gem + silver = ring, sold at a kiosk to bus tourists | 2:45 |
| 7 | Laser Cutter | $240 | The drill becomes a triple laser: wider cuts, more chunks | 3:20 |
| 8 | Mine Cart Line + Ghost Town | $270 | A cart runs gems to the old ghost town; one building comes back to life per delivery | 4:00 |
| 9 | Drill Rig 2 | $300 | Second arm on the far side; it feeds the ring workshop | 4:40 |
| 10 | Canyon Cable Car | $320 | Grand upgrade of the road: twice the tourists | 5:30 |
| 11 | Stargazer Deck | $360 | Observatory and loungers on the rim; tourists stay into the evening | 6:30 |
| 12 | Crown Jeweler | $420 | New product: crowns, carried by the cable car to a museum | 7:30 |
| 13 | Neon Main Street | $480 | Signs and street lamps light up one by one at dusk | 8:40 |
| 14 | The Grand Unveiling | $560 | Finale | ~10:00 |

**Day to night:** the sky moves from bright noon (unlock 1) through golden hour (8–11) to blue dusk (12–13). The
finale happens at night. The meteor's glow, the lamps and the neon get stronger as the light falls, so the game
looks better the further you get. This is the visual reward for progress.

**Difficulty curve:** there is no challenge curve; the pace is the curve. The next pad is always visible with its
price and a fill bar. Income grows with each automation unlock, so the wait between unlocks stays at about 15–40 s.
The bot run (§10) checks it.

**Finale, The Grand Unveiling (~18 s):** all lasers fire at once. The meteor shell cracks along its wounds and
falls open, revealing a giant heart gem that rises and glows. Gems rain on the stands. Fireworks go up over each
district while the camera tours them with name banners. End card: "TOWN SAVED!" with gems cut, rings, crowns,
tourists and bus trips, then KEEP PLAYING. Free play goes on afterwards: the heart gem keeps spinning and the stands
keep selling.

**Save:** progress saves through `lib.saveUserGameState`. A returning player gets a CONTINUE / NEW GAME card with
"N / 14 upgrades built".

## 5. Art and 3D direction (Game Quality Standard)

- **Style:** polished, toy-like stylised 3D. Rounded chunky shapes, readable silhouettes, and soft materials with a
  little roughness variation. No bare primitives: every prop gets bevels, trims and a second detail (for example, a
  water tower has planks, bands, a ladder and a dripping tap).
- **Palette:** three colour families, each with one meaning.
  - **World:** warm desert. Terracotta cliffs, sand, sun-bleached wood, sage plants.
  - **Meteor and gems:** cool magenta to cyan crystal, the only cool and glowing colour in the scene, so the eye
    always finds it.
  - **Machines:** mint-teal steel with brass details.
  - **People:** the crowd wears bright sun hats and ponchos in a small set of accent colours.
- **The meteor (hero object):** a charred, cratered rock shell over a faceted crystal interior.
  - Cutting is persistent. A cut-field texture over the meteor's surface stores the depth of every cut. The vertex
    shader pushes the shell inward by that depth, and the fragment shader blends from rock to an emissive, faceted
    crystal with a pale rim.
  - The more you cut, the more it glows.
  - Instanced crystal shards also break off and fall into the crater.
  - A low-poly proxy casts the shadow.
- **Characters:** skinned, rigged low-poly people (CC0 or our own; the source and license are recorded) in several
  outfits: the hero prospector with a hat and scarf, workers, a shopkeeper, tourists with cameras, a bus driver.
  They have animation states for walk, run, carry, idle, cheer and mine. The crowd is instanced: up to 300 people as
  body + head InstancedMeshes, vertex-coloured, with bobbing and cheering.
- **Environments:** the crater square, a wooden boardwalk shop deck, the canyon road and bridge, the ghost town (6
  buildings that come back to life), the cable car line, the stargazer deck and Main Street. There are canyon walls
  and mesas in the background layers. Every district has small props: cacti, barrels, windmills, bunting, signs and
  carts.
- **Lighting:** one sun with soft shadows that follow the camera, hemisphere fill, and warm bounce. Its colour and
  angle follow the day-to-night timeline. Dusk adds pooled lamp lights: fake point lights (additive ground decals
  plus glow sprites) instead of real lights.
- **Camera:** a fixed 3/4 view, portrait-framed, with the meteor on a diagonal at the top. It follows the hero
  smoothly. Showcase moves are short (2–3 s) eased pans and zoom-outs. Camera shake on the crash, on unlocks and on
  the finale. A slight zoom-out as the town grows.
- **Atmosphere:** heat haze over the sand at noon (a subtle screen-space shimmer on tier 3 only), dust devils,
  tumbleweeds, drifting sparkles near the meteor, and fireflies at dusk.

## 6. VFX (per interaction)

| Interaction | Effect |
|---|---|
| Pickaxe hit | Crystal sparkle burst, rock dust puff, a small shard that hops to the pile, a tick sound |
| Drill or laser cutting | Spinning bit or beam with a heat glow at the contact point, a continuous spark stream, shards arcing out, a cut line that glows and then cools |
| Chunk lands on pile or stack | Squash-and-settle bounce, a faint glint |
| Polishing wheel | Sparks in a fan, a gem pops out with a star glint and a rising chime |
| Sale | Coin and bill arc to the cash pile; "+$" floats up; a happy bubble over the buyer |
| Cash collect | A stream of bills flies to the hero's back stack, with a pitched tick that climbs |
| Paying a pad | Bills arc into the pad, a green fill sweeps up, and the pad pulses on each payment |
| Unlock | Shockwave ring on the ground, a column of light, confetti and sparkle, the new object rises with an overshoot tween, camera showcase, banner |
| Customer waits too long | Their gem bubble turns to an impatient face after 9 s. It is only a hint: nothing is lost |
| Crash (opening) | Fireball trail, ground shockwave, debris and planks, dust ring, panic bubbles, screen shake |
| Finale | Crack lines spread over the meteor, shell pieces fall away with dust, the heart gem rises with god rays and bloom, gem rain, fireworks over each district |
| World alive | Windmills turn, bunting flaps, cart wheels spin, crowd idles and cheers, dust devils pass, smoke curls from the bus, lamps flicker on in order |

All particles come from pooled InstancedMeshes or one GPU point system. Nothing is allocated during play.

## 7. Audio

- **Music:** one generated loop (Astrocade `generate_music`): a warm desert-western groove with guitar, light
  percussion and glassy chimes, mid tempo, not busy. A dusk variant or a softer mix plays from unlock 12. It is
  quiet under the SFX, and there is a ♫ toggle that mutes only the music.
- **SFX:** made in code (WebAudio), plus a few generated ones:
  - Pickaxe tink, drill whir and laser hum (pitched to speed), polishing wheel zing, gem chime on a pentatonic
    ladder.
  - Coin ticks that climb in pitch while collecting, a pad fill swell, an unlock fanfare (short, 3 sizes), a crowd
    cheer, a bus horn, a cable car clank, the crash boom and rumble, the finale crack and choir pad, fireworks.
- **Mix rules:** a limit of 1 tick per 35 ms so streams don't clip. Audio starts on the first gesture and pauses
  when the page is hidden.

## 8. UI

- **HUD:** a cash pill (top-left) with a 3D-styled bill icon that bumps on each collect. A NEXT card under it shows
  the upgrade name, a fill bar and "$have / $price". The ♫ and ↻ buttons are small and translucent in the top-right
  corners, away from the thumb.
- **In world:** mining circle, pickup rings, price pads (icon, price, level tag, fill), a bouncing arrow over the
  current goal, an animated chevron trail on the floor to an affordable pad, and a "MAX" tag over a full stack.
- **Banners:** a one-line pill at about 15% from the top, at most 2 s, saying what the unlock does.
- **Screens:** CONTINUE / NEW GAME card (returning players only), the end card, and a loading state that stays up
  until the restored scene has drawn. There is no title screen and no settings page.
- **Style:** rounded, chunky, warm cards with a soft inner shadow and a brass edge, matching the game's palette. No
  plain web buttons and no clutter.
- **7 languages:** banners, NEXT names and the end card all come from one string table.

## 9. Performance plan (stable 60 FPS on mid-range phones)

- **Budgets (tier 2, a mid phone):** ≤ 120 draw calls, ≤ 350K triangles, ≤ 60 live textures, 1 shadow-casting light
  at 1024², pixel ratio ≤ 1.5.
- **Instancing and pooling:** crowd, bills, chunks, gems, rings, crowns, shards, sparks, dust and confetti all use
  fixed-size InstancedMeshes with ring-buffer pools.
- **Geometry:** static districts are merged into one mesh per material when they are built, and the meteor's shadow
  comes from a proxy.
- **Materials:** a shared material set (one per palette role) and a vertex-colour atlas for props.
- **Lighting:** dusk lamps are glow sprites and ground decals, not real lights.
- **Adaptive quality (4 tiers, tuning in `config.js`):** the tier is picked at start from the device and dropped live
  when the average frame time stays above budget. Tier 0 is a safe floor that always holds 60.
  - Tier 3: glow/bloom pass (bright things only: meteor crystal, gems, lasers, neon), ACES tone mapping and a
    colour grade, soft shadows, heat haze.
  - Tier 2: the same without heat haze, at a lower pixel ratio.
  - Tier 1: no bloom pass (emissive colours do the job), shadow map updated every 2nd frame.
  - Tier 0: pixel ratio 1.0, no shadows (contact-shadow discs remain), half the crowd.
- **Ambient occlusion:** contact-shadow discs under props and people, plus baked vertex AO on merged districts. No
  real-time SSAO on phones.
- **Canvas textures:** a fixed pool. Floating texts use one shared atlas and pooled sprites, and price pads redraw
  their own canvas in place. Nothing is created per event (see §11, fix B).

## 10. Test plan

**Automated (Node tests, run in CI):**
- `logic.js` is pure and has no three.js. It holds the economy, stacks, unlock order, prices, conversion rates,
  helper behaviour and the guide's target choice. Unit tests (`logic.test.mjs`) cover:
  - Prices and order.
  - 3 chunks make 1 gem, and gem + silver make a ring.
  - Stacks respect their capacity.
  - The guide never returns a target that accepts nothing (fix A).
  - Save → load round-trips to the same state.
  - A full simulated run reaches the finale with no stall longer than 20 s (headless, no rendering).
- A bot playthrough (Playwright, `?bot`, deterministic `__step`):
  - Plays from crash to end card.
  - Records the time of each unlock against the targets in §4.
  - Fails on any page error, any stall, or more than 60 live textures (fix B).
  - Saves one screenshot per unlock.
- Repo checks: syntax, JSON, "THREE at import", upload set (`tools/ci-checks.sh`), plus the Astrocade bundle test.

**By play and screenshots (retained in `production/qa/evidence/meteor-gem-works/`):**
- One screenshot per milestone screen: opening crash, first sale, each district, dusk Main Street, finale, end card,
  CONTINUE card.
- A 60 FPS check at a mobile viewport (390×844): frame time from a real GPU run (the owner's phone or the Astrocade
  draft analytics showing "Optimal"). SwiftShader numbers from CI are not used as FPS evidence.
- A feel check:
  - Does the first unlock land within 30 s?
  - Does every unlock read without text?
  - Is the bloom tasteful, with gameplay still readable?

## 11. Fixes for the two Giant Salami Saw flaws

**A. The guide never dead-ends.** In the Saw, the guide sends a player who holds a stack that no station can take
back to the pile, which is a step that does nothing (the bot was stuck for about 7 minutes).
- Our guide only picks a target that can accept something now.
- If nothing can, it points to the cash or to the next pad.
- Stations never block: when the polishers are full, an "overflow crate" next to the pile takes raw chunks and pays a
  small amount, so carrying is never wasted.
- Tested by the unit test and the full-run stall check (§10).

**B. No texture leak.** The Saw makes a new canvas texture for every floating text and keeps them (1,000 textures in
memory at the end).
- We use pooled sprites on one text atlas and redraw pads in place.
- The bot run fails if live textures exceed 60.

Other Saw lessons we keep: the 5 s cold open, the persistent carve shader, a new kind of unlock every 15–35 s with a
showcase, a finale with an end card, a save that replays unlocks and never overwrites an unreadable save, and a bot
driven by the same function as the player's guide.

## 12. Milestones

| # | Milestone | Done means |
|---|---|---|
| M1 | **Visual sample** | Crater square, meteor with the carve shader and glow, the hero mining, the chunk pile, one polisher, one stand with tourists, the HUD, the look pass (tone map, grade, bloom on tier 3). Screenshots go to the owner for approval of the look **before** M2. Tier 0 runs at 60 on a mobile viewport. |
| M2 | **Core loop + unlocks 1–7** | The whole mine → polish → sell → pay loop. Drill, conveyor, stands, shopkeeper, road repair with the bus, ring workshop, laser. Guide (fix A), save/continue, `logic.js` with tests. Bot reaches unlock 7 within about 3:30. |
| M3 | **Whole game, unlocks 8–14** | Ghost town, rig 2, cable car, stargazer deck, crown jeweler, neon Main Street, the day-to-night timeline, the finale and end card, free play. Bot finishes in about 10–12 min with no stall. Texture budget holds (fix B). |
| M4 | **Polish and ship** | All VFX and SFX from §6–7, the generated music, 7 languages, 4 quality tiers tuned, evidence screenshots retained, a 60 FPS check, then upload as an Astrocade draft with `/astrocade-ship`. It is not published, and the owner makes the thumbnail. |

**Build rules:**
- Code lives in `prototypes/meteor-gem-works/`.
- Three.js and its add-ons are vendored (`.claude/scripts/vendor-three.sh`), and there are no network requests at
  run time.
- All tuning values are in `config.js`.
- Commits reference this plan.
