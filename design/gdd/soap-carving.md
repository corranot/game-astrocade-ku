# GDD: Soap Carving: Satisfying ASMR

> Status: approved and built (2026-11-20, `prototypes/soap-carving/`); notes marked *Built:* record where the build differs. Platform: Astrocade (portrait iframe 720×1280, touch first).
> Audience: kids 6–10 (Gen Alpha), 7 languages. Benchmark played as guest: Woodturner Workshop (#5 weekly).
> Market basis: `production/market/2026-11-20T0749/strategi.md` (make/DIY = 13 of the weekly top 50; recipe
> steps + judged reveal + a shelf of results = highest share). Not in the families of our own live games
> (rubbing to erase, drawing a part, smashing a city) and no rigged characters.

---

## 1. Overview

The player runs a little soap studio. Each customer brings an order card: a shape (heart, star, duck…) and a
soap colour. A big marbled soap bar sits in the middle of the screen with the shape drawn on it as a dotted
line. The player carves away everything outside the line with a knife: every drag peels off a curly shaving
that drops and piles up on the table. Then a damp sponge rubs the rough cut edges smooth and glossy, glitter
and gems make it sparkle, and the finished soap is dropped into a bath bowl where it fizzes, foams and floats,
while the customer reacts. Three bars (Shape, Smooth, Sparkle) and 1–3 stars judge it; coins buy new soap
marbles, glitter and gems; the soap joins the player's shelf. A carve takes 45–75 s. There is no fail.

## 2. Player Fantasy

"I made something beautiful with my own hands, and it was SO satisfying to make."
- **ASMR satisfaction:** the soft crunch of the knife, a curl peeling off, the pile growing under the bar,
  foam squeaking under the sponge. Every touch makes a sound, a shaving and a buzz.
- **Craft pride:** the carved shape is the player's own: their cuts stay visible, nothing is replaced by a
  ready-made picture. The bath reveal shows it off.
- **Surprise:** some soaps hide a charm inside (a tiny toy embedded in the soap) that appears when the knife
  reaches it.
- **Collection:** the shelf fills with the player's soaps; marble patterns and glitters unlock.

## 3. Detailed Rules

### 3.1 Screens and flow
1. **Studio (main screen, no menu).** First frame: the bar on the table, dotted outline, order card, a hand
   demonstrating a knife stroke. The first touch carves at once.
2. **Steps:** Carve → Smooth → Sparkle → Bath reveal → next order. A step bar at the top shows 4 icons with a
   progress ring; finishing a step pops its icon green and gives a chime.
3. **Shelf** (button top-right): the last 12 soaps in 3 rows of 4, each tappable to view large.
4. **Shop** (tray at the bottom during Sparkle and on the shelf screen): soap marbles, glitter colours, gems.
   Locked items show a padlock and price.

### 3.2 The soap
- The bar is a **mask** of `MASK_W × MASK_H` cells (each cell 1 game pixel at quality 0) placed over the
  bar's rectangle on screen (`BAR_RECT`). A cell is soap (1) or carved (0).
- **Look (3D from 2D):** each frame the visible soap is drawn as: drop shadow on the table (blurred mask,
  offset down) → marble texture clipped to the mask → bevel: a lighter rim on the top-left edges and a darker
  rim on the bottom-right edges (mask offset by ±`BEVEL_PX`, composited) → a soft top highlight band. Cut
  edges inside the bar get the **inner colour** (each marble has an outer and inner colour, so carving
  reveals the soap's core).
- **Roughness:** each carved edge cell has a roughness value 0..1. Knife cuts set edge cells to rough (1);
  rough edges are drawn with a jagged, chalky light rim. The sponge lowers roughness.

### 3.3 Carving (step 1)
- Dragging moves the knife; the blade tip removes soap in a capsule of radius `KNIFE_R` along the finger's
  path (sampled every `KNIFE_STEP` px).
- **Resistance inside the line:** the knife stops at the line; cells inside the template are removed only when
  the drag speed is above `INSIDE_SPEED`: a quick slip removes a small nick (radius `KNIFE_R × 0.5`), plays
  "oops" and counts against Shape. *Built:* the `INSIDE_HOLD` rule was dropped (holding still would let a child
  dig into the shape by accident), and the knife is free only outside the line (`protect` 0): a protect band
  inside the line cost 5–7% of Shape on every soap.
- **Shavings:** each `SHAVE_EVERY` removed cells spawn one curl (a ribbon of 6–10 points, curling while it
  falls, in the outer or inner colour). Curls fall with gravity and **land and stay** on the table/floor in
  a pile (max `SHAVINGS_MAX`, oldest fade).
- **Chunks:** when a carved stroke separates a region of soap from the main body (flood fill from the bar's
  base), that island falls off as one chunk with a thud and a bounce, and becomes part of the pile. This is a
  big satisfying moment.
- **Hidden charm:** on orders flagged `charm`, a small charm sprite is embedded at a random point in the waste
  soap at least 30 px outside the line (*Built:* inside the template the knife could never reach it). When carving exposes ≥ 30% of its area it pops out with sparkles and goes to the charm album.
- **Step done** when ≥ `CARVE_DONE` of the cells outside the outline are removed, or the player taps ✔
  (shown at ≥ `CARVE_CHECK`). Leftover soap outside the line is then trimmed automatically with a short
  auto-carve animation (no penalty below the done threshold, small penalty for what was left).

### 3.4 Smoothing (step 2)
- A damp sponge follows the finger. Edge cells within `SPONGE_R` lose roughness at `SPONGE_RATE` per second
  of contact; foam bubbles appear on touched edges; when an edge region reaches roughness 0, it flashes a
  glossy streak.
- Step done when mean edge roughness ≤ `SMOOTH_DONE`, or ✔ (shown at ≤ `SMOOTH_CHECK`).

### 3.5 Sparkle (step 3)
- **Glitter:** drag the shaker over the soap: glitter specks (colour chosen in the tray) stick to soap cells
  under it. Density counted per soap area.
- **Gems:** tap a gem in the tray, then tap the soap to place it (max 3); tap a placed gem to remove it.
- Step done with ✔ (shown once anything was added) or automatically `SPARKLE_AUTO` s after the last action.

### 3.6 Bath reveal (step 4)
- The soap slides into a round glass bath bowl that rises from the bottom; water ripples, foam builds up
  around it, bubbles rise and catch rainbow light; the soap bobs. The customer's portrait shows the mood for
  the result (wow / happy / ok); three bars fill one by one with sounds; stars pop; coins fly to the counter.
- A photo of the soap (the mask rendered with its look, on a clean card) goes to the shelf.
- ▶ (big, centre) or a tap after 1.5 s brings the next customer; otherwise after `REVEAL_SECONDS`.
  *Built:* counted from when the stars and coins finish (3.4 s), so the celebration is never cut short.

### 3.7 Orders and progression
- Order = `{ customer, shape, marble, charm?, glitterWanted? }`.
- Orders 1–2: heart, star (simple, `SIMPLE_TOL`). From order 3: all 8 shapes, deterministic by order index.
  Every 4th order is a **Golden Soap** (gold marble, double coins). Every 5th order has a hidden charm.
- After a purchase, the next order asks for the item just bought.
- **Free carve** unlocks after 6 orders: any shape, no judging, the soap still goes to the shelf. *Built:* a small
  oval core (120 px) is the template, so the soap can never be carved away entirely; ✔ shows at 15% carved.

### 3.8 Economy
- Coins per soap = `COIN_PER_STAR × stars + (golden ? COIN_PER_STAR × stars : 0)`.
- Shop prices rise by `PRICE_STEP` per purchase from `PRICE_BASE`. First purchase after ~2 orders.
- Locked items show their price; tapping with too few coins wiggles the item and the coin counter (no
  "you can't" screen).

### 3.9 Customers
- 4 painted customers (2×2 mood sheets: neutral, happy, wow, oops), each with a name colour and a short
  speech bubble per state (in the string table). Static portraits, no rig.

### 3.10 Save and leaderboard
- Save (`lib.saveUserGameState`), only after the stored save was read; merge rules as Crazy Hair Salon (count
  up, never set from the screen).
  `{ n, coins, stars, owned: {marbles, glitters, gems}, shelf: [≤12 soaps as compact masks], charms: [], fresh, lang, muted }`.
  A shelf soap is stored as its mask downsampled to 48×60 bits (run-length encoded) + marble + gems + glitter
  seed.
- Leaderboard: total stars (`sort_ascending: false`).

### 3.11 Help and language
- Helper hand: shows each step's gesture on the first order and after `IDLE_HAND` s of no input.
- Prompts of 2–4 words per step in 7 languages (en, ar RTL, es, vi, hi, bn, id), 🌐 on the shelf screen.
  Baloo font family (Latin/Vietnamese, Bengali, Devanagari, Arabic).

## 4. Formulas

Let `T` = template mask (1 inside the outline), `S` = soap mask after the step, `B` = band of cells within
`TOL` px of the outline, `A(x)` = cell count.

- **Shape score**
  `cover = A(S ∧ T) / A(T)` (how much of the wanted shape is still there)
  `excess = A(S ∧ ¬T ∧ ¬B) / A(¬T)` (soap left outside the line, beyond the tolerance band; ¬T counted
  within the bar)
  `shape = clamp(cover − 1.5 × excess, 0, 1)`
- **Smooth score:** `smooth = 1 − mean(roughness of edge cells)`
- **Sparkle score:** `sparkle = min(1, glitterDensity / GLITTER_TARGET) × 0.6 + min(gems, 2) / 2 × 0.4`
  (`glitterDensity` = glitter specks per 1,000 soap cells)
- **Total:** `v = 0.55 × shape + 0.25 × smooth + 0.20 × sparkle`
  Stars: `v ≥ 0.85 → 3`, `v ≥ 0.6 → 2`, else `1`.
- **Coins:** see 3.8. **Price** of the k-th purchase: `PRICE_BASE + PRICE_STEP × k`.
- **Ranges:** every score is 0..1; `glitterDensity` is about 0–60 in play; `v` is 0..1.
- **Example:** heart order, 60,000 template cells, 54,000 left inside (`cover = 0.90`), 900 of 54,000 outside
  cells left beyond the band (`excess = 0.0167`) → `shape = 0.90 − 0.025 = 0.875`; mean roughness 0.06 →
  `smooth = 0.94`; 14 specks per 1,000 cells and 1 gem → `sparkle = 0.778 × 0.6 + 0.5 × 0.4 = 0.667`;
  `v = 0.481 + 0.235 + 0.133 = 0.849` → **2 stars** (one more gem: `sparkle = 0.867`, `v = 0.889` → 3 stars).
- **Bevel lighting per edge pixel:** `light = clamp(0.5 + 0.5 × dot(n, L), 0, 1)` with `n` the edge normal from
  the mask gradient and `L = normalize(−1, −1.4)`; drawn as two offset rims (approximation, no per-pixel loop).

## 5. Edge Cases

- **Carve everything away:** a minimum core (the template eroded by 8 px) can never be removed; the knife
  just skids with a squeak there.
- **Carving a hole through the middle:** separates islands → chunks fall (3.3); holes inside the outline
  count against Shape.
- **Very fast swipes:** the path is sampled every `KNIFE_STEP` px so no gaps appear.
- **Two fingers:** only the first pointer carves.
- **Leaving mid-step** (shelf, language, a second `run()`): the soap and the step are kept.
- **Save arrives late:** progress is merged (count up); no write before the read.
- **Corrupt save:** shelf entries with bad masks or unknown items are dropped; counts clamped.
- **Slow phone:** quality steps down (fewer shavings, no drop-shadow blur, lower canvas resolution) and back up.
- **Edit mode:** draws the studio with a sample bar, no input, no saving.
- **Charm partly carved:** it pops at 30% exposure; if never exposed, it still appears at the reveal ("it was
  hiding inside!").
- **Locked tap with too few coins:** wiggle + coin counter pulse only.

## 6. Dependencies

- **Platform:** `lib` save/load, leaderboard, haptics, `showGameParameters`, asset map; no network but CDN assets.
- **Reused from Crazy Hair Salon:** `ui.js` (glossy UI), sprite loader pattern, language and save code
  patterns, playtest/soak structure. No shared runtime module (each game folder is standalone).
- **Art (generator, one style sentence):** studio background, 4 customer mood sheets, 4 marble textures
  (+4 shop marbles), tools sheet (knife, sponge, glitter shaker), gems sheet, charms sheet (8), bath bowl.
- **Audio:** synthesized (carve crunch, curl ticks, chunk thud, sponge squeak, fizz, chimes) + optional
  generated loop for the studio.

## 7. Tuning Knobs (all in `game_config.json`)

| Knob | Start | Range | Note |
|---|---|---|---|
| `MASK_W × MASK_H` | 380 × 460 | — | *Built:* 1 cell = 1 game px, bar at (170, 420) |
| `KNIFE_R` | 18 px | 8–30 | blade radius |
| `KNIFE_STEP` | 6 px | 3–12 | sampling along the drag |
| `INSIDE_SPEED` | 2,200 px/s | 800–4,000 | slip speed inside the line (`INSIDE_HOLD` dropped) |
| `TOL` | 10 px | 4–20 | tolerance band at the outline; `SIMPLE_TOL` 16 px for orders 1–2 |
| `SHAVE_EVERY` | 240 cells | 60–600 | one curl per this many removed cells (one per ≈ 7 px of a stroke) |
| `SHAVINGS_MAX` | 140 | 40–300 | pile size cap |
| `CARVE_DONE` / `CARVE_CHECK` | 0.92 / 0.75 | — | share of outside cells removed |
| `SPONGE_R` / `SPONGE_RATE` | 40 px / 2.2 s⁻¹ | — | |
| `SMOOTH_DONE` / `SMOOTH_CHECK` | 0.08 / 0.35 | — | mean roughness |
| `GLITTER_TARGET` | 18 | 5–40 | specks per 1,000 cells |
| `SPARKLE_AUTO` | 5 s | 2–10 | |
| `REVEAL_SECONDS` | 4.5 s | 2–8 | |
| `COIN_PER_STAR` | 10 | 1–30 | |
| `PRICE_BASE` / `PRICE_STEP` | 50 / 10 | — | |
| `IDLE_HAND` | 4 s | 1–10 | |
| `BEVEL_PX` | 6 px | 2–12 | |

## 8. Acceptance Criteria

**Feel and first minute**
1. The first frame is the bar, the dotted outline, the order card and the moving helper hand; a carve stroke
   on the very first touch removes soap and spawns a curl within 1 frame and a sound within 50 ms.
2. Order 1 (heart) can be finished start to reveal in 45–75 s by following the hand, and gives 3 stars.
3. A shaving falls and lands on the pile within 1.5 s of a stroke; the pile is visible for the whole order.
4. Separating an island produces a falling chunk with a thud and haptic.

**Visual bar (side by side with Woodturner, full size)**
5. The soap reads as a solid 3D block (bevel, highlight, shadow) and the screen is one themed world with no
   empty flat areas; checked on a side-by-side image at full size before reporting.
6. No object blends into its background (contrast check on every screen).

**Rules**
7. Shape/Smooth/Sparkle scores follow §4 exactly (unit test with fixed masks).
8. The minimum core can never be carved; carving inside the line triggers "oops" and lowers Shape.
9. A purchase is followed by an order asking for it.

**Platform and quality**
10. Playtest: full flow, taps only, 600 random inputs, edit mode, save merge (late save, corrupt save), second
    `run()`, 7 languages × every screen, layout (nothing tappable in the bottom 15%), platform rules — all pass.
11. Soak: 14 orders in one page with no error, capped pile and particles, sound still playing, save < 40 KB.
12. Median frame ≤ 33 ms with the CPU slowed 4× in the headless browser; real-phone FPS is reported as not
    verified until the owner checks.
13. A bug hunt by a fresh subagent; every confirmed bug gets a test that fails without its fix.

**Targets after publishing (Astrocade analytics, not testable here)**
- Significant plays (≥ 30 s) ≥ 80%, median FPS Optimal (≥ 40), first touch ≤ 3 s, 0-interaction ≤ 6%.

---

## Appendix A — Screen layout (720 × 1280)

| Area | y range | Content |
|---|---|---|
| HUD | 20–110 | coin pill (left), shelf + sound (right) |
| Steps | 125–195 | 4 step icons with progress ring |
| Prompt / order | 210–420 | prompt pill (left), order card with the shape + customer portrait (right) |
| Work area | 420–900 | soap bar `BAR_RECT` (180–540 × 430–886), table surface, pile below |
| Tool tray | 900–1080 | tools / glitter / gems / shop (nothing tappable below 1088) |
| Floor | 1088–1280 | decoration and the shavings pile only |

## Appendix B — Art list (generator, style sentence: "Soft painted 2D mobile game art, semi-realistic cartoon, smooth airbrushed shading, warm studio lighting, gentle saturated colors, kid-friendly, high detail, no text")

1. `studio_bg` 1024×1536: pastel soap studio, tiled mint wall, shelves with soap jars, wooden table centre, empty middle.
2. `customer_[a-d]` 2×2 mood sheets (neutral, happy, wow, oops): 4 distinct friendly adults/kids, head and shoulders.
3. `marble_[pink|lavender|mint|honey]` 512×640: marbled soap surface, outer colour; plus inner core colour in config.
4. `marble_shop_[gold|rainbow|galaxy|cocoa]` same format.
5. `tools_sheet` 3×2: carving knife, damp sponge, glitter shaker, gem tweezers, spray bottle, apron icon.
6. `gems_sheet` 4×2 gems; `charms_sheet` 4×2 tiny toys (duck, star, heart, dino, car, cat, crown, shell).
7. `bath_bowl`: round glass bowl with water, front view.

## Appendix C — Sound list
Carve crunch (filtered noise, pitch by speed), curl tick, chunk thud + bounce, oops, sponge squeak loop,
foam pops, glitter shimmer, gem clink, bath plop + fizz loop, bar fills (rising notes), stars, coins, unlock.
