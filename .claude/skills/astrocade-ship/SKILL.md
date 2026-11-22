---
name: astrocade-ship
description: "Ships a game from prototypes/<name>/ to its Astrocade draft and the test artifact: checks, clean upload set, bundle test, upload, save_draft, version check, artifact. Use when the user asks to upload, update the draft, or send a game to Astrocade. Never publishes and never sets a thumbnail."
argument-hint: "<game folder name>"
user-invocable: true
---

# Astrocade ship

The working rules live in `ASTROCADE.md` (sections 4, 5 and 8); the repo map is `docs/repo-knowledge.md`.
This skill only orders the steps. Each step reports what it saw; a step that could not run is NOT ASSESSED, never a pass.

## Before uploading
1. `bash tools/ci-checks.sh`: syntax, JSON, modules that touch THREE when imported, clean upload sets. Fix every FAIL.
2. The game's own suite, e.g. `node prototypes/<name>/playtest.js` (and `screens.js` / `look.js` for 7-language screens, `layout.js` for spacing of the HUD and every card or panel, `contrast.js` where the game has one). Report failures with their output.
3. A fresh bug-hunting subagent on what changed (ASTROCADE.md section 5). Fix what it confirms.
4. `node tools/astrocade-bundle-test.js prototypes/<name> [shot.png]`: must say `started: true`, no errors and an empty `fail` (it runs the game as the feed does: sandboxed 720x1280 iframe, web lib, a real touch counted by document listeners). Report `feed.movesBeforeTouch` (the muted preview should be alive), `feed.tapChangedScreen`, `feed.code.leaderboard` and `feed.code.share` against ASTROCADE.md's "Hukum Nilai Astrocade". This is the only Astrocade-like run available (the owner cannot share a login).
5. If the game has `bake.js`: `node tools/bake.js prototypes/<name> --check`. On FAIL, re-bake (`node tools/bake.js prototypes/<name>`), look at the screens that use the sprites again, and treat `baked.webp` as a changed asset below.

## Upload
6. Media: `node tools/assets.js prototypes/<name>` lists each local image/sound/model as ok, preview (a shrunk copy kept for the artifact), NEW or CHANGED. The first time on a game without `assets.lock.json`, run it with `--adopt` (records files the CDN already serves byte for byte, and names likely shrunk previews: look at both, then `--record <file> <url> <id> --preview`). For each NEW/CHANGED file: `begin_upload` (purpose `asset`, exact size) + `curl -X PUT -T` + `upload_asset`, then `node tools/assets.js prototypes/<name> --record <file> <url> [id]` (writes the lock and `asset_map.json`). Only changed files go up.
7. `bash tools/astrocade-upload-set.sh prototypes/<name> <scratch>/up` (drops the prototype header and every `dev:start` … `dev:end` block: cheats and test hooks never ship) and copy `game_config.json` and `asset_map.json` next to it.
8. `pull_game` with the last `sync_token`. If it answers "changed", compare each file with `cmp`, merge, and only then save. Never overwrite edits you have not seen (a wish from astrocade.com may have fixed something). If `list_game_files` shows `unsaved_edits: true`, another session left server-side edits: ask the owner before `discard_edits`.
9. `begin_upload` (purpose `game_file`, exact `size_bytes`) for EVERY file, then `curl -X PUT -T <file> '<upload_url>'` for each (expect 200). Upload ids expire after 15 minutes.
10. `save_draft` with all `file_upload_ids` (files left out are deleted), a one-line `change_summary`, `change_details`, and a `reason` in your own words without personal details. Keep the returned `sync_token` and `draft_play_url`.
11. `list_versions`: the new save must be the current draft. A later "Wish" titled "fix this game error" means the draft is broken: pull it, find the fix, port it to the repo. To roll back a broken draft: `restore_version` with the owner's OK, then `pull_game` without a `sync_token`.

## Artifact (the owner tests here)
12. 2D game: `node tools/single-file.js prototypes/<name> <scratch>/art/index.html [modules]`. Three multi-module game: `node tools/artifact-modules.js prototypes/<name> <scratch>/art/index.html`, copy every module and local images next to it, and publish them through the Artifact tool's `files`. Publish to the same URL as before.

## Report
- Links: draft play URL (owner-only), artifact, PR.
- Proven vs not proven, separately. Never "bug-free". Real-phone FPS stays unproven until measured.
- Remind: the owner makes the thumbnail; publishing waits for the owner's word.
