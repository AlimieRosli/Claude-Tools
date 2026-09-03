# Template: Adopting-Repo AGENTS.md Snippet

> **How to use this template:** run `/dev-workflow:workflow-adopt` from the adopting repo — it applies this template for you (scaffolding, merging, conflict detection, and clean removal are automated). Manual application: copy the snippet below into the adopting repo's `AGENTS.md` (the repo's single source of truth for AI-assisted development), then resolve every `<UPPER_SNAKE_CASE>` placeholder and delete every `<!-- ... -->` guidance comment. Do **not** commit this template itself to the adopting repo — only the resolved snippet. If the adopting repo splits `CLAUDE.md`/`AGENTS.md` (CLAUDE.md imports AGENTS.md via `@AGENTS.md`), this snippet goes in `AGENTS.md`; keep Claude Code–specific notes in `CLAUDE.md`.
>
> **What this snippet is:** the reusable half of an adopting repo's AI-instructions — how the repo references the `dev-workflow` plugin. The repo-specific half (what the repo is, build commands, architecture, coding conventions) cannot be templated and must be written by the team.

---

## Snippet — paste into `AGENTS.md`

### Topic workflow (dev-workflow plugin)

This repo uses the **`dev-workflow` plugin** (Claude Code) for AI-assisted development: topic documentation skills, shared rules, doc templates, and the AI-Assisted Development Principles. The plugin ships **no hooks and no repo files** — everything below is the contract between this repo and the plugin.

**Invocation** — skills are invoked as namespaced commands:

- `/dev-workflow:topic-init <Module> <Topic>` — classify the work, then scaffold `docs/ref/<MODULE>/<TOPIC>/` with the main doc (plan/test docs only on request or via their skills)
- `/dev-workflow:topic-plan` · `/dev-workflow:topic-test` · `/dev-workflow:topic-status` — plan doc, test doc, and progress status
- `/dev-workflow:main-doc-verify` · `/dev-workflow:plan-doc-verify` — verification passes for main/plan docs
- `/dev-workflow:doc-conciseness-review <path-to-doc.md>` — second-pass doc tightening
- `/dev-workflow:workflow-self-correct <target>` — de-duplicate the workflow docs
- `/dev-workflow:workflow-adopt [--remove]` — apply this snippet to the repo (merge/scaffold/sync), or remove the managed section on opt-out
- `/dev-workflow:self-update` — re-pin the plugin install after its marketplace repo is updated

**Reference rules (strict):**

- Reference plugin content **by command name or doc title only** — never by file path. The plugin's install location differs per machine and platform; a hardcoded path breaks for everyone but the author.
- Skills are **self-contained**: invoking a skill loads its rules and templates. This file states *when* to run what; the plugin supplies *how*. Do not duplicate skill internals here.
- The plugin references this repo **defensively** (e.g. "a `secret-scan` gate in the adopting repo's `.claude/hooks/`, if present — check before relying on them"). Where this repo has no such gate, the corresponding rule stays LLM-enforced (best-effort).

**Classification before documentation** — `/dev-workflow:topic-init` Step 1 classifies the work (hotfix, minor change, test-only, investigation, refactor, config/infra, new feature/bug fix) and scales the flow to its risk; minor changes skip all docs. The decision matrix ships with the plugin — do not restate it here. `<!-- If this repo also uses non-Claude AI tools that cannot invoke plugin skills (Copilot, Codex, Cursor), inline the load-bearing rules they need (classification table, principles summary) directly in AGENTS.md — those tools can only read repo files. Mark the section as the tool-agnostic summary so it is not mistaken for plugin duplication. -->`

**Repo adaptations** — the workflow is repo-agnostic; this repo pins it as follows:

| Adaptation | This repo's value |
| --- | --- |
| Doc root | `<!-- e.g. docs/ref/ — keep the <MODULE>/<TOPIC>/ nesting, or substitute your layout -->` |
| Main / plan / test doc naming | `<!-- e.g. <PREFIX>.md / <PREFIX>_PLAN.md / <PREFIX>_TEST.md -->` |
| Default classification overrides | `<!-- e.g. "bug fixes on X always need REG cases", "investigations go to docs/ref/Investigation/" — or 'none' -->` |
| Deterministic hooks (optional) | `<!-- e.g. '.claude/hooks/ registers TOC-sync, secret-scan, env-scope gates' — or 'none installed; rules are LLM-enforced' -->` |
| Repo-local skills | `<!-- e.g. '.claude/skills/hook-fix, hook-init' — skills meaningless without local machinery, or 'none' -->` |

**What this repo keeps local vs. what the plugin ships:** any rule, template, or reference doc that is true for every adopting repo belongs to the plugin (propose changes there via `/dev-workflow:workflow-self-correct`); anything true only of this repo belongs in this file or `.claude/`. When the two drift, fix the source — never patch over a plugin rule with a repo-local copy.