# Astrocade backend check, 2026-11-25: can a thumbnail be an animated GIF?

Read-only. No thumbnail generated or set, no game changed. Tags: **SEEN** = in a tool schema,
tool reply, saved config or saved code note; **INFERRED** = reasoning from those; **UNKNOWN** = not checkable today.

## Answer

No path in the Astrocade MCP makes an animated thumbnail. The thumbnail designer is an image model
that returns one still picture. The "moving thumbnail" a player sees in the feed is the game itself,
running muted as a live preview.

## Evidence

1. **SEEN** `generate_thumbnail` takes only `game_id`, `instruction`, `reference_asset_ids` (max 20),
   `reference_upload_ids` (max 4). No format, animation, frames or duration parameter. It "designs a 2:3
   thumbnail"; a reference image is "adopted, cropped to 2:3, or designed from".
2. **SEEN** `set_thumbnail` accepts only a `request_id` of a successful `generate_thumbnail`. There is no
   way to set an arbitrary uploaded file (GIF or otherwise) as the thumbnail through MCP.
3. **SEEN** flag `gpt-image-2-5-covers: on` (`production/market/2026-11-24T1035/flags.json:102`). Covers come
   from a still-image model, so output is one frame. The .webp result matches this.
4. **SEEN** feed flags: `live-preview-value-mobile: large_card`, `show-thumbnail-in-feed-experiment: treatment`,
   `game-screenshots: treatment`; `live-thumbnail-experiment` off on 2026-11-22. The host runs `run("play")`
   muted on the feed card before any tap (`2026-11-22-platform/bedah.md` §A.2, §A.7).
5. **SEEN** web app upload endpoints: `/v3/image/upload`, `/v3/screenshot/upload`, `/v3/cover-photo/upload`
   (`2026-11-22-platform/bedah.md:282`). Whether the web upload keeps GIF frames is **UNKNOWN**.
6. **SEEN** the current draft of +1 Mega Hammer is a wish from astrocade.com at 12:14 UTC: "change this as
   the thumbnail, without any edits, just delete the other thumbnails" (`list_versions`). So a thumbnail
   was already chosen on the web.
7. **SEEN** today the egress proxy refuses astrocade.com, www/api/cdn.astrocade.com and astrotopper.com
   (HTTP 403). The web bundle and fresh traffic could not be re-read; the latest saved traffic snapshot is
   `production/market/2026-11-24T1035/` (astrotopper 7-day gain as the daily-plays proxy).
8. **SEEN** the MCP has no resources and no hidden tools: 23 tools, all listed with full schemas.

## Recommendation

1. Treat the thumbnail as a still image. Make the GIF for social posts, not for the Astrocade listing.
2. If Larisha wants to try a GIF on the listing, the only untested route is the astrocade.com uploader.
   She can upload the GIF there and check on her phone whether it moves. No tool here can do that test.
3. The real "animation" in the feed is the live preview. Make the first 1 to 2 seconds of the game look
   like the thumbnail: big hammer, a slam, debris, the title readable, with no sound needed.
4. For fresh traffic data and a new web-bundle dump, allow `astrocade.com`, `astrocade-api-prod.com`,
   `astrotopper.com` in the cloud environment's network settings.
