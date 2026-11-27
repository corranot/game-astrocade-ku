# Pending drafts on 45 more live games (27 Nov 09:20-10:00 UTC)

Rechecked with the Astrocade MCP after the owner asked. `list_my_games` flags 46 games with unpublished edits; `list_versions` shows 45 of them carry real content drafts from the 25 Nov bulk wish round (one manual save at 17:22-17:43 UTC with no description, then a `GOAL ...` wish at 17:44-18:48 UTC per game), many followed by 26 Nov `continue`, error-fix or frame-rate wishes. Jelly Bump Party was never published and is private.

Each draft was pulled, served locally with a stub host, handed over `run('edit')` then `run('play')` at 390x844, 360x640 and 768x1024, and its own tests were run. Every share that sent a picture was changed to send only title and text, and saved as a new draft (nothing published). Version ids below are the drafts to publish.

| Game | Handover, 3 sizes | Own tests | Share sent a picture | Draft to publish | Notes |
|---|---|---|---|---|---|
| Snip It | ok | ok | image yes | 01M8E55GVNYA2VF324A0KBA1TW | Candy Land L51-55 |
| Block Smash Crew | ok | ok | image yes | 01M8E55K9CHTJPXGDYSJAR6YFR | first-40s crash |
| Toy City Stomp | ok | ok | image yes | 01M8E55P63YE0ACP6Z8THF29RD | first 40 s |
| Pinata Maker | ok | ok | image yes | 01M8E55S2G6DVJB8P5XYAJK2ST | smash moment + share |
| Fizzy Bath Bomb | tablet crash (negative sparkle size) once, fixed; rerun 3 sizes ok | ok | image yes | 01M8E6GADZ7T7FQPSE6V06FYMF | 3D conversion |
| Pet Smile Clinic | ok | ok | image yes | 01M8E59C7S45RPNG310V3Y2FPS | 3D conversion |
| Winter Toy-Box | ok | ok | image yes | 01M8E5BWDMS0VY0K8VXM645W6X | Three.js from jsdelivr at runtime (slower load) |
| Aurora Heist | ok | ok | image yes | 01M8E5BY75TWXG5J4GWF87B022 |  |
| Frosty Heist | ok | ok | image yes | 01M8E5FP05MK65AGWSWESDV5YM | identity change (snowball fort) |
| Punch Tower | ok | ok | image yes | 01M8E5FREX29RRSHZNMM64ECAR | load error not reproduced |
| Pixel Blast | ok | ok | image yes | 01M8E5GW26ZTP046MHAPDG3BAX | 3D voxel conversion |
| Tiptoe & Hatch | ok | ok | image yes | 01M8E5BTX0QGV2NHCC615WKDKC |  |
| Sprint Past the Tsunami | ok | ok | image yes | 01M8E5BZEMQPDBG525FKD7000Y |  |
| Bus Telolet | ok (re-verified after save) | ok 7/7 | image yes | 01M8E5JC7T34TWWSFTDE09E2MK | draft failed platform bundler ("Could not resolve 'three'" dynamic import) -> fixed with runtime specifier |
| Martabak Master | ok | ok | no share | not needed | 3D conversion |
| Ambulance Rush | ok | ok | image yes | 01M8E5PCF86C5303TQ8XPTDN6M | test updated |
| Cozy Room Designer | ok | ok | no share | not needed | 3D conversion |
| Splash Master #2 | ok (own loader 8 s timeout log on swiftshader) | ok | image yes | 01M8E5VXGE1530F98JMN6XMDXN | check phone load time; many fps wishes |
| RUN! Pet Thief 3D | ok | ok | image yes | 01M8E5W5HBFCCNRSVVK9GD8QRC |  |
| Splash Master #1 | ok | ok | image yes | 01M8E60N9V3DVJAAEZ72CV8TGX | removed snapshot await |
| Bicep Clash | ok | none | image yes | 01M8E60T0F7FTPB696BA70P8PR |  |
| Blueprint Builder | ok | ok | image yes | 01M8E62YEH86JXG8D7K9Z5NZXR |  |
| Asteroid Wars | ok | ok | image yes | 01M8E5KK7SF567C4XJ9Q6N9VE9 |  |
| FLOW STATE | ok | ok | image yes | 01M8E5KNST8S74GDB7TJD2BA3T |  |
| Turbo Splash | ok | ok | image yes | 01M8E5TBJC4DWRCF8FAP5MSSQ5 |  |
| Kebab Street Tycoon | ok | ok | image yes | 01M8E5TFV3C3WHTQASBCMCZS7F |  |
| Escape the Hippo Warden | ok | ok | image yes | 01M8E5TJEZZYN545ZJTVSJYPN5 |  |
| Titan Gates | ok | ok | image yes | 01M8E64ZFRWN4R8ZTFR5EAC5D9 |  |
| Giant Snowball Smash | ok | ok | image yes | 01M8E652T49P6F0XWREHTWBG0H | test updated |
| Juice Face Slice | ok | ok | image yes | 01M8E655366F8JAWATT35PRC60 | plat error fixed in draft |
| DIY Squishy Studio | ok | ok | image yes | 01M8E657TSNF07HJ54S6C85Z3E | test updated |
| Paint Peekaboo | ok | none | image yes | 01M8E65BSZ8764TQ4Y38G5TCT2 |  |
| Mega Aura | ok | ok | image yes | 01M8E65F38T567801E65GT7WRX |  |
| Candy Mine Vacuum | ok | ok | image yes | 01M8E59SQF6RZSBA4HAFR6ZW5H |  |
| Tiny Town Mayhem | ok | ok | image yes | 01M8E59X1XGARWQ18JZWEJ8HCS |  |
| 3D Date Stylist | ok | ok | image yes | 01M8E5D9WEPW90X29DHWKW19FD |  |
| Prop Heist | ok | ok | image yes | 01M8E5DGZD22ZCYT8FA8HP0QME |  |
| Megalodon.io | ok | ok | image yes | 01M8E5JFZ9JD4EP1JQWKBNRYN5 |  |
| Miawdoku | ok | ok | no share | not needed | 3D conversion |
| Dum Biryani | ok (after local bundling) | ok 7 | image yes | 01M8E66VTPXB4TMR0GBNSJASR1 | Three from cdnjs at runtime |
| Hero Bridge Royale | ok | none | image yes | 01M8E672APD0FPQVSHGFQQYJY3 |  |
| Toybox Town | ok | ok | image yes | 01M8E6A38PEM9M2ZXEGC5GB4G0 |  |
| Tame a Dragon | ok | ok | image yes | 01M8E6ABWYPNDBJ9HCWQ9R64SD |  |
| Spooky Squad 3v3 | ok | ok | image yes | 01M8E6D2CN93VDCS32PKFVNGY8 |  |

Draft contents per game (from the version list) are in `drafts-46-classification.md`.

## Watch before publishing
- Frosty Heist: the draft re-themes the game as a snowball fort battle (identity change).
- Six drafts convert a 2D game to 3D (Fizzy Bath Bomb, Pet Smile Clinic, Pixel Blast, Miawdoku, Martabak Master, Cozy Room Designer); existing 2D games are not converted unless the owner asks, and her 2D games carry most traffic.
- Fizzy Bath Bomb: one run hit a crash on the tablet size (negative sparkle size); fixed in the listed draft.
- Bus Telolet: the draft could not be bundled by the platform (dynamic import of 'three'); fixed in the listed draft.
- Winter Toy-Box and Dum Biryani load Three.js from a CDN at run time; Splash Master #2 logs a slow-load timeout on the software renderer.

## Lesson
The `unpublished_edits` flag is accurate: it cleared on all ten games published earlier today. A pending-draft audit must call `list_versions` for every flagged game instead of treating the flag as noise.
