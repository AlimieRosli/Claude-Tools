# Shared: Context Mode (Scope Separation Between Project Work and Plugin Work)

Used by the orchestrator (mode gate before topic-init) and by every maintenance / governance skill (`hook-fix`, `hook-init`, `self-update`, `todo-board`, `workflow-adopt`, `workflow-self-correct`). This is a shared reference file, not a skill itself — it is loaded when linked from a skill's own SKILL.md.

## Purpose

The plugin lives in two worlds at once: it is **used** to deliver work in adopting repos, and it is **developed** in its own source repo. An AI session can see both kinds of skills at the same time (the plugin is installed user-scope, so its skills are available everywhere), and the same word — "fix the hook", "update the workflow", "add a rule" — means different work in each world. Without an explicit mode decision the AI blends the two: it runs the topic flow against the plugin's own source, or "helpfully" edits plugin files while delivering a consumer repo's feature. This rule forces the mode decision up front and keeps the modes separate.

## The Modes

Every dev-workflow skill declares exactly one scope in its SKILL.md frontmatter (`scope:`) and repeats it as a `SCOPE:` sentence at the start of its description:

| Scope | Meaning | Skills |
| ----- | ------- | ------ |
| `project-workflow` | Deliver work in an **adopting repo** through the topic flow — the adopting repo's code and its `docs/ref/` topic docs | orchestrator, `topic-*`, doc verifiers, doc-conciseness-review |
| `consumer-hook-ops` | Operate the **installed hooks** in an adopting repo — fix gate failures reported there | `hook-fix` |
| `plugin-maintenance` | Change the **plugin's own source** (skills, rules, hooks cores, registry) in the plugin source repo, or its installed state | `todo-board`, `hook-init`, `self-update` |
| `workflow-governance` | Maintain **workflow infrastructure** in whichever repo holds it — adoption boilerplate, workflow docs/rules/templates dedup | `workflow-adopt`, `workflow-self-correct` |

## Detecting the Mode

- **Plugin source repo**: the repo root contains `.claude-plugin/plugin.json` (or the plugin's skills live under a `skills/` tree with `_shared/rules/`). Requests in this repo are `plugin-maintenance` (or `workflow-governance`) by default.
- **Adopting repo**: the repo root contains the workflow's managed boilerplate in `AGENTS.md` (written by `workflow-adopt`) and/or `docs/ref/` topic docs. Requests here are `project-workflow` (or `consumer-hook-ops` when a hook gate reported a failure) by default.
- Ambiguous → ask the human which mode they mean. Never guess across modes.

## The Boundaries

- **Project-workflow skills never edit plugin source.** In an adopting repo the plugin source is not even present; in the plugin source repo the topic flow is not run at all — the plugin does not dogfood itself.
- **Plugin-maintenance skills never touch an adopting repo's project code or topic docs.** Plugin changes are tracked in the plugin source repo's maintenance log, not in `docs/ref/` topic docs.
- **`hook-fix` reads plugin cores, never writes them.** Fixing a gate failure means applying the fix in the *adopting repo* (the core's `fix` step) or correcting repo data the core checks. If the core itself is wrong, that is a plugin defect — hand it to the human as a `plugin-maintenance` item (fix in the plugin source repo, then `self-update`), do not patch the installed core in place.
- **Maintenance work in the plugin source repo is never routed through the orchestrator or topic skills** — no main/plan/test docs, no topic gates. The maintenance log's own statuses and the human gates of the maintenance skills are the control plane.
- **A request that crosses modes is stopped and re-routed, not blended.** If delivering a project requirement exposes a plugin defect, finish (or park) the project item first, then handle the plugin item as a separate `plugin-maintenance` task — two modes, two conversations, two change sets.

## Enforcement

LLM-enforced (best-effort) in the plugin: every SKILL.md carries the `scope:` frontmatter field plus a leading `SCOPE:` sentence in its description, and the orchestrator runs a mode gate before `topic-init` — a requirement about the plugin itself is re-routed to the maintenance skill set, never orchestrated. The plugin source repo's `CLAUDE.md` restates the repo's identity and default mode so every session starts with the mode decided.