---
description: "Onboards an adopting repo to the dev-workflow workflow: writes or merges the standardized topic-workflow section into AGENTS.md (managed anchor block — idempotent, re-runnable), scaffolds AGENTS.md/CLAUDE.md when absent, surfaces conflicts with existing AI-instructions instead of overwriting them, and cleanly removes the managed section on opt-out. USE FOR: setting up a repo to use the dev-workflow skills; syncing an already-adopted repo's boilerplate after a plugin update; removing the workflow integration from a repo. INVOKE WITH: /workflow-adopt [--remove]"
argument-hint: "[--remove]"
---

# Workflow Adopt

## Table of Contents

1. [Overview](#overview)
2. [When to Use](#when-to-use)
3. [Step 1 — Parse the Mode](#step-1--parse-the-mode)
4. [Step 2 — Survey the Repo State](#step-2--survey-the-repo-state)
5. [Step 3 — Resolve the Adaptation Table](#step-3--resolve-the-adaptation-table)
6. [Step 4 — Detect Conflicts](#step-4--detect-conflicts)
7. [Step 5 — Apply the Changes](#step-5--apply-the-changes)
8. [Step 6 — Human Review Checkpoint (Blocking)](#step-6--human-review-checkpoint-blocking)
9. [Step 7 — Report](#step-7--report)
10. [Constraints](#constraints)

---

## Overview

Adopting the workflow in a new repo means writing the same reusable boilerplate into `AGENTS.md` every time: the plugin invocation list, the strict reference rules (by command name, never by path), the defensive hook contract, and the repo-adaptation table. Hand-copying it drifts; copying it from another repo's file carries that repo's specifics with it.

This skill is the **onboarding node**: it applies the canonical snippet template (the single source of the reusable half) to the current repo, handling all repo states — none, partial, or fully populated — and `--remove` undoes it cleanly.

**Key principle:** *merge, never overwrite. The skill manages exactly one marked block and touches nothing else in the repo's files.*

*Adapt paths/commands to your repository's actual layout and tooling — `AGENTS.md` may be named differently in some repos (check for it before assuming absence).*

---

## When to Use

**Use this skill when:**
- A repo is adopting the workflow for the first time (no or partial `AGENTS.md`/`CLAUDE.md`).
- An already-adopted repo needs its boilerplate re-synced after the template changed in a plugin update (re-run without arguments).
- A team is opting out and the managed section must be removed (`--remove`).

**Do NOT use this skill when:**
- You need to change the boilerplate *content* — edit the template at `${CLAUDE_PLUGIN_ROOT}/skills/_shared/templates/adopting-repo-agents-snippet.md` (universal changes) or, for one repo only, edit between the anchor markers directly.
- You need to write a topic doc — use `topic-init` / `topic-plan` / `topic-test`.
- The repo's own (non-managed) `AGENTS.md` content needs editing — that content is the team's; edit it directly with the team.

---

## Mandatory reads

1. BEFORE Step 3: [${CLAUDE_PLUGIN_ROOT}/skills/_shared/templates/adopting-repo-agents-snippet.md](${CLAUDE_PLUGIN_ROOT}/skills/_shared/templates/adopting-repo-agents-snippet.md) — the canonical snippet this skill applies. Never write boilerplate from memory; the template is the source and may have changed since your training data.
2. BEFORE Step 5 (the temp-artifact ignore-entry install): [${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/temporary-artifacts.md](${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/temporary-artifacts.md) — the rule behind the repo-root `.ai-tmp/` folder this skill gitignores on onboarding; do not install the entry from memory.

---

## Step 1 — Parse the Mode

| `$ARGUMENTS` | Mode | Action |
|------|------|--------|
| (empty) | **adopt** | Steps 2–7: survey, resolve, apply |
| `--remove` | **remove** | Strip the managed section (Step 5, remove path); skip Steps 3–4 |

Anything else: treat as the repo/doc path the user wants onboarded (rare — the skill normally operates on the current repo root), else stop and ask.

---

## Step 2 — Survey the Repo State

Check, and record the findings:

1. **`AGENTS.md`** — exists? If yes: does it already contain the anchor markers `dev-workflow:begin` / `dev-workflow:end`?
2. **`CLAUDE.md`** — exists? If yes: does it import `AGENTS.md` (an `@AGENTS.md` line)?
3. **`.claude/settings.json`** — is the `claude-tools` marketplace registered under `extraKnownMarketplaces`? (For team distribution — the plugin being runnable means *your* machine has it; teammates need the project-level registration.)
4. **Repo layout signals for the adaptation table** — does `docs/` (or a topic-doc tree) exist? What stack/commands (`package.json`, etc.)? Do repo-local hooks or skills exist under `.claude/`?
5. **Temp-artifact ignore state** — does a repo-root `.gitignore` exist? Does it already ignore `.ai-tmp/` (or a repo-specific equivalent temp folder)? Record for Step 5.

---

## Step 3 — Resolve the Adaptation Table

The template's adaptation table has fill-in-the-blank rows (doc root, doc naming, classification overrides, deterministic hooks, repo-local skills). For each row:

- Derive a proposal from the Step 2 survey (e.g. existing `docs/` layout, existing `.claude/hooks/`).
- Anything you cannot verify from the repo, mark `<!-- TODO: confirm -->` — never guess.
- **Present the proposed table to the human and get their confirmation on every row before Step 5.** These values become the repo's pinned convention; the human owns them.

---

## Step 4 — Detect Conflicts

Before writing, compare the resolved snippet against the repo's existing AI-instruction content (`AGENTS.md`, `CLAUDE.md`). Flag any **contradiction**, e.g.:

- The repo already defines its own topic-doc convention (different doc root or naming).
- The repo states a rule that conflicts with a workflow rule (e.g. different git-ownership or server-startup policy).
- The repo already has a workflow section written by hand (pre-template adoption).

For each conflict, present both sides and ask the human which wins. Record the resolution in the adaptation table's "classification overrides" row (or a dedicated overrides row). **Never silently insert boilerplate that contradicts existing rules** — coexisting contradictory rules are worse than either alone. If the human cannot decide, stop and report; do not write.

---

## Step 5 — Apply the Changes

### Adopt path

Wrap the resolved snippet (template preamble stripped, guidance comments resolved or kept as `<!-- TODO: confirm -->` per Step 3) in anchor markers:

```markdown
<!-- dev-workflow:begin — managed by /dev-workflow:workflow-adopt; re-run the skill to update; edit only with the team's approval -->
…resolved snippet…
<!-- dev-workflow:end -->
```

Then, per the Step 2 survey:

| Repo state | Action |
|------|------|
| **No `AGENTS.md`** | Create it: a one-line repo header (what the repo is — derive from the survey, mark unverified parts `<!-- TODO: confirm -->`) + the managed block. Then create `CLAUDE.md` containing only `@AGENTS.md` plus a one-line pointer that the topic-workflow section lives in `AGENTS.md`. |
| **`AGENTS.md` exists, no markers** | **Insert** the managed block at the end of the file (after a `---` separator). Touch nothing above it. |
| **`AGENTS.md` exists with markers** | **Replace** the block between the markers, inclusive. This is the re-sync path — re-running after a plugin update pulls boilerplate changes. |
| **`CLAUDE.md` exists, imports `AGENTS.md`** | Leave it untouched. |
| **`CLAUDE.md` exists, no import** | Propose adding the `@AGENTS.md` import as a separate, clearly-labeled edit — apply only if the human approves in Step 6. |

Also report (do not edit unless the human asks): whether `.claude/settings.json` registers the `claude-tools` marketplace for teammates (Step 2 finding #3) — if absent, give the `extraKnownMarketplaces` / `enabledPlugins: false` snippet for the human to review.

#### Temp-artifact ignore-entry install (part of every adopt run)

Per the mandatory read (Temporary Artifacts & Scratch Work): ensure the repo-root `.gitignore` ignores the AI temp folder — the AI creates scratch scripts/files there during tasks and deletes them at task end.

| Repo state | Action |
|------|------|
| No `.gitignore` | Create one containing exactly the entry below |
| `.gitignore` exists, no `.ai-tmp/` entry | **Append** the entry at the end (after a newline); touch nothing above it |
| Already ignores `.ai-tmp/` (or an equivalent convention is already pinned in the adaptation table) | Report "already ignored" — change nothing |

Entry to add:

```gitignore
# AI (Claude) temporary artifacts — scratch scripts/files, deleted after tasks
.ai-tmp/
```

Idempotent: re-running the skill re-checks the entry rather than duplicating it. This install is part of the managed adoption — it is presented in the Step 6 checkpoint summary like every other write.

### Remove path

Strip the managed block **inclusive of both marker lines**, plus any blank line left immediately before it or after it, so no orphaned separator remains. Everything else in the file stays byte-identical. If no markers exist, report "nothing to remove" and change nothing.

**`.gitignore` on opt-out:** the `.ai-tmp/` entry is left in place by default — an already-created `.ai-tmp/` folder may still hold artifacts worth sweeping before removal. Ask the human; only remove the entry (and optionally the folder) if they explicitly confirm.

---

## Step 6 — Human Review Checkpoint (Blocking)

Present a summary: which files were created/modified, the exact inserted or replaced block (or the removed span for `--remove`), the resolved adaptation table, and every conflict resolution from Step 4. **Wait for explicit human approval before considering the run complete** — if this checkpoint comes *before* any write in a conflict-heavy repo, present the planned writes instead and write only after approval. If the human raises concerns, apply the fixes and re-present the affected parts.

---

## Step 7 — Report

- Files created / modified / untouched, with paths.
- The resolved adaptation table (the repo's pinned conventions).
- The temp-artifact ignore entry status — added / already ignored / not applicable, with the file path.
- Conflicts found and how each was resolved.
- Re-run guidance: to pull future boilerplate updates, re-run `/dev-workflow:workflow-adopt` after updating the plugin (`/dev-workflow:self-update` + fresh session).
- Any `<!-- TODO: confirm -->` items left for the team.
- Reminder: the AI never runs `git commit` / `git push` — the human reviews and commits the changes.

---

## Constraints

- **Merge, never overwrite** — only the block between the anchor markers is managed; never rewrite, reorder, or reformat the repo's existing content. (The `.gitignore` temp-artifact entry is the one unmanaged touch — append-only, idempotent, and reported in the checkpoint.)
- **Never guess a repo fact** — unresolved values stay `<!-- TODO: confirm -->`.
- **Never write on an unresolved conflict** — stop and ask.
- **Never run `git commit` / `git push`** — the human owns all git operations.
- The template at `${CLAUDE_PLUGIN_ROOT}/skills/_shared/templates/adopting-repo-agents-snippet.md` is the **single source** of the managed content — never inline-edit the boilerplate into a repo in a form that diverges from it.