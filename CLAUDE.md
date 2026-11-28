# Claude Code Game Studios -- Game Studio Agent Architecture

Indie game development managed through 49 coordinated Claude Code subagents.
Each agent owns a specific domain, enforcing separation of concerns and quality.

## Technology Stack

- **Engine**: [CHOOSE: Web / Godot 4 / Unity / Unreal Engine 5]
- **Language**: [CHOOSE: TypeScript / GDScript / C# / C++ / Blueprint]
- **Version Control**: Git with trunk-based development
- **Build System**: [SPECIFY after choosing engine]
- **Asset Pipeline**: [SPECIFY after choosing engine]

> **Note**: Engine-specialist agents exist for Godot, Unity, and Unreal with
> dedicated sub-specialists. Use the set matching your engine.

## Project Structure

@.claude/docs/directory-structure.md

## Engine Version Reference

<!-- ENGINE-REFERENCE-IMPORT: the line under this comment is engine-specific,
     and there is none until an engine is set. /setup-engine, the grow's record
     step and /project-settings (engine.name) write
     @docs/engine-reference/<engine>/VERSION.md here for the chosen engine. Skills
     that need the pinned version read that file on demand either way. -->


## Technical Preferences

`project.yaml` at the repo root is the primary config store — engine, specialists,
naming, platform, performance, modes. Skills resolve it via `resolve_config`
(see `.claude/docs/config-resolution.md`).

`.claude/docs/technical-preferences.md` is the **legacy fallback**, read on demand
when a key is absent from `project.yaml`. It is not imported here: before
`/setup-engine` runs it is almost entirely `[TO BE CONFIGURED]` placeholders, and
after it runs `project.yaml` holds the real values.

## Coordination Rules

@.claude/docs/coordination-rules.md

## Collaboration Protocol

**User-driven collaboration, not autonomous execution.**
Every task follows: **Question -> Options -> Decision -> Draft -> Approval**

- Agents MUST ask "May I write this to [filepath]?" before using Write/Edit tools
  (exempt: `active.md` appends, agent memory, a subagent's new file at the path
  its orchestrating skill named; see `.claude/rules/agent-memory.md`)
- Agents MUST show drafts or summaries before requesting approval
- Multi-file changes require explicit approval for the full changeset
- No commits without user instruction
- A skipped or dismissed question is not an answer: act on nothing, re-ask in
  plain text and wait
- Started outside this file's folder? Warn first: hooks, deny rules and the
  ask-first mode load only when Claude Code starts here

See `docs/COLLABORATIVE-DESIGN-PRINCIPLE.md` for full protocol and examples.

> **First session?** Say "make me a game" (`/prototype`), or run `/start` to begin
> the guided onboarding flow.

## Coding Standards

@.claude/docs/coding-standards.md

## Game Quality Standard (MANDATORY)

The project owner set this as a permanent rule. **Every game in this repo must
meet it**: each new game, and each existing 2D game being converted. It sits on
top of the Coding Standards above and the rules in `.claude/rules/`; it removes
none of them. The owner's words, verbatim:

> Convert my existing 2D game into a fully realized 3D game using Three.js while preserving all existing gameplay mechanics, progression, controls, and artistic identity. Aim for AAA-quality visuals with polished indie game charm. Recreate characters, environments, and objects using detailed 3D geometry, cohesive materials, cinematic lighting, soft shadows, atmospheric depth, and beautiful color composition. Avoid generic primitive-looking models and empty environments. Create stunning, layered visual effects for gameplay interactions, including particles, impact effects, trails, debris, shockwaves, and environmental reactions where appropriate. Combine smooth animations, JavaScript tweens, dynamic lighting, subtle camera effects, and satisfying audio feedback to make every interaction feel impactful. Use tasteful post-processing, including selective bloom, ambient occlusion, tone mapping, and color grading without compromising gameplay visibility. Make the world feel alive through environmental movement and subtle animated details. Upgrade the UI to match the visual quality of the game without adding clutter or generic website-style elements. Prioritize mobile performance, targeting a stable 60 FPS through object pooling, instanced meshes, optimized lighting, shared materials, and adaptive rendering quality. The finished game should feel professionally developed, visually captivating, responsive, and ready for publication—not simply a 2D game converted into basic 3D geometry.

How it fits the existing rules:

- **New games may be 2D or 3D** (owner, 26 Nov). Pick by data and genre: the
  traffic of 26 Nov showed her 2D one-finger toys far ahead of her 3D games
  (`production/market/2026-11-26T1800-rub-it-away-audit/`). A 2D game meets the
  same AAA bar in 2D terms: polished painted art, layered effects, juice, audio,
  a clean HUD and 60 FPS on mobile. A 3D game is built with Three.js to the bar
  above. Existing 2D games are not converted to 3D unless the owner asks.
- **Prototypes too.** Throwaway engine and paper prototypes meet this standard
  as well; the placeholder-art allowance in `.claude/rules/prototype-code.md` no
  longer applies.
- **Gameplay stays as it is.** Keep a game's mechanics, controls, progression and
  short, easy sessions; the upgrade is visual and feel, not added complexity.
- **Offline still holds.** A one-shot vendors Three.js and its add-ons into
  `vendor/` (`.claude/scripts/vendor-three.sh`) and makes no network requests
  while it runs (`.claude/rules/prototype-code.md`).
- **Tuning values stay in `config.js`.** Effect, post-processing and quality
  levels are tuning values like any other.
- **The look is evidence.** Retained screenshots in `production/qa/evidence/`
  show the standard was met (see Coding Standards), and a 60 FPS check on a
  mobile-sized viewport is part of done.

## Plan Before Building (MANDATORY)

The project owner set this as a permanent rule: **before building any new game,
write a complete, detailed plan first and get the owner's approval before
writing any code.** This applies to every new game, including quick and
throwaway prototypes, and to `/prototype` (its one-page brief becomes this full
plan). The plan covers at least:

1. **Concept**: the pitch, the fantasy, the audience.
2. **Core loop**: what the player does every few seconds and every minute.
3. **Controls**: touch and keyboard/mouse input, mapped to actions.
4. **Progression**: levels, difficulty curve, unlocks, session length.
5. **Art and 3D direction**: style, palette, characters, environments, lighting,
   camera, held to the Game Quality Standard above.
6. **VFX**: particles, impacts, trails, shockwaves and other effects per
   interaction.
7. **Audio**: music, SFX and feedback per interaction.
8. **UI**: HUD, menus, screens and their flow.
9. **Performance plan**: 60 FPS mobile budget, pooling, instancing, adaptive
   quality.
10. **Test plan**: what is tested automatically and what is checked by play and
    screenshots.
11. **Milestones**: the build order, each with what "done" means.

Show the plan to the owner and wait for an explicit yes. A skipped or
unanswered plan is not approval. Changes to an existing game don't need a new
full plan unless they add a new game mode or rework the game.

## Owner Preferences

- **Language**: the owner (Larisha) writes in Indonesian. Reply to the owner in
  Indonesian. Code, comments, commit messages and docs in the repo stay in
  English.
- **Skills always on.** Activate the `caveman`, `ponytail` and `leanrea` skills
  at the start of every session and keep them on for all work in this project.
  `caveman` shapes chat replies only; anything persisted (code, docs, commits,
  PRs) stays in normal prose, as that skill already says.
- **New-game concepts follow platform traffic.** Base new-game concepts on the
  latest Astrocade platform-wide data on the games with the most daily plays,
  not on the owner's own games. Name the data source and its date; when daily
  plays are not exposed, say which proxy was used (for example 7-day gain or
  plays divided by age). Use genres and mechanics, never a recreation.
- **Every new rule goes in the repo.** When the owner gives a new standing rule,
  add it to this CLAUDE.md as well, so it never has to be repeated.
- **Save all research to the repo.** Every research result, market snapshot and
  report is committed to the repo (via PR, auto-merge OK) without asking first.
- **Thumbnails are the owner's job.** Larisha makes and sets every game thumbnail
  herself. Don't generate, render, propose or set a thumbnail (no
  `generate_thumbnail`, no `set_thumbnail`, no thumbnail candidate images), even
  when a plan or prompt in the repo lists one.
- **Always watch the threads.** The coordinator must actively monitor every
  project thread at all times: check the thread list on every wake, unblock or
  restart stalled threads, and never let a thread sit unnoticed.
- **Coordinator is the orchestrator.** The coordinator orchestrates every
  project thread. All communication between threads and the coordinator
  (instructions, recommendations, decisions) must always rest on the best
  recommendation from a discussion and collaboration of a full combined team of
  top AAA game-studio experts, each speaking to their own expertise. Threads
  communicate only with the coordinator, and Larisha communicates only with the
  coordinator.
- **Coordinator decides for waiting threads.** When a thread waits on an
  approval, a choice or a review, the coordinator makes that call itself, on
  the AAA expert team's best recommendation, without asking Larisha.
- **Always learn from everything.** Learn from every correction, failure,
  result and piece of feedback: write the lesson down (project memory, and the
  repo when it is a lasting rule) and apply it from then on.
- **One publish per game per round.** Each publish queues a manual Astrocade
  review, so a game is published once per round, never back and forth. Finish
  every fix for that game first (load speed, bugs found, everything planned),
  then run full QA: a bug hunt, the feed handover, saves, phone-portrait
  screenshots and a short playtest. Only then publish. Leave a game whose publish
  is in review alone until the review clears, and bundle any further work into
  its next single publish.
- **Publishes wait for Astrocade review.** Every `publish_game` goes into the
  Astrocade team's manual review queue, even when the tool answers
  "approved/live". Until review passes, `list_versions` shows the publish with
  `is_published: false` and the live page still serves the old build. That is
  pending review, not a failure: never re-publish (it may reset the queue),
  check again later, and re-publish only after a rejection.
- **Astrocade sees only the game.** Everything uploaded to Astrocade (game
  files, code comments, title, description, tags, wishes/prompts, comments,
  replies) talks only about that game itself. Never mention or reveal our
  workflow, repo, rules, agents, tools, skills or process there.
- **Goal: unlimited, massive plays.** The main goal of every Astrocade game is
  as many plays as possible, with no ceiling. Always understand and apply the
  recommendation and distribution patterns from the Astrocade backend digs, so
  each game gets recommended to large traffic. The playbook is
  `docs/astrocade-distribution-playbook.md`; read it before every concept,
  build, update and publish, and refresh it after each new backend dig.
- **Very fast first load (every game).** A game's initial load must be very
  fast: aim for a playable first frame within about 2 seconds on a mid-range
  phone over 4G. Load only what the first frame needs (minified libraries,
  no unminified builds pulled in by a module's own imports, module preloads
  to flatten import waterfalls), defer non-critical models, audio and effects
  until after the first frame, and avoid long blocking shader compiles
  before the first picture. Measure load time on a throttled phone profile
  and report it with every build.
- **The coordinator reviews every thread's work visually.** Before a thread's
  result goes to the owner, the coordinator looks at the screenshots itself, with
  the full AAA expert team, to catch the problems nobody asked about. Each thread
  saves key phone-portrait screenshots (JPG) of its work to the shared project
  files and to the repo, names them in its report, and waits for the
  coordinator's visual review and fixes.
- **HUD laid out on a precise grid.** Every game's HUD UI/UX is neatly structured,
  with precise positions relative to each other: one spacing grid (8 px), equal
  safe-area margins, one shared height for pills and buttons, aligned centres,
  equal gaps, consistent icon and number sizes, button columns on the same
  margin, and world bubbles or pointers never under the HUD. Check it on small,
  mid and large phones and a tablet.
- **Solve problems proactively.** Solve every problem found proactively, without
  waiting to be asked. When work turns up a bug, a slow load, a broken share, a
  stale draft or any other issue, fix it (or start the fix) in the same pass and
  report it, instead of only listing it for the owner to request later.
- **Work effectively and efficiently.** Give all review feedback for a round in one
  batch. Each round runs only the quick checks (unit tests, CI checks, the feed
  bundle test, a short smoke run and screenshots). Run the full playtest only
  before a publish or when a change touches gameplay pacing. Run independent
  steps in parallel.
- **Share cards use the live thumbnail.** An in-game share calls `lib.share` with a
  title and text but no `image`. The host's share card then shows the game's
  current thumbnail, so a new thumbnail appears there with no game update. Pass an
  image only when the owner asks for a custom card.
- **Guidance points from the hero to the goal.** Every guide line, trail or arrow
  starts at the player's character and points toward the current goal, updating
  live as the character moves. An off-screen edge arrow also points from the
  character's side toward the goal. Never point from the goal back at the
  character (no arrow over the goal pointing down at it).
- **FTUE is mandatory (every game).** Every game has a first-time tutorial as an
  interactive, flexible spotlight: the screen dims except a soft cutout around the
  current target (an object, a station or a button), with a short icon-first hint,
  one step at a time. A step advances when the player does the real action, never
  on tap-to-continue. The spotlight follows moving targets, fits any screen size
  and safe area, and never blocks the player. Steps the player already did are
  skipped, a finished tutorial is saved and never repeats, and it has a skip
  button. It covers the game's core loop.
- **Every key moment is cinematic.** Each key moment (first result, first sale,
  a build or upgrade, a hatch or new friend, a perfect hit, a rare drop, a zone or
  chapter unlock, a milestone, a surprise event) gets a short camera beat: the
  camera eases to the moment and frames it, with a brief slow-motion or hit-stop,
  letterbox bars or a vignette, VFX and an audio sting, then eases back. Beats are
  0.6 to 2 s, never block input, and run through a priority queue with a cooldown
  so they never pile up or get annoying in the core loop.
- **Everything has a text label.** Every icon, button, goal, pickup, guidance and
  tutorial step in every game must have a short readable text label or instruction;
  nothing is communicated by icon or visuals alone (Larisha, 28 Nov). Labels are 1 to 3
  words, hints and tutorial steps one short sentence, and one goal line always says
  what to do now. Every string is localized in each language the game supports
  (right-to-left included) and fits at 360x640 without clipping. This wins over
  "icon-first" wording elsewhere: the icon stays, the words are added. Labels sit on
  the HUD grid and never clutter or cover play.
- **Rigs follow human anatomy.** Every character rig is built on the full set of human
  joints, scaled to the game's style: pelvis, a multi-bone spine, neck and head, clavicles,
  shoulders, elbows with forearm twist, wrists, a two-joint thumb and finger bends, hips,
  knees, ankles and toes. Each joint is clamped to its real range of motion (hinges bend one
  way only), skin weights blend smoothly at every joint with twist bones against
  candy-wrapper pinching, and stress poses (arms up, squat, reach, look around, plus the
  game's own moves) are rendered and checked for self-intersection before a rig ships.
- **Modular meta-prompts between coordinator and threads.** Every message from
  the coordinator to a thread is a modular meta-prompt with labeled sections:
  ROLE (the AAA expert team), CONTEXT, GOAL, CONSTRAINTS, TASKS, QUALITY BAR,
  OUTPUT FORMAT, DONE-WHEN. The goal is answers that hit the target exactly.

## Three.js Game Skills

Six `threejs-*` skills in `.claude/skills/` are adapted from
[majidmanzarpour/threejs-game-skills](https://github.com/majidmanzarpour/threejs-game-skills)
(MIT, adopted 27 Nov). They sit beside `caveman`, `ponytail` and `leanrea` and
never replace them; on any conflict this file and `.claude/rules/` win. Load the
one a task needs, and only the reference rows that task touches:

- `threejs-gameplay-systems`: design brief, core-loop contract, level plan, game feel.
- `threejs-aaa-graphics-builder`: authored models, material kits, lighting, budgets,
  and the 10-category visual scorecard (used in every visual review).
- `threejs-aaa-vfx-builder`: layered event VFX with 5-beat timing inside a mobile budget.
- `threejs-game-ui-designer`: HUD, menus, overlays, touch UI (the HUD grid rule wins).
- `threejs-debug-profiler`: root-cause triage and measured profiling.
- `threejs-qa-release`: the quick QA round, reading `feed.gpu` and `feed.pixels`
  from `tools/astrocade-bundle-test.js`.

Not adopted: the upstream director (the coordinator and this file own routing),
the Vite/TypeScript scaffold (Astrocade bundles plain JS modules and the load
budget rules out its defaults), and the Tripo, Gemini and ElevenLabs generators
(paid keys; the Astrocade MCP already generates images, music and sound).
They are adapted once, not synced: the daily auto-sync does not touch them.

## Context Management

Read `.claude/docs/context-management.md` on demand — it is a reference, not
session context. Two of its conventions are load-bearing and cited by name
elsewhere in the repo, so they are restated here rather than lost:

- **`production/session-state/active.md` is the session checkpoint.** The file is
  the memory, not the conversation. Read it first after any compaction, crash, or
  `/clear`.
- **Helpers in `.claude/scripts/` emit observations, never verdicts.** A script
  that scores or judges will eventually contradict a mode or override it cannot
  see. (Cited by `artifact-check.sh` and `adr-dep-graph.sh`.)
