---
description: "Topic Plan Doc Owner. Writes and maintains the implementation plan doc for a topic — phases, steps, branch & deployment tracking, commit log, progress tracker, and risks. USE FOR: planning a new feature/fix after the main doc exists; updating an existing plan doc with new commits, deployment status, or phase progress. INVOKE WITH: /topic-plan <module-name> <topic-name>"
argument-hint: "<ModuleName> <TopicName>"
---

# Topic Plan

## Table of Contents

1. [Overview](#overview)
2. [When to Use](#when-to-use)
3. [Step 1 — Locate the Topic](#step-1--locate-the-topic)
4. [Step 2 — Read the Main Doc](#step-2--read-the-main-doc)
5. [Step 3 — Explore the Codebase](#step-3--explore-the-codebase)
6. [Step 4 — Branch, Commit Message & Deployment Status](#step-4--branch-commit-message--deployment-status)
   - [4.1 — Suggest a working branch name and commit message](#41--suggest-a-working-branch-name-and-commit-message)
   - [4.2 — Determine deployment status](#42--determine-deployment-status)
   - [4.3 — Updating the branch name or commit message later](#43--updating-the-branch-name-or-commit-message-later)
   - [4.4 — Write the action overview](#44--write-the-action-overview)
7. [Step 5 — Write or Update the Plan Doc](#step-5--write-or-update-the-plan-doc)
   - [5.1 — First-time write (filling the stub or creating fresh)](#51--first-time-write-filling-the-stub-or-creating-fresh)
   - [5.2 — Update an existing plan doc](#52--update-an-existing-plan-doc)
   - [5.3 — Optional: Plan Doc Verify](#53--optional-plan-doc-verify)
8. [Step 5.5 — Human Review Checkpoint (Blocking)](#step-55--human-review-checkpoint-blocking)
9. [Step 6 — Confirm](#step-6--confirm)
10. [Step 7 — Mandatory Session & Model Reminder](#step-7--mandatory-session--model-reminder)

---

## Overview

This skill is the **plan doc owner** for a topic in the target repo. The `topic-init` skill creates only the main doc by default — it does not create a plan doc stub unless explicitly asked. This skill writes the plan doc from scratch (or fills the stub, if one was created) and continues to maintain it as the work progresses (new commits, deployment updates, phase status changes).

The plan doc is the single source of truth for **how** a topic is implemented: branch, commits, deployment status, phased steps, rollback, risks, and progress tracking.

---

## When to Use

**Use this skill when:**
- The main doc (`<PREFIX>.md`) already exists in `docs/ref/<MODULE>/<TOPIC>/` (created by `topic-init` or manually).
- You need to write the implementation plan for the first time (from scratch, or filling the stub if `topic-init` created one).
- You need to **update** an existing plan doc with new commits, deployment status, or phase progress.
- You need to add or revise phases, steps, risks, or rollback notes.

**Do NOT use this skill when:**
- The main doc does not exist yet — use `topic-init` first.
- You need to create or update the main doc — use `topic-init` instead.
- You need to create or update the test doc — use `topic-test` instead.

---

## Mandatory reads

Read each of these files with the Read tool at the indicated point. Inline references in the steps below are reminders, not substitutes — if you have not actually Read the file, do it before proceeding. Do not execute any step from memory alone.

1. BEFORE Step 1: [${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/locate-topic.md](${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/locate-topic.md) — required to resolve `<module>/<topic>` and derive the doc paths correctly (Step 1 depends on it).
2. BEFORE Step 3 (and again at Step 5): [${CLAUDE_PLUGIN_ROOT}/skills/topic-plan/rules/topic-plan-doc-writing.md](${CLAUDE_PLUGIN_ROOT}/skills/topic-plan/rules/topic-plan-doc-writing.md) — the plan-doc writing rules ("Reuse Existing Code", Documentation Update Phase, Requirement Coverage, Open Questions, Table of Contents & Last Updated rules). Steps 3, 5, 5.1, and 5.2 all depend on it.
3. BEFORE Step 3 (any env/deploy value is needed): [${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/sensitive-file-scope.md](${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/sensitive-file-scope.md) — never read sensitive files (stack-dependent: env/config files, profile files, keys, credentials); env/deploy values come from the adopting repo's placeholder reference doc (e.g. `docs/PLACEHOLDER_REFERENCE.md`).
3b. BEFORE Step 3 (codebase exploration): [${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/temporary-artifacts.md](${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/temporary-artifacts.md) — exploration one-off scripts/probe outputs go under the repo-root `.ai-tmp/` folder and are deleted when Step 3 ends.
4. BEFORE Step 5.1 (first-time write): [${CLAUDE_PLUGIN_ROOT}/skills/topic-plan/templates/plan-doc.md](${CLAUDE_PLUGIN_ROOT}/skills/topic-plan/templates/plan-doc.md) — the doc skeleton; every section heading must come from it.
5. BEFORE Step 5.3 (only if the user agrees to run the verifier): [${CLAUDE_PLUGIN_ROOT}/skills/plan-doc-verify/SKILL.md](${CLAUDE_PLUGIN_ROOT}/skills/plan-doc-verify/SKILL.md) — the verifier skill's procedure must be read before it is run.
6. BEFORE Step 5.5: [${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/human-review-checkpoint.md](${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/human-review-checkpoint.md) — the single source of truth for the gate behavior, summary table format, and presentation rules of the blocking checkpoint.
7. BEFORE Step 7: [${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/topic-doc-writing-conventions.md](${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/topic-doc-writing-conventions.md) — the per-prompt and per-session reminder texts this skill must deliver verbatim.

---

## Step 1 — Locate the Topic

This skill requires the main doc to already exist — `topic-init` owns creating it and the `docs/ref/<MODULE>/<TOPIC>/` folder. Read [Shared: Locating the Topic](${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/locate-topic.md) now (Mandatory reads #1) and resolve the module and topic name, and derive the doc paths, per that file.

**Verify the main doc exists** before proceeding. If it does not, stop and tell the user to run `topic-init` first.

---

## Step 2 — Read the Main Doc

Read the main doc (`docs/ref/<MODULE>/<TOPIC>/<PREFIX>.md`) in full. This is the source of truth for **what** is being built and **why**. The plan doc must be consistent with it.

Extract:
1. The target state and new flow — these become the phases.
2. The key files listed — these become the "Current Code" references in each phase.
3. The technical details — these inform the steps within each phase.
4. The open questions — any that affect implementation get a prerequisite or a phase step to resolve them.
5. The external dependencies — these inform the Prerequisites section.

---

## Step 3 — Explore the Codebase

Read the codebase before writing the plan. The main doc already documents the current state, but the plan needs **implementation-level detail** — exact functions, line numbers, config keys, and call sites.

Key areas to look at (same as `topic-init`, but deeper — adapt to your repository's actual layout; for example, in an Express.js backend these often map to):
- route handlers and middleware (e.g. a `server/` tree with route registration)
- business-logic modules (e.g. `server/modules/`)
- external service calls (e.g. `server/services/` — third-party APIs, cache clients, database clients)
- shared utilities (e.g. `server/helpers/` or `server/utils/`)
- configuration and constants (e.g. `config/`)
- dependency manifest (e.g. `package.json`)

What to find:
1. Exact file paths and function names that will be touched.
2. Current behavior of those functions (read them in full).
3. Config keys, env vars, and cache/database keys involved.
4. Call sites — who calls the functions being changed.
5. Any existing tests that cover the affected code.
6. **Existing helpers/utils/services that already do part of what the target state needs** — candidates for reuse. Grep the repo's shared-helper directories (e.g. `server/helpers/`, `server/utils/`, `server/services/`) for equivalents before specifying new functions. Read [`${CLAUDE_PLUGIN_ROOT}/skills/topic-plan/rules/topic-plan-doc-writing.md`](${CLAUDE_PLUGIN_ROOT}/skills/topic-plan/rules/topic-plan-doc-writing.md) now (Mandatory reads #2) if you have not already — it carries the "Reuse Existing Code" rule that governs this search.

Minimum before writing:
- At least one grep/glob search on the topic keywords.
- At least 2 source files read in full (the ones that will be modified).
- If the main doc lists open questions, search the codebase for clues to answer them.

*Adapt paths/commands to your repository's actual layout and tooling.*

If exploration needs a one-off script or probe (e.g. to test an endpoint or convert data), write it under the repo-root `.ai-tmp/` folder (Mandatory reads #3b) and delete it when Step 3 ends — never in source directories.

---

## Step 4 — Branch, Commit Message & Deployment Status

The plan doc tracks the Git branch, commit message(s), and deployment status for the topic. None of this is auto-detected from `git` — it comes from an AI suggestion (branch/commit) confirmed by the user, or from the user directly (deployment status), since the user may rename the branch or edit the message at any time.

### 4.1 — Suggest a working branch name and commit message

Based on the topic's main doc (what's being built/fixed/investigated), suggest:
- A working branch name, following the repo's existing branch naming convention (check recent branches with `git branch -a` if unsure — never copy a convention from docs without verifying).
- A commit message in **Conventional Commits** format (e.g. `feat(scope): message`, `fix(scope): message`), matching the style already used in this repo. Keep it **concise** — a short subject line that states what changed, without mentioning implementation phases or internal workflow steps (e.g. `feat(payments): migrate shipping-cost API to new endpoints`, not `feat(payments): ... — Phases 1–3 code, Phase 4 validation`).
- **Hotfix marker:** if the topic is a **hotfix** (a change deployed directly to production without going through the normal release cycle — e.g. an urgent bug fix or a contained change that must ship immediately), append `[HOTFIX]` to the end of the commit subject. This is the repo's SOP for flagging hotfix commits. Example: `feat(payments): migrate shipping-cost API to new endpoints [HOTFIX]`. Only add it when the topic is genuinely a hotfix — do not add it to normal feature/fix commits.

Present both as a suggestion and let the user confirm or override — never assume the suggestion is final, and never run `git branch --show-current` or `git log` to detect them instead.

### 4.2 — Determine deployment status

Deployment status is supplied by the user as work progresses — do not infer it from branch names or CI status. Record per environment (adapt the environment list to the repo's actual deployment environments; Working Branch / Development / Staging / Production is the typical shape):
- Environment name (Working Branch, Development, Staging/STG, Production/PRD)
- Status: ✅ Deployed / ✅ Merged / ⏳ Pending / ❌ Blocked / ☐ Not Started
- Branch or note (e.g. `prd — cherry-pick only (branches diverged)`)

Update this table whenever the user reports a change. Use `☐ Unknown` if the user hasn't reported a status yet.

### 4.3 — Updating the branch name or commit message later

The user may rename the branch or add/edit commit messages at any point. When they do, update the record directly from what they specify — append or edit the Commits table row(s) and/or the Branch field as instructed. Do not re-derive or verify these against `git log`/`git branch`.

### 4.4 — Write the action overview

Draft a short **action overview** for the topic — a plain-text summary of what the topic does and why. Base it on the main doc (what/why) and the plan (how). Keep it concise — a few lines on what changed and why. **Text only — never use emoji.**

This overview is **recommended for use as the PR description** when the pull request is opened. Present it as a suggestion and let the user confirm or edit it — never assume it is final. Record the confirmed overview in the plan doc's **Action Overview** section (Step 5.1).

---

## Step 5 — Write or Update the Plan Doc

Read [`${CLAUDE_PLUGIN_ROOT}/skills/topic-plan/rules/topic-plan-doc-writing.md`](${CLAUDE_PLUGIN_ROOT}/skills/topic-plan/rules/topic-plan-doc-writing.md) now (Mandatory reads #2) and follow its writing rules — do not restate those rules here.

### 5.1 — First-time write (filling the stub or creating fresh)

If the plan doc does not exist yet, or is still the empty stub (from `topic-init`, if one was created), Read the [plan doc template](${CLAUDE_PLUGIN_ROOT}/skills/topic-plan/templates/plan-doc.md) now (Mandatory reads #4), then replace/create the plan doc entirely using it.

Fill every section with real findings from Steps 2–4 (Table of Contents rules are in [`${CLAUDE_PLUGIN_ROOT}/skills/topic-plan/rules/topic-plan-doc-writing.md`](${CLAUDE_PLUGIN_ROOT}/skills/topic-plan/rules/topic-plan-doc-writing.md)):

**Branch & Deployment section** — fill from Step 4:
- The working branch name (suggested in Step 4.1, confirmed by the user).
- A single-column Commits table with commit **messages** in Conventional Commits format (no hashes — see Step 4.1/4.3).
- A Deployment Status table covering the repo's environments (e.g. Working Branch, Development, Staging, Production).

**Action Overview section** — fill from Step 4.4: the confirmed action overview (a short summary of what the topic does and why). This overview is recommended for use as the PR description.

**Progress Tracker** — derive the phases from the main doc's target state and new flow. Each phase becomes one row. Always include:
- Phase 0 — Prerequisites & Setup
- Phase N — <!-- one per logical chunk of work -->
- Penultimate phase — Documentation Update (the repo's API reference / architecture docs, e.g. `docs/API_REFERENCE.md` / `docs/ARCHITECTURE.md` if present in the adopting repo — adapt as needed) — fixed phase; mandatory when the code changes touch anything documented in those docs, N/A (with one-line justification) otherwise. See [`${CLAUDE_PLUGIN_ROOT}/skills/topic-plan/rules/topic-plan-doc-writing.md`](${CLAUDE_PLUGIN_ROOT}/skills/topic-plan/rules/topic-plan-doc-writing.md) ("Documentation Update Phase").
- Final Phase — Testing & Validation

Set all phases to `☐ Not Started` initially. If the work has already started (commits exist), set the relevant phases to `🔄 In Progress` or `✅ Complete` based on what the commits actually implemented.

**Requirement Coverage** — **required table.** Maps each main-doc §2.1 requirement item to its phase(s) and test case ID(s). See [`${CLAUDE_PLUGIN_ROOT}/skills/topic-plan/rules/topic-plan-doc-writing.md`](${CLAUDE_PLUGIN_ROOT}/skills/topic-plan/rules/topic-plan-doc-writing.md) ("Requirement Coverage") for the full rule.

**Prerequisites** — list everything that must be true before any code is written:
- Local infrastructure (e.g. the app's database and cache running — via mongosh/redis-cli/docker compose if your stack uses Mongo/Redis, or your stack's equivalents).
- Env vars that must be set.
- Files that must be read first.
- Open questions from the main doc that must be resolved.

**Phases** — for each phase:
- **Goal:** One sentence describing what the phase achieves.
- **Current Code:** The file(s) and function(s) as they exist today (from Step 3). Include the file path and a one-line behavior summary.
- **Reuse:** The existing helper/service/function to reuse, or `none (grep: <keywords>)` if none was found. **Required** for Phase 1+ — see the "Reuse Existing Code" rule in [`${CLAUDE_PLUGIN_ROOT}/skills/topic-plan/rules/topic-plan-doc-writing.md`](${CLAUDE_PLUGIN_ROOT}/skills/topic-plan/rules/topic-plan-doc-writing.md).
- **Steps:** Numbered, concrete steps. Each step names the file + function to touch and what to do. Be specific enough that someone can follow without re-reading the main doc.
- **Done When:** A verifiable outcome (not a vague "it works").
- **Rollback:** How to undo this phase if it goes wrong (revert commit, delete a file, toggle a flag, etc.).

> **Documentation Update phase uses different fields** — instead of *Current Code* / *Reuse*, it carries **Doc Impact** (per doc: Impacted / Not impacted), **Affected sections** (exact headings in the repo's API reference / architecture docs), and **Content to add/change** (specific paths/methods/fields/diagrams), plus Steps, Done When, and Rollback. It is exempt from the Reuse field. See [`${CLAUDE_PLUGIN_ROOT}/skills/topic-plan/rules/topic-plan-doc-writing.md`](${CLAUDE_PLUGIN_ROOT}/skills/topic-plan/rules/topic-plan-doc-writing.md) ("Documentation Update Phase") and the plan doc template.

**Risks** — list implementation risks with Likelihood, Impact, and Mitigation. Common risks: external API rate limits, cache key collisions, breaking changes to client-facing wire formats, config drift between environments.

**Open Questions** — **required section.** Any assumption, missing detail, unclear behavior, or unresolved decision encountered while writing the plan must be listed here — never guess or silently fill in an answer. **Each open question lives in exactly ONE doc — the doc where it was raised.** List only **plan-specific** questions here; for questions already tracked in the main doc, reference them (e.g. `main doc OQ N`) rather than duplicating them. All open questions must be resolved (Status `✅ Resolved — <answer>`) before proceeding to execution or test doc creation. The `open-questions-gate` hook enforces this — a deterministic gate may exist in the adopting repo's `.claude/hooks/`; check before relying on it. See [`${CLAUDE_PLUGIN_ROOT}/skills/topic-plan/rules/topic-plan-doc-writing.md`](${CLAUDE_PLUGIN_ROOT}/skills/topic-plan/rules/topic-plan-doc-writing.md) ("Open Questions") for the full rule.

**References** — link to the main doc and test doc within the same topic folder (see writing rules for cross-linking constraints).

### 5.2 — Update an existing plan doc

If the plan doc already has content, do **not** overwrite it. Make targeted edits:

- **Adding commits:** Append new rows to the Commits table as the user specifies them (Step 4.3).
- **Updating deployment status:** Edit the Deployment Status table rows.
- **Updating phase progress:** edit the Progress Tracker table when the user reports progress or when updating the plan directly. **During execution, `topic-implement` owns the per-phase sync** — after every implementation phase it marks the tracker ✅ before starting the next phase and updates `Last Updated`. See [`${CLAUDE_PLUGIN_ROOT}/skills/topic-implement/rules/topic-implementation-execution.md`](${CLAUDE_PLUGIN_ROOT}/skills/topic-implement/rules/topic-implementation-execution.md) ("Progress Sync After Every Phase"). `topic-status` reads the tracker to determine where the topic is — a stale tracker reports an incorrect status.
- **Adding/revising phases:** Insert new phase sections in order; update the Progress Tracker to match.
- **Adding risks:** Append rows to the Risks table.

Per the file you Read in Mandatory reads #2 ([`${CLAUDE_PLUGIN_ROOT}/skills/topic-plan/rules/topic-plan-doc-writing.md`](${CLAUDE_PLUGIN_ROOT}/skills/topic-plan/rules/topic-plan-doc-writing.md) — re-Read it if you have not), the Table of Contents and Last Updated date rules apply to every edit.

### 5.3 — Optional: Plan Doc Verify

After the plan doc is written or updated (Step 5.1/5.2) and **before** the human review checkpoint (Step 5.5), the AI **should encourage** the human to run the plan-doc verifier. This is **optional and non-blocking** — it is a recommendation, not a gate.

Ask the user:

> *"The plan doc is written. Would you like to run the **plan-doc verifier** (`/plan-doc-verify <path>`) now to check it for correctness, completeness, and soundness against the current codebase and coding conventions before the human review checkpoint?"*

- **If the user agrees:** Read the [`plan-doc-verify` skill](${CLAUDE_PLUGIN_ROOT}/skills/plan-doc-verify/SKILL.md) now (Mandatory reads #5) and run it against the plan doc path. It verifies requirements coverage & traceability, coding-standards conformance (layering, error handling, logging, reuse/anti-spaghetti), design-level security/OWASP, accuracy vs current code, rollback, NFR coverage, phasing sanity, and branch & commit hygiene — then presents its own blocking human review checkpoint.
- **If the user declines:** proceed directly to the human review checkpoint (Step 5.5). The verifier is optional; the checkpoint is not.

> **Why this exists:** the plan doc is the blueprint the implementation and test doc build on. Verifying it **before** the human checkpoint catches coverage gaps, standards violations, security concerns, and accuracy errors early, so the human reviews a verified plan rather than a best-effort one. But it is a heavier, codebase-reading pass — so it is offered, not forced. It mirrors the `main-doc-verify` slot in `topic-init` Step 4.

---

## Step 5.5 — Human Review Checkpoint (Blocking)

After the plan doc is written (Step 5) and verified (Step 5.3, if run) and before the confirm step, the AI **must run a blocking human review checkpoint**. This enforces human ownership of the implementation plan before the AI proceeds — the human must read, understand, and explicitly approve the key judgment items.

Read [Shared: Human Review Checkpoint](${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/human-review-checkpoint.md) now (Mandatory reads #6) and follow it — that file is the single source of truth for the gate behavior, the summary table format, and the presentation rules. Use the **plan-doc summary table** (7 rows: Requirement Coverage, Phases & Steps, File Changes, Reuse, Risks & Rollback, Branch & Deploy, Open Items) from that rule file.

**In summary (see the rule file for full detail):**

1. **Stop.** Do not proceed to Step 6.
2. **Present** the plan-doc summary table with concrete details — phase names, file paths, reuse candidates, risks.
3. **Wait** for the human to respond. Do not proceed until the human explicitly approves.
4. **If the human raises concerns**, apply fixes to the plan doc, re-present affected rows, and wait again.
5. **Never skip** this checkpoint.

---

## Step 6 — Confirm

> **Note:** Step 5.5 (Human Review Checkpoint) must have completed with human approval before reaching this step. Do not proceed here if the checkpoint has not been approved.

After writing or updating the plan doc, report:
- Path of the file written or updated.
- The branch and commit message(s) recorded.
- The action overview recorded.
- The phases defined and their current status.
- Any open questions still unresolved (Status `Open`) — these must be resolved before execution or test doc creation.
- Any `<!-- TODO -->` items (gaps not found in the codebase, or details the user still needs to confirm/specify).
- What to run next: `/topic-test` to write the test doc, then — once the test doc exists and its pre-implementation runs (Smoke & Sanity, NEG pre-fix for bug fixes) are recorded — `/topic-implement` to execute the plan's phases. **Implementation is owned by `topic-implement`**: it starts from **Phase 0**, executes the phases per its execution rules ([`${CLAUDE_PLUGIN_ROOT}/skills/topic-implement/rules/topic-implementation-execution.md`](${CLAUDE_PLUGIN_ROOT}/skills/topic-implement/rules/topic-implementation-execution.md) — session & granularity, no-tests-between-phases, unit-test timing, reuse binding), and keeps the plan doc's Progress Tracker updated after every phase. `topic-plan` writes and maintains the plan doc; it does not execute it.

---

## Step 7 — Mandatory Session & Model Reminder

> **Note:** This step is **mandatory** — the AI must always deliver this reminder at the end of `topic-plan`. It is non-blocking (the human decides), but the AI must always say it. This enforces Context Management & Hygiene (Principle 1) and Model Selection & Tiering (Principle 11) in the adopting repo's AI-assisted development principles (if present — e.g. a `AI_ASSISTED_DEVELOPMENT_PRINCIPLES.md` doc; adapt as needed).

After completing all work for this skill, the AI **must** deliver the **per-prompt** and **per-session** reminders as defined in [`${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/topic-doc-writing-conventions.md`](${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/topic-doc-writing-conventions.md) ("Per-prompt discipline" and "Per-session discipline" rules). Do not restate them here — Read that file now (Mandatory reads #7) and deliver the reminders as written, substituting `topic-plan` for the skill name.

### Model selection reminder

> *"**Model selection:** For the next step — `topic-test` (test doc writing, moderate complexity) — use the model recommended for that task tier in the adopting repo's model recommendation table (e.g. `AI_ASSISTED_DEVELOPMENT_PRINCIPLES.md` §11, if present). For implementation, `topic-implement` executes the plan — use the coding-task tier, escalating to a heavier reasoning tier for complex multi-file logic. Keep the model sticky within a session; change tiers only when the task genuinely requires it."*