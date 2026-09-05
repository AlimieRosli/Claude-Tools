---
description: "Topic Implementation Executor. Executes a topic's plan doc phase by phase — from the pre-implementation Smoke & Sanity / NEG pre-fix gate through every implementation phase (plan-doc progress updated after each) to the post-implementation test gates and final cleanup — keeping every related doc in sync with what was actually done. Produces no doc of its own: the plan doc is its instruction source and its progress record. USE FOR: implementing a planned topic; resuming an in-progress implementation; executing the plan's Testing & Validation phase. INVOKE WITH: /topic-implement <module-name> <topic-name>"
argument-hint: "<ModuleName> <TopicName>"
---

# Topic Implement

## Table of Contents

1. [Overview](#overview)
2. [When to Use](#when-to-use)
3. [Step 1 — Locate the Topic](#step-1--locate-the-topic)
4. [Step 2 — Read the Topic Docs & Find the Current Position](#step-2--read-the-topic-docs--find-the-current-position)
5. [Step 3 — Pre-Implementation Test Gate (SMK & NEG pre-fix)](#step-3--pre-implementation-test-gate-smk--neg-pre-fix)
6. [Step 4 — Human Review Checkpoint (Blocking)](#step-4--human-review-checkpoint-blocking)
7. [Step 5 — Execute the Phases](#step-5--execute-the-phases)
   - [5.1 — The per-phase loop](#51--the-per-phase-loop)
   - [5.2 — Update the plan doc after every phase](#52--update-the-plan-doc-after-every-phase)
   - [5.3 — When reality diverges from the plan](#53--when-reality-diverges-from-the-plan)
8. [Step 6 — Post-Implementation Test Gates](#step-6--post-implementation-test-gates)
9. [Step 7 — Cleanup & Final Doc Sync](#step-7--cleanup--final-doc-sync)
10. [Step 8 — Confirm](#step-8--confirm)
11. [Step 9 — Mandatory Session & Model Reminder](#step-9--mandatory-session--model-reminder)

---

## Overview

This skill is the **implementation executor** for a topic. `topic-init` writes the main doc (what & why), `topic-plan` writes the plan doc (how), and `topic-test` writes the test doc (how to verify) — this skill **does the work**: it executes the plan doc phase by phase, from the first gate (Smoke & Sanity) to the final cleanup, and keeps every related doc in sync with what was actually done.

It creates **no document of its own**. The plan doc is both its instruction source (phases, steps, Reuse fields, Done When, Rollback) and its progress record (Progress Tracker); the test doc governs every test run. One fact lives in one place: the plan doc owns *what to do and how far along it is*; this skill owns *doing it and recording the progress*.

The full execution rules — per-phase loop, progress sync, session/granularity, no-tests-between-phases, unit-test timing, reuse binding, divergence handling, cleanup sweep — live in [`rules/topic-implementation-execution.md`](${CLAUDE_PLUGIN_ROOT}/skills/topic-implement/rules/topic-implementation-execution.md) (Mandatory reads #2); the steps below defer to it instead of restating it.

---

## When to Use

**Use this skill when:**
- The main doc and plan doc exist in `docs/ref/<MODULE>/<TOPIC>/` and the plan's open questions are all `✅ Resolved` — you are ready to execute Phase 0.
- An implementation is mid-flight (a phase is 🔄 or some phases are ☐) and you are resuming in a new session.
- All implementation phases are ✅ and the plan's **Testing & Validation** phase must be executed (the post-implementation gates).

**Do NOT use this skill when:**
- The main doc does not exist — use `topic-init` first.
- The plan doc does not exist — use `topic-plan` first.
- You need to write or update the test doc — use `topic-test` instead.
- You only need to know where the topic is — use `topic-status` (read-only).

---

## Mandatory reads

Read each of these files with the Read tool at the indicated point. Inline references in the steps below are reminders, not substitutes — if you have not actually Read the file, do it before proceeding. Do not execute any step from memory alone.

1. BEFORE Step 1: [${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/locate-topic.md](${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/locate-topic.md) — the single source of truth for name resolution and path derivation; Step 1 depends on it.
2. BEFORE Step 2 (and again before Step 5): [${CLAUDE_PLUGIN_ROOT}/skills/topic-implement/rules/topic-implementation-execution.md](${CLAUDE_PLUGIN_ROOT}/skills/topic-implement/rules/topic-implementation-execution.md) — the canonical execution rules (plan-order execution, progress sync, session & granularity, no-tests-between-phases, unit-test timing, reuse binding, divergence handling, cleanup sweep); Steps 2, 5, 6, and 7 defer to it.
3. BEFORE Step 2: the topic docs — the main doc (`<PREFIX>.md`) and plan doc (`<PREFIX>_PLAN.md`) **in full**, plus the test doc (`<PREFIX>_TEST.md`) whenever it exists. Never execute from memory of a previous session's read.
4. BEFORE Step 3 (and again before Step 6 — before any test run or result recording): [${CLAUDE_PLUGIN_ROOT}/skills/topic-test/SKILL.md](${CLAUDE_PLUGIN_ROOT}/skills/topic-test/SKILL.md) and [${CLAUDE_PLUGIN_ROOT}/skills/topic-test/rules/topic-test-doc-writing.md](${CLAUDE_PLUGIN_ROOT}/skills/topic-test/rules/topic-test-doc-writing.md) — the run conventions (environment scope, run order, NEG-before-fix) and the post-run recording rules this skill records test results through.
5. BEFORE writing any code (Step 5): [${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/error-handling.md](${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/error-handling.md) and [${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/sensitive-file-scope.md](${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/sensitive-file-scope.md) — the repo's error-handling/logging conventions apply to every line written; sensitive files are never read.
6. BEFORE Step 4: [${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/human-review-checkpoint.md](${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/human-review-checkpoint.md) — the single source of truth for the gate behavior, summary table format, and presentation rules; Step 4 depends on it.
7. BEFORE delivering the Step 9 reminders: [${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/topic-doc-writing-conventions.md](${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/topic-doc-writing-conventions.md) — the exact text of the per-prompt and per-session discipline rules; Step 9 depends on it.
8. BEFORE Step 5 (and again before Step 7): [${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/temporary-artifacts.md](${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/temporary-artifacts.md) — scratch scripts/generated files go under the repo-root `.ai-tmp/` folder with scoped deletion at task end; Step 5 creates artifacts there, Step 7's cleanup sweep deletes them.

---

## Step 1 — Locate the Topic

Read [Shared: Locating the Topic](${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/locate-topic.md) now (Mandatory reads #1) and resolve the module and topic name, and derive the doc paths, per that file.

**Existence gate:** the main doc (`<PREFIX>.md`) and the plan doc (`<PREFIX>_PLAN.md`) must exist at the target folder. If either is missing, stop and tell the user to run `topic-init` / `topic-plan` first — do not create them here.

**Test-doc gate:** the plan's fixed final **Testing & Validation** phase executes the test doc's flow. If the plan has that phase and the test doc (`<PREFIX>_TEST.md`) does not exist, stop and tell the user to run `topic-test` first. (If the plan has no executable test surface — e.g. a documented exemption marker — note it and proceed.)

`topic-implement` creates **no doc of its own** — it executes and updates existing docs only.

---

## Step 2 — Read the Topic Docs & Find the Current Position

Read the main doc and the plan doc **in full** (Mandatory reads #3), plus the test doc whenever it exists. Extract:

- **From the main doc:** the §2.1 Requirement Statement (the scope boundary), target state, §5.5 NFRs, and open questions.
- **From the plan doc:** the Progress Tracker (phase statuses), every phase's Goal / Current Code / **Reuse** / Steps / **Done When** / Rollback, the **Unit Tests** fields, Prerequisites, and the Risks table.
- **From the test doc (if it exists):** the Testing Flow order, environment placeholders, and which cases already have `**Result:**` lines.

**Open-questions gate:** every open question in the plan doc must be `✅ Resolved` before any Phase 1+ execution — a plan with an unresolved question is a draft, not an executable plan. If any is `Open`, stop and tell the user to resolve it in the plan doc first.

**Determine the current position** from the Progress Tracker and the test doc's result lines:

| Position | Where you are | Start at |
|----------|--------------|----------|
| No phases started, SMK / NEG pre-fix not recorded | Before implementation — testing first | Step 3 |
| SMK + NEG pre-fix recorded, no phases started | Ready to implement | Step 4 (checkpoint), then Phase 0 |
| Some phases 🔄 or ☐, none ✅-complete after the current one | Mid-implementation | Step 4 (checkpoint), then resume the current phase |
| ALL implementation phases ✅, post-implementation tests not run | After implementation, before test gates | Step 6 |
| All phases ✅ and post-implementation tests recorded | Wrap-up | Step 7 |

**Per-session discipline:** when resuming mid-implementation in a fresh session, re-read the plan doc (and test doc) — the docs are the state; do not continue from memory of a previous session.

---

## Step 3 — Pre-Implementation Test Gate (SMK & NEG pre-fix)

Before any code change, run the pre-implementation portion of the test doc's Testing Flow:

1. **Smoke & Sanity (`SMK-`) first** — service boots, core endpoints reachable, critical dependencies connected. It must pass before anything else runs.
2. **Negative Flow pre-fix (`NEG-`) for bug fixes** — captures the buggy behavior before any code change. A NEG pre-fix with no recorded result blocks implementation (the post-fix pass is meaningless without it). Features without a negative surface follow the test doc's exemption marker, if present.

Record every result **through the `topic-test` skill's post-run update rules** (Mandatory reads #4) — result lines, pass-criteria checklists, append-only run log — never in a format of this skill's invention. Do not proceed to Step 4 until the gate is satisfied or explicitly exempted.

---

## Step 4 — Human Review Checkpoint (Blocking)

Before executing any phase, the AI **must run a blocking human review checkpoint** — the human owns the decision to start (or resume) implementation, and at what granularity.

Read [Shared: Human Review Checkpoint](${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/human-review-checkpoint.md) now (Mandatory reads #6) and follow it — that file is the single source of truth for the gate behavior, the summary table format, and the presentation rules. Use the **implementation-start summary table** (5 rows: Current Position, Pre-Impl Tests, Next Phase & Granularity, Unit-Test Plan, Risks & Blockers) from that rule file.

**In summary (see the rule file for full detail):**

1. **Stop.** Do not execute any phase.
2. **Present** the implementation-start table with concrete details — tracker state, test-gate status, the next phase's name and first steps, unit-test files to be written, known risks.
3. **Wait** for the human to respond. Do not proceed until the human explicitly approves.
4. **If the human raises concerns**, apply fixes to the plan doc (not silently elsewhere), re-present only the affected rows, and wait again.
5. **Never skip** this checkpoint — not for resumes, not for single-phase topics.

> **Why this exists:** the human review checkpoints for the docs approved *what* to build. This one confirms *when and how the code starts changing* — the point of no return for rollback cost.

---

## Step 5 — Execute the Phases

Read [`rules/topic-implementation-execution.md`](${CLAUDE_PLUGIN_ROOT}/skills/topic-implement/rules/topic-implementation-execution.md) now (Mandatory reads #2) and follow its rules — the steps below summarize; the rule file is the single source of truth.

### 5.1 — The per-phase loop

For each phase in the plan doc's recorded order — Phase 0 (Prerequisites & Setup) → implementation phases → **Documentation Update** → **Testing & Validation**:

1. Mark the phase 🔄 in the Progress Tracker.
2. Follow the phase's **Steps 1-by-1** as written — each step names the file + function to touch and what to do. Verify the **Done When** outcome before declaring the phase complete; the **Rollback** plan is what you execute if the phase goes wrong.
3. The **Reuse** field is binding — call the named existing helper/service; never write a duplicate (Phase 0 exempt). The **Unit Tests** field means the phase *writes* its colocated test file — never runs it (see Step 6).
4. Write code that matches the repo's layering, error-handling, and logging conventions (Mandatory reads #5) — every `catch` logs before responding, every error response is returned, guard clauses first, structured logger only.
6. Any scratch script, generated data file, or probe output this phase needs goes under the repo-root `.ai-tmp/` folder (Mandatory reads #8) — never in source directories; delete what this phase created as soon as its purpose is served.
7. Mark the phase ✅ (Step 5.2) and move to the next phase.

### 5.2 — Update the plan doc after every phase

**Immediately after a phase's Done When is verified — and before starting the next phase:**

- Progress Tracker row → `✅ Complete`; set the next phase `🔄 In Progress` when work on it starts.
- Update the plan doc's `Last Updated` date.

Never batch progress updates to the end of the run — `topic-status` reads the tracker, and a stale tracker reports a wrong next step. Full rule: the "Progress Sync After Every Phase" section of the rules file you Read in Mandatory reads #2.

### 5.3 — When reality diverges from the plan

If the code, behavior, or Done-When verification does not match the plan (missing helper, changed behavior, failing verification): attempt a **bounded repair — up to 3 fix attempts**, re-running the failing check after each. Still failing → **stop**, record the finding in the plan doc (an Open Questions row or a revised phase), and tell the human. Never silently improvise a different design, and never expand scope beyond the main doc's §2.1 + the plan's Requirement Coverage — new ideas become open questions or follow-up topics, not silent additions.

Record commit messages and deployment status **only as the user reports them** (per the `topic-plan` Step 4 rules); the human performs all git operations.

---

## Step 6 — Post-Implementation Test Gates

After **ALL** implementation phases are ✅ — and never between phases:

1. **Full unit-test suite once** (e.g. `npm test` — per the repo's runner) when any phase named `UNIT-` cases: after all phases, **before** the NEG post-fix pass, infrastructure-free.
2. **NEG post-fix** — every `NEG-###` case now returns the correct rejection; both result lines get filled.
3. **Positive Flow (`TC-`)** — happy paths green.
4. **Conditionally-required and requested categories** — REG (shared code paths), STG (after staging deploy), PERF (concrete NFR target), EC/ERR (on request) — in exactly the test doc's **Testing Flow order**. Do not invent a different order.

Run the tests per the test doc; record results per the `topic-test` skill's post-run update rules (Mandatory reads #4). Update the plan doc's tracker: **Testing & Validation** phase `🔄 In Progress` when testing starts, `✅ Complete` when all tests pass, plus `Last Updated`.

---

## Step 7 — Cleanup & Final Doc Sync

Execute the **Final Cleanup Sweep** from the rules file (Mandatory reads #2). In summary:

- **Remove temporary instrumentation** — debug logs added only for verification, scratch files, commented-out experiments. Production code keeps only the logging the plan specified.
- **Delete `.ai-tmp/` artifacts** — remove everything this topic created under the repo-root `.ai-tmp/` folder (Mandatory reads #8), including after a failed run where possible. Only files this task created; never wipe the whole folder blindly.
- **Resolve every `<!-- TODO: confirm -->`** the implementation was meant to answer; anything still unknown becomes an Open Question in the doc where it was raised.
- **Doc-sync sweep** — every doc the work touched reflects the final state: plan doc (tracker, Status field per its vocabulary, `Last Updated`, deployment as reported), test doc results (via `topic-test` rules), main doc drift (targeted edits per the `topic-init` update rules — never a wholesale rewrite).
- **Set the plan doc's `Status` field** per its vocabulary — `Complete` only when fully deployed to Production and all phases are ✅; otherwise `In Progress` (or `Blocked` / `On Hold` as applicable). Deployment itself is human-driven; record each environment's status as the user reports it.

---

## Step 8 — Confirm

> **Note:** Step 4 (Human Review Checkpoint) must have completed with human approval during this run before execution happened; if this run was a resume, the checkpoint was re-run at its start.

Report:

- Phases completed this run and the tracker state after them (✅/🔄/☐).
- Test gates executed and their results summary (unit suite, NEG post-fix, POS, conditional categories).
- Docs updated (paths) — plan doc progress, test doc results, main doc drift fixes.
- Any divergences found between plan and codebase, and how they were recorded.
- Any `<!-- TODO -->` items or unresolved open questions (they block the next stage).
- What to run next: deploy steps per the plan doc's Deployment Status table (human-driven), `/topic-status` for a session-entry check, or `/doc-conciseness-review <path>` on any doc that grew wordy during the updates.

---

## Step 9 — Mandatory Session & Model Reminder

> **Note:** This step is **mandatory** — the AI must always deliver this reminder at the end of `topic-implement`. It is non-blocking (the human decides), but the AI must always say it. This enforces Context Management & Hygiene (Principle 1) and Model Selection & Tiering (Principle 11).

After completing all work for this skill, the AI **must** deliver the **per-prompt** and **per-session** reminders as defined in [`_shared/rules/topic-doc-writing-conventions.md`](${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/topic-doc-writing-conventions.md) ("Per-prompt discipline" and "Per-session discipline" rules). Do not restate them here — read that file and deliver the reminders as written, substituting `topic-implement` for the skill name.

### Model selection reminder

> *"**Model selection:** implementation (coding tasks) uses the model recommended for coding tasks in the adopting repo's model recommendation table — escalate to a heavier reasoning tier for complex multi-file logic. Keep the model sticky within the session. For the next doc step (test-result recording or a conciseness pass), a lighter tier is usually sufficient. See the model recommendation table in the adopting repo's AI-assisted development principles doc, if present (adapt the model names to your own tooling)."*

---

## Constraints

- **The plan doc is the single source of truth for execution** — never skip, reorder, or merge phases without the human's explicit approval and a plan-doc update recording the change.
- **Update the plan doc's Progress Tracker after every phase** — before starting the next. Never batch.
- **No tests between implementation phases** — complete ALL phases first; the canonical run-order rule is in the test-doc rules.
- **The Reuse field is binding** — never write a duplicate of an existing helper.
- **Bounded repair** — up to 3 fix attempts per failure, re-verifying each; then stop and record in the plan doc.
- Never run `git commit` / `git push` — the human owns all git operations.
- Never read sensitive files — env/config values come from the adopting repo's placeholder reference doc.
- **The session & model reminder (Step 9) is mandatory** — never skip it, even for single-phase runs.
- Deterministic doc gates may exist in the adopting repo's `.claude/hooks/` — check before relying on them.

*Adapt paths/commands to your repository's actual layout and tooling.*