---
description: "Topic Status. A lightweight read-only node that reads the topic docs (main/plan/test) and reports where the topic is in the workflow and what the next step is — which skill to run, which phase to implement, which tests to run, or whether to deploy. No docs are created or edited. USE FOR: resuming work after a session break; checking progress before starting a new session; answering 'where are we with this topic and what's next?'. INVOKE WITH: /topic-status <module-name> <topic-name>"
argument-hint: "<ModuleName> <TopicName>"
---

# Topic Status

*Adapt paths, commands, and environment names to your repository's actual layout and tooling.*

## Table of Contents

1. [Overview](#overview)
2. [When to Use](#when-to-use)
3. [Step 1 — Locate the Topic](#step-1--locate-the-topic)
4. [Step 2 — Read the Topic Docs](#step-2--read-the-topic-docs)
5. [Step 3 — Determine the Workflow Position](#step-3--determine-the-workflow-position)
6. [Step 4 — Report Status & Next Step](#step-4--report-status--next-step)
7. [Constraints](#constraints)

---

## Overview

This skill is a **read-only status node** — it does not create or edit any docs. It reads the topic's existing docs (main, plan, test) and reports:

1. **Where the topic is** in the workflow (which docs exist, which phases are done, which tests have been run, deployment status).
2. **What the next step is** — which skill to run, which phase to implement next, which tests to run, or whether to deploy.

It is designed for the moment when a human starts a **new session** (or resumes after a break) and needs to know where they left off without reading multiple docs manually. This is the file-backed-state recovery point (Principle 1 — Context Management & Hygiene): the topic docs ARE the state, and this skill reads them so the human doesn't have to.

---

## When to Use

**Use this skill when:**
- You're starting a **new session** for an existing topic and need to know where you left off.
- You're resuming work after a break and want a quick status check before prompting.
- You want to know what the **next workflow step** is (which skill, which phase, which tests, deploy?).
- You're deciding which **model to select** for the next step (the status report includes the model recommendation).

**Do NOT use this skill when:**
- You need to write or update a topic doc — use `topic-init` / `topic-plan` / `topic-test`.
- You need to start or continue implementation — use `topic-implement`.
- No topic docs exist yet — use `topic-init` first.
- You need to verify a main doc — use `main-doc-verify`.

---

## Mandatory reads

Read each of these files with the Read tool at the indicated point. Inline references in the steps below are reminders, not substitutes — if you have not actually Read the file, do it before proceeding. Do not execute any step from memory alone.

1. BEFORE any step: [${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/locate-topic.md](${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/locate-topic.md) — required to resolve `<module>/<topic>` correctly; Step 1 depends on it.
2. BEFORE Step 2: the topic docs at `docs/ref/<MODULE>/<TOPIC>/` — the main doc (`<PREFIX>.md`) is always required; the plan doc (`<PREFIX>_PLAN.md`) and test doc (`<PREFIX>_TEST.md`) whenever they exist. Steps 3–4 report from these docs; never report a status from a doc you have not Read in this run.

---

## Step 1 — Locate the Topic

Read [${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/locate-topic.md](${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/locate-topic.md) now (Mandatory reads #1) — required to resolve `<module>/<topic>` correctly. The priority order is:

1. **User-provided arguments** — if the user named a topic in their prompt/message (e.g. "check the status of Cache-Tier-Optimization" or "topic-status <Module> Cache-Tier-Optimization"), use that. **Do NOT ignore the user's explicit text in favor of the active editor file.** The user's message takes priority over the editor fallback.
2. **`$ARGUMENTS`** (Claude Code slash command) — if provided as `/topic-status <module> <topic>`, use exactly as provided.
3. **Active editor file fallback** — only if neither the user's message nor `$ARGUMENTS` names a topic: check the active editor file — if it's a topic doc under `docs/ref/<MODULE>/<TOPIC>/`, derive the module and topic from the folder names.
4. **Ask the user** — if none of the above yield a topic, ask the user directly.

**Critical:** The active editor file is a **last resort**, not the default. If the user's message mentions a topic name, use that — even if the active editor file is a different topic's doc. Mixing these up reports the wrong topic's status.

If the user's message mentions a topic name but not the module name, search `docs/ref/` for a folder matching the topic name to find the module. If multiple matches exist, ask the user to clarify.

**Verify the topic folder exists** at `docs/ref/<MODULE>/<TOPIC>/`. If it does not, stop and tell the user no topic was found — suggest running `/topic-init <module> <topic>` to start a new topic.

---

## Step 2 — Read the Topic Docs

Read the docs that exist in the topic folder, in this order (Mandatory reads #2 — Read them now with the Read tool; do not report from memory):

1. **Main doc** (`<PREFIX>.md`) — always required. Extract: Classification, Recommended flow, Current State, Target State, Open Questions (and their status).
2. **Plan doc** (`<PREFIX>_PLAN.md`) — if it exists. Extract: Progress Tracker (phase statuses), Deployment Status table, Open Questions (and their status), the current/next phase.
3. **Test doc** (`<PREFIX>_TEST.md`) — if it exists. Extract: which test cases have `**Result:**` lines (run), which don't (not yet run), overall test status.

If only the main doc exists, the topic is at the "plan doc" stage. If main + plan exist but no test doc, the topic is at the "test doc" stage. If all three exist, check the Progress Tracker and test results to determine the exact position.

---

## Step 3 — Determine the Workflow Position

Based on the docs read in Step 2, determine where the topic is in the workflow. Use this decision table:

| Condition | Workflow Position | Next Step |
|-----------|------------------|-----------|
| Only main doc exists, classification ≠ Investigation | After init, before plan | Run `topic-plan` to create the plan doc |
| Only main doc exists, classification = Investigation | Investigation complete (no code changes) | Review findings; if code changes are needed, run `topic-plan` |
| Main + plan exist, plan has unresolved Open Questions | Before execution — OQ gate | Resolve open questions in the plan doc, then proceed |
| Main + plan exist, all OQs resolved, no test doc | Before test doc | Run `topic-test` to create the test doc |
| Main + plan + test doc exist, no tests run yet | Before implementation — **testing first** | Run **Smoke & Sanity** first, then **NEG pre-fix** (for bug fixes — captures the bug before any code change). Do NOT start implementation until NEG pre-fix is recorded. |
| Test doc: SMK passed, NEG pre-fix done, no phases started | After NEG pre-fix, before implementation | Run `/topic-implement` — it starts from **Phase 0** (see plan doc). NEG pre-fix is already recorded — the bug is captured. |
| Plan Progress Tracker: some phases ☐, current phase 🔄 | Mid-implementation | Continue with `/topic-implement` — resume the current in-progress phase. **Do NOT run tests between phases** — complete ALL implementation phases first, then run NEG post-fix → Positive → REG. |
| Plan Progress Tracker: some phases ✅, some ☐, none 🔄 | Between phases | Run `/topic-implement` for the next ☐ phase. **Do NOT run tests** — all phases must be completed first. |
| Plan Progress Tracker: all phases ✅, NEG post-fix not yet run | After ALL implementation, before NEG post-fix | Run **NEG post-fix** (confirm the fix resolved the bug without breaking the rejection path), then run Positive tests |
| Test doc: all tests passed (SMK + NEG + POS), Deployment Status: Working Branch only | After testing, before deploy | Deploy: Working Branch → DEV → STG |
| Deployment Status: STG Deployed, test doc has no STG- results | After STG deploy, before STG verification | Run STG- cases against staging (via the staging API gateway, e.g. a public gateway hostname or a designated gateway path such as `/cr` in some setups) |
| Deployment Status: STG verified, PRD not started | After STG verification, before PRD | Cherry-pick `feat:`/`fix:` commits to PRD |
| Deployment Status: PRD Deployed | Topic complete | Update docs with final results; topic is done |

If the state doesn't match any row, report what docs exist and their statuses, and recommend the most logical next step based on the workflow guide.

*The DEV → STG → PRD row above reflects a common working-branch → dev → staging → production promotion flow. Adapt the environment names and deploy steps to your repository's actual pipeline (e.g. some repos have only staging + production; others use different environment names).*

---

## Step 4 — Report Status & Next Step

Present a concise status report:

### Status Report Format

```
## Topic Status: <Topic Name>

**Classification:** <case name>
**Recommended flow:** <skills>

### Docs
- Main doc: ✅/❌ exists (Last Updated: <date>)
- Plan doc: ✅/❌ exists (Last Updated: <date>)
- Test doc: ✅/❌ exists (Last Updated: <date>)

### Progress
<if plan doc exists: paste the Progress Tracker table — as a proper markdown table, not plain text>
<if test doc exists: one-line summary — "X passed, Y failed, Z not run" — do NOT list every test case>

### Deployment
<if plan doc exists: paste the Deployment Status table — as a proper markdown table>

### Open Questions
<one line: "All resolved" or "N unresolved — see <doc> §<section>">

### Next Step
<ONE sentence: which skill to run, which phase to start, which tests to run, or deploy step. Reference the plan doc for details — do NOT restate phase content, code changes, or test flow order here.>

### Model Recommendation
<name the specific model + provider priority per the adopting repo's AI-assisted development principles doc §11, if present (adapt as needed) — e.g. "DeepSeek V4 Flash 0731 (OpenRouter / DeepSeek / Ollama)". Do NOT say "use the default model" or "use the current agent" — always name the model explicitly.>
```

### Formatting rules (mandatory)

- **Tables must be valid markdown** — use `| col | col |` with `|---|---|` separator rows. Never paste table content as plain text without pipe characters.
- **Keep the report under ~20 lines** — this is a status check, not a doc read. The human should be able to read it in a few seconds.
- **Do NOT restate phase content** — the plan doc already describes what each phase does. The status report says "Start implementation from Phase 0" and points to the plan doc for details. Do NOT list code changes, function names, or implementation steps.
- **Do NOT restate test flow order** — the test doc already describes the execution flow. The status report says "Run tests per test doc flow" and points to the test doc.
- **Suggest `/topic-implement` for implementation** — `topic-plan` writes and updates the plan doc, it never executes it; `topic-implement` is the implementation executor and starts from the plan's Phase 0.
- **Do NOT explain infrastructure details** — notes about dev-server start/kill-port scripts, database connection strings, etc. belong in the plan doc's Prerequisites section, not the status report.
- **Always name the specific model** — never say "use the default model" or "use the current agent". Always state the model name and provider priority from the §11 table of the adopting repo's principles doc (if present — adapt as needed).

---

## Constraints

- **Read-only** — never create, edit, or delete any file. This skill only reads and reports.
- **Never invent status** — if a doc is missing or a section is empty, report it as missing/empty. Do not guess.
- **Never run `git commit` / `git push`** — the human owns all git operations.
- **Keep the report under ~20 lines** — this is a status check, not a full doc read. Summarize; don't dump entire docs.
- **Tables must be valid markdown** — use pipe characters and separator rows. Never render table content as plain text.
- **Do NOT restate phase content, code changes, or test flow order** — point to the plan/test docs instead.
- **Suggest `/topic-implement` for implementation** — `topic-plan` writes the plan doc; `topic-implement` executes it from the plan's Phase 0.
- **Always name the specific model** — never say "use the default model" or "use the current agent". State the model name + provider priority from §11 of the adopting repo's principles doc (if present — adapt as needed).
- **NEG-before-fix is mandatory for bug fixes** — never recommend starting implementation before NEG pre-fix tests are recorded. The correct order is: SMK → NEG pre-fix → `/topic-implement` → NEG post-fix → Positive. If the test doc exists but NEG pre-fix has no result, the next step is "run NEG pre-fix", NOT "start implementation".
- **No tests between implementation phases** — when implementation is in progress (phases ☐ or 🔄), the next step is always "continue/next phase via `/topic-implement`", never "run tests". All implementation phases must be completed before running post-implementation tests (NEG post-fix, Positive, REG).
- **Deterministic doc gates may exist in the adopting repo's `.claude/hooks/`** — check before relying on them; do not assume gates are present in every adopting repo.
- If the topic folder doesn't exist or has no main doc, stop and tell the user — do not proceed.