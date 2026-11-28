# Mow Mow Meadow: milestone log

Evidence lives in `production/qa/evidence/mow-mow-meadow/` (copies in the shared project files under `new-sim/m<N>/`).
Scores use the 10-category visual scorecard (1 to 3) from `threejs-aaa-graphics-builder`.

## M0 (28 Nov 2026): the cut

Go. Mask texture plus tiled instanced blades cut cleanly; Nilo sits on Buzzy on the chibi base.

## M1 (28 Nov 2026): the whole loop in gardens 1 and 2

What works: drive, cut, bales, coins, finds (friend, toy, hat, coins), stars at 90/97/100%, gate, finale bloom,
lane with three upgrade pads, garden 2 with flower beds, receipt, album, shop, save, FTUE steps, guide trail,
cinematic beats, seven languages (Arabic mirrored).

Checks run:

| Check | Result |
|---|---|
| `node --test prototypes/mow-mow-meadow/logic.test.mjs` | 12 of 12 pass (layout, cutting, stars, save, economy, reachability of every grass cell, gate reachable in all 12 gardens, languages) |
| `node tools/lint-game.mjs` and `bash tools/ci-checks.sh` | pass |
| `node tools/astrocade-bundle-test.js` | no errors, no fails; bundle 266 KB; starts in the feed, moves before touch, tap reaches the game |
| Bot run (path-planning bot, stepped) | garden 1: first bale 4 s, first find under 5 s, star 1 at 20 s, finale 25 s; in garden 2 by 30 s; a child is expected to take two to three times as long |
| `node tools/load-time.js` (4G, CPU x4, software GL) | library ready 0.45 s; game script about 1.2 s; first frame 3.6 to 4.2 s, of which about 2.5 s is software-GL shader work that a phone GPU does not pay. Real-phone number still to be measured |
| Render budget (software GL counts) | garden 1: 84k to 94k triangles, 40 to 45 draw calls; two gardens loaded: about 140k, 50 calls |
| HUD grid | 360x640, 390x844, 430x932, 768x1024 and Arabic: equal margins (16 px at 360), one height for pills and buttons, 8 px gaps; pad price labels hide under the button column |

Scorecard (active play, 390x844):

| Category | Score | Evidence |
|---|---|---|
| Art direction | 2.5 | one storybook palette across grass, kart, cottage, HUD paper |
| Hero | 2.5 | Nilo on the anatomical chibi rig, Buzzy with eyes, hopper, bonnet riders |
| Obstacles | 2 | beds, rocks, bushes read clearly; little variety until garden 3 |
| Rewards | 2.5 | bales, coin flight, find beats, gift box, pads with fill rings |
| World | 2 | cottage, fence, lane plaza, trees and wild flowers; far layers still plain |
| Materials | 2 | shared kit with vertex gradients; grass shader with stripes and roots |
| Lighting | 2 | sun plus hemisphere, soft shadow, no post yet |
| VFX and motion | 2 | clippings, dust, sparkles, rings, confetti, bloom wave; flowers of the bloom are flat |
| UI | 2.5 | paper HUD on the 8 px grid, album, shop, receipt |
| Performance evidence | 2 | counts above; no real-device FPS yet |

Average 2.2. Weakest and next: far background layers, bloom flowers, post (M4), real-device FPS.

Changes from the plan, with reasons:

- Camera: fov 46, pitch 52, distance 15 to 20 (the planned framing showed fogged far ground at the top of a portrait frame).
- Grass: 0.5 m tall (0.8 extra tall), blades in 6 m tiles with 50/90/140 blades per m2 by quality tier, instead of one global cap that left large gardens sparse.
- Districts: Clover Lane is gardens 1 to 6, Windmill Hill 7 to 9, Lantern Lake 10 to 12 (the plan's tables disagree; this follows sections 6.3 and 8). Parties after gardens 6 and 12.
- The lane between gardens is a 7.4 m plaza, so the three pads sit beside the path, never on it.
- Three.js comes from the CDN through an importmap (Astrocade bundles plain modules); tuning lives in `game_config.json`.
- The mower's collider is a 0.8 m circle centred on the body; props keep a mower-width from fences so no grass is out of reach.

## M2 (28 Nov 2026): M1 review fixes, garden toys, parties, daily garden

Evidence: `production/qa/evidence/mow-mow-meadow/m2-*.jpg` (two contact sheets and 14 frames).

M1 review fixes:

- Mow reveal: the mask stores a stripe tone per cut (light going north, dark going south), a soft sheen on cut
  grass, and the finale grooms the lawn into tidy 2.6 m stripes with five-petal flowers.
- Lighting: warmer key (2.3) and brighter fill (1.25), softer shadows; Windmill and Lantern palettes brightened
  (Lantern is a pink-lilac sunset, not a night).
- World beyond the fence: cottage, hedges and trees outside, village cottages and far trees, a laundry line that
  sways, butterflies and two birds.
- HUD: pad price labels carry the upgrade's icon and hide under the top rows, the button column and the side
  margins, so nothing overlaps or clips at 360 px; Arabic mirrors exactly.
- Camera: three-quarter follow (yaw 22, pitch 45, distance 13 to 17.5), stick input rotated to match.
- First frame: quality starts low for 8 frames, Nilo, outside scenery and wildlife build one job per frame after
  the first picture. 4G profile, software GL: first frame 1.73 to 1.81 s (was 3.6 to 4.2 s).
- Upgrade pads show an icon badge.

New in M2:

- Garden toys (`toys.js`): duckling parade from the pond, molehills that pop a toy, orchard apples, sheep that
  munch the edge, sprinklers that wet the grass (wet pays more), mushroom rings, fountain spray.
- District party after gardens 6 and 12: the district's neighbours dance on the lane under bunting, confetti,
  a camera beat and a one-time coin gift.
- Daily garden: one seeded garden per day from garden 2 onward, with its own neighbour and a three-star gift.
- Mower fit: 1.0 m collider, the deck springs narrower near fences and rocks, blades are cut under the body.
- Grass detail by distance: far tiles draw fewer blades.

| Check | Result |
|---|---|
| `node --test logic.test.mjs` | 13 pass (adds: every grass cell reachable, every garden's promised feature present) |
| `node tools/lint-game.mjs`, `bash tools/ci-checks.sh` | pass |
| `node tools/astrocade-bundle-test.js` | 296 KB, no failures |
| `node tools/load-time.js` (4G) | first frame 1.73 and 1.81 s |
| Render budget (software GL counts, middle tier) | 171k to 193k triangles at the start of gardens 6 and 9 (was 256k); 280k with a party on the lane; 470k for the 1.8 s three-star pull-back |
| Bot | gardens 2, 3, 6 finished to three stars; party fired after garden 6; daily garden entered and mown; gardens 7, 9, 11, 12 mown 30 s each with no error |

Scorecard (0 to 10 per frame, from the retained frames):

| Frame | Score | Note |
|---|---|---|
| First frame with spotlight, 360x640 | 7.5 | hero reads; the lane takes the lower half of the frame |
| Ducklings, garden 3 | 8 | cottage, pads, pond, parade, three-quarter hero |
| Receipt and finale, garden 2 | 8 | stripes, flowers, confetti, neat receipt |
| Finished garden | 8.5 | the prettiest frame, as asked |
| District party | 8 | neighbours, bunting, confetti |
| Windmill Hill | 7.5 | chequer pattern reads; palette still a little acid |
| Lantern Lake | 7.5 | bright now; trees still dark, lanterns and fireflies come in M3 |
| Daily garden | 8 | |
| HUD at 360, 390, 430, 768 and Arabic | 8.5 | one grid, equal margins, mirrored |
| Album and shop | 8 | |

Open, carried to M3 and M4: Windmill and Lantern art pass (below 8 today), selective bloom on flowers (no post
pass yet), the three-star pull-back triangle spike, real-device FPS.

## M3 (28 Nov 2026): M2 review fixes, districts 2 and 3, share and leaderboard

Evidence: `production/qa/evidence/mow-mow-meadow/m3-*.jpg` (three contact sheets and 11 frames).

M2 review fixes:

- First frame: a new player's Buzzy has already cut a 3 m stripe and turned to face the camera; the first
  spotlight dims the scene by 0.1 instead of 0.4. Bright from the first picture, both faces readable.
- Camera: follow yaw 38, pitch 42, so normal driving shows Buzzy and Nilo from the three-quarter side.
- Sheep tiles: sheep now munch a continuous strip with the same stripe tone and sheen as the mower's cut.
- Light: Lantern Lake grass, foliage and fog brightened to the warm look of the finished-garden frame. Found on
  the way: the meadow ground plane ended at z = -300, so gardens 11, 12 and the daily garden stood on bare fog
  colour; it now runs under all of them.
- No-clip sweep (`logic.test.mjs`): in every garden the mower is pushed 6,000 steps into fences, rocks, bushes,
  trees and the pond with the widest deck. 72,000 poses: body never closer than 0.25 m to a solid (0 clips),
  deck corners outside in 0 poses. To get there: the collider is 1.0 m, the gate gap fits the 0.75 m body, the
  deck sits closer to the body, springs narrower and slides back under the body near obstacles
  (`L.deckFit`). Neighbours step out of Buzzy's way and party guests stand beside the lane, outside where it
  can drive. Flower beds are driven over on purpose (the flowers bow). Houses, the mill and lamp posts stand
  outside the lane walls.

New in M3:

- Windmill Hill: a mill with turning sails beside the lane. Lantern Lake: lamp posts along the lane and the
  fence, fireflies around Buzzy.
- Share chip at the district party (only when the host offers sharing; title and text, no image).
- Leaderboard: lifetime square metres, sent quietly at each receipt.

| Check | Result |
|---|---|
| `node --test logic.test.mjs` | 14 pass |
| lint, `ci-checks.sh`, bundle test | pass; 301 KB, no failures |
| `node tools/load-time.js` (4G) | first frame 1.55 and 1.64 s |

Scorecard (0 to 10 per frame):

| Frame | Score | Note |
|---|---|---|
| First frame, 360x640 | 8.5 | bright, faces, stripe, cottage |
| Clover play (ducklings) | 8.5 | |
| Finished garden, party | 8.5 | guests beside the lane, share chip |
| Windmill play (sheep strip) | 8 | |
| Windmill lane | 8 | mill is at the frame edge; pads and faces read well |
| Lantern play | 8 | bright; fireflies are small square points |
| Lantern overview | 7.5 | lanterns are small at this distance |
| Daily garden | 8 | |
| HUD at four sizes and Arabic, album, shop | 8.5 | |

Open for M4: glow pass evidence (the bloom pass waits for 30 smooth frames and never switches on in software
GL), round fireflies, larger lanterns, the three-star pull-back triangle spike, a measured mid-phone FPS number,
the full 10-minute bot run.

## M4 (28 Nov 2026): M3 review fixes and the final package

Evidence: `production/qa/evidence/mow-mow-meadow/m4-*.jpg` (contact sheets for Clover, Windmill, Lantern and the
HUD, the daily garden, and 10 frames).

M3 review fixes:

- District identity, all from `game_config.json` (`districts[i]`): grass palette and blade height, fence, lane,
  houses and roofs, foliage, sky, sun and fill.
  - Clover Lane: morning, green lawn, white picket fence, coral roofs. Mechanics: ducklings, molehills, apples.
  - Windmill Hill: golden afternoon, tall wheat-gold grass that cuts to lime, open wooden rail fence, haystacks,
    the mill with turning sails. Mechanic: the sheep flock that mows beside Buzzy.
  - Lantern Lake: dusk, teal grass, plum fence, violet lane, large warm lanterns each with a pool of light,
    fireflies, Buzzy's headlamp on the grass. Mechanics: sprinklers and glowing mushroom rings.
  - Daily garden: a festival, pink-tipped grass that cuts to mint, blossom trees, bunting all along the fence.
- Stripes everywhere: the cut tone is crossed with 1.3 m mower lanes, so a single pass mid-garden already shows
  light and dark bands with sheen; the finale still combs them into wide tidy stripes.
- Camera: yaw 45, pitch 40 (an isometric three-quarter view). Mowing along any fence shows Buzzy and Nilo from
  the side, never straight from behind. HUD sheet re-shot from this build.
- Price chips sit above their own pad, lift above Nilo when the hero stands there, and keep an 8 px gap.
- During a far camera pull-back the grass thins (`lawn.wideMin`), so the three-star beat no longer spikes.

Final package:

| Check | Result |
|---|---|
| `node --test logic.test.mjs` | 14 pass |
| No-clip sweep | 72,000 poses in 12 gardens with the widest deck: body never closer than 0.15 m to a fence, rock, tree or pond; deck corners outside in 0 poses |
| lint, `ci-checks.sh` | pass |
| `node tools/astrocade-bundle-test.js` | 305 KB, no failures (includes the feed handover case) |
| `node tools/load-time.js` (4G) | first frame 1.59 and 1.90 s |
| Bot session (new save, path-planning bot, 14 min of game time) | no page error; first bale and first friend inside 12 s; garden 2 at 0.5 min, 3 at 1.2, 4 at 2.2, 5 at 3.7, 6 at 5.6, 7 at 7.9, 8 at 10.1, 9 at 12.5; still mowing garden 9 at 14 min with 3 gardens, the daily garden and every replay left. The bot drives perfect lanes without pausing; a child is expected to take two to three times as long |
| Game logic cost | 0.04 ms per step on this machine (0.16 ms at 4x CPU throttle) |
| Render counts (software GL) | middle tier 160k to 200k triangles, 35 to 50 draw calls; high tier 250k (Clover) to 390k (Lantern), 80 to 130 calls |

Not measured: frames per second on a phone GPU. This container renders in software (about 2 to 7 FPS at any
quality, which says nothing about a phone). A real number needs the game on a device: either a draft on
Astrocade opened on a phone or Chromebook, or the folder served to a phone. Until then the evidence is the
counts above and the adaptive quality tiers.

Scorecard (0 to 10 per frame):

| Frame | Score |
|---|---|
| First frame, 360x640 | 8.5 |
| Clover play, finished garden, party | 8.5 |
| Windmill play and lane | 8.5 |
| Lantern play | 8 |
| Lantern lane and pools | 8 |
| Daily garden | 8.5 |
| HUD at four sizes, Arabic, album, shop | 8.5 |

Honest list, still plain or unproven:

- Phone FPS is unmeasured (above).
- The glow pass (bloom on lanterns, sparkles and flowers) only switches on after 30 smooth frames, so no
  screenshot here shows it; it needs the same device check.
- Lantern lamp posts are bleached below the light pool; the pool is a flat overlay, not real light.
- The bot buys upgrades in a fixed order, so the economy late in the run (2,300 coins unspent at 14 min) is
  not tuned by play.
- No human child has played it yet; session length is projected from the bot.

Players' Choice estimate (formula: retention x 15 + share of sessions over 300 s x 10 + 0.033 x p50 + 0.01 x p75):
with the bot's pace doubled for a child, a session that plays District 1 runs 11 to 17 minutes. Taking a
cautious p50 of 300 s, p75 of 700 s, 45% of sessions over 300 s and 10% return: 1.5 + 4.5 + 9.9 + 7.0 = 22.9.
A weak case (p50 180, p75 420, 30%, 6%) gives 14.0; a strong case (p50 420, p75 900, 55%, 14%) gives 30.5.
These are projections, not player data.

Sign-off by discipline: Creative yes; Art yes (Lantern pools noted); Retention yes on projection; Audio
unchanged since M1 (no new stings for the district props); UX yes; QA yes for logic, no-clip, bundle and load,
open on phone FPS.

## M5 (28 Nov 2026): M4 review fixes and the private draft

Private draft created (not published, no thumbnail touched): game `01M8GVJ830TW5T0VFCA38YYH9C`, version
`01M8GVMW41X36GXT047D6WMG39`.

Review fixes:

- **Faces in the HUD sheet**: the follow camera was right (yaw 45); the capture harness drove straight away from it.
  The harness now drives toward the camera, and Nilo also glances toward the camera (`camera.glanceK`, `glanceMax`),
  holding his side when driving straight away so the head never flips.
- **Lantern**: brighter cut and stripe tones, and a soft glow under Buzzy (`comfort.heroGlowM`, `heroGlowK`) so the
  hero always reads in the tall teal grass.
- **Windmill**: stripe contrast raised to match Clover. Price chips are placed against Nilo's projected screen box
  and keep an 8 px gap from each other, so a chip never sits on the hero.
- **Arrow glyph**: it was the guide arrow; it is now a styled coral arrow with a cream outline that bobs, pointing
  from the hero to the goal.
- **Hidden FPS readout**: tap the progress bar five times within two seconds; a small chip at the bottom left shows
  `fps · low · q` (average, slowest recent, quality tier). Five taps again hides it.

Fresh-eyes bug hunt (fixed in this pass): the daily garden had no music key or tempo (sound broke there); a
mid-line comment swallowed the lawn's wind, push and stripe settings; a late save from an earlier day could bring
yesterday's daily stars into today; lane lamps and party guests overlapped the cottage and the neighbour in
Lantern; the finale posted the score twice; a find under a sheep's bite now reveals at once; the hero glow is
disposed on destroy. Left as is: the deck front can poke about 0.2 m through a closed gate.

Checks on the build pulled back from the draft: 17 files byte-identical to the upload set; bundle test 308 KB,
`fail []`, no errors, start 1.3 s; load time on 4G 1.70 and 1.94 s to playable (slow 4G 3.3 to 3.5 s); 14 unit tests
pass including the no-clip sweep; lint and CI checks pass.

Sheets: `production/qa/evidence/mow-mow-meadow/m5-sheet-*.jpg` and `/mnt/project-files/new-sim/m5/`.

Still open: phone FPS (to be read from the hidden readout on a real phone), the glow pass on real hardware, a child
playtest.

## M6 (28 Nov 2026): words on everything

The owner tried the private draft and found everything without text confusing. Every element now carries words,
in all seven languages (125 new strings each). Draft version `01M8H1VYAZKR6X5PGFS43JKZ8H`.

| Element | Before | Text added |
|---|---|---|
| Coin pill, progress pill | icon and number only | captions "Coins" and "Mown" |
| Sound, album, shop, skip buttons | icon only | captions "Sound", "Album", "Shop", "Skip" |
| What to do now | nothing | a goal line under the top row, always on |
| The three goals (90, 97, 100%) | three stars on the bar | goal line: "Mow 90% to open the gate", then "Mow 97% for 2 stars", "Mow 100% for 3 stars" |
| Gate | opens with a camera beat | "Gate open!" chip, then "Drive through the gate" |
| Tutorial steps | hand, ring and spotlight only | one sentence per step ("Drag to drive", "Drive over the tall grass", "Grab the bale for coins", "Find the hidden friend", "Drive through the gate", "Stop on the pad to upgrade", "Open your album") |
| Upgrade pads | icon and price | name and price ("Wide deck 150"); the goal line says "Stop on the pad to upgrade" |
| Upgrade bought | effects only | "Wide deck: level 3" chip |
| Friend, toy, hat found | toy count only | "New friend: Firefly", "Toy found: Duckie 8/36", "Golden toy: ...", "New hat: ..." |
| Flow ribbon, party, daily gift, share | icons | "Ribbon: Flow", "Garden party!", "Daily gift!", "Share" |
| Garden greeting | face and garden name | plus the district name (Clover Lane, Windmill Hill, Lantern Lake) |
| Receipt | icons, numbers | "Tip", "Ribbons", "Share" |
| Album and shop tabs | icons | a word under every tab |
| Album cells | pictures | a name under each friend, neighbour, toy and hat ("?" until found), and one line that says what a tap does |
| Ribbon cards | three ribbon icons | "Gentle", "Stripes", "Flow" |
| Upgrade cards | name, pips, price | effect and level ("Cuts wider · Level 2"), "Buy" or "Max" |
| Looks | swatches, a lock | "Opens at garden N", "On" on the one in use |
| Settings | five round icons | labelled switches ("Sound: On", "Calm mode: Off", "Tutorial") |

Left as pictures on purpose: colour swatches (their section has a name and a price), and the garden toys in the
world (sprinklers, sheep), which only react to play.

Layout: captions sit in a 24-unit band under the 80-unit pills and buttons, the button column keeps a 16-unit gap
below each caption, and the goal line shares the row of the second button. A text-fit report over every screen at
360x640 in all seven languages finds no clipped or overflowing text.

Checks: 14 unit tests pass; lint and CI checks pass; build pulled back from the draft is byte-identical (17 files);
bundle 315 KB (was 308), `fail []`; 4G load 1.85 to 2.30 s to playable over three runs (was 1.70 to 1.94).

Scorecard (10 categories, 360x640): HUD play 8.5, tutorial 8.5, pads 8, receipt 8, album 8.5, shop 8.5, Arabic 8.

Sheets: `production/qa/evidence/mow-mow-meadow/m6-text-*.jpg`, `/mnt/project-files/mow-mow-meadow/text-labels/`.
