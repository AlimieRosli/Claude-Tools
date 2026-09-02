---
description: "Topic Test Doc Owner. Writes and maintains the test doc for a topic following the docs/ref/<MODULE>/<TOPIC>/ convention — environment, required test cases (smoke & sanity, negative flow run before AND after the fix, positive flow run after), the recommended unit-tests category (function-level, mocked, run as a full `npm test`-style suite after all implementation phases and before the NEG post-fix pass), plus optional categories generated only on request (edge, error, regression, performance), expected results, side-effect checks, execution flow, and pass criteria. USE FOR: writing a new test doc after the main and plan docs exist; updating an existing test doc; recording test run results. INVOKE WITH: /topic-test <module-name> <topic-name>"
argument-hint: "<ModuleName> <TopicName>"
---

# Topic Test — Test Doc Owner

> *Adapt paths/commands to your repository's actual layout and tooling (test runner, dev-server command, logger, DB/Cache CLIs, gateway prefixes).*

## Table of Contents

1. [Overview](#overview)
2. [When to Use](#when-to-use)
   - [Test-only mode](#test-only-mode)
3. [Step 1 — Locate the Topic](#step-1--locate-the-topic)
4. [Step 2 — Read the Main & Plan Docs](#step-2--read-the-main--plan-docs)
5. [Step 3 — Explore the Codebase](#step-3--explore-the-codebase)
6. [Step 4 — Identify Test Paths](#step-4--identify-test-paths)
7. [Step 5 — Write or Update the Test Doc](#step-5--write-or-update-the-test-doc)
   - [5.1 — First-time write (filling the stub or creating fresh)](#51--first-time-write-filling-the-stub-or-creating-fresh)
   - [5.2 — Update an existing test doc](#52--update-an-existing-test-doc)
8. [Step 5.5 — Human Review Checkpoint (Blocking)](#step-55--human-review-checkpoint-blocking)
9. [Step 6 — Post-Run Documentation Update](#step-6--post-run-documentation-update)
   - [What to update](#what-to-update)
10. [Step 7 — Confirm](#step-7--confirm)
11. [Step 8 — Mandatory Session & Model Reminder](#step-8--mandatory-session--model-reminder)

---

## Overview

This skill is the **test doc owner** for a topic. The `topic-init` skill creates the main doc and `topic-plan` creates the plan doc — this skill writes the test suite that verifies the plan was implemented correctly, and continues to maintain it as tests are actually run (results, run log, fixes to run steps).

The test doc is the single source of truth for **how to verify** a topic works: environment setup, expected results, side effects, and pass criteria. The required/optional category split and the Negative-Flow-before-fix rule are defined in [`${CLAUDE_PLUGIN_ROOT}/skills/topic-test/rules/topic-test-doc-writing.md`](rules/topic-test-doc-writing.md) — do not restate them here.

In **test-only mode** (testing an existing feature with no code changes), the plan doc is not required — the test doc derives its test targets from the main doc and codebase exploration directly. See Step 1 for the existence gate details.

---

## When to Use

**Use this skill when:**
- The main doc (`<PREFIX>.md`) exists in `docs/ref/<MODULE>/<TOPIC>/` (the topic-doc convention this workflow follows — if the adopting repo uses a different docs root, adapt the path).
- The plan doc (`<PREFIX>_PLAN.md`) also exists **OR** you are in **test-only mode** (no code changes planned — see Step 1).
- You need to write the test suite for the first time (from scratch, or filling the stub if `topic-init` created one).
- You need to **update** an existing test doc with new cases, edge coverage, or a new category (e.g. performance).
- You just finished running tests and need to record results — see Step 6.

**Do NOT use this skill when:**
- The main doc does not exist yet — use `topic-init` first.
- The plan doc does not exist yet **AND code changes are planned** — use `topic-plan` first. (If no code changes are planned — test-only mode — the plan doc is optional; see below.)
- You need to create or update the main doc — use `topic-init` instead.
- You need to create or update the plan doc — use `topic-plan` instead.

### Test-only mode

When testing an **existing feature** with **no code changes** (e.g. audit, regression validation, baseline characterization), the plan doc is not needed — there are no phases, no branch, no commits, and no rollback to document. In this case, `topic-test` requires only the main doc and operates in **test-only mode**. The test doc frontmatter should note `Mode: test-only (no plan doc)` so it is clear why no plan doc is referenced.

---

## Step 1 — Locate the Topic

This skill requires the main doc to already exist — `topic-init` owns the main doc. The plan doc is **required when code changes are planned** (it provides phases, test targets, and rollback context), but **optional in test-only mode** (testing an existing feature with no code changes). Resolve the module and topic name, and derive the doc paths, per [Shared: Locating the Topic](`${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/locate-topic.md`).

**Verify the main doc exists** before proceeding. If it is missing, stop and tell the user to run `topic-init` first.

**Check for the plan doc:**
- If the plan doc exists → read it in Step 2 as usual (full mode).
- If the plan doc does not exist → ask the user whether code changes are planned.
  - If **yes** → stop and tell the user to run `topic-plan` first.
  - If **no** (test-only mode) → proceed without the plan doc. Note `Mode: test-only (no plan doc)` in the test doc frontmatter. Skip plan-doc-related items in Step 2 (phases, rollback, plan prerequisites) — derive test targets directly from the main doc and codebase exploration (Step 3).

---

## Step 2 — Read the Main & Plan Docs

Read the main doc in full, and the plan doc if it exists. Extract:

- **From main doc:** Target state/flow (what to test), technical details (side effects to verify), error handling (error scenario tests), open questions, config/env vars, external dependencies.
- **From plan doc** (if exists): Phases (each behavior-changing phase needs test cases), rollback steps, code references (test targets), prerequisites.
- **In test-only mode** (no plan doc): Derive test targets and scope directly from the main doc's Technical Details and Target State sections, and from the codebase exploration in Step 3. There are no phases or rollback steps to reference — the test doc covers the feature's current behavior as-is.

---

## Step 3 — Explore the Codebase

Read source code before writing — the test doc needs verification-level detail (exact endpoints/routes, request/response shapes, cache keys, database collections/tables, error bodies).

Look at the layers the target repo actually uses — e.g. in an Express.js app: route/handler files, business-logic modules, external-call services, shared helpers, config/env setup — plus existing tests (patterns). In a different stack, map this to the equivalent entry points, service layer, and config surface.

Minimum: 1 grep on topic keywords, 2 source files read, 1 existing test file (if any).

**Local run & logging convention (example — adapt to the repo):** a typical Node/Express service runs locally via its dev-server command (e.g. `npm start`), which loads a gitignored `.env` for config vars and uses a structured logger (e.g. pino via a `loggerFor('ComponentName')` helper) at `debug` level for non-production runs. When a test needs to inspect runtime state, add a temporary `log.debug` via the repo's logger and read it from the dev-server terminal — **do not use `console.log`** (it bypasses structured/redacted logging and is hard to read in the terminal). See the "Environment Scope" rule in [`${CLAUDE_PLUGIN_ROOT}/skills/topic-test/rules/topic-test-doc-writing.md`](rules/topic-test-doc-writing.md) for the full convention.

**Reuse the already-running local service — NEVER start a duplicate.** Before running any local test, check whether the service is already up on its local port (e.g. `curl -s -o /dev/null -w "%{http_code}" http://localhost:<port>/...` — expect `200`/`401`, not `000`). If it responds, reuse it as-is; do not start it again. **If the repo's dev-start command kills any existing instance on the port first** (e.g. a `prestart` hook running a port-killer), running it while the user's instance is up destroys their service and causes `HTTP 000` / connection-refused on subsequent requests. A test that suddenly returns `000` is more likely caused by a duplicate dev-server start killing the port than by the code crashing — check the port first before assuming a code bug. If a restart is needed, ask the user to do it manually and continue only after they confirm; only restart it yourself if the user has explicitly authorized that.

---

## Step 4 — Identify Test Paths

Enumerate cases across 7 categories. The required/optional gating is defined in [`${CLAUDE_PLUGIN_ROOT}/skills/topic-test/rules/topic-test-doc-writing.md`](rules/topic-test-doc-writing.md) — the table below lists the categories and ID prefixes for reference:

| Category | ID Prefix | Required? | What to test |
|----------|-----------|-----------|-------------|
| Smoke & Sanity | `SMK-` | **Required** — runs first | Service boots, core endpoint/route reachable, critical dependencies (cache/DB) reachable — fast baseline health check |
| Negative Flow | `NEG-` | **Required** — runs before AND after the fix | Missing/invalid/out-of-range fields, empty body, auth failure |
| Positive Flow | `TC-` | **Required** — runs after the fix | Happy path, cache hit/miss, multiple valid inputs, defaults |
| Unit Tests | `UNIT-` | **Recommended** — when a plan phase touches function-level logic in the repo's service/helper/util layer (e.g. in one Express.js layout: `server/database/service/`, `server/helpers/`, `server/utils/`, `server/service/`); skip for pure route/doc/config-only changes | Function-level logic exercised in-process with mocked DB/cache/external calls — fast, infrastructure-free; the full test-suite command (e.g. `npm test`) runs **after all implementation phases** and **before the NEG post-fix pass** (see `rules/topic-test-doc-writing.md`) |
| Edge Cases | `EC-` | Optional — only if requested | Boundaries, large payloads, concurrent requests, TTL expiry, partial data, unicode, time zones |
| Error Scenarios | `ERR-` | Optional — only if requested | Cache/DB down, external API timeout/5xx/4xx, rate limit |
| Regression | `REG-` | **Conditionally required** — required when plan touches shared code paths | Existing endpoints/routes, cache keys, response format unchanged |
| Performance | `PERF-` | Optional — only if requested | Response time under normal load, throughput, latency percentiles |

The required/optional gating, run-order, and the Negative-Flow-before-fix rule are defined in [`${CLAUDE_PLUGIN_ROOT}/skills/topic-test/rules/topic-test-doc-writing.md`](rules/topic-test-doc-writing.md) — do not restate them here.

Each case needs: ID, scenario (one line), why needed, category, precondition, request, expected positive result, expected negative result (anti-pattern), side effects, how to run, pass criteria.

---

## Step 5 — Write or Update the Test Doc

Follow the writing rules in [`${CLAUDE_PLUGIN_ROOT}/skills/topic-test/rules/topic-test-doc-writing.md`](rules/topic-test-doc-writing.md) — do not restate those rules here.

### 5.1 — First-time write (filling the stub or creating fresh)

If the test doc does not exist yet, or is still the empty stub (from `topic-init`, if one was created), replace/create it entirely using the [test doc template](`${CLAUDE_PLUGIN_ROOT}/skills/topic-test/templates/test-doc.md`).

Fill every section with real findings from Steps 2–4:

1. **Frontmatter** — Service, topic folder, status (`Draft`/`In Progress`/`Complete`/`Blocked`), last updated date.
2. **Table of Contents** — All `##` and key `###` sections (TOC rules are in [`${CLAUDE_PLUGIN_ROOT}/skills/topic-test/rules/topic-test-doc-writing.md`](rules/topic-test-doc-writing.md)).
3. **Test Environment** — Prerequisites (infra, env vars, seed data) + setup/reset commands. Include both **Local** and **Staging** subsections when the service has a staging deployment — local for dev testing, staging for pre-prod validation. Staging entries must include the API endpoint URL, database/cache connection details, and any access requirements (VPN, headers). **Never write real connection information (URLs, hostnames, ports, credentials, DB connection strings) anywhere in the doc** — use placeholders (e.g. `<LOCAL_API_URL>`, `<STG_GATEWAY_URL>`, `<LOCAL_DB_HOST>`, plus e.g. `<LOCAL_REDIS_HOST>` if your stack uses Redis) using the `<UPPER_SNAKE_CASE>` placeholder convention, and mark each `<!-- TODO: confirm -->`. The actual values must be provided by the user from the prompt at run time (many adopting repos keep them in a gitignored local reference file), not stored in the doc. See the "Environment Scope" rule in [`${CLAUDE_PLUGIN_ROOT}/skills/topic-test/rules/topic-test-doc-writing.md`](rules/topic-test-doc-writing.md) for the full placeholder/never-guess policy.
4. **Test Cases — Smoke & Sanity (required, run first)** — one `###` per case.
5. **Test Cases — Negative Flow (required, run BEFORE and AFTER the fix)** — one `###` per case. The post-fix re-run confirms each case now returns the correct rejection instead of the original bug.
6. **Test Cases — Positive Flow (required, run AFTER the fix)** — one `###` per case.
7. **Test Cases — Unit Tests (recommended)** — one `###` per case, generated when a plan phase touches function-level logic in the repo's service/helper/util layer (e.g. `server/database/service/`, `server/helpers/`, `server/utils/`, `server/service/` in one Express.js layout); skip for pure route/doc/config-only changes. Placed immediately after Positive Flow and before Edge Cases (see the template). The full test-suite command (e.g. `npm test`) runs **after all implementation phases** and **before the NEG post-fix pass**.

   Categories (required/optional, ID prefixes, what to test) are defined in the **Step 4 table** — do not restate them here. All cases share the same per-case structure:
   - **Scenario** — one line
   - **Why needed** — what bug/regression it prevents
   - **Category** — Happy Path / Missing Field / Invalid Type / Auth Failure / etc.
   - **Precondition** — system state before
   - **Request** — exact HTTP request (method, path, headers, body)
   - **Expected positive result** — correct behavior (status + body)
   - **Expected negative result** — anti-pattern a broken implementation would produce
   - **Side effects** — cache keys, database docs/rows, logs, external calls. Include verification commands inline when needed.
   - **How to run** — copy-pasteable command or step sequence.
   - **Pass criteria** — assertion checklist
   - **Open questions** — per-case questions that can't be answered from the codebase. Bullet list. Resolve inline when answered. **Each open question lives in exactly ONE doc — the doc where it was raised.** List only **test-specific** questions here; for questions already tracked in the main or plan doc, reference them (e.g. `main doc OQ N` / `plan doc OQ N`) rather than duplicating them.
8. **Test Cases — Edge Cases / Error Scenarios / Regression (optional / conditionally required)** — same per-case structure as Negative/Positive above. Edge Cases and Error Scenarios are optional (generate only on request). **Regression is conditionally required** — required when the plan doc touches any shared code path (e.g. middleware, shared helpers, utils, config, or a file imported/used by 2+ modules); generate it by default in that case. See the rule file for the full conditional-requirement policy and the `regression-gate` check (if the adopting repo wires it as a deterministic gate in `.claude/hooks/` — check before relying on it).
9. **Test Cases — Performance (optional)** — same per-case structure as above, plus a measured metric (latency, throughput) and a target threshold. See the rule file for the omit-when-not-requested policy.
10. **References** — Link to main doc and plan doc in the same topic folder only.

### 5.2 — Update an existing test doc

Do **not** overwrite. Make targeted edits:

- **Add cases:** Append under the right category with the next available ID.
- **Add an optional category on request:** If the doc doesn't yet have the requested category's section (Edge Cases / Error Scenarios / Regression / Performance), add it in the position shown in the [template](`${CLAUDE_PLUGIN_ROOT}/skills/topic-test/templates/test-doc.md`), plus its TOC entry and Testing Flow phase.
- **Update results/side effects/pass criteria:** Edit the relevant blocks within each test case.
- **Add/remove sections:** Update the TOC to match.
- **Resolve open questions:** Edit the per-case "Open questions" bullet — replace with `✅ Resolved — <answer>`.

See [`${CLAUDE_PLUGIN_ROOT}/skills/topic-test/rules/topic-test-doc-writing.md`](rules/topic-test-doc-writing.md) for the Table of Contents and Last Updated date rules that apply to every edit.

---

## Step 5.5 — Human Review Checkpoint (Blocking)

After the test doc is written (Step 5) and before any test execution or the post-run update step, the AI **must run a blocking human review checkpoint**. This enforces human ownership of the test plan before any tests are run — the human must read, understand, and explicitly approve the test coverage and pass criteria.

Follow [Shared: Human Review Checkpoint](`${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/human-review-checkpoint.md`) — that file is the single source of truth for the gate behavior, the summary table format, and the presentation rules. Use the **test-doc summary table** (5 rows: Test Coverage, NEG Cases, Environment, Side-Effect Checks, Pass Criteria) from that rule file.

**In summary (see the rule file for full detail):**

1. **Stop.** Do not proceed to Step 6 or Step 7, and do not run any tests.
2. **Present** the test-doc summary table with concrete details — test case IDs, NEG scenarios, environment placeholders, side-effect checks, pass criteria.
3. **Wait** for the human to respond. Do not proceed until the human explicitly approves.
4. **If the human raises concerns**, apply fixes to the test doc, re-present affected rows, and wait again.
5. **Never skip** this checkpoint.

---

## Step 6 — Post-Run Documentation Update

After **any test run is complete**, update the test doc immediately — do not batch this for later. Governing rules live in [`${CLAUDE_PLUGIN_ROOT}/skills/topic-test/rules/topic-test-doc-writing.md`](rules/topic-test-doc-writing.md) (see "Post-Test-Run Updates"); follow them for every run.

### What to update

| Item | When | Details |
|------|------|---------|
| **Doc status** | After every run | Update the `Status:` metadata header (e.g. `Draft` → `Active — <TC-ID> Verified`) |
| **Last Tested** | After every run | Add/update `Last Tested:` in the metadata header with date and time |
| **Result subsections** | After each test case | Add a `**Result:**` line (✅ PASS / ❌ FAIL + notes) directly below that test case's Pass Criteria checklist. For NEG-### cases, record BOTH `**Result (pre-fix):**` (Phase 1) and `**Result (post-fix):**` (Phase 2b) — one result line is incomplete. |
| **Pass criteria checklist** | After each test case | Check off each item that passed; leave unchecked items that failed |
| **Run log** | After every run | Append a dated entry (case IDs run, pass/fail counts, environment) — never edit or delete prior entries |
| **"How to run" commands** | After first run and whenever gaps found | Fix any incorrect commands, missing prerequisites, or steps that differ from real execution |
| **Plan doc Progress Tracker** | After test milestones | Update the plan doc's Progress Tracker to reflect test progress: mark the "Testing & Validation" phase (usually the last phase) `🔄 In Progress` when testing starts, `✅ Complete` when all tests pass. Also update the plan doc's `Last Updated` date. This is the same obligation as during implementation — see the adopting repo's contributor guide (e.g. `AGENTS.md` / `CLAUDE.md`, if present — adapt as needed). |

---

## Step 7 — Confirm

> **Note:** Step 5.5 (Human Review Checkpoint) must have completed with human approval before reaching this step. Do not proceed here if the checkpoint has not been approved.

Report:
- File path written/updated.
- Test case count by category (Smoke & Sanity / Negative / Positive — always; plus Edge / Error / Regression / Performance only if included).
- Any `<!-- TODO -->` items.
- Testing flow summary.
- What to run next (execute the flow — Smoke & Sanity first — or update plan doc Testing & Validation phase status).

---

## Step 8 — Mandatory Session & Model Reminder

> **Note:** This step is **mandatory** — the AI must always deliver this reminder at the end of `topic-test`. It is non-blocking (the human decides), but the AI must always say it. This enforces Context Management & Hygiene (Principle 1) and Model Selection & Tiering (Principle 11).

After completing all work for this skill, the AI **must** deliver the **per-prompt** and **per-session** reminders as defined in [`${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/topic-doc-writing-conventions.md`](../_shared/rules/topic-doc-writing-conventions.md) ("Per-prompt discipline" and "Per-session discipline" rules). Do not restate them here — read that file and deliver the reminders as written, substituting `topic-test` for the skill name.

### Model selection reminder

> *"**Model selection:** For the next step — test execution (running SMK/NEG/TC cases, quick checks): use a fast/cheap model tier suited to short verification loops. For code implementation (if the test doc is for a bug fix): also a fast tier. If the implementation involves complex multi-file logic, escalate to a heavier reasoning tier. If you need to share a screenshot or image with the AI for visual verification, use a vision-capable model tier. See the model recommendation table in the adopting repo's AI-assisted development principles doc (e.g. §11, if present — adapt as needed)."*