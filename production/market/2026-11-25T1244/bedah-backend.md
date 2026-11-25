# Astrocade backend dig, 2026-11-25 12:44 UTC (vs 2026-11-24T1035)

Method (leanrea, read-only, guest): Playwright on astrocade.com (home, search, create, earn, feed, a game page) at
mobile size; 184 JS chunks downloaded from the web app CDN and sliced with `rg`; 71 JSON responses kept
(`/v4/feed`, Statsig initialize, flags); astrotopper weekly board; MCP `list_my_games` and `list_versions`.
No login, no API calls made by hand beyond one unauthenticated GET (refused), nothing published or set.
**SEEN** = in code, config or a response (file named). **INFERRED** = reasoning. **UNKNOWN** = not checkable.
Network today: astrocade.com and astrocade-api-prod.com reachable; astrotopper.com 502 via proxy, but
`astrotopper.vercel.app` (what `tools/market-check.js` uses) works.

## 1. Animated thumbnails: the web app plays them (SEEN)

- The game card component is named `GifThumbnail` (chunks `35ia87238i71e.js`, `3c31ck9cvlpp5.js`). It is used
  for every feed card, the large game card and the create-page metadata thumbnail.
- Its helper (`1s-pgs8tjuy72.js`) marks a cover as animated when the URL ends in `.gif`, or ends in `.webp`
  **and is not under `/assets/images/`**. Animated covers are first served as `frame=first` (still); the card swaps
  to `frame=all` only when: the card is in view, it is the active card, the page has not scrolled for 500 ms,
  the browser is idle, and `forceStill` is off. So the GIF moves only when the player stops on that card.
- `/assets/images/` is where Astrocade's own generated images live (all `generate_thumbnail` style covers are
  there). An animated WebP there is shown still: "Stickman Archer Duel" has a 21-frame WebP cover under
  `/assets/images/`, and the card never animates it.
- The staff curated list in `42z235xmjhueu.js` already uses GIF covers on real games, all under the user upload
  hosts (`d16qq0o35va7kz` / `dzmv1mxivz48k.cloudfront.net/images/<user>/...`): e.g. `...tapdestroy-ezgif.com-optimize.gif`,
  `...PixVerse-AI-Video-1-.gif`, `...CoasterThumbnailGif.gif`, `...slicedrop.gif` (5 of 35 curated covers are GIF).
- Upload path for a creator: the editor chat attach button accepts `jpg, jpeg, png, gif, webp, svg, ...`,
  max **3 files, 4 MB each** (`155gebro-k_pp.js`, module 151099: `n = 4194304`), uploaded through `/v3/image/upload`
  to the user upload host. With the thumbnail selected, the wish box says "Wish for changes about the game's
  thumbnail..." and the agent receives "(user selected the game thumbnail)". A thumbnail set from such an
  upload keeps the user host URL, so a `.gif` there would match the animated rule. **INFERRED**: whether the
  agent keeps the GIF as is or re-renders it to a still image is **UNKNOWN**; only a real try shows it.
- Today's feed: 67 covers seen, 0 GIF (34 png, 29 webp, 4 jpg). So almost nobody uses this; a moving cover
  stands out.
- MCP still cannot do it: `generate_thumbnail` makes a still image under `/assets/images/`, and `set_thumbnail`
  only takes that output.
- Home hero videos (`/videos/d0-hero/v1/<id>.av1.mp4/.h264.mp4/.poster.webp`) exist for 8 hard-coded game ids
  only. Staff-picked, not a creator option.
- Mobile web game page (screenshot `top3-mobile-game-page.jpg`): the cover sits as a card with a Play button on
  top of the game running dimmed behind it. The cover is the first thing a visitor reads.

## 2. Flags changed since 24 Nov (SEEN, `flags.json`)
`live-preview-value-mobile` removed; new `feels-v3-app` / `feels-v3-d7-app = mixed-v3`, `social-button-variants-
experiment-v2 = two-icons`, `leaderboard-share-prompt-web = hidden`, `webview-seam-recycle = on`.
Still on: `show-thumbnail-in-feed-experiment = treatment`, `game-screenshots = treatment`, `gpt-image-2-5-covers = on`.
"Feels"/"Shorts" (`2e9f6ljpjc45c.js`) = house-made micro-games (byline "house", e.g. "toast-it", "carve-the-pumpkin")
mixed into the feed for ad-acquired users ("Shorts play instantly · Swipe up to skip"). Not open to creators.

## 3. Platform traffic (astrotopper weekly gain = daily-plays proxy; feed plays/age)
Fastest this week: Minecraft Guns +410K (new), Color Quest +400K (new, coloring for kids), Smash Everything +391K,
Draw One Part +382K, Kaiju City +328K, 41 Ragdoll Executions +299K, Minecraft Sandbox TNT +270K, Counter Arena +217K,
Papercut.io +202K, Lip Art Studio +200K, Giant Salami Saw +198K. New entries: Trace & Color Kids +175K, Minecraft
Creative +171K, Lava Rises! +147K. Full list in `report.md`.

Families winning now: (1) smash/destroy/ragdoll (Smash Everything, Kaiju City, Ragdoll, Robo-Crash 37.8K/day,
Crash Bot Lab 29.9K/day); (2) kids coloring/drawing (Color Quest 54K/day, Coloring Quest 16K/day, Trace & Color
Kids, Draw One Part); (3) DIY/ASMR/beauty (Astro Slime Studio 52.6K/day, Lip Art, Nail Art, Squishy);
(4) branded Minecraft remixes (many, but brand risk).

## 4. What top covers share (`top24-covers.jpg`, 24 fastest games in the feed)
- Title in huge, thick, outlined letters across the top 25-30%; often 2 lines; a short subtitle ribbon.
- One hero object/character centred, mid-action (hammer hitting a robot, slime being stretched, gun firing).
- Saturated, bright, high contrast; AI-illustration look; no dark covers among the top 24.
- Promise of variety shown as a grid of items (Crash Bot Lab "20+ EPIC WEAPONS", Minecraft Snipers).
- "NEW UPDATE!" badge on Papercut.io (79.6K/day, the top game).
- Robo-Crash (a giant hammer smashing a robot, 37.8K/day, 1.68M plays) is the closest match to +1 Mega Hammer.

## 5. +1 Mega Hammer: Smash and Grow (01M88DAAFTWX92H6DF0Q73H0MM) (SEEN, MCP)
Private, review_status `not_ready`, **0 plays**: never submitted or published, so there are no stats yet.
13 versions today; current draft is the 12:14 UTC wish "change this as the thumbnail, without any edits, just
delete the other thumbnails". A second private game "Mega Hammer Royale: Sky Forge" also exists, 0 plays.

## 6. Own account (MCP, 26 h since last snapshot)
+16,094 plays. Rub It Away +9,420 (8.6K/day, up from 6.1K/day), Reel & Hatch 1.4K/day, Draw It Alive 1.2K/day,
Grab and Park 0.7K/day, Pin & Bloom 0.7K/day.

## 7. Recommendations
1. If a moving cover is wanted: make a GIF under 4 MB, 2:3, first frame strong on its own (it is shown still until
   the player stops on the card). Attach it in the astrocade.com editor chat with the thumbnail selected and wish
   "use this exact GIF as the thumbnail, do not convert". Then check the game card on a phone. If the URL ends in
   `.gif` on the user host, it animates. This is the owner's step (thumbnails are hers).
2. Whatever the format, follow the winning cover pattern above: huge outlined title, one giant hammer mid-smash,
   bright colours, debris.
3. Publish +1 Mega Hammer for review: it has 0 plays, so the market cannot judge it yet. Smash/destroy is a top
   family this week, and Robo-Crash proves a hammer-smash cover sells.
4. Keep updating Rub It Away (fastest own game, growing); a "NEW UPDATE!" badge is used by the top game.
5. Next-game concepts: smash/destroy or kids coloring families; avoid Minecraft/Ben 10 brand remixes.
