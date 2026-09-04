---
description: "Topic Documentation Initializer. Writes the main doc for a new module/topic in the target repo. Plan and test docs are NOT created by default — only on request. USE FOR: starting work on a new feature, task, investigation, or fix; bootstrapping a docs/ref/<module>/<topic>/ folder. INVOKE WITH: /topic-init <module-name> <topic-name>"
argument-hint: "<ModuleName> <TopicName>"
---

# Topic Init

## Table of Contents

1. [Overview](#overview)
2. [When to Use](#when-to-use)
3. [Step 1 — Classify, Resolve Module &amp; Topic Name](#step-1--classify-resolve-module--topic-name)
   - [1.1 — Classify the topic](#11--classify-the-topic)
   - [1.2 — Resolve the module and topic name](#12--resolve-the-module-and-topic-name)
4. [Step 2 — Explore the Codebase](#step-2--explore-the-codebase)
5. [Step 3 — Write or Update the Main Doc](#step-3--write-or-update-the-main-doc)
   - [3.1 — First-time write](#31--first-time-write)
   - [3.2 — Update an existing main doc](#32--update-an-existing-main-doc)
6. [Step 4 — Optional: Main Doc Verify](#step-4--optional-main-doc-verify)
7. [Step 5 — Human Review Checkpoint (Blocking)](#step-5--human-review-checkpoint-blocking)
8. [Step 6 — Optional: Plan and Test Doc Stubs](#step-6--optional-plan-and-test-doc-stubs)
9. [Step 7 — Confirm](#step-7--confirm)
10. [Step 8 — Mandatory Session & Model Reminder](#step-8--mandatory-session--model-reminder)

---

## Overview

This skill sets up the starting docs for a new work topic in the target repository. Before writing any code, we need a place to record what exists today, what we want to change, and why. This skill does that by writing a full main doc from real codebase findings.

**"Topic" is the root term** used across this skill and `topic-plan`/`topic-test`. It is not limited to features — a topic can equally be a task name, an investigation name, or a fix/bug name. Whatever the piece of work is called, resolve it as the `<TOPIC>` in Step 1 and treat it identically regardless of its nature (feature, task, investigation, or fix).

Plan and test docs are **not** created by default — they are only written when explicitly requested (see Step 6), or later via the dedicated `topic-plan` and `topic-test` skills.

Use this skill whenever you start a new feature, task, investigation, or fix in the target repo — before any code changes or investigation work begins.

---

## When to Use

**Use this skill when:**
- No main doc (`<PREFIX>.md`) exists yet for the topic in `docs/ref/<MODULE>/<TOPIC>/`.
- You're starting a new feature, task, investigation, or fix and need to record the current state, target state, and requirement source before any code changes begin.
- You need to bootstrap the `docs/ref/<MODULE>/<TOPIC>/` folder for the first time.
- A main doc already exists and needs updating (e.g. requirement changed, current/target state drifted, new findings from the codebase) — this skill owns the main doc for its full lifecycle, not just initial creation.

**Do NOT use this skill when:**
- You only need to write or update the implementation plan — use `topic-plan` instead.
- You only need to write or update the test cases — use `topic-test` instead.

---

## Mandatory reads

Read each of these files with the Read tool at the indicated point. Inline references in the steps below are reminders, not substitutes — if you have not actually Read the file, do it before proceeding. Do not execute any step from memory alone.

1. BEFORE Step 1 (classification): [${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/topic-classification.md](${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/topic-classification.md) — the single source of truth for the 7 cases, the classification questions, and the flow mapping; Step 1.1 depends on it.
2. BEFORE Step 1.2 (name resolution): [${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/locate-topic.md](${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/locate-topic.md) — the single source of truth for the name-resolution priority order and the path-derivation table; Step 1.2 depends on it.
3. BEFORE Step 2 (codebase exploration): [${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/sensitive-file-scope.md](${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/sensitive-file-scope.md) — never read sensitive files (stack-dependent: env/config files, profile files, keys, credentials) while exploring; env/config values come from the adopting repo's placeholder reference doc (e.g. `docs/PLACEHOLDER_REFERENCE.md`).
4. BEFORE writing the doc (Step 3.1): [${CLAUDE_PLUGIN_ROOT}/skills/topic-init/templates/main-doc.md](${CLAUDE_PLUGIN_ROOT}/skills/topic-init/templates/main-doc.md) — the doc skeleton; every section heading must come from it.
5. BEFORE writing the doc (Step 3.1): [${CLAUDE_PLUGIN_ROOT}/skills/topic-init/rules/topic-main-doc-writing.md](${CLAUDE_PLUGIN_ROOT}/skills/topic-init/rules/topic-main-doc-writing.md) — the writing rules enforced on the main doc; Steps 3.1 and 3.2 depend on it.
6. BEFORE running the Step 5 checkpoint: [${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/human-review-checkpoint.md](${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/human-review-checkpoint.md) — the single source of truth for the gate behavior, summary table format, and presentation rules; Step 5 depends on it.
7. BEFORE delivering the Step 8 reminders: [${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/topic-doc-writing-conventions.md](${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/topic-doc-writing-conventions.md) — the exact text of the per-prompt and per-session discipline rules; Step 8 depends on it.
8. CONDITIONAL — if the user asks for plan/test doc stubs (Step 6): Read [${CLAUDE_PLUGIN_ROOT}/skills/topic-plan/templates/plan-doc.md](${CLAUDE_PLUGIN_ROOT}/skills/topic-plan/templates/plan-doc.md) before copying it, and [${CLAUDE_PLUGIN_ROOT}/skills/topic-test/templates/test-doc.md](${CLAUDE_PLUGIN_ROOT}/skills/topic-test/templates/test-doc.md) before copying it.
9. CONDITIONAL — before running another skill (Step 4 `main-doc-verify` if the user agrees; Step 7 `doc-conciseness-review` if the user agrees): Read its SKILL.md — [${CLAUDE_PLUGIN_ROOT}/skills/main-doc-verify/SKILL.md](${CLAUDE_PLUGIN_ROOT}/skills/main-doc-verify/SKILL.md) and [${CLAUDE_PLUGIN_ROOT}/skills/doc-conciseness-review/SKILL.md](${CLAUDE_PLUGIN_ROOT}/skills/doc-conciseness-review/SKILL.md) — before executing it, instead of running from memory.

---

## Step 1 — Classify, Resolve Module & Topic Name

This step has two parts, run in order: **classify the topic** (determine which case applies and which downstream skills are needed), then **resolve the module and topic name** (derive the doc paths).

### 1.1 — Classify the topic

Before writing any doc, classify the topic to determine the right workflow depth. Read [Shared: Topic Classification](${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/topic-classification.md) now (Mandatory reads #1) and follow it — that file is the single source of truth for the 7 cases, the classification questions, and the flow mapping.

Ask the classification questions from the rule file **in order**. Stop at the first one that gives a definitive answer.

**If the classification is "Minor change":** stop immediately — do not write any doc. Tell the user:

> *"This is classified as a **minor change** (one-liner, no logic change, no side effects). No topic doc is needed — make the change and verify manually. If the change turns out to be more complex than expected, re-run `/topic-init`."*

Do not proceed to Step 1.2, Step 2, or Step 3. The classification itself is the output.

**For all other cases:** record the classification result. It will be written into the main doc frontmatter in Step 3 as:

```markdown
> **Classification:** <case name>
> **Recommended flow:** <skills to use>
```

Report the classification to the user and proceed to 1.2.

### 1.2 — Resolve the module and topic name

Read [Shared: Locating the Topic](${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/locate-topic.md) now (Mandatory reads #2), then resolve the module and topic names and derive the doc paths per it — that file is the single source of truth for the name-resolution priority order (`$ARGUMENTS` → task file → ask user) and the path-derivation table.

`topic-init` has no existence gate (it creates the folder and main doc).

---

## Step 2 — Explore the Codebase

Read the codebase before writing anything. Use Read, Glob, and Grep tools to find real details.

Key areas to look at — adapt to the target repo's actual layout:
- Route/endpoint handlers and middleware (e.g. in an Express.js app, the router/endpoint layer)
- Controllers or feature modules — business logic
- Service/database layer — external calls, data access, cache usage
- Shared helpers or utilities
- Config files and constants
- `package.json` (or the equivalent dependency manifest)

What to find:
1. Files related to the topic keywords
2. Key functions, external API calls, cache and database usage
3. Any TODOs, stubs, or comments pointing to planned work

Minimum before writing:
- At least one grep/glob search on the topic keywords
- At least 2 source files read in full

*Adapt paths/commands to your repository's actual layout and tooling.*

---

## Step 3 — Write or Update the Main Doc

### 3.1 — First-time write

Read the [main doc template](${CLAUDE_PLUGIN_ROOT}/skills/topic-init/templates/main-doc.md) now (Mandatory reads #4) and use it. Fill every section with real findings from Step 2.

The **Requirements section (§2)** is mandatory and blocking — every topic must cite where its requirement came from (an official doc/SRS/ticket, or a direct prompt request) and state its type (Feature / Bugfix / Investigation). If this cannot be determined, stop and ask the user before writing further. Read [`rules/topic-main-doc-writing.md`](${CLAUDE_PLUGIN_ROOT}/skills/topic-init/rules/topic-main-doc-writing.md) now (Mandatory reads #5) for full enforcement details.

The **§5.5 Non-Functional Requirements** subsection is required for `Feature` type — per [`rules/topic-main-doc-writing.md`](${CLAUDE_PLUGIN_ROOT}/skills/topic-init/rules/topic-main-doc-writing.md) ("Non-Functional Requirements" section of the file you Read in Mandatory reads #5).

This is the **only** doc created by default. Follow the writing rules in [`rules/topic-main-doc-writing.md`](${CLAUDE_PLUGIN_ROOT}/skills/topic-init/rules/topic-main-doc-writing.md) — the file you Read in Mandatory reads #5; do not restate those rules here.

Rule-following here is LLM-enforced (best-effort). If the adopting repo has deterministic gates (e.g. a hook watcher in its `.claude/hooks/` — check before relying on them), those are the deterministic backstop — they do not check the Requirements section itself, but they can catch TOC drift in the doc mechanically, regardless of which editor/agent made the edit.

### 3.2 — Update an existing main doc

If the main doc already exists, do **not** overwrite it wholesale — make targeted edits based on the new findings from Step 2:

- Reflect changes in Current State, Target State, or Technical Details as the codebase or plans evolve.
- If the requirement itself changed, update the Requirements section (§2) — Source, Type, and Statement — and confirm with the user; it remains mandatory and blocking (see [`rules/topic-main-doc-writing.md`](${CLAUDE_PLUGIN_ROOT}/skills/topic-init/rules/topic-main-doc-writing.md)).
- Update Open Questions statuses as they get resolved (`✅ Resolved — <answer>`).
- Always update the `Last Updated` date at the top of the doc when making any edit.
- When adding, removing, or renaming sections, **also update the Table of Contents** to match.

---

## Step 4 — Optional: Main Doc Verify

After the main doc is written (Step 3) and **before** the human review checkpoint (Step 5), the AI **should encourage** the human to run the main-doc verifier. This is **optional and non-blocking** — it is a recommendation, not a gate.

Ask the user:

> *"The main doc is written. Would you like to run the **main-doc verifier** (`/main-doc-verify <path>`) now to check it for correctness, reliability, and accuracy against the current codebase before the human review checkpoint?"*

- **If the user agrees:** run the [`main-doc-verify` skill](${CLAUDE_PLUGIN_ROOT}/skills/main-doc-verify/SKILL.md) against the main doc path — Read [${CLAUDE_PLUGIN_ROOT}/skills/main-doc-verify/SKILL.md](${CLAUDE_PLUGIN_ROOT}/skills/main-doc-verify/SKILL.md) first (Mandatory reads #9); do not run it from memory. It verifies Requirements §2, external claims (pricing/quota/SLA) sourcing, no invented metrics, accuracy vs current code, and structural rules — then presents its own blocking human review checkpoint.
- **If the user declines:** proceed directly to the human review checkpoint (Step 5). The verifier is optional; the checkpoint is not.

> **Why this exists:** the main doc is the foundation the plan and test docs build on. Verifying it **before** the human checkpoint catches accuracy/sourcing issues early, so the human reviews a verified document rather than a best-effort one. But it is a heavier, codebase-reading pass — so it is offered, not forced.

---

## Step 5 — Human Review Checkpoint (Blocking)

After the main doc is written (Step 3) and verified (Step 4, if run) and before any plan/test stubs or next-step recommendations, the AI **must run a blocking human review checkpoint**. This enforces human ownership of the decisions before the AI proceeds — the human must read, understand, and explicitly approve the key judgment items.

Follow [Shared: Human Review Checkpoint](${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/human-review-checkpoint.md) — that file is the single source of truth for the gate behavior, the summary table format, and the presentation rules. Do not restate those rules here.

**In summary (see the rule file for full detail):**

1. **Stop.** Do not proceed to Step 6 or Step 7.
2. **Present** the main-doc summary table (10 rows: Topic & Classification, Current Code, What Changes, Impact, Cost/Billing, Security, Reusable Components, Open Questions, Decisions & Constraints, Accuracy Check) with concrete details in every row — file paths, line numbers, actual values, not placeholders.
3. **Wait** for the human to respond. Do not proceed until the human explicitly approves (e.g. "approved", "looks good", "ok proceed") or answers all judgment items without objection.
4. **If the human raises concerns or corrections**, apply the fixes to the main doc, then re-present only the affected summary rows and wait for approval again.
5. **Never skip** this checkpoint, even for simple topics. The table may be short, but the checkpoint always runs.

> **Why this exists:** AI can write accurate docs, but the human must own the decisions. Without this gate, the AI writes → plans → tests in a bubble and the human becomes a passive checkbox approver. This checkpoint makes human understanding the explicit exit criterion for the main doc phase, before any further work (plan doc, code changes) is started.

---

## Step 6 — Optional: Plan and Test Doc Stubs

Do **not** create the plan doc or test doc unless the user explicitly asks for one during this init (e.g. "also stub out the plan doc"). If asked, create only the one(s) requested:

- Plan doc: copy the [plan doc template](${CLAUDE_PLUGIN_ROOT}/skills/topic-plan/templates/plan-doc.md) — owned by `topic-plan`, not duplicated here — as-is, no filled content, all placeholders left in place. Full content is written later by the [`topic-plan` skill](${CLAUDE_PLUGIN_ROOT}/skills/topic-plan/SKILL.md).
- Test doc: copy the [test doc template](${CLAUDE_PLUGIN_ROOT}/skills/topic-test/templates/test-doc.md) — owned by `topic-test`, not duplicated here — as-is, no filled content, all placeholders left in place. Full content is written later by the [`topic-test` skill](${CLAUDE_PLUGIN_ROOT}/skills/topic-test/SKILL.md).

Otherwise, these are created later — in full, not as empty stubs — by the `topic-plan` and `topic-test` skills respectively.

> **Remark:** It is recommended to run `topic-plan`, `topic-test`, and `topic-implement` each in their own **separate session/prompt**, after this init is done and reviewed — not chained into the same prompt as init or as each other. This applies more generally too: prefer one skill/action per session where practical, since each additional chained action dilutes context and increases the chance of drift or missed details.

---

## Step 7 — Confirm

> **Note:** Step 5 (Human Review Checkpoint) must have completed with human approval before reaching this step. Do not proceed here if the checkpoint has not been approved.

After creating the file(s), report:
- Path(s) of file(s) created
- Any `<!-- TODO -->` items (gaps not found in the codebase)
- What to run next:
  - **A hook watcher / deterministic doc gate, if the adopting repo has one** (e.g. a `.claude/hooks/` watcher task in the editor that checks `docs/ref/**/*.md` for TOC sync on every save — check the repo before relying on this) — recommend the user run it now if present. It deterministically (no LLM) catches TOC drift that a rule-following LLM pass could miss. Leave it running in the background while iterating on the doc.
  - `/topic-plan <module-name> <topic-name>` — to write the implementation plan doc
  - `/topic-test <module-name> <topic-name>` — to write the test cases doc
  - `/doc-conciseness-review <path-to-doc.md>` — to tighten prose before committing

Note: post-test-run documentation updates are owned by the `topic-test` skill, see its Step 6 and the "Post-Test-Run Updates" section of [`${CLAUDE_PLUGIN_ROOT}/skills/topic-test/rules/topic-test-doc-writing.md`](${CLAUDE_PLUGIN_ROOT}/skills/topic-test/rules/topic-test-doc-writing.md).

Once the main doc is created, **always ask the user** whether to run `doc-conciseness-review` on it now. If the user agrees, run it following the procedure in the [`doc-conciseness-review` skill](${CLAUDE_PLUGIN_ROOT}/skills/doc-conciseness-review/SKILL.md) against the main doc path. If the user declines, stop here.

---

## Step 8 — Mandatory Session & Model Reminder

> **Note:** This step is **mandatory** — the AI must always deliver this reminder at the end of `topic-init`. It is non-blocking (the human decides), but the AI must always say it. This enforces Context Management & Hygiene (Principle 1) and Model Selection & Tiering (Principle 11).

After completing all work for this skill, the AI **must** deliver the **per-prompt** and **per-session** reminders as defined in [`_shared/rules/topic-doc-writing-conventions.md`](${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/topic-doc-writing-conventions.md) ("Per-prompt discipline" and "Per-session discipline" rules). Do not restate them here — read that file and deliver the reminders as written, substituting `topic-init` for the skill name.

### Model selection reminder

> *"**Model selection:** For the next step (`topic-plan` — complex planning, deep research), the recommended model tier is a heavier reasoning model suited to complex planning and deep research. For `topic-test` (test doc writing — moderate complexity), a lighter/moderate-complexity model is usually sufficient. See the model recommendation table in the adopting repo's AI-assisted development principles doc, if present (adapt the model names to your own tooling)."*

---

## Constraints

- Never invent technical details — use `<!-- TODO: confirm -->` for unknowns.
- Cite external factual claims (pricing, quotas, SLAs) with source + URL + date checked; mark unverifiable claims as `[UNVERIFIED — needs source]`.
- Match the existing error-handling and logging conventions of the target repo (e.g. its `AGENTS.md` / agent-guidance file, if present — adapt as needed).
- Report the classification and the created doc path to the user when done.
- **The session & model reminder (Step 8) is mandatory** — never skip it, even for simple topics.

*Adapt paths/commands to your repository's actual layout and tooling.*