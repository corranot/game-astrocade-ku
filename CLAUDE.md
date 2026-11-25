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

- **New games** follow it too: build them in 3D with Three.js to this bar from
  the start, not only when converting a 2D game.
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
