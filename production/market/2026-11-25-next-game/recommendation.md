# Next game: recommendation — 2026-11-25

Inputs: the Giant Salami Saw teardown (`../competitors/01M7B4YM0Q5XFDCXS4CXG8Y74X/analysis.md`) and platform-wide
traffic from astrotopper, snapshot `../2026-11-25T1244/` (taken 12:44 UTC, astrotopper ~5 h behind). Astrocade does
not expose daily plays per game, so the proxy is **7-day and 30-day play gain** (astrotopper weekly/monthly lists).
Our own games are not used as evidence. These are pitches only: the full 11-section plan is written for the chosen
one and needs the owner's yes before any code (CLAUDE.md, Plan Before Building).

## Traffic signals (7-day gain unless noted)

| Genre | Games in the top 30 this week | Evidence |
|---|---|---|
| 3D arcade idle tycoon (carry, stack, pads) | Giant Salami Saw +198K | Same creator, 30-day: Giant Salami Factory +821K (1.0M), Frozen Harbor 1.3M, Harpoon Harbor 990K |
| Smash / chaos / destruction | Smash Everything! +391K, Kaiju City +328K, 41 Ragdoll Executions +299K, Prank City +179K | 30-day: Robo-Crash 1.7M, 41 Ragdoll +1.2M |
| ASMR craft / make-and-sell | Woodturner Workshop +171K, Squishy Balloon Slime +157K, Lip Art Studio +200K, Phone Case Shop +161K, Oreo Master +176K, Dalgona 2 +156K | 30-day: DIY Phone Case Studio +896K |
| Voxel / block remixes | Minecraft Guns +410K, Minecraft Sandbox TNT +270K, Minecraft Creative +171K | Mostly remixes of trademarked themes: not for us |

## 1. Recommended: "Meteor Gem Works" (3D arcade idle tycoon, giant hero object)

- **Pitch:** a giant glowing crystal meteor crashes into a sleepy desert canyon town. You cut it apart, polish the
  gems into jewellery, sell to the tourists who come to see it, and rebuild the town around the crater.
- **Why:** the genre is the strongest single-creator franchise on the platform right now (≈3.6M plays over four
  games), and it is short with a real ending, which fits our "short, easy sessions" rule. Theme, setting, product
  chain and story are ours; only the genre and mechanics are shared.
- **What we take from the teardown:** 5-second crash cold open; a persistent carve shader on the meteor (cracks glow,
  chunks break off and the core gets brighter); first unlock in ~20 s, one every 15–35 s, each one a new kind of
  thing (drill rig, polishing wheel, display cases, tour bus, observatory, night market); a finale where the core
  cracks open, an end card, keep playing; bot + `__step` test tooling; replay-unlock saves.
- **Where we beat it:** our quality bar (bloom on the crystal only, tone mapping, AO, soft shadows, real props, a
  living town), a guide that never dead-ends, disposed canvas textures, haptics.
- **Risk:** the genre needs a lot of content (≈14 unlocks, a town). It is the biggest build of the three.

## 2. Alternative: "Kaiju Snack Delivery" (chaos/smash with a goal)

- **Pitch:** you are a giant, hungry monster in a toy-like city; stomp through buildings to reach food trucks before
  the timer ends. Each level is one street, 60–90 s.
- **Why:** smash/chaos has the most top-30 entries this week (4 games, 1.2M combined weekly gain).
- **Risk:** we already have smash games in the repo, so the learning value is lower.

## 3. Alternative: "Glass Blower Studio" (ASMR craft, make-and-sell)

- **Pitch:** heat, blow and shape glowing glass on a pipe (one-finger drag), cool it, and sell vases to customers who
  ask for a shape and colour.
- **Why:** six ASMR craft games in this week's top 30 (≈1.0M combined weekly gain); a lathe-like "shape a spinning
  object" feel is proven by Woodturner Workshop.
- **Risk:** the genre is crowded; it wins on the feel of the material, which needs careful shader work.

## Recommendation

Build **#1 Meteor Gem Works**. It applies the most lessons from this teardown and follows the strongest genre signal
not yet in our repo. Next step: write its full plan for approval.
