# Snowy Snapshot, round 14: controls v3 and small world touches (28 Nov)

The owner asked for a walk-only area in the bottom-left, the rest of the screen for free camera look, and the
photographer always visible. Scope was then widened to "fix everything end to end", plus a Chapter 2 coming-soon
teaser and four small touches from the Alba study. Base: round 13 draft 01M8FSWGC7SHPF4VD9THKTAHPV.

**Result:** new draft **01M8FW4V2JR71J4EQXV4SHYK40** (sync token 025fb26878305add143cf6be3f0b8915). All 10 files were
verified byte for byte against the upload. It is not published. Fallback: 01M8FSWGC7SHPF4VD9THKTAHPV.

## What shipped

| # | Change | Owner |
|---|---|---|
| 1 | **Walk zone**: the bottom-left quarter (`controls.walkZone` 50% x 50%) is walk only. The stick rests there dimmed and jumps under the thumb. It mirrors to bottom-right in Arabic. | Input / UX |
| 2 | **Free look**: any other touch looks around. Yaw is unlimited (full 360°), pitch goes 0.62 rad up and 0.5 rad down, and nothing pulls the view back. Tap-to-walk is gone; a tap does not move the photographer. | Camera |
| 3 | **Photographer always visible**: the camera first lifts (up to 0.45 m) and then pulls in when a rock, lamp post, gate or terrain would cover the photographer, with a 3.4 m minimum distance. | Camera |
| 4 | **Tutorial**: the first step is now "Drag here to walk", with the hand on the stick, in 7 languages. | UX / FTUE |
| 5 | **Lens and look**: a look swipe lowers the viewfinder, so turning near an animal never gets stuck in first person. | Camera |
| 6 | **Chapter 2 teaser**: a "Chapter 2 · Coming soon" card at the end of the book, and a toast when the book is completed. 7 languages, no date. | Live-ops / Writer |
| 7 | **Directional sound (Alba a)**: each animal call is panned by its side of the screen and is quieter with distance. Music drops to 30% while the viewfinder is up. | Audio |
| 8 | **Soft flash and depth on photos (Alba b)**: the polaroid gets a soft glow and a gentle blur away from the animal, centred on the animal. | Art / Tech art |
| 9 | **Hoot at the request board (Alba c)**: a small owl perches on a notice board by the path, blinks, turns to the photographer, and hops when a request is done (with its call). | Art / Gameplay |
| 10 | **Friends board (Alba d)**: a wooden board by the cabin pins a photo (or portrait) of each new species seen, up to 12. | Art / Retention |
| 11 | The treat button moved above the shutter, so the bottom-left belongs to the stick. | UI |

Nothing from the Alba list waited.

## Decision on the viewfinder

The viewfinder stays first person, so the photographer hides while aiming. This is a deliberate photo mode: it
opens only when standing still near an animal, and any look swipe lowers it at once. Everywhere else the
photographer is in view (360° turn 8/8, edge and gate tilts 6/6).

## Measured

| | Round 13 | Round 14 |
|---|---|---|
| 4G first frame (3 runs each, interleaved) | 1.92 / 1.85 / 1.91 s (median 1.91) | 1.87 / 1.83 / 1.89 s (median 1.87) |
| bundle (transfer, from the load test) | 259 kB | 262 kB |
| full playtest | 99/99 | 106/106 (new: stick rests bottom-left, hand on stick, tap does not walk, stick drag walks, view stays, 360° framing, edge/gate framing) |
| unit tests | 29/29 | 29/29 |
| CI checks | pass | pass |
| feed bundle test | errors: [] | errors: [] |

The load times overlap; they are the same within run-to-run noise.

## Visual scorecard (aaa-graphics, per screen)

| Screen | Score | Note |
|---|---|---|
| Opening with walk hint (`ctl-360-a01`) | 8 | Hint and hand on the stick, clear of the shutter. |
| Spin 90/180/270/360 (`ctl-*-b0*`) | 8 | Photographer framed in every quarter. |
| Pitch top and low (`ctl-*-c0*`) | 8 | Low pitch shows sky and crystals; top pitch reads as a map view. |
| Gate and edge (`ctl-*-d0*`) | 8 | Camera lifts and pulls in; photographer visible. Frames with an animal in view show the viewfinder by design. |
| Book with Chapter 2 (`ctl-*-e01`) | 8 | Card reads in English and Arabic. |
| Arabic controls (`ctl-ar-*`) | 8 | Stick and hint mirror to the right; shutter to the left. |
| Hoot (`hoot-board`, `hoot-hop`) | 8 | Small and charming; it doesn't crowd the opening frame. |
| Friends board (`friends-board`) | 8 | Photos read at 360. |
| Photo depth (`photo-depth-*`) | 8 | Subject sharp, edges soft. |
| Comfort tour 360/768 (`comfort-*`) | 8 | Unchanged flow. The stepped capture shows the photo mid-develop. |

## Post-publish roadmap (ranked)

Chapter 2 is already set for the 3-day update and is not listed here.

| # | Idea | Why | Effort |
|---|---|---|---|
| 1 | Read first-day play time and D1 return; tune the walk-zone size and look speed from them | Controls are the biggest change this round | S |
| 2 | Tap the friends board or Hoot's board to open the book or Today tab | Makes the new world pieces useful, not only pretty | S |
| 3 | Look-speed setting in the sound/settings corner | Phones differ a lot in swipe feel | S |
| 4 | Light haptic tick on the shutter (where supported) | Cheap, satisfying feel | S |
| 5 | "Best shot of the day" share from the photo card | Shares drive feed traffic | M |
| 6 | Weather moments (light blizzard, sunbeams) as rare cinematic beats | Freshness for returning players | M |
