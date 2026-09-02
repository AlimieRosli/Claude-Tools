# Claude-Tools

Personal Claude Code plugin marketplace — reusable AI-assisted development workflow assets, maintained centrally and installable into any repo.

## Contents

| Plugin | What it carries |
|---|---|
| [`dev-workflow`](dev-workflow/) | Topic documentation skills (`topic-init`, `topic-plan`, `topic-test`, `topic-status`, `main-doc-verify`, `plan-doc-verify`, `doc-conciseness-review`, `workflow-self-correct`), their shared rules + doc templates, and the 19 AI-Assisted Development Principles + Topic Workflow Guide reference docs |

Repo-agnostic by design: the adopting repo follows the `docs/ref/<MODULE>/<TOPIC>/` convention and adapts the marked path/command examples to its own layout. Phase A scope = skills/rules/templates/docs. Deterministic hook gates (a per-repo-configurable gate-core pattern) are planned as a later phase.

## Install (any repo, once)

```text
/plugin marketplace add ALimie/claude-tools
/plugin install dev-workflow@claude-tools
```

Private-repo note: cloning uses your normal git credentials. Background auto-update disables credential helpers — if private auto-update fails, use a read-only token via a git `insteadOf` rewrite.

## Update flow

No `version` field is declared in `plugin.json` or the marketplace entry — the plugin updates automatically whenever this repo's commit SHA changes, picked up on the next Claude Code session. Declare a `version` only if you want to pin installs.

## Development / testing

```text
claude --plugin-dir ./dev-workflow
```

Validate manifests after editing:

```text
claude plugin validate ./dev-workflow
```

## Origin & maintenance

The `dev-workflow` skills were extracted and genericized from a source repo's `.claude/skills/` workflow (the repo-specific originals — templates, hook gates, editor-agent wrappers — stay in that source repo). Improvements made here should be back-ported to the source repo's originals where relevant, and vice versa — watch for divergence.
