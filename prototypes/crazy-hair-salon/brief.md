<!-- PROTOTYPE - NOT FOR PRODUCTION -->
# Game Brief: Crazy Hair Salon: Cut & Color

## In your words
- "bikin game baru aja pake rekomendasi terbaik berdasarkan data, apa ya kira2?"
- "jangan rub it away lagi, nanti malah saling bersaing buat dapetin traffic"
- After play: "game kita masih kalah jauh banget secara visual keseluruhan sama ini : https://www.astrocade.com/games/diy-beauty-salon/01M6J7K826JG0GJKKJMPVYE4M0"
- After play (answer): "Ganti karakter manusia" (human children, painted art from the AI image generator)

**Pitch:** A wild-haired cute customer plops into your chair: wash, snip, dye, blow-dry and decorate their hair with one finger, then watch them gasp in the mirror. *(inferred (strong))*

**Genre:** makeover / salon toy with orders (make-it, multi-step) *(inferred (strong))*

**Controls:** one finger: rub to lather, drag scissors across strands, paint with the dye brush, hold to blow-dry, tap to place accessories; touch and mouse alike. *(guessed)*

**Question:** do kids stay past 30 s and finish a second customer when every step is a different gesture and the end is a mirror reveal? *(inferred (strong))*

**Hooks:** real swinging hair strands that fall when cut, take colour where painted and fluff under the dryer; the customer's mirror reaction + 1–3 stars; the photo goes on the salon wall. *(guessed)*

**Intent:** soft or no failure *(provisional)*

## Look and references
- Look: soft painted, semi-realistic cartoon (generated art, one style sentence for every image): a cosy bulb-lit salon room; four children (Maya, Leo, Hana, Kofi) close up, each with 4 painted moods; painted accessories and tools. The hair stays simulated strands, drawn as painted locks (dark edge, grooves, sheen) with an arched hairline. HUD kept small. If an image cannot load, the code-drawn stand-in plays instead.
- References: Poké Ice Cream Rolls (a different gesture per step, demo hand only the first time, a shelf of results), Dress up Showdown (a judged reveal at the end), Lip Art Studio (many free colours, very little text). Structure only, not their themes. *(inferred (strong))*
- View: 2D · Camera: fixed front portrait of the customer in the chair, 720×1280. *(guessed)*

## First minute
On the first frame a customer already sits in the chair, wild hair swaying, frowning, pointing at a small order card (a picture of the wanted hair). A hand shows the rub: the first touch makes foam and a sound within 1 s. Then scissors: drag across and strands drop with a snip. Dye brush: strands take the order's colour. Hold the dryer: the hair fluffs. Tap a bow. About 45–60 s in, the mirror moment: the customer gasps "WOW!", confetti and stars fly, a photo slides onto the wall; the next customer walks in by themselves. *(guessed)*

## Challenge
The first customer always ends with 3 stars when the player follows the hand. From customer 3 the order card asks for a length line, two colours or a particular accessory, and stars come from how close the result is. No fail screen: an over-cut makes a funny "eek!", and a 1-star result is still celebrated. Later customers add curls and sparkle spray. *(guessed)*

## Core loop
- Customer arrives with an order card → 5 steps of ~5–10 s, each a different gesture.
- Mirror reveal → 1–3 stars from matching the card, coins, a photo on the salon wall.
- Coins unlock new colours and accessories → the next order asks for what was just unlocked.

## Goal & fail state
- Make every customer happy and fill the salon wall; a session feels complete at each mirror reveal. No fail: stars only measure the match. *(provisional)*

## Features
- [ ] One customer start to end: wash (rub), cut (drag scissors through simulated strands), dye (paint), dry (hold), decorate (tap); mirror reveal with stars.
- [ ] Order cards that ask for more from customer 3 (length, colour, accessory), scored by match.
- [ ] 4 customers with reacting faces (frown, giggle, gasp) and idle motion before the first touch.
- [ ] Salon wall: the last 8 photos, saved with `lib.saveUserGameState`.
- [ ] Coins + unlocks: 12 free colours, more colours and accessories bought with coins (first unlock after ~2 customers) (thin stand-in)
- [ ] Leaderboard: total stars (the platform's "challenge your friends" prompt after 30 s).
- [ ] 7 languages (en, ar RTL, es, vi, hi, bn, id), 2–4 word prompts, 🌐 language button; `lib.haptics` on snip, fill and reveal; adaptive quality.

## Your systems
- orders and stars · in the slice *(guessed)*
- salon wall of photos · in the slice *(guessed)*
- coins and unlocks · thin stand-in *(guessed)*
- leaderboard · in the slice *(guessed)*
- daily gift · later *(guessed)*

## Keep
-

## Avoid
- Rub It Away, and anything where rubbing or erasing is the core action, so it does not compete with our own live games *(you said, in spirit)*
- The core genres of our own drafts: drawing the missing part (Draw It Alive), smashing a city (Toy City Stomp) *(inferred (strong))*
- Brand characters (Barbie, Pokémon…), dark or neon themes, a word-free game

## Out of scope
- Free-style mode without an order: change it after play
- Curling iron, sparkle spray, a second salon room: add it as a feature
- Daily gift: add it as a feature

## Build order
1. One full customer: real strands, all 5 gestures, mirror reveal with stars, no fail; the next customer walks in.
2. Orders that ask for more + 4 customers + salon wall + save.
3. Coins/unlocks, leaderboard, 7 languages, haptics, sound, adaptive quality, then the full ASTROCADE.md §5 audit.

---
**Kill condition:** if the hair still looks flat or cutting does not feel satisfying after two tuning rounds, switch to the boba shop. *(guessed)*

**Who it's for / what they feel:** kids 6–10: "I made them look awesome!" plus the ASMR snip. *(guessed)*

**Games you love / don't:** Love (from market data) Poké Ice Cream Rolls, Dress up Showdown, Lip Art Studio; don't: our make games that failed the first-day test (Pet Smile Clinic, Fizzy, Pinata). *(inferred (strong))*
