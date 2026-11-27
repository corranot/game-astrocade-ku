# Held 7 updates: fixed and published (27 Nov 2026)

The owner held seven 25 Nov Astra "GOAL" drafts (six 2D->3D conversions, one theme change) and asked for them to be fixed first and published only when truly safe.

Method: each game's live version was restored as the draft base (held drafts stay in version history), the held draft was diffed against it, only gameplay-neutral improvements that fit the original game were ported, then share (title/text only, no image), FTUE and HUD were checked or added. Each saved draft was re-pulled and verified (own tests, run('edit')->run('play') at 360x640, 390x844, 430x932, 768x1024 with 0 errors, share keys, FTUE play-through), then opened on the real Astrocade draft page in Chrome. Two visual review rounds before publish.

| Game | Held draft: kept / dropped | Added | Published draft |
|---|---|---|---|
| Frosty Heist (3D live, stays 3D) | 3v3 fort-battle retheme, build walls, charged snowball, snowstorm, team saves dropped; perf items already live | Spotlight FTUE (grab egg, bring home, freeze guards, shop) with hero cut-out and goal-icon edge markers on the hero->goal line; SHARE on results | 01M8EBSYW36GG6XY4YXHFCPTDP |
| Fizzy Bath Bomb Maker | Three.js scene dropped; share + particle radius crash fix kept | SHARE pill beside MAKE ANOTHER; labelled unlock pill under stats; Skip on first-bomb guide | 01M8EBJ938A3EBVKF180YWZT67 |
| Pet Smile Clinic | draft was not 3D; soft music loop + happy chirp kept | Spotlight FTUE (carrot, tool, tooth, photo), first smile ~16 s, SHARE on result card | 01M8EANT8A8KE44TVV17SPCW9Y |
| Pixel Blast | 3D voxel renderer and 3D-only fx dropped; game-over share + boss sub-bass kept | Spotlight FTUE (steer, blast with ship->invader guide, NOVA) | 01M8EA43JTRJ9B9T77MHWHJKMT |
| Miawdoku | held draft identical to live | SHARE on win card | 01M8EAN9DFCQFB3H403RC093ZZ |
| Martabak Master | held draft identical to live | Edit->play handover fix, spotlight FTUE on first order, SHARE on result card | 01M8EB2FPNETB3H9G2SAY6XG4S |
| Cozy Room Designer | 3D renderer dropped | Edit->play handover fix, 3-step spotlight FTUE (7 languages), SHARE on happy-guest card | 01M8EB4FMFD8FPPWXSVFT6M0DF |

All published with player saves and leaderboards kept; no thumbnails touched. publish_game returned approved/live for all 7.

Open notes:
- Miawdoku keeps its existing interactive tutorial, which opens with 4 "Next" rule pages; a dim layer was not added to keep the board readable.
- Martabak and Cozy previously stayed in edit mode (Martabak) or started twice (Cozy) when the host called run('edit') then run('play'); both fixed and checked with a single run('play') too.

Screenshots: `shots/`.
