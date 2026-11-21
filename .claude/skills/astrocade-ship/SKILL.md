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
4. `node tools/astrocade-bundle-test.js prototypes/<name> [shot.png]`: must say `started: true` with no errors. This is the only Astrocade-like run available (the owner cannot share a login).

## Upload
5. `bash tools/astrocade-upload-set.sh prototypes/<name> <scratch>/up` and copy `game_config.json` and `asset_map.json` next to it.
6. `pull_game` with the last `sync_token`. If it answers "changed", compare each file with `cmp`, merge, and only then save. Never overwrite edits you have not seen (a wish from astrocade.com may have fixed something).
7. `begin_upload` (purpose `game_file`, exact `size_bytes`) for EVERY file, then `curl -X PUT -T <file> '<upload_url>'` for each (expect 200). Upload ids expire after 15 minutes.
8. `save_draft` with all `file_upload_ids` (files left out are deleted), a one-line `change_summary`, `change_details`, and a `reason` in your own words without personal details. Keep the returned `sync_token` and `draft_play_url`.
9. `list_versions`: the new save must be the current draft. A later "Wish" titled "fix this game error" means the draft is broken: pull it, find the fix, port it to the repo.

## Artifact (the owner tests here)
10. 2D game: `node tools/single-file.js prototypes/<name> <scratch>/art/index.html [modules]`. Three multi-module game: `node tools/artifact-modules.js prototypes/<name> <scratch>/art/index.html`, copy every module and local images next to it, and publish them through the Artifact tool's `files`. Publish to the same URL as before.

## Report
- Links: draft play URL (owner-only), artifact, PR.
- Proven vs not proven, separately. Never "bug-free". Real-phone FPS stays unproven until measured.
- Remind: the owner makes the thumbnail; publishing waits for the owner's word.
