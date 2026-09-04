# Shared: Locating the Topic

Used by `topic-init`, `topic-plan`, `topic-implement`, and `topic-test` to resolve the module and topic names and derive the doc paths. This is a shared reference file, not a skill itself — it has no `SKILL.md` and is only loaded when linked from a skill's own SKILL.md (each skill's Step 1 links here as the single source of truth).

## Name Resolution

A topic lives under a module — the module is the higher-level grouping (e.g. `Google-API`), the topic is the specific piece of work within it (e.g. `Session-Token`). A topic can be a feature name, a task name, an investigation name, or a fix/bug name — resolve whatever term the work is known by.

**Source of truth for the module and topic names, in priority order:**

1. `$ARGUMENTS` — expects two tokens, `<module> <topic>`, each kebab-case (e.g. `Google-API Session-Token`) — use exactly as provided.
2. **Skill-specific editor fallback** — if `$ARGUMENTS` is absent, check the active editor file:
   - `topic-init`: active task file (e.g. `work/tasks/*.md`, if the adopting repo keeps task files) — derive both from the task title or filename, then **confirm with the user before proceeding**.
   - `topic-plan` / `topic-implement`: active plan doc (`docs/ref/<MODULE>/<TOPIC>/<PREFIX>_PLAN.md`) — derive module and topic from the folder names.
   - `topic-test`: active test doc (`docs/ref/<MODULE>/<TOPIC>/<PREFIX>_TEST.md`) — derive module and topic from the folder names.
   - Any skill may also fall back to an active task file (e.g. `work/tasks/*.md`) — derive from the task title or filename, then **confirm with the user before proceeding**.
3. Neither, or ambiguous — ask the user directly for the module name and the topic name before doing anything else.

## Path Derivation

Once both names are known, derive all paths per [Shared: Topic Doc Path Derivation](${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/topic-path-derivation.md) — that file holds the `<MODULE>`, `<TOPIC>`, `<PREFIX>`, and doc path derivation table.

## Per-Skill Existence Gate

Each skill applies its own existence gate in its Step 1 — this shared file does not enforce it:

- **`topic-init`**: no gate (it creates the folder and main doc).
- **`topic-plan`**: the main doc (`<PREFIX>.md`) must exist at the target folder. If not, stop and tell the user to run `topic-init` first — do not create it here.
- **`topic-implement`**: the main doc (`<PREFIX>.md`) **and** the plan doc (`<PREFIX>_PLAN.md`) must exist at the target folder — the plan is its instruction source. If either is missing, stop and tell the user to run `topic-init` / `topic-plan` first. If the plan has a Testing & Validation phase and the test doc (`<PREFIX>_TEST.md`) does not exist, stop and tell the user to run `topic-test` first. All plan open questions must be `✅ Resolved` before execution (the plan doc's open-questions gate).
- **`topic-test`**: the main doc (`<PREFIX>.md`) must exist at the target folder. The plan doc (`<PREFIX>_PLAN.md`) is **required** when the topic involves code changes (the plan provides phases, test targets, and rollback context). The plan doc is **optional** in **test-only mode** — when testing an existing feature with no code changes (e.g. audit, regression validation, baseline characterization). If the main doc is missing, stop and tell the user to run `topic-init` first — do not create it here. If the plan doc is missing and code changes are planned, stop and tell the user to run `topic-plan` first. If the plan doc is missing and no code changes are planned (test-only mode), proceed — note "test-only mode, no plan doc" in the test doc frontmatter.

*Adapt paths/commands to your repository's actual layout and tooling.*