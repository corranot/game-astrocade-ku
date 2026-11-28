# Snowy Snapshot, round 12: player comfort, end to end (28 Nov)

The owner asked for the AAA team's best advice on making Snowy comfortable for players across the whole game, keeping
its original 3D art style. The team played the build fresh and as a returning player at 360x640 and 768x1024 (plus
844x390 landscape). They then hunted blind spots across the feed card, audio, accessibility, languages, performance,
memory, input edge cases, saves, sharing, platform rules and distribution. The base was draft 01M8FPSC0SGVMJ14X2J5W8Y9GT
(round 11, swipe to look).

**Result:** new draft **01M8FSCZH9PS0R90PB1D6XTK0E**, verified byte for byte against the upload. It is not published.

## Ranked recommendations

Impact is the effect on a new player's first two minutes and on returning players. Effort is the build plus QA time.

| # | Problem found | Owner | Impact | Effort | Status |
|---|---|---|---|---|---|
| 1 | On some days the rare visitor's close-up fired in the first second. The opening frame was a giant blurred animal and no photographer (`before-opening-rare-closeup.jpg`), which is a bad feed hook and confusing. | Creative / Camera | High | S | **Shipped**: the beat waits until the tutorial is done and at least 4 s have passed. |
| 2 | New players walk at the animal and press the shutter while moving. Nothing told them that the viewfinder opens only when they stand still. | UX / FTUE | High | S | **Shipped**: "Stop to aim" tutorial hint over the photographer while walking near an animal (7 languages). |
| 3 | While the viewfinder eased in or out, the photographer filled the screen (`before-hero-fills-screen.jpg`). | Camera / Art | High | S | **Shipped**: the photographer hides while the viewfinder is up or the camera is within 2.4 m. |
| 4 | Only one finger worked at a time: you could walk or look, not both. | Gameplay / Input | High | M | **Shipped**: a second thumb on the right looks while the first walks. |
| 5 | Switching apps left the wind playing and could leave the stick stuck on return, so the photographer kept walking. | Audio / QA | High | S | **Shipped**: on hide, the game saves, releases every finger and suspends audio; on return, audio resumes. |
| 6 | Book labels were about 8 to 11 px on a 360 phone and long names clipped. | UX / Accessibility | Medium | S | **Shipped**: 27-unit labels, two lines, centred. |
| 7 | At 360 the logo still covered the first hint for its full 4 s. | UI | Medium | S | **Shipped**: logo time 2.5 s (tuning value `feel.logoS`). |
| 8 | The shop sold treats without saying what they do. | Economy / UX | Medium | S | **Shipped**: each treat shows a heart and the portrait of the shy animal it brings out (silhouette until seen). |
| 9 | In landscape the book and shop stretched across the whole screen. | UI | Medium | S | **Shipped**: the sheet keeps a portrait-like width in landscape. |
| 10 | A second finger on the left while the first finger looks should also walk (the mirror of #4). | Input | Low | S | Waits for the next update. |
| 11 | The two outfit items are both just called "Outfit". | Writer | Low | S | Waits for the next update (needs 7-language names). |
| 12 | The bot finishes the book at about 13 minutes; long-term players run out of goals. | Live-ops | Medium | L | Waits: chapter 2 is the next update. |

## Checked and fine (no change needed)

- **Feed card and handover**: the game starts in 1.3 to 1.5 s and moves before the first touch. Tapping reaches the game, it saves on hide, and the share button is there.
- **Audio**: mute is saved and restored. Nothing plays while the game is hidden (fixed in #5).
- **Languages**: Hindi and Arabic show no overflow at 360. Arabic mirrors right to left.
- **Memory**: over 120 photos the heap goes from 13.9 to 16.3 MB, the DOM stays steady, and new geometries are area builds. No leak.
- **Render cost**: in play it is unchanged from round 11 (the same draw calls and triangles per frame, measured on the same frames).
  The feed test's number rose from 85 to 135 only because round 11's feed frames were the rare close-up from #1.
- **Camera**: the follow distance stays about 10 m. The photographer stays framed.

## Things you didn't know to ask

- On some days the very first frame a feed viewer saw was a blurred close-up of the rare animal, not the game (#1).
- Leaving the app mid-walk could bring you back to a photographer still walking on their own (#5).
- The feed test's draw-call figure can change with the opening cinematic alone. Compare it on the same frames before
  calling it a regression.
- Two-thumb play is what players expect from any 3D phone game; without it, turning felt "stuck" (#4).
- Treat purchases had no visible payoff in the shop, so players saw no reason to spend (#8).

## Measured

| | Round 11 | Round 12 |
|---|---|---|
| 4G first frame (3 runs each, interleaved) | 1.92 / 2.04 / 2.17 s (median 2.04) | 1.92 / 2.11 / 2.15 s (median 2.11) |
| bundle | 257 kB | 258 kB |
| full playtest | 95/95 | 99/99 (4 new checks: quiet opening, Stop to aim, two thumbs, background release) |
| unit tests | 29/29 | 29/29 |
| colorEntropyBits / dominantColorShare / edgeDensity | 4.72 / 0.215 / 0.238 | 4.73 / 0.215 / 0.238 |

The load times overlap; they are the same within run-to-run noise.

## Visual scorecard (aaa-graphics, per screen)

| Screen | Score | Note |
|---|---|---|
| Opening (`after-*-a01`) | 8 | The photographer, the fox and the valley; the logo clears by 2.5 s. |
| Walking with "Stop to aim" (`a03`/`a04`) | 8 | The hint sits above the photographer and clear of the HUD. |
| Photo card (`a06`) | 8 | Unchanged. In stepped captures the photo shows mid-develop; in real time it develops in full. |
| Book (`b01`) | 8 | Labels readable at 360. |
| Shop (`b02-shop`) | 8 | Treat portraits read at 360 and 768. |
| Today (`b02-req`) | 8 | Unchanged. |
| Night (`c01`) | 9 | Unchanged. |
| Returning player (`d02`) | 8 | In local test mode no save exists, so this shows the fresh flow; the playtest covers real saves. |
| Landscape book and play (`844x390`) | 8 | The sheet is centred at a comfortable width. |

Every expert discipline signs off: Creative, Art, Camera, UX, Audio, Gameplay, Economy and QA.
