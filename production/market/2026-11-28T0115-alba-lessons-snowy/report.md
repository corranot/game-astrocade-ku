# What Snowy Snapshot can learn from Alba: A Wildlife Adventure (28 Nov)

Requested by the owner in the project thread (28 Nov, 01:07 UTC). Research only: the game and its Astrocade draft were
not touched, because another thread is finishing Snowy's publish for 15:00 WIB today.

Rule for every item below: we borrow **design principles**, never Alba's content, characters, art, island, story or
names. Snowy keeps its own soft-toy winter diorama look, Pip, Hoot and its 24 animals.

## Ringkasan (Bahasa Indonesia)

Alba (ustwo games, 2020) dipuji karena foto satwa yang terasa bebas, dunia yang padat dan hidup, suara alam yang
menggantikan musik, dan rasa "aku menolong pulau ini". Keluhan utamanya: terlalu pendek, satwa kurang bervariasi,
mencari hewan sulit terasa berulang, jalan lambat tanpa perjalanan cepat. Snowy sudah punya inti yang sama (jalan,
foto, isi buku) dan sudah lebih kuat di beberapa hal (bintang foto, pose, tamu langka harian, tutorial). Pelajaran
terbesar untuk Snowy: (1) dunia harus berubah karena pemain, (2) beri kata kerja "menolong" selain "memotret",
(3) suara hewan sebagai petunjuk arah, (4) chapter 2 menjawab keluhan "terlalu pendek" Alba sekaligus masalah Snowy
sendiri (bot menamatkan buku di ~13 menit).

## 1. Alba, the facts we used

Sources are listed at the end. **SEEN** = stated by a source. **INFERRED** = our reading.

| Area | What Alba does | Source |
|---|---|---|
| Core loop | Walk a small island, photograph wildlife with a phone app that identifies and records each species; clean litter and repair bird feeders and houses, which brings animals back | SR, PG, TSA (SEEN) |
| Collection | 62 species of birds and mammals plus one reptile, across eight biomes. Each new species lets you print a sign for the island's wildlife boards | TSA (SEEN) |
| Goals | A notepad of tasks (photograph N species, pick up litter, find a poisoning source); a petition that needs 50 signatures; overheard talk and phone calls start quests | NL, GAG (SEEN) |
| Pacing | A brief intro, then free roaming. Island crossable in minutes: "density mattered more than size". No timers. A one-week holiday frames it | NL, FS, CSM, GAG (SEEN) |
| Camera | Built for one-handed portrait play: thumb moves, camera follows from behind with a very wide FOV. The girl plants her feet to photograph; autofocus and bokeh were praised | UT, TSA (SEEN) |
| Audio | Music is rare; bird calls and sea breeze carry the mood | NL, GAG (SEEN) |
| Comfort | Save anytime, map, progress hints, audible directional cues, guaranteed progress, no flashes, no screen shake, playable without sound | NL quoting Family Gaming Database (SEEN) |
| Rewards | Returning wildlife, island repairs, petition signatures, badges (one for identifying every animal), no missable achievements | NL, SR, AS, VL (SEEN) |
| Updates | Free content updates added questlines: "Mystery Animal", "Small Animals", "Visiting Birds" (4 new animals) | AS (SEEN) |
| Praise | Metacritic iOS 84 / Switch 80 / PC 79, OpenCritic 89% recommend, Apple Design Award 2021 (Social Impact); photography mechanic and the kind tone praised | WK, NL, CSM (SEEN) |
| Complaints | Too short (2 to 3 hours, the top complaint); little animal variety; finding the harder species gets repetitive; slow walking, no fast travel; simple and linear; a flipped or awkward photo camera for some; port bugs | NL, WK, VL, GAG, TSA, CSM (SEEN; VL is an AI summary of user reviews, indicative only) |
| Real world | One tree planted per download (Ecologi) | UT, TSA (SEEN) |

Unknown from the sources: whether the player picks the species by hand after a photo, and how missing species are
shown in the guide. We did not rely on either.

## 2. Snowy today, side by side

From `prototypes/photo-safari/` (plan.md, README.md, game.js, audio.js) and the round 12 and 13 comfort reports in
`/mnt/project-files/snowy/comfort/`.

| | Alba | Snowy Snapshot (draft r13) | Gap |
|---|---|---|---|
| Photo loop | Photo, identify, record | Photo, develop, 1 to 3 stars, card flies to the book, 3 slots per species (Hello, Pose, Star) | Snowy is deeper here |
| Collection size | 62 + 1 species | 24 species, 72 stamps, bot finishes at ~13 min | **Snowy runs out of goals faster** |
| The world reacts | Signs printed, feeders repaired, animals return, the island visibly heals | Gates open by stamps; the world itself does not change because of your photos | **Biggest gap** |
| Verbs | Photograph, clean, repair, help | Photograph, toss a treat, buy | No "help / care" verb |
| Guidance | Map, hints, audible directional cues | Paw trail and edge arrow from Pip, FTUE spotlight, silhouettes with hint icons | Snowy strong visually; sound is not a clue yet (animal voices play within 12 m, not panned) |
| Audio mood | Little music, nature sound leads | Music box always on, wind bed, animal voices | Music could step back when you aim |
| Daily return | One-week story frame | Daily rare visitor, 3 daily requests, morning mail | Snowy stronger for daily return |
| Comfort | No flashes, no shake | Reduce-motion turns off camera shake; the shutter still flashes white for 80 ms | Flash not softened |
| Characters | Grandparents and villagers give quests | Hoot gives requests through a board in the book | Hoot is not in the world |

## 3. Team discussion (condensed)

The team, as the owner asked: game director, creative director, producer, game designer, systems and economy designer,
level and world designer, narrative designer, UX lead, user researcher, accessibility specialist, camera designer,
technical director, gameplay programmer, tech artist, VFX artist, animator, character artist, environment artist,
lighting artist, art director, UI artist, audio director, sound designer, composer, localization lead, data analyst,
retention designer (no monetization), live-ops lead, community and marketing lead, performance engineer, QA lead.

- **Game director:** Alba's magic is not the camera, it is that the island answers you. Snowy's photos go into a book
  and nothing outside changes. Fix that first; it is cheap in a diorama.
- **Game designer / systems designer:** Add a second verb that is kind, short and physical: refill a bird feeder,
  dig out a snowed-in burrow, rebuild a fallen nest box. Each help brings a new visitor or a new pose. It turns
  "collect" into "care", which is what Alba's reviews praise.
- **User researcher / data analyst:** Alba's top complaint is length, and Snowy has the same risk: the bot finishes
  the book at ~13 min. On Astrocade the score weights retention (×15) and sessions over 5 min (×10), so content
  depth in chapter 2 matters more than any polish item.
- **Level designer / environment artist:** "Density over size" fits short mobile sessions. Chapter 2 should add one
  dense pocket (a hot-spring hollow or a frozen village edge) rather than a big empty field, with small hidden
  critters to reward looking around.
- **Narrative designer / writer:** Alba frames the week and gives the kid a cause. Snowy can keep it icon-first:
  a small mystery (strange tracks in the snow that lead somewhere new over a few days) gives a reason to come back
  without text walls. Never copy Alba's petition or story.
- **Audio director / sound designer / composer:** Let nature lead. Duck the music box while the viewfinder is up and
  let wind and the animal's breath and steps carry the shot. Pan animal calls left and right, and let an
  unphotographed species call from off screen so the ear points the way. The trail stays the main guide; sound is
  a bonus clue, so muted players lose nothing.
- **Accessibility specialist:** Alba lists "no flashes". Snowy's 80 ms white flash should drop to a soft warm bloom
  when the phone asks for reduced motion, and should never go full white at night.
- **Camera designer / tech artist / lighting artist:** Reviewers loved Alba's autofocus and bokeh. Snowy can add a
  cheap focus effect to the developed polaroid only (the 256 × 320 photo render target), not the live view, so the
  frame budget does not move.
- **UX lead / UI artist:** Keep Snowy's icon-first HUD. Do not add a map or task list screen; the trail already does
  that job on a phone. A small "the valley is waking" meter on the book cover is enough.
- **Character artist / animator:** Bring Hoot into the world: perched on the cabin sign, hops when a request is done.
  It gives the requests a face, as Alba's villagers do, at almost no cost.
- **Live-ops lead / retention designer:** Alba's free updates were named questlines with a few new animals each.
  That is the right shape for Snowy's updates on Astrocade: chapter 2 named and themed, 4 to 8 new animals, one new
  verb, one new pocket of world.
- **Technical director / performance engineer:** Every item below fits the current budget (≤ 135 draw calls in feed
  frames). The world-reaction props are instanced and built after the first frame; the polaroid focus runs only on
  capture. Nothing touches the 2 s first-frame load.
- **Producer / QA lead:** Snowy publishes once today at 15:00 WIB. Per the one-publish rule, nothing here goes into
  that build. "Small" items are built after the 15:00 publish and ship together with chapter 2 as one publish.
- **Community / marketing lead:** Alba's tree pledge is admired, but we cannot fund one and Astrocade pages must stay
  about the game. Skip it. The kind tone itself ("the animals trust you") is the shareable part.

## 4. Ranked recommendations

Impact is the expected effect on Astrocade's score terms (next-day return, sessions over 5 min, p50 and p75 session).
Effort: S under half a day, M one to two days, L more.

### Small (build right after the 15:00 publish; ships with chapter 2 as one publish)

| # | Recommendation | Why (Alba lesson) | Impact | Effort | Backed by |
|---|---|---|---|---|---|
| S1 | **The valley shows your book.** Each new species pins its polaroid on a wooden board by the cabin (and a tiny sign in its area). Walking past shows your collection in the world. | Alba prints info boards; the island answers you | High (pride, p75) | S | Game director, level designer, environment artist, UX |
| S2 | **Ears point the way.** Pan animal voices by screen side; an unphotographed species near the trail calls every ~8 s from off screen. | Alba's audible directional cues | Medium | S | Audio director, sound designer, accessibility |
| S3 | **Quiet viewfinder.** Duck the music box to ~30% while aiming; wind and the animal's sounds lead; music returns on the develop chime. | Alba lets nature sound lead | Medium (calm, feel) | S | Composer, audio director, camera designer |
| S4 | **Hoot in the world.** Hoot perches by the request board, turns its head to Pip, hops and hoots when a request is done. | Alba's villagers give tasks a face | Medium (return) | S | Character artist, animator, narrative designer |
| S5 | **Soft flash.** Reduced-motion phones and night shots get a warm soft bloom instead of a full white flash. | Alba: "no flashes" | Low to medium (comfort) | S | Accessibility, VFX artist, QA |
| S6 | **Polaroid focus.** A cheap depth blur on the captured photo only, sharp on the animal, soft behind. | Alba's autofocus and bokeh praised | Medium (shot pride, shares) | S to M | Tech artist, lighting artist, performance engineer |

### Chapter 2 update (the planned ~3-day update)

| # | Recommendation | Why (Alba lesson) | Impact | Effort | Backed by |
|---|---|---|---|---|---|
| C1 | **A kind second verb: help.** Refill feeders, dig out a snowed-in burrow, rebuild a nest box, clear ice from a pond edge. Each help brings a new visitor or unlocks a pose. A "valley is waking" meter on the book cover fills with helps. | Alba's cleaning and repairs bring animals back; the most praised feeling | Very high (p50, p75, purpose) | M to L | Game director, game designer, systems designer, retention designer |
| C2 | **More animals, one dense new pocket.** Area 4 (hot springs, already in plan.md U1) as a dense hollow, 8 new species, plus 4 to 6 tiny hidden critters (snow bunting, ermine kits, a chickadee flock) as quick bonus finds. | Alba's top complaints: too short, low variety; praise for density over size | Very high (retention, > 5 min share) | L | Data analyst, level designer, live-ops lead |
| C3 | **A small multi-day mystery.** Strange tracks appear in the snow and lead a bit further each day, ending in a new friend on day 3 to 4. Icon-first, no text walls, no streak penalty. | Alba's "Mystery Animal" questline and one-week frame | High (next-day return) | M | Narrative designer, live-ops lead, retention designer |
| C4 | **Fight the "hard to find" grind.** After 2 minutes without a new photo, the trail picks the closest missing species and the silhouette in the book shows where and when it lives (area and day/night icons). | Alba: finding harder species gets repetitive | High (p75, less quitting) | S to M | User researcher, UX lead, game designer |
| C5 | **Sled ride between areas.** A sled at each gate slides Pip to an opened area in a short, fun ride (a cinematic beat, input-safe). | Alba: slow walking, no fast travel | Medium | M | Level designer, camera designer, VFX artist |
| C6 | **Named chapter, like a questline.** Give the update a name and theme on the game page and in game ("Warm Springs"); the in-game book gets a new tab with its own cover. | Alba's named free updates | Medium (re-engage lapsed players) | S | Live-ops lead, community and marketing lead |

### Considered and dropped

- A map screen or written task list: the trail and the book already do this on a phone; a screen adds clutter.
- A petition, story cutscenes or a family cast: Alba's content, and text-heavy for kids 6 to 12.
- A real-world tree pledge: costs money, and Astrocade pages talk only about the game.
- Gyro aiming: Alba reviewers found it awkward; Snowy's two-thumb look is already in place.

## 5. Top order for chapter 2

C1 help verb, C2 new pocket with animals, S1 valley shows your book, C3 mystery tracks, C4 anti-grind, S2 and S3
audio, S4 Hoot, then C5, C6, S5 and S6 if time allows. Chapter 2 needs its own short plan (new mode-like content)
before any code.

## Sources

- WK: https://en.wikipedia.org/wiki/Alba:_A_Wildlife_Adventure
- PG: https://www.pocketgamer.com/articles/085197/alba-a-wildlife-adventure-review/
- NL: https://www.nintendolife.com/reviews/switch-eshop/alba_a_wildlife_adventure
- FS: https://filmstories.co.uk/features/how-we-made-alba-a-wildlife-adventure/
- CSM: https://www.commonsensemedia.org/game-reviews/alba-a-wildlife-adventure
- VL: https://vaporlens.app/app/1337010/alba_a_wildlife_adventure.md (AI summary of Steam user reviews)
- UT: https://ustwogames.co.uk/news/the-environment-art-of-alba-a-wildlife-adventure/
- SR: https://screenrant.com/alba-wildlife-adventure-game-review/
- AS: https://apps.apple.com/us/app/alba-a-wildlife-adventure/id1528014682
- GAG: https://www.godisageek.com/reviews/alba-a-wildlife-adventure-review/
- TSA: https://thesixthaxis.com/2020/12/11/alba-a-wildlife-adventure-review/
