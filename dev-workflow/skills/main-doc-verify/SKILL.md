---
description: "Main Doc Verifier. Verifies a topic main doc (docs/ref/<module>/<topic>/<PREFIX>.md) for correctness, reliability, and accuracy against the current codebase — requirements cited, external claims (pricing/quota/SLA) sourced, no invented metrics, no code blocks, §5.5 NFR present, and every file path/function/endpoint/DB name matches the actual source. USE FOR: verifying a main doc before the human review checkpoint, or re-verifying after edits. INVOKE WITH: /main-doc-verify <path-to-main-doc.md>"
argument-hint: "<path-to-main-doc.md>"
disable-model-invocation: true
---

# Main Doc Verify

## Table of Contents

1. [Overview](#overview)
2. [When to Use](#when-to-use)
3. [Step 1 — Load the Main Doc](#step-1--load-the-main-doc)
4. [Step 2 — Verify Requirements (§2)](#step-2--verify-requirements-2)
5. [Step 3 — Verify External Claims (Pricing / Quota / SLA)](#step-3--verify-external-claims-pricing--quota--sla)
6. [Step 4 — Verify No Invented Metrics](#step-4--verify-no-invented-metrics)
7. [Step 5 — Verify Accuracy vs Current Code](#step-5--verify-accuracy-vs-current-code)
8. [Step 6 — Verify Structural Rules](#step-6--verify-structural-rules)
9. [Step 7 — Confirm Deterministic Hooks](#step-7--confirm-deterministic-hooks)
10. [Step 8 — Human Review Checkpoint (Blocking)](#step-8--human-review-checkpoint-blocking)
11. [Step 9 — Report](#step-9--report)
12. [Constraints](#constraints)

---

## Overview

`topic-init` writes the main doc from codebase findings, but rule-following there is LLM-enforced (best-effort). This node is the **verification pass** for the main doc: it re-checks every LLM-enforced rule against the actual codebase and the doc's own claims, so the human review checkpoint (Step 5 of `topic-init`) is backed by a verified document rather than a best-effort one.

This node is **main-doc specific**. Plan and test docs have their own concerns (implementation detail, security/OWASP for plan docs) and are verified by their own verifier nodes — do not apply this checklist to them.

The deterministic structural rules (TOC sync, dangling doc links, secrets) may be enforced by gates in the adopting repo's `.claude/hooks/` (if present — check before relying on them) — this node **references** those rather than re-running them (see Step 7).

---

## When to Use

**Use this skill when:**
- You just wrote a main doc via `topic-init` and want to verify it before the human review checkpoint.
- A main doc was edited (via `topic-init` Step 3.2 or manually) and needs re-verification.
- You want a second-pass accuracy audit of an existing main doc against the current codebase.

**Do NOT use this skill when:**
- You need to verify a plan doc or test doc — those have their own verifiers (e.g. `plan-doc-verify` / `topic-test`, if present in the adopting repo).
- You need to tighten prose — use `doc-conciseness-review` instead (if present in the adopting repo).
- You need to fix a hook-gate failure — use a hook-fixing workflow instead, if the adopting repo provides one (see its `.claude/hooks/`).

---

## Step 1 — Load the Main Doc

Read the full file at `$ARGUMENTS`. If the path doesn't exist, stop and report the error. Confirm it is a **main doc** (a `<PREFIX>.md`, not `_PLAN.md` / `_TEST.md`) — if not, stop and tell the user this node is main-doc only.

---

## Step 2 — Verify Requirements (§2)

Check the Requirements section against [`${CLAUDE_PLUGIN_ROOT}/skills/topic-init/rules/topic-main-doc-writing.md`](../topic-init/rules/topic-main-doc-writing.md) — do not restate the rule here:

- **Source** is cited: an official document (SRS section, ticket ID, spec, meeting notes — with link/reference) OR `Direct request (prompt)`. Never blank, generic, or `<!-- TODO -->`.
- **Type** is exactly one of `Feature`, `Bugfix`, or `Investigation`, matching what §2.1 and §4 describe.
- **Requirement Statement (§2.1)** says precisely what changes/gets added (Feature), what gets fixed (Bugfix), or what gets explored/answered (Investigation) — not a restatement of the Overview.

**Fail** if any of these is missing, generic, or contradicts the rest of the doc.

---

## Step 3 — Verify External Claims (Pricing / Quota / SLA)

Every external factual claim in the doc — third-party pricing, rate limits, quotas, SLAs, third-party API behavior — must carry an inline citation: **source name, URL, and date checked**. Follow the adopting repo's documentation standard (e.g. its `AGENTS.md` / `CLAUDE.md`, if present — adapt as needed).

- For each such claim, confirm it has `source + URL + date checked`.
- If a claim cannot be verified at write time, it must be marked `[UNVERIFIED — needs source]` — not stated as fact.
- **Never** accept a plausible-sounding number as confirmed unless a primary source was actually checked.

**Fail** if any external claim lacks a citation, or is stated as fact without a source.

---

## Step 4 — Verify No Invented Metrics

Check for unverified percentage/metric estimates — cost reductions, hit ratios, latency improvements, capacity numbers — that are not backed by actual measurement data.

- If a metric is present, confirm it is either backed by measurement data or marked `<!-- TODO: confirm -->` (and listed as an open question in §7).
- Otherwise the doc must use qualitative terms (High/Moderate/None) instead of invented numbers.

**Fail** if any invented/unverified metric is stated as fact.

---

## Step 5 — Verify Accuracy vs Current Code

This is the core accuracy check. For every file path, function name, endpoint, DB/collection name, config key, and service referenced in the doc:

1. **Grep** the workspace for each referenced symbol/path.
2. **Read** the relevant source files (at least the ones the doc's Current State §3 and Technical Details §5 depend on).
3. Confirm the doc's claims match the actual source — file paths exist, function names are real, endpoints/route prefixes match, and DB/collection names match the repo's actual schema/model registration and config layer.

*Adapt verification targets to your repository's actual layout and tooling — e.g. in an Express.js + Mongoose app, confirm DB/collection names against the model/schema registration module and the central config file.*

**Fail** if any referenced path/symbol/endpoint/DB name does not exist or is described inaccurately. Use `<!-- TODO: confirm -->` for anything you cannot verify rather than guessing.

---

## Step 6 — Verify Structural Rules

Check the main-doc-specific structural rules from [`${CLAUDE_PLUGIN_ROOT}/skills/topic-init/rules/topic-main-doc-writing.md`](../topic-init/rules/topic-main-doc-writing.md):

- **No code blocks** — no implementation code, no existing function bodies, no config object literals. Behavior/structure in prose or tables only.
- **No files-to-modify listed** — the main doc covers objectives and technical design only; specific file changes belong in the plan doc.
- **§5.5 Non-Functional Requirements** present — required for `Feature` type; `N/A — no NFR impact` (with reason) for Bugfix; `N/A — investigation only` (with reason) for Investigation.
- **Open Questions table** uses `| # | Question | Status |` only (no Owner column); status starts `Open`, resolved rows are `✅ Resolved — <answer>`.

**Fail** if any of these is violated.

---

## Step 7 — Confirm Deterministic Hooks

The structural rules below **may be enforced mechanically by deterministic gates in the adopting repo's `.claude/hooks/`** — check whether they exist before relying on them. If they exist, do not re-run them; just confirm they apply (a hook watcher / save-time check covers them):

- **TOC sync** — `toc-sync` gate
- **No dangling doc links** — `doc-reference-gate` gate
- **No secrets** — `secret-scan` gate

If the doc was just written and the hook watcher hasn't run yet, note that these will be checked on save. Do not duplicate their logic here. If the adopting repo has no such hooks, run these three checks manually as part of this verification.

---

## Step 8 — Human Review Checkpoint (Blocking)

After verification and before reporting, run a **blocking human review checkpoint**. Present a findings table: for each check (Steps 2–6), state **PASS / FAIL** with concrete evidence (file paths, line numbers, the exact claim and its source). Wait for the human to explicitly approve or raise corrections.

If the human raises concerns, apply the fixes to the main doc, then re-present only the affected rows and wait for approval again.

---

## Step 9 — Report

Report:
- **PASS / FAIL** per check (Steps 2–6), with file:line evidence.
- Any `<!-- TODO: confirm -->` items or `[UNVERIFIED — needs source]` claims found.
- Any corrections applied to the doc.
- What to run next: the human review checkpoint in `topic-init` (if not already done), or `doc-conciseness-review` to tighten prose (if present in the adopting repo).

---

## Constraints

- **Main-doc only.** Do not apply this checklist to plan or test docs.
- **Never invent technical details** — use `<!-- TODO: confirm -->` for anything unverifiable.
- **Never state an external claim as fact without a source** — mark `[UNVERIFIED — needs source]`.
- **Never invent metrics** — use qualitative terms unless backed by measurement data.
- **Never run `git commit` / `git push`** — the human owns all git operations.
- Match the existing skill/rule/agent structure and conventions in the target repo.

*Adapt paths, sibling-skill names, and hook-gate references to your repository's actual layout and tooling.*