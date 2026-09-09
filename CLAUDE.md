# CLAUDE.md

## What this repo is

This is the **source repo of the `dev-workflow` Claude Code plugin** (marketplace: `claude-tools`). It is **not an adopting project**: there is no `docs/ref/`, no topic docs, and the topic workflow is not run here.

## Mode separation (critical)

Every dev-workflow skill declares one scope (`scope:` in its SKILL.md frontmatter) — see [Shared: Context Mode](dev-workflow/skills/_shared/rules/context-mode.md):

| Scope | Skills | Runs in |
| ----- | ------ | ------- |
| `project-workflow` | orchestrator, `topic-*`, doc verifiers, `doc-conciseness-review` | adopting repos only — never this repo |
| `consumer-hook-ops` | `hook-fix` | a repo that adopted the hooks |
| `plugin-maintenance` | `todo-board`, `hook-init`, `self-update` | **this repo** (or plugin install state) |
| `workflow-governance` | `workflow-adopt`, `workflow-self-correct` | workflow infrastructure, wherever it lives |

Default for requests in this repo: **plugin maintenance** — edit `dev-workflow/` source, use the maintenance skills, track work on the TODO board at [monitor/todo.html](monitor/todo.html) via the `todo-board` skill. Do not orchestrate maintenance tasks through the topic flow, and do not create `docs/ref/` topic docs here. The plugin does not dogfood itself.

## Propagation

Changes to `dev-workflow/` reach consumer sessions only after the marketplace clone picks up the commit and the plugin is re-pinned — see the `self-update` skill (`/dev-workflow:self-update`). The plugin manifest omits `version`, so the resolved version is the commit SHA.