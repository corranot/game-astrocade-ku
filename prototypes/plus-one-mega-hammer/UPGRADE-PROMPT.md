<!-- PROTOTYPE - NOT FOR PRODUCTION -->
# +1 Mega Hammer: upgrade meta-prompt

The owner approved all nine upgrade recommendations on 2026-11-25 and asked for them as one explicit prompt,
built in stages. This file is that prompt. A Claude session that picks the work up reads it top to bottom and
builds the stages in order, one pull request per stage.

## Role and goal

You are a senior game team (game design, technical art, UI, audio, performance and QA) improving a shipped
prototype. +1 Mega Hammer is a one-finger smash-and-grow game for children aged 6 to 12 on phones in portrait. The
goal is a game that feels premium, AAA in polish with indie charm, and that gives children a reason to play again
tomorrow. Keep a run short (about one minute) and the controls one finger. Don't add reading-heavy menus.

## Rules that hold for every stage

1. **Gameplay stays simple.** One input: tap or hold to slam. No failure states, no timers that punish.
2. **Tuning goes in `game_config.json`.** Gameplay randomness goes through the seeded `rng`. Saving goes only
   through `lib.*`. Each stage's new values are named in the stage below.
3. **Layout precision.**
   - All HUD sizes are multiples of the `--u` unit (the stage is 720 units wide).
   - Use one outer margin `--m`, plus the phone's safe-area inset.
   - Match the heights of elements in the same row and centre them on one line.
   - No element overlaps another at 9:16, 9:19.5 or 3:4.
   - Every tap target is at least 88 units.
   - Text never overflows its box in any of the 7 languages, right-to-left Arabic included.
4. **No errors.** Zero console errors and warnings in a full playtest run.
5. **Performance.** Stay within the budget of at most 130 draw calls and 220k triangles. Keep the adaptive quality
   tiers. Pool every new effect; don't allocate per frame.
6. **Evidence.** Each stage saves JPEG screenshots (each at most 250 KB) to
   `production/qa/evidence/plus-one-mega-hammer/` and passes `node --test logic.test.mjs` and `node playtest.js`.
7. **Shipping.** Each stage ends with:
   - a pull request (auto-merges when CI is green);
   - an Astrocade draft update (`astrocade-ship` flow);
   - a short report to the owner.

   Never publish. The thumbnail is set only with the owner's word.

## Stage 1: the hammer feels giant, every hit feels heavy (recommendations 1 and 6)

**Problem.** The camera pulls back as fast as the hammer grows, so on screen the hammer looks the same size all
run and is often cut off at the corner. The swing has no wind-up and the head does not squash.

**Build:**
- **Camera pull-back.**
  - Pull back more slowly than the hammer grows: lower `camera.growK`, so the hammer's share of the screen grows
    through the run.
  - Frame the hammer head, not only the zone: the camera follows a point between the zone centre and the aim, so
    the head is never cut off.
- **Splash.** Small objects (req 1) within `growth.splash` times the reach also break. This is a shockwave, so a
  big hammer clears the small stuff around it. Numbered objects still need a direct hit.
- **Tier-up moment.**
  - Slow motion for `fx.tierSlowMo` seconds at `fx.tierSlowScale`.
  - A camera punch-in, then a release.
  - A golden shockwave ring of 3x the reach, and the hammer overshoots in size.
  - A rising "WHOOM" sound and the banner.
- **Swing.**
  - A wind-up of `hammer.windup` seconds: the hammer lifts further before it comes down.
  - The head squashes on impact (wider, flatter) and springs back.
  - The camera FOV kicks on big hits.
- **Combo.** A combo chip ("x5 COMBO") under the counter from `fx.comboShow` slams on. It scales with each step and
  fades when the combo lapses. The combo dings keep rising.

**Done when:**
- The hammer's on-screen height at the end of a run is at least 1.4x its start height. Playtest measures this with
  `toScreen`.
- A tier-up shows the slow-mo, ring and banner.
- Splash breaks small objects outside the direct reach.
- Logic tests cover splash.
- Screenshots: start, mid-run and late run.

## Stage 2: gems become a hammer collection (recommendation 2)

**Problem.** Gems are counted and then reset to zero every run, so they mean nothing.

**Build:**
- **Saved gems.** The gem total is kept in the save (`save.gems`). The results card shows the gems earned this run
  and the total.
- **Skins.** `skins` in the config is a list of hammer skins, each with an id, a gem cost, and head, band, handle
  and grip colours plus a head pattern. At least 6:
  - classic (free)
  - candy (stripes)
  - dino (spikes)
  - ice cream
  - robot
  - rainbow (the last and most expensive)

  Costs are spread so the first unlock comes after the first run, and the full collection takes about 15 to 25 runs.
- **Collection screen.**
  - A hammer button on the start screen and on the results card opens the collection: a grid of cards, each with
    a live mini icon in the skin's colours, its cost or "equipped".
  - Tap to buy (when the player has enough gems) or to equip.
  - Buying plays a celebration (sound, sparkle, shake of the card).
  - The equipped skin is saved and drawn on the 3D hammer.
  - Evolution tiers still raise the glow on any skin.
- **Gem counter.** A small gem counter shows during play.

**Done when:**
- Gems survive a reload (save round-trip in the playtest).
- Buying needs enough gems.
- The equipped skin shows on the 3D hammer and the icon.
- Screenshots: the collection screen and two skins in play.

## Stage 3: each new run is a new place with a new boss (recommendation 3)

**Problem.** "Smash again x2" replays the same six zones, only faster.

**Build:**
- **Worlds.** `worlds` in the config lists worlds, each with an id, sky and fog colours, ground tints, and
  replacements for some zones' items and the finale boss:
  - Toy Town (the current one)
  - Sunny Beach (sandcastles, beach balls, parasols; boss: giant sandcastle)
  - Candy Land (lollipops, gumdrops; boss: gingerbread house)
  - Snow Peak (snowmen, ice blocks; boss: ice palace)

  Run n plays world n mod 4. Zone sizes and positions stay the same, so the island and the layout code are shared.
- **Models.** New kinds get their own models with the same detail as the current ones (no bare primitives).
- **World intro.** A short title banner names the world when a run starts.
- **Saved progress.** The furthest world reached is saved.

**Done when:**
- Each world plays from start to boss to card in the playtest.
- Screenshots: each world's finale.

## Stage 4: every zone has its own look, labels stay clean, layout is exact (recommendations 4 and 5)

**Build:**
- **Ground per zone:**
  - fruit stand: wooden boards
  - market: cobbles
  - street: asphalt with a zebra crossing and lane lines
  - park: grass with a gravel path
  - city: concrete slabs
  - finale: icing with sprinkles (per world in stage 3)
- **Sky.** It shifts per zone, from morning to golden hour to dusk at the finale.
- **Life.** Small animated details: birds that scatter on a big hit, fountains that spray, flags that wave, and
  lamp glow at dusk.
- **Labels:**
  - Only the next targets show their number: objects whose req is at most `labels.ahead` times the current size.
  - Objects that are breakable now show a green number with a soft pulse.
  - Locked objects further away show a small lock badge instead of a number.
- **Layout pass:**
  - Safe-area insets on the top HUD.
  - The counter, mute button and gem counter share one centre line.
  - The progress bar is centred under the counter.
  - Card spacing follows an 8-unit rhythm.
  - Check all 7 languages and three aspect ratios.

**Done when:** screenshots of every zone, every language and the three aspect ratios show no overlap and no
clipped text.

## Stage 5: daily goal (recommendation 8)

**Build:**
- **The goal.** One goal per day, picked by the seeded rng from the local date, for example:
  - break N cars
  - reach size S
  - collect G gems
- **Display.** It shows as a chip on the start screen and on the card, with progress.
- **Reward.** Finishing it pays bonus gems (`daily.reward`) with a celebration.
- **Saved.** Progress is kept in the save per day.

**Done when:** the playtest finishes a goal and sees the reward paid once; the next day gives a new goal.

## Stage 6: thumbnail candidate and phone performance (recommendations 7 and 9)

**Build:**
- **Thumbnail candidate.** A staged, high-resolution render of the giant hammer smashing the cake vault, with
  debris, gems and a "+19000!" pop. It is saved as an image for the owner. It is not set on Astrocade without the
  owner's word.
- **Performance.**
  - Measure FPS on a throttled mobile profile (4x CPU slowdown, 390x844).
  - Report the adaptive tier it settles on.
  - Fix what keeps it under 60 FPS at tier 1.
  - Say plainly that a real phone still has to be checked.

**Done when:** the thumbnail candidate is in the project files, the performance numbers are in the README, and the
whole playtest is green.
