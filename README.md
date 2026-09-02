# Claude-Tools

Personal Claude Code plugin marketplace — reusable AI-assisted development workflow assets, maintained centrally and installable into any repo.

## Contents

- [`dev-workflow`](dev-workflow/)
  - Topic documentation skills: `topic-init`, `topic-plan`, `topic-test`, `topic-status`, `main-doc-verify`, `plan-doc-verify`, `doc-conciseness-review`, `workflow-self-correct`
  - Shared rules + doc templates
  - The `self-update` skill
  - 19 AI-Assisted Development Principles + Topic Workflow Guide reference docs

Repo-agnostic by design: the adopting repo follows the `docs/ref/<MODULE>/<TOPIC>/` convention and adapts the marked path/command examples to its own layout. Phase A scope = skills/rules/templates/docs. Deterministic hook gates (a per-repo-configurable gate-core pattern) are planned as a later phase.

## Install (any repo, once)

```text
/plugin marketplace add AlimieRosli/Claude-Tools
/plugin install dev-workflow@claude-tools
```

> Note the `@claude-tools` — that is the marketplace's `name` field inside `.claude-plugin/marketplace.json` (lowercase, kebab-case), **not** the repo name `Claude-Tools`.

Private-repo note: cloning uses your normal git credentials. Background auto-update disables credential helpers — if private auto-update fails, use a read-only token via a git `insteadOf` rewrite.

## Update flow

No `version` field is declared in `plugin.json` or the marketplace entry — plugin updates are commit-SHA based. Third-party marketplaces have no auto-update in current builds, so after pushing changes, re-pin the install:

```text
claude plugin update dev-workflow@claude-tools
```

…then start a fresh chat session. Or, from inside any Claude Code chat, the plugin ships its own updater skill (also invocable as a slash command):

```text
/dev-workflow:self-update
```

It runs the same re-pin, confirms the new SHA from `~/.claude/plugins/installed_plugins.json`, and reminds you to restart the chat. Declare a `version` only if you want to pin installs.

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
