# Players' Choice candidates on Larisha's account (2026-11-26 17:40 UTC)

Analysis only: no game was changed, drafted or published. Asked by Larisha: which of her games can get into
Players' Choice, and what the strategy should be. Rules come from `docs/astrocade-distribution-playbook.md`
§11.2: at least 50,000 plays, then
`score = 15 × D1-style retention + 10 × share of sessions over 300 s + 0.033 × p50 s + 0.01 × p75 s`,
pool of up to 60, re-drawn within minutes.

## Sources

- Plays now: `list_my_games` (MCP) at 17:37 UTC. Plays 24.8 h earlier: `../2026-11-25T1648-account-audit/my-games.json`.
- Session numbers: owner analytics screenshots of 18 Nov (`docs/game-history.md` §11). They predate later
  updates, so they are a guide, not today's value.
- Likes and shares per 1,000 plays: guest feed today (`../2026-11-26T1700-deep-dig/games-2026-11-26.json`).
- **Not available to us:** retention, the share of sessions over 5 minutes, and today's p50/p75. They are
  in Larisha's analytics page only (`astrocade.com/create/analytics`). Every score below is an estimate.

## Every game with a chance, ranked

Pool medians for comparison: likes 18.5 and shares 7.3 per 1,000 plays; lowest pool member about 3.8K plays/day
on lifetime average.

| # | Game | Plays | Last 24 h | To 50K | Likes /1K | Shares /1K | Session data (18 Nov) | Call | Confidence |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Rub It Away | 74,693 | +11.3K | passed | 18.0 | 17.4 | p50 1:35, p75 3:10, 80% significant | Best chance now: gate passed, traffic high, social proxies at pool level. Weak on 5-minute sessions | Medium |
| 2 | Draw It Alive | 20,705 | +15.5K | about 2 days | 7.7 | 1.2 | none | Reaches 50K first, but likes and shares are far below the pool, which points to weak satisfaction | Medium on the plays, low on the score |
| 3 | Soap Carving | 13,475 | +12.5K | about 3 days | 9.9 | 32.0 | none | Shares are excellent; likes are low | Medium on the plays, low on the score |
| 4 | Reel & Hatch | 37,212 | +0.7K | about 19 days | 17.0 | 27.2 | p50 1:58, p75 5:03, 86% significant | Best measured sessions on the account (p75 over 5 minutes), but traffic has faded. Update boost ends about 8 Dec | Medium |
| 5 | Old games past 50K (Splash Master #1 and #2, Blueprint Builder, Pet Thief, Paint Peekaboo, Hero Bridge, Tiptoe & Hatch, Bus Telolet, Date Stylist, Dum Biryani) | 52K–218K | +35 to +370 each | passed | – | 11–75 | Paint Peekaboo p50 1:59, p75 4:04 | Pass the plays gate but get under 400 plays a day. Every pool member gets thousands a day, and past 30 days no update boost applies | Low |

Rough score estimates (INFERRED; unknown retention set to the platform prior of 18%):
Reel & Hatch about 12.1 (3.9 + 3.0 + 2.5 deep + 2.7 retention); Paint Peekaboo about 10.8; Rub It Away about 8.7
(3.1 + 1.9 + about 1.0 deep + 2.7). The pool's own scores are unknown, so these rank our games against each
other only.

## Top 4: the gap and the three biggest changes

How each change can be made: **Wish** = an Astra wish on the existing game; **Build** = our own code
(`prototypes/<game>/`, shipped with `astrocade-ship`). Rub It Away and Reel & Hatch exist only as Astra games,
so wishes are their route. Draw It Alive and Soap Carving have repo source, so both routes are open.

### 1. Rub It Away: already eligible, needs depth

Gap: plays done. Score likely held back by 5-minute sessions (p75 3:10) and an unknown return rate.
About 18 days of update boost left.

1. A long goal that runs past minute 5: a picture album or world map with a completion meter, so finishing a
   level leads straight into the next set. Raises the over-5-minutes share. **Wish.** Confidence: medium.
2. A reason to come back tomorrow: a "picture of the day" or a daily gift. **Needs Larisha's decision first:**
   on 21 Nov she removed auto-next, the streak and the leaderboard, and on 24 Nov said to leave them out. A daily
   picture is not a streak, but it is close. **Wish.** Confidence: medium (formula weight is SEEN, effect INFERRED).
3. A named content pack every 3 days until the window ends, so the update boost keeps it in front of new
   players while (1) and (2) lift the score. **Wish.** Confidence: high on the boost, medium on the effect.

### 2. Draw It Alive: will pass 50K in about 2 days, score is the problem

Gap: about 29K plays. Likes 7.7 and shares 1.2 per 1,000 are the lowest of our live games.

1. The share card of the player's own drawing coming alive (Wish 1 in `production/astra-wishes/draw-it-alive.md`).
   Check first whether it shipped. **Build or Wish.** Confidence: medium.
2. Depth after level 20: a sticker-album completion goal and one more chapter, so a session runs past 5 minutes.
   **Build** (source in repo). Confidence: medium.
3. A daily drawing puzzle on top of the existing daily gift of drops. **Build.** Confidence: low to medium.

### 3. Soap Carving: will pass 50K in about 3 days, needs likes and depth

Gap: about 36.5K plays. Shares are strong (32 per 1,000); likes are about half the pool's.

1. A bigger finish: a show-off moment for each finished soap (turntable, sparkle, the customer's reaction) right
   where the like button matters. **Build.** Confidence: low to medium (likes' weight is UNKNOWN; they correlate
   with the pool).
2. A collection that lasts: the charm album with a visible completion meter and rewards per set, aimed past
   minute 5. **Build.** Confidence: medium.
3. A daily special order (one rare soap a day). **Build.** Confidence: medium.

### 4. Reel & Hatch: best sessions, needs traffic before the window closes

Gap: about 12.8K plays at about 0.7K a day; the update boost ends about 8 Dec.

1. A meaningful update every 3 days (new sea, new boss) to win back feed traffic while the boost lasts.
   **Wish.** Confidence: medium.
2. A share card at the hatch moment (the game has no `lib.share` call, SEEN in its wish file). **Wish.**
   Confidence: medium.
3. A return reason: farm earnings waiting when the player comes back. Check first whether the farm already pays
   while the player is away. **Wish.** Confidence: medium.

## What we cannot see, and how to close it

Ask Larisha for one screenshot of the analytics page for Rub It Away, Draw It Alive, Soap Carving and Reel &
Hatch (median, P75, significant share). Then the estimates above become measured inputs. Retention is not on
that page as far as we know (`docs/game-history.md` §11 lists no return metric).
