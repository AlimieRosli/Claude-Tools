# Shared: Human Review Checkpoint

Used by `topic-init` (Step 5), `topic-plan` (Step 5.5), `topic-test` (Step 5.5), and `topic-implement` (Step 4, implementation start) as a **blocking gate** before the next phase of work. This is a shared reference file, not a skill itself — it is loaded when linked from a skill's own SKILL.md.

## Purpose

AI can write accurate docs, but the **human must own the decisions**. This checkpoint enforces that the human reads, understands, and explicitly approves the key judgment items before the AI proceeds. Without it, the AI writes → plans → tests in a bubble, and the human is a passive checkbox approver.

This is not a code review or doc review — it is an **understanding check**. The AI presents the things that require human judgment; the human confirms, corrects, or raises concerns.

## When It Fires

| Skill | After this step | Before this step |
|-------|----------------|-----------------|
| `topic-init` | Step 4 (optional main-doc verify) | Step 6 (optional stubs) / Step 7 (confirm) |
| `topic-plan` | Step 5.3 (optional plan-doc verify) | Step 6 (confirm) |
| `topic-test` | Step 5 (test doc written) | Step 6 (post-run update) / Step 7 (confirm) |
| `topic-implement` | Step 3 (pre-implementation SMK / NEG pre-fix recorded) | Step 5 (phase execution) |

## Behavior — Blocking Gate

1. The AI **must stop** after the checkpoint step.
2. The AI **must present** the summary table (see below).
3. The AI **must wait** for the human to respond.
4. The AI **must not proceed** to the next step until the human explicitly approves (types something that clearly indicates approval, e.g. "approved", "looks good", "ok proceed", "correct", or answers all judgment items without objection).
5. If the human raises concerns or corrections, the AI **must apply the fixes** to the doc, then re-present the affected summary rows (not the full table) and wait for approval again.
6. The AI **must not skip** this checkpoint, even if the human seems engaged or the topic is simple. The checkpoint is always mandatory.

## Summary Table Format

The AI presents a structured summary table in the conversation. The rows are the items that require human judgment — not a re-read of the doc, but a distillation of what the human needs to confirm.

### For topic-init (main doc checkpoint)

| # | Item | Detail | Human Action |
|---|------|--------|--------------|
| 1 | **Topic & Classification** | `<classification>` — `<one-line topic description>` | Confirm: is this the right classification? |
| 2 | **Current Code** | Key files/functions the doc is based on (file:line references) | Confirm: did AI identify the right code? Any missing files? |
| 3 | **What Changes** | Target state in plain language (from §4) | Confirm: is this what you intended? |
| 4 | **Impact** | Affected endpoints/routes, sibling topics, other users of the changed code | Confirm: any impact the AI missed? |
| 5 | **Cost / Billing** | External API pricing implications, sourced (or "N/A") | Confirm: is the cost analysis accurate? |
| 6 | **Security** | Attack surface, input handling, secrets, auth implications (or "N/A") | Confirm: any security concern? |
| 7 | **Reusable Components** | Existing code/functions to reuse vs. new code required | Confirm: any reusable component the AI missed? |
| 8 | **Open Questions** | List of unresolved items from §7 (status: Open) | Action: resolve, defer, or convert to a decision |
| 9 | **Decisions & Constraints** | Key architectural choices from §6 | Confirm: do you agree with these decisions? |
| 10 | **Accuracy Check** | Any `<!-- TODO -->` or `<!-- TODO: confirm -->` markers in the doc | Action: provide the missing info, or confirm AI should proceed without it |

### For topic-plan (plan doc checkpoint)

| # | Item | Detail | Human Action |
|---|------|--------|--------------|
| 1 | **Requirement Coverage** | Every requirement from the main doc §2 mapped to a plan phase | Confirm: any requirement not covered? |
| 2 | **Phases & Steps** | Implementation phases, their order, and dependencies | Confirm: is the phase order correct? Any missing steps? |
| 3 | **File Changes** | Files to be created/modified, with brief description of change | Confirm: any file change missing or wrong? |
| 4 | **Reuse** | Existing code/functions reused per phase (required by plan template) | Confirm: any reusable component missed? |
| 5 | **Risks & Rollback** | Risks identified and rollback plan | Confirm: any risk the AI missed? |
| 6 | **Branch & Deploy** | Branch strategy, deployment order, staging/production gates | Confirm: does this match your team's process? |
| 7 | **Open Items** | Unresolved items or blockers | Action: resolve or defer |

### For topic-test (test doc checkpoint)

| # | Item | Detail | Human Action |
|---|------|--------|--------------|
| 1 | **Test Coverage** | Every plan phase has at least one test case | Confirm: any phase not tested? |
| 2 | **NEG Cases** | Negative flow cases that run before AND after the fix | Confirm: are the NEG scenarios correct? |
| 3 | **Environment** | Test environment setup (local/staging/production) | Confirm: does this match your test environment? |
| 4 | **Side-Effect Checks** | What else is verified beyond the primary change | Confirm: any side effect the AI missed? |
| 5 | **Pass Criteria** | Measurable success criteria per test case | Confirm: are the criteria clear and correct? |

### For topic-implement (implementation-start checkpoint)

| # | Item | Detail | Human Action |
|---|------|--------|--------------|
| 1 | **Current Position** | Progress Tracker state — which phases ✅/🔄/☐ (plan doc) | Confirm: resume point correct? |
| 2 | **Pre-Impl Tests** | SMK result; NEG pre-fix recorded (or exemption marker) | Confirm: gate satisfied? |
| 3 | **Next Phase & Granularity** | Next ☐/🔄 phase name; recommended prompts-per-phase | Confirm: start here, this granularity? |
| 4 | **Unit-Test Plan** | Phases naming colocated test files (written in-phase, run post-implementation) | Confirm: any phase missing unit coverage? |
| 5 | **Risks & Blockers** | Open plan risks / TODOs affecting execution | Action: resolve or accept |

## Presentation Rules

- The AI **must present the full table** (not a shortened version) as a markdown table in the conversation — subject to the Brevity Rules below and the row-scope rule (Minor topics).
- The AI **must not present the table inside a code block** — it must be rendered as a proper markdown table.
- The AI **must include concrete details** in the "Detail" column — *concrete but minimal*: file paths, line numbers, actual values count as concrete; explanations do not fit in a table cell. Use references (`main doc §4`, `src/api/auth.ts:42`) plus a short noun phrase, not generic placeholders and not full sentences.
- The AI **must number each row** so the human can reference items by number in their response.
- The AI **must end with an explicit ask**: "Please review each item above. Respond with corrections, answers to open questions, or 'approved' to proceed."

## Brevity Rules

The checkpoint is a **decision surface, not a report**. The human must be able to read the whole table in under a minute. Completeness lives in the doc; the table only distills it. The AI applies these rules to every checkpoint presentation:

1. **One line per Detail cell** — hard cap ~15–20 words per cell. A Detail cell is a pointer (`src/api/auth.ts:42 — refresh token not validated`), never an explanation of the mechanism. If a point needs a sentence to explain, it belongs in the doc with a reference here.
2. **Noun phrases only** — no full sentences in any cell. Strip articles and filler ("the", "is", "which").
3. **Word budget for the whole table** — ≤150 words total across all Detail cells (all classifications). If a row cannot fit in budget, that signals the topic is too big for one checkpoint — decompose the topic rather than padding the table.
4. **No prose around the table** — at most one short sentence before the table and the standard closing ask after. No narration of what the human is about to read.
5. **Plain language** — write each cell the way you'd say it to a colleague. No inflated verbs — the canonical examples and replacements are in the [Shared: Topic Doc Writing Conventions](`${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/topic-doc-writing-conventions.md`) plain-language rule. Any unavoidable technical term gets a short plain-words parenthetical. Undefined jargon is a defect, not a shortcut.
6. **Row-scope by classification** — Minor topics present only the rows whose Human Action is blocking for the decision (typically Topic & Classification, What Changes, Open Questions). Standard/complex topics present all rows. The checkpoint itself always runs — only the row count scales.
7. **One concern per row** — if a Detail cell needs "and" to list two separate things, they are two rows (or one belongs in the doc).

## What This Is Not

- **Not a code review.** The AI has already explored the codebase. This is about human understanding and ownership.
- **Not a doc formatting review.** Deterministic gates (e.g. in the adopting repo's `.claude/hooks/`, if present — check before relying on them) handle formatting (TOC sync, secret scan). This is about content accuracy.
- **Not optional.** Even for simple topics, the checkpoint runs. The table may be short, but it still runs.
- **Not a replacement for any hook/gate system.** Deterministic gates enforce structural rules mechanically. The checkpoint enforces human understanding — they are complementary.

*Adapt paths/commands to your repository's actual layout and tooling.*