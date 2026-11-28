# Snowy Snapshot, round 15: a living valley (28 Nov)

The owner asked for the whole game to feel very alive, in detail, HUD and UX included. Base: round 14 draft
01M8FW4V2JR71J4EQXV4SHYK40 (controls v3).

**Result:** new draft **01M8FXD24XA4M4TA1Y93S28AME** (sync token 24433b33bfcc1471c76b24d814ee50fc). All 10 files were
verified byte for byte against the upload. It is not published. Fallbacks: r14 01M8FW4V2JR71J4EQXV4SHYK40, then r13
01M8FSWGC7SHPF4VD9THKTAHPV.

## Already alive before this round (audited, kept)

Footprints in the snow, breath puffs, chimney smoke, pines that sway, snow shaken off pines when brushing past,
glints on the snow and the ice gates, falling snow in three layers, an aurora at night, area music layers, animal
blinks, breathing, tail wags and head turns toward Pip, pill bumps, the shutter's ready pulse, toasts and haptics.

## What shipped

| # | Change | Discipline |
|---|---|---|
| 1 | **Wind gusts** every 9 to 17 s: the pines lean harder, the falling snow streams sideways, fine powder skims the ground and the wind swells with a soft whoosh. | Environment / VFX / Audio |
| 2 | **Snow clumps** slip off a pine near Pip every few seconds (more often in a gust). | VFX |
| 3 | **A small flock** of five birds crosses the sky by day every 24 to 40 s, with a chirp from its side. Two instanced draws, drawn only while it flies. | Environment / Animation |
| 4 | **Animal idles** between poses: sniff the snow, shake the snow off (with a puff), look around. A **curious head tilt** when Pip stands close. Idles never run during a pose or its cue, so photo timing is unchanged. | Animation |
| 5 | **Pip comes alive**: glances at the nearest animal, and when left standing rubs the mittens, stamps the boots or checks the camera. | Animation |
| 6 | **HUD motion**: the snowflake counter rolls up to a gain, buttons squash under the thumb, the shutter breathes gently, book tabs slide the page in and the cards pop in one after another, and tabs give a light haptic tick. Reduced motion turns these off. | UI motion |
| 7 | **Ambient sounds** by place and time: birds in the meadow, creaking lake ice, cave drips and a distant owl at night, panned left or right. | Audio |
| 8 | **Bug fix**: the treat close-up framed Pip and a hiding animal from their midpoint, which pushed Pip off the edge of a 360-wide screen. It now leans at most 1 m toward the animal (`camera.focusShiftM`). New playtest check. | Camera / QA |

All life effects draw from their own random stream, so the seeded gameplay rolls (poses, rares, requests) are
unchanged. All tuning values live in `game_config.json` under `alive`.

## Measured

| | Round 14 | Round 15 |
|---|---|---|
| 4G first frame (3 runs each, interleaved, same session) | 2.12 / 2.06 / 2.07 s (median 2.07) | 2.05 / 2.08 / 2.27 s (median 2.08) |
| transfer (load test) | 262 kB | 266 kB |
| render cost, same frames (draws / triangles) | 213 / 424k | 212 / 424k |
| low-end phone profile, 6x CPU, software GL (frame p50 / game code) | 150 ms / 32.4 ms | 133 ms / 28.7 ms |
| full playtest | 106/106 | 108/108 (new: treat close-up keeps Pip framed; a gust blows and a flock passes) |
| unit tests / CI / feed bundle test | 29/29, pass, errors: [] | 29/29, pass, errors: [] |

This session's machine ran slower than round 14's, so the load times are compared in the same session; they are the
same within noise. The software-GL frame times compare runs only; a real phone is much faster.

## Visual scorecard (aaa-graphics, per screen)

| Screen | Score | Note |
|---|---|---|
| Gust sequence (`alive-*-a01-gust*`) | 8 | Streaming snow is subtle by design; it reads in motion more than in a still. |
| Flock (`alive-flock-closeup`, `alive-*-a02`) | 8 | Small birds over the ice gate, under the HUD. |
| Fox shake / Pip idle (`a03`, `a04`) | 8 | Small movements; best seen in play. |
| Counter roll, page turn (`a05` to `a07`) | 8 | Cards pop in order; the counter rolls to 54. |
| Comfort tour 360/768 (`comfort-*`) | 8 | Unchanged flow, no errors. |

## What waits (and why)

| Idea | Why it waits |
|---|---|
| Footprints that slowly fill with snow | They already fade out; a fill shader needs its own QA pass. |
| Separate ear flicks | Ears are merged into the head mesh; it needs a per-species ear pivot. |
| Animals reacting to each other (play, chase) | New behaviour that touches photo timing; it needs pacing QA. |
| A full day-to-night light shift during one session | It changes how often night animals appear, which is a pacing change. |
| Swimming fish or ice cracks on the lake | New art; better as a chapter 2 lake beat. |
