# Deep backend dig, 2026-11-26 16:56 to 17:15 UTC

Read-only guest capture of astrocade.com and astrocade-api-prod.com, about one request per second.
Nothing was published, liked, shared or set. Findings are written up in
`docs/astrocade-distribution-playbook.md` §11; this file lists the evidence.

## Files

| File | What it holds |
|---|---|
| `rows-2026-11-26.json` | Every home row read to its end (24 rows), served order of game ids, US guest |
| `games-2026-11-26.json` | One line per game (1,800): plays, age, plays/day, likes, shares and comments per 1,000 plays, remix, leaderboard, title and description length, owner lifetime plays and followers, cover host, rows it sits in with position |
| `players-choice-2026-11-26.json` | The first Players' Choice draw (21 games) with full public fields |
| `players-choice-pool-10-samples.json` | 10 draws from fresh guests: how often each game appeared and its mean rank (34 games) |
| `statsig-configs-2026-11-26.json` | The ranking configs served to guests today: gallery rows, Players' Choice, theme gate, boosts, dead-game gate, search, review-on-demand, taxonomy (14 fields), first-visit tags, Shorts row weights, contests history, study lists |

How to repeat: `node tools/row-crawl.js <out.json> [row ...]`. Statsig configs come from the
`/v1/initialize` response of the home page (see `tools/market-check.js` for the capture pattern).

## Endpoint map (SEEN in the web app bundle and network)

| Call | Purpose |
|---|---|
| `POST /v4/feed?filter=gallery&categoryPageSize=N&numCategories=10&paginationToken=…` | Home rows; the token is base64 JSON `{category_row_offset, algorithm_metadata:{seed}, gallery_id}` |
| `POST /v4/feed?filter=gallery&category=<row>&categoryPageSize=N&paginationToken=…` | One row, paged; token `{category, offset, algorithm_metadata:{seed}}` |
| `GET /v4/feed?filter=playlists&category=…` or `&arm=…` | Curated playlists (Thrill, Classics, Relax, Compete) |
| `/category/<row>` page | Server-rendered first 20 games plus a token |
| Headers | `authorization` and `x-guest-id` = `guest-<uuid>`; `user-country`, `user-day-n`, `client-device-language`, `user-connection-type`, `x-experiment-variants` |
| `fueTags` query param | First-visit tag picker choice, from a cookie (`fue-tag-selector` experiment) |
| `feels_stage` in the response | Short-form taste stage: `gentle` or `stepped_up` (`shorts-taste-v1`); moves the Shorts row to slot 5 or 3 |

## Players' Choice

Config today (`3478718458`): `min_plays 50000, pool_size 60, min_pool_size 20, selection_temperature 0.25,
deep_spr_threshold_sec 300, p50_weight 0.033, p75_weight 0.01, deep_spr_weight 10, retention_weight 15,
knn_dedup dedup-description, manually_added [], manually_removed []`.

Draw at 16:59 (21 games) and nine draws from 17:09 to 17:11 (23 games each): 10 games in all ten, 13 only
in the later nine, 11 only in the first. The pool was re-drawn between the two. Past snapshots (18, 20,
24, 25 Nov) show the same churn.

## Medians: pool against everything else in rows

| Group | n | Plays/day | Age d | Likes/1K | Shares/1K | Remix | Leaderboard | Own cover | Owner lifetime plays |
|---|---|---|---|---|---|---|---|---|---|
| Players' Choice | 21 | 14,923 | 18 | 18.5 | 7.3 | 14% | 67% | 43% | 3.2M |
| Recommended For You | 30 | 4,298 | 11 | 14.1 | 3.6 | 70% | 40% | 7% | 0.97M |
| Discover More | 30 | 5,175 | 18 | 14.5 | 4.5 | 57% | 37% | 17% | 1.4M |
| Theme rows only | 1,719 | 453 | 15 | 15.2 | 4.9 | 44% | 55% | 8% | 0.57M |
| Theme rows, 50K+ plays | 405 | 5,449 | 33 | 16.8 | 5.7 | 40% | 57% | 16% | 2.8M |

## $100K Creator Contest

Rules and blog read in full (26 Nov). The list of the 25 selected creators is not on any page, API or
config we can read, and no press article names them. x.com refuses automated reads. See playbook §11.5.

## Not checked

Logged-in rows (`because_you_played`, `featured`, `beta`, `new` answer empty for guests), the GBDT
features, the pool re-draw cadence beyond "within 10 minutes once", and iOS or app clients.
