---
description: "Plan Doc Verifier. Verifies a topic plan doc (docs/ref/<module>/<topic>/<PREFIX>_PLAN.md) for correctness, completeness, and soundness against the current codebase — requirements fully covered & traceable, code changes match the adopting repo's coding conventions (feature layering, error handling, logging, reuse/anti-spaghetti), design-level security/OWASP review of the planned changes, every referenced file/function/config key/endpoint/DB name matches the actual source, rollback plausible, NFR coverage, phasing sane, branch & commit hygiene. USE FOR: verifying a plan doc before the human review checkpoint in topic-plan, or re-verifying after edits. INVOKE WITH: /plan-doc-verify <path-to-plan-doc.md>"
argument-hint: "<path-to-plan-doc.md>"
disable-model-invocation: true
---

# Plan Doc Verify

## Table of Contents

1. [Overview](#overview)
2. [When to Use](#when-to-use)
3. [Step 1 — Load the Plan Doc](#step-1--load-the-plan-doc)
4. [Step 2 — Verify Requirements Met & Valid Delivery](#step-2--verify-requirements-met--valid-delivery)
5. [Step 3 — Verify Coding Standards Conformance](#step-3--verify-coding-standards-conformance)
6. [Step 4 — Verify Design-Level Security / OWASP](#step-4--verify-design-level-security--owasp)
7. [Step 5 — Verify Accuracy vs Current Code](#step-5--verify-accuracy-vs-current-code)
8. [Step 6 — Verify Rollback, NFR Coverage & Phasing Sanity](#step-6--verify-rollback-nfr-coverage--phasing-sanity)
9. [Step 7 — Verify Branch & Commit Hygiene](#step-7--verify-branch--commit-hygiene)
10. [Step 8 — Confirm Deterministic Gates](#step-8--confirm-deterministic-gates)
11. [Step 9 — Human Review Checkpoint (Blocking)](#step-9--human-review-checkpoint-blocking)
12. [Step 10 — Report](#step-10--report)
13. [Constraints](#constraints)

---

## Overview

`topic-plan` writes the plan doc from codebase findings, but rule-following there is LLM-enforced (best-effort). This node is the **verification pass** for the plan doc: it re-checks every LLM-enforced rule against the actual codebase, the main doc, and the adopting repo's coding conventions (e.g. its `AGENTS.md`/`CLAUDE.md` or equivalent guidance, if present — adapt as needed), so the human review checkpoint (Step 5.5 of `topic-plan`) is backed by a verified plan rather than a best-effort one.

This node is **plan-doc specific**. Main docs are verified by `main-doc-verify`; test docs have their own concerns and are verified by their own future node — do not apply this checklist to them.

The security check here is a **design-level review of the planned changes** (input validation, auth guards, injection surface, PII/secret logging). It is complementary to, not a replacement for, the `/security-review` skill, which reviews the **actual diff** after code is written — this node runs before coding, that one runs after.

The deterministic structural rules (TOC sync, open-questions gate, dangling doc links, secrets) may already be enforced by gates in the adopting repo's `.claude/hooks/` (if present — check before relying on them) — this node **references** those rather than re-running them (see Step 8).

*Adapt paths, conventions, and commands to your repository's actual layout and tooling.*

---

## When to Use

**Use this skill when:**
- You just wrote a plan doc via `topic-plan` and want to verify it before the human review checkpoint (Step 5.5).
- A plan doc was edited (via `topic-plan` Step 5.2 or manually) and needs re-verification.
- You want a second-pass accuracy/standards audit of an existing plan doc against the current codebase.

**Do NOT use this skill when:**
- You need to verify a main doc — use `main-doc-verify` instead.
- You need to verify a test doc — those have their own future verifier.
- You need a security review of already-written code — use `/security-review` instead (this node reviews the *plan*, before code exists).
- You need to fix a hook-gate failure — use `hook-fix` instead (if the adopting repo provides it).

---

## Mandatory reads

Read each of these files with the Read tool at the indicated point. Inline references in the steps below are reminders, not substitutes — if you have not actually Read the file, do it before proceeding. Do not execute any step from memory alone.

1. BEFORE any step: the **plan doc** at `$ARGUMENTS` — the document under verification; every step below checks claims in it (Step 1 loads it).
2. BEFORE any step: the topic's **main doc** (`<PREFIX>.md` in the same folder as the plan doc) — Steps 2 and 6 verify the plan against it (requirement coverage, target-state delivery, NFR coverage). If it does not exist, stop (Step 1 handles this).
3. BEFORE Step 2: [${CLAUDE_PLUGIN_ROOT}/skills/plan-doc-verify/rules/plan-doc-verify.md](${CLAUDE_PLUGIN_ROOT}/skills/plan-doc-verify/rules/plan-doc-verify.md) — the verification rule defining the requirement-coverage and delivery checks Step 2 performs.
4. BEFORE Step 3: [${CLAUDE_PLUGIN_ROOT}/skills/topic-plan/rules/topic-plan-doc-writing.md](${CLAUDE_PLUGIN_ROOT}/skills/topic-plan/rules/topic-plan-doc-writing.md) — the plan-writing rule containing the Reuse requirement Step 3 enforces.
5. BEFORE Step 7, **if bundled** (otherwise skip — Step 7 adapts to the repo's own strategy doc): [${CLAUDE_PLUGIN_ROOT}/docs/TOPIC_WORKFLOW_GUIDE.md](${CLAUDE_PLUGIN_ROOT}/docs/TOPIC_WORKFLOW_GUIDE.md) — the "Branch & Commit Strategy" section Step 7 checks the plan's branch/commit sections against.

---

## Step 1 — Load the Plan Doc

Read the full file at `$ARGUMENTS` (Mandatory reads #1). If the path doesn't exist, stop and report the error. Confirm it is a **plan doc** (a `<PREFIX>_PLAN.md`, not `<PREFIX>.md` / `_TEST.md`) — if not, stop and tell the user this node is plan-doc only.

Then read the topic's **main doc** (`<PREFIX>.md` in the same folder) in full (Mandatory reads #2) — the plan doc must be consistent with it, and several checks (requirement coverage, NFR coverage, target-state delivery) read from the main doc. If the main doc does not exist, stop and tell the user to run `topic-init` first.

---

## Step 2 — Verify Requirements Met & Valid Delivery

Read [`${CLAUDE_PLUGIN_ROOT}/skills/plan-doc-verify/rules/plan-doc-verify.md`](${CLAUDE_PLUGIN_ROOT}/skills/plan-doc-verify/rules/plan-doc-verify.md) now if you have not already (Mandatory reads #3), then check that the plan actually delivers what the main doc (Mandatory reads #2) requires, with full traceability — do not restate the rule here:

- **Requirement Coverage table** exists and **every** §2.1 requirement item from the main doc maps to ≥1 phase AND ≥1 test case ID. A requirement with no phase is an implementation gap; a requirement with no test case is a verification gap.
- **Target-state delivery** — the phases *collectively* deliver the main doc's Target State (§3), not just a subset. No required outcome is silently dropped between main→plan.
- **Requirement text is not duplicated** — the Coverage table references item numbers, it does not restate requirement text (that lives only in the main doc).

**Fail** if any §2.1 item is unmapped, or the phases don't cover the full target state.

---

## Step 3 — Verify Coding Standards Conformance

Read the adopting repo's guidance now (e.g. its `AGENTS.md` "Coding conventions" / "Working in this repo" sections, or its `CLAUDE.md` equivalent, if present — adapt as needed) and [`${CLAUDE_PLUGIN_ROOT}/skills/topic-plan/rules/topic-plan-doc-writing.md`](${CLAUDE_PLUGIN_ROOT}/skills/topic-plan/rules/topic-plan-doc-writing.md) now if you have not already (Mandatory reads #4), then check that the planned changes conform to those coding conventions and the Reuse rule in that file:

- **Feature layering** — new routes follow the repo's established layering pattern (e.g. in an Express.js app, the feature triple `endpoint → controller → service`); no layer skipping (e.g. a route handler doing DB calls directly).
- **Error handling** — each touched file's error-handling pattern is respected (e.g. an inline-response pattern vs a structured error-response helper + error constants). Every `catch` logs via the repo's logger before responding; every error response is preceded by `return`.
- **Logging** — the repo's structured logger/child-logger helper is used, never raw `console.log`. Sensitive fields (tokens, passwords, keys, PII) go through the repo's logger redaction config (if it has one), not hand-rolled redaction.
- **Reuse / anti-spaghetti** — every Phase 1+ block has a **Reuse** field that is genuinely grep-verified. A `none (grep: <keywords>)` must actually have been grepped — flag any Phase 1+ that specifies a new helper/service/utility when an existing equivalent exists in the repo's shared helper/utility/service directories (e.g. in an Express.js backend: `server/helpers/`, `server/utils/`, `server/services/`). This is the maintainability gate: the plan must build on existing utilities, not reinvent them.

**Fail** if any planned change violates the conventions, or a Reuse field is missing/falsely `none` where a helper exists.

---

## Step 4 — Verify Design-Level Security / OWASP

This is a **design-level** review of the *planned* changes — it runs before code exists. It does not duplicate `/security-review`, which reviews the actual diff after coding. Check the plan's intended changes for:

- **Input validation** — new/changed endpoints validate and sanitize inputs (params, query, body) before use; no raw user input passed into database queries, external API calls, or template strings.
- **Auth & permission guards** — new routes wire the repo's auth/permission middleware (or document why a route is public, e.g. guest/public access paths). No unguarded sensitive endpoint.
- **Injection surface** — query/params are not concatenated into database queries or external API URLs; aggregation operators do not take raw user input.
- **PII / secret logging** — the plan does not introduce logging of tokens, passwords, keys, or PII outside the repo's redaction config; error responses do not leak internals (stack traces, config values, connection strings).
- **External data egress** — new outbound calls (third-party APIs, caches) send only required data; no over-sharing of user PII to third parties.
- **Secrets in docs** — no real connection info / credentials in the plan doc (placeholders only — see the `<UPPER_SNAKE_CASE>` placeholder convention). (A `secret-scan` gate in the adopting repo's `.claude/hooks/` backstops this, if present — see Step 8.)

**Fail** if any planned change introduces an unaddressed security/OWASP concern. Note: this is design-level — flag the concern and the mitigation the plan needs, it is not a code-level exploit audit.

---

## Step 5 — Verify Accuracy vs Current Code

This is the core accuracy check, mirroring `main-doc-verify` Step 5 but applied to the plan's implementation-level detail. For every file path, function name, config key, env var, endpoint, cache/DB key, and DB/collection name referenced in the plan's phases:

1. **Grep** the workspace for each referenced symbol/path.
2. **Read** the relevant source files (at least the ones each phase's "Current Code" names).
3. Confirm the plan's claims match the actual source — file paths exist, function names are real, endpoints/route prefixes match, DB/collection names match the repo's model/schema registration and config wiring (e.g. in a Mongoose/Express app: the schema/model registry and `config.js`), config keys exist in the repo's config module.

**Fail** if any referenced path/symbol/endpoint/DB name/config key does not exist or is described inaccurately. Use `<!-- TODO: confirm -->` for anything you cannot verify rather than guessing.

---

## Step 6 — Verify Rollback, NFR Coverage & Phasing Sanity

- **Rollback plausibility** — every phase has a Rollback that is concrete and executable (revert commit, delete a file, toggle a config flag, drop a cache key — e.g. a Redis key, if your stack uses Redis). A vague "restore previous state" fails.
- **NFR coverage** — the main doc's §5.5 Non-Functional Requirements (performance / security / observability targets) are addressed by some phase. A plan that silently drops the NFR section drops a requirement. If the main doc marked NFR `N/A`, confirm the plan does not contradict that.
- **Phasing sanity** — Phase 0 prerequisites are *real* prerequisites (the phases genuinely depend on them); no phase depends on a later phase; each phase's **Done When** is a verifiable outcome, not a vague "it works"; the Progress Tracker phase list matches the phase headings in the body.

**Fail** if any rollback is non-executable, an NFR is dropped, the phasing order is wrong, or a Done-When is unverifiable.

---

## Step 7 — Verify Branch & Commit Hygiene

Read [`${CLAUDE_PLUGIN_ROOT}/docs/TOPIC_WORKFLOW_GUIDE.md`](${CLAUDE_PLUGIN_ROOT}/docs/TOPIC_WORKFLOW_GUIDE.md) → "Branch & Commit Strategy" now if bundled (Mandatory reads #5) — otherwise read the repo's own strategy doc, if present (adapt as needed) — then check the Branch & Commits and Deployment Status sections against that strategy and the `topic-plan` rules:

- **Commit messages** are in **Conventional Commits** format (`feat(scope):`, `fix(scope):`, etc.), matching the repo style. No commit hashes recorded (messages only).
- **Hotfix marker** — `[HOTFIX]` is appended to the commit subject **only** if the topic is a genuine hotfix. Not present on normal feature/fix commits.
- **One logical change per commit** — code, topic docs, and tooling are not mixed in a single commit (the plan's commits should be code-type for the implementation work).
- **Deployment Status** covers Working Branch and the repo's deployment environments (e.g. Development, Staging, Production).

**Fail** if the branch/commit plan violates the strategy.

---

## Step 8 — Confirm Deterministic Gates

The structural rules below may be enforced mechanically by gates in the adopting repo's `.claude/hooks/` (if present — check before relying on them) — **do not re-run them**, just confirm they apply (a hook watcher, if configured, covers them on save):

- **TOC sync** — `toc-sync` gate (if present)
- **Open questions resolved** — `open-questions-gate` gate (if present; all plan-doc open questions must be `✅ Resolved` before execution or test doc creation)
- **No dangling doc links** — `doc-reference-gate` gate (if present)
- **No secrets** — `secret-scan` gate (if present)

If the doc was just written and the hook watcher hasn't run yet, note that these will be checked on save. Do not duplicate their logic here.

---

## Step 9 — Human Review Checkpoint (Blocking)

After verification and before reporting, run a **blocking human review checkpoint**. Present a findings table: for each check (Steps 2–7), state **PASS / FAIL** with concrete evidence (file paths, line numbers, the exact claim and its source, the specific convention violated). Wait for the human to explicitly approve or raise corrections.

If the human raises concerns, apply the fixes to the plan doc, then re-present only the affected rows and wait for approval again.

---

## Step 10 — Report

Report:
- **PASS / FAIL** per check (Steps 2–7), with file:line evidence.
- Any `<!-- TODO: confirm -->` items or unverified claims found.
- Any corrections applied to the doc.
- What to run next: the human review checkpoint in `topic-plan` (Step 5.5, if not already done), or `topic-test` to write the test doc, or start implementation from Phase 0.

---

## Constraints

- **Plan-doc only.** Do not apply this checklist to main or test docs.
- **Design-level security only.** This node reviews the *plan* for security concerns before code exists; it is not a replacement for `/security-review` on the actual diff.
- **Never invent technical details** — use `<!-- TODO: confirm -->` for anything unverifiable.
- **Never run `git commit` / `git push`** — the human owns all git operations.
- Match the existing skill/rule/agent structure and conventions in the target repo.