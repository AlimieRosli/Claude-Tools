# AI-Assisted Development Principles

**Status:** Active
**Last Updated:** 2026-09-04

> *Adapt paths/commands to your repository's actual layout and tooling. This document is written repo-agnostically; the adopting repo's own instructions files (`AGENTS.md`/`CLAUDE.md`, if present) are its ground truth for codebase-specific patterns.*

---

## Table of Contents

- [AI-Assisted Development Principles](#ai-assisted-development-principles)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Category A — AI Execution \& Harness Control](#category-a--ai-execution--harness-control)
    - [1. Context Management \& Hygiene](#1-context-management--hygiene)
    - [2. Human-in-the-Loop \& Ownership](#2-human-in-the-loop--ownership)
    - [3. Requirements Gathering \& Traceability](#3-requirements-gathering--traceability)
    - [4. Deep Research \& Codebase Analysis](#4-deep-research--codebase-analysis)
    - [5. Token \& Infrastructure Cost Optimization](#5-token--infrastructure-cost-optimization)
    - [6. Dynamic \& Intelligent Workflow (Graph Engine)](#6-dynamic--intelligent-workflow-graph-engine)
    - [7. Planning \& Progress Monitoring](#7-planning--progress-monitoring)
    - [8. Automated \& Edge-Case Testing](#8-automated--edge-case-testing)
    - [9. Self-Correction \& Healing Loops](#9-self-correction--healing-loops)
    - [10. Persistent Memory \& Self-Improvement](#10-persistent-memory--self-improvement)
    - [11. Proper Model Selection \& Tiering](#11-proper-model-selection--tiering)
    - [Recommended models (updated based on cost, availability, and performance)](#recommended-models-updated-based-on-cost-availability-and-performance)
    - [How the AI enforces model selection](#how-the-ai-enforces-model-selection)
  - [Category B — Production \& Governance](#category-b--production--governance)
    - [12. Security, Vulnerability \& Secret Defense](#12-security-vulnerability--secret-defense)
    - [13. Data Privacy \& Supply Chain Compliance](#13-data-privacy--supply-chain-compliance)
    - [14. Architectural Integrity \& Anti-Spaghetti Code](#14-architectural-integrity--anti-spaghetti-code)
    - [15. Algorithmic Complexity \& Resource Leaks](#15-algorithmic-complexity--resource-leaks)
    - [16. Assertion \& Test Quality Verification](#16-assertion--test-quality-verification)
    - [17. Git Hygiene \& Change Auditability](#17-git-hygiene--change-auditability)
    - [18. Production Observability \& Telemetry](#18-production-observability--telemetry)
    - [19. Engineering Culture \& Skill Preservation](#19-engineering-culture--skill-preservation)
  - [Related Artifacts](#related-artifacts)

---

## Overview

This is the **single foundational document** for AI-assisted development in the adopting repo. The principles below are the main 'answer' to the core **why** questions that justify the entire workflow system:

- **Why we need this workflow** — AI left unchecked hallucinates, breaks shared code paths, and produces untraceable work (Context Management, Requirements & Traceability, Deep Research, Automated & Edge-Case Testing, Self-Correction).
- **Why use AI** — done properly it accelerates delivery while enforcing quality and traceability that manual work often lacks (Human-in-the-Loop, Planning & Progress Monitoring, Persistent Memory, Engineering Culture).
- **Why use AI properly** — proper driving (context isolation, human-in-the-loop, research, model tiering) is what separates an accelerator from a liability (Context Management, Human-in-the-Loop, Deep Research, Token & Cost, Model Selection).
- **Why dynamic** — a single linear chat cannot branch, recover, or scale to the risk of the work; a state-graph workflow of nodes and edges can (Dynamic & Intelligent Workflow).
- **Why nodes, skills, agents, hooks** — each node type has a distinct enforcement role: **skills** (LLM-driven process), **agents** (autonomous multi-step), **hooks** (deterministic mechanical backstops), **rules** (on-demand detail). One type alone is not enough (Dynamic Workflow, Self-Correction, and the enforcement notes across all principles).

The principles are organized into two complementary categories:

- **Category A — AI Execution & Harness Control:** how the AI is *driven* — context hygiene, human authority, requirements discipline, research depth, cost control, workflow structure, planning, testing (including no-negative-impact verification), self-healing, memory, and model tiering.
- **Category B — Production & Governance:** what the AI *produces* must survive production — security, supply-chain compliance, architecture integrity, complexity/resource discipline, test quality, git hygiene, observability, and human skill preservation.

Each principle states **why it is needed** (the root failure mode that justifies its existence), its **Goal**, checklist bullets, an **Anti-pattern**, and its **Enforcement**. The principles are **not rigid rules** — like the topic workflow, they scale to the risk and complexity of the work. A one-line config fix does not need a full security audit; a new public endpoint does. Use the per-principle enforcement notes to decide what applies per task.

---

## Category A — AI Execution & Harness Control

### 1. Context Management & Hygiene

**Why this principle is needed:** AI models hallucinate when their working context grows large, stale, or mixed across unrelated tasks — the further the prompt drifts from verified facts, the more confident the model becomes about invented details.

**Goal:** Prevent hallucinations, context drift, and prompt dilution.

- Isolate work into **sub-agent sessions** so one task's context does not pollute another.
- **Compact** long sessions via file-backed state (write intermediate findings to disk) rather than keeping everything in the prompt.
- Keep the working context **small and focused** — one logical task per session where possible.
- Re-read authoritative files (`AGENTS.md`, `CLAUDE.md` — if present in the adopting repo, adapt as needed — and topic docs) rather than relying on stale in-context copies.
- **Per-prompt discipline** — within a single session, send **one prompt at a time** (prompt 1 by 1). Do not chain multiple unrelated requests into a single mega-prompt. Each prompt should have one clear objective. Wait for the result before sending the next prompt.
- **Per-session discipline** — when the AI completes a workflow skill (`topic-init`, `topic-plan`, `topic-implement`, `topic-test`, or any phase of implementation), it **must proactively remind the human** to either: (a) start a **fresh session** for the next skill/phase, or (b) at minimum acknowledge that continuing in the same session risks context dilution. This reminder is **mandatory at the end of every skill's Confirm step** — see the enforcement rows below.

**Anti-pattern:** A single mega-prompt that chains 10 unrelated tasks and drifts off the original requirement. Also: the AI completing a skill and silently moving to the next without reminding the human to consider a session change.

**Enforcement:**

| Enforcer | What it does |
|----------|-------------|
| `${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/topic-doc-writing-conventions.md` | "Never guess" rule — never guess technical details not found in the codebase; use `<!-- TODO: confirm -->` instead of inventing an answer. Also: **per-prompt and per-session discipline** rule — one prompt at a time, remind the human to change session between skills. |
| One skill per session recommendation | `topic-init`, `topic-plan`, `topic-implement`, `topic-test` each recommend running in separate sessions to avoid context dilution. |
| `topic-init` Confirm step | **Mandatory post-task reminder** — the AI must tell the human to start a new session for `topic-plan` / `topic-test`, and remind them to select the right model (see item 11). |
| `topic-plan` Confirm step | **Mandatory post-task reminder** — the AI must tell the human to start a new session for `topic-test` or implementation, and remind them to select the right model. |
| `topic-test` Confirm step | **Mandatory post-task reminder** — the AI must tell the human to start a new session for test execution or the next workflow step, and remind them to select the right model. |
| `topic-test` env placeholder policy | Never store real connection info in the test doc — use placeholders (`<LOCAL_API_URL>`) marked `<!-- TODO: confirm -->`. (Placeholders use the `<UPPER_SNAKE_CASE>` convention; the adopting repo keeps real values out of committed docs.) |
| Env-scope gate (if present) | A deterministic gate may exist in the adopting repo's `.claude/hooks/` — e.g. one that mechanically scans test docs for disallowed environment references (PRD, production, dev). Check before relying on it. |
| Adopting-repo instructions (`CLAUDE.md`/`AGENTS.md`) documentation standards | External factual claims must carry inline citations; unverifiable claims marked `[UNVERIFIED — needs source]`. Do not invent percentage/metric estimates. |

---

### 2. Human-in-the-Loop & Ownership

**Why this principle is needed:** AI can produce plausible-looking code that no human understands or has reviewed. Without explicit human authority at every gate, the system drifts toward autonomous commits and deployments that nobody can explain or safely roll back.

**Goal:** Humans retain authority, ownership, and manual approval over plans and code.

- Enforce **human gatekeeper checkpoints** before: plan approval, code merge, and deployment.
- The AI **proposes**; the human **disposes**. No AI-initiated `git commit` / `git push` (see the adopting repo's `AGENTS.md`, if present — the human owns all git operations).
- Every production change must have a **named human owner** who reviewed and understands it.
- Approval gates are **non-negotiable** even when the AI is confident.

**Anti-pattern:** Letting the AI auto-commit and auto-deploy without a human review checkpoint.

**Enforcement:** The adopting repo's `AGENTS.md` git-ownership rule (if present); `topic-plan` human-SOP note — **Human SOP**.

---

### 3. Requirements Gathering & Traceability

**Why this principle is needed:** AI cannot infer intent reliably — given a vague prompt it invents scope, fills gaps with assumptions, and produces work that looks complete but answers a question nobody asked. Without a sourced, typed requirement the entire delivery is untraceable.

**Goal:** Deep requirements capture and strict delivery adherence without scope creep.

- Capture the requirement from an **authoritative source** (SRS, ticket, meeting notes, direct prompt) and record its type (Feature / Bugfix / Investigation).
- Maintain a **traceable chain**: requirement → plan phase → test case → verification result.
- **Block scope creep** — deliver what was asked, not more, not less, not different.
- Surface contradictions between the requirement and the codebase **before** implementation.

**Anti-pattern:** Starting with a vague "make it better" and inventing scope as you go.

**Enforcement:**

| Enforcer | What it does |
|----------|-------------|
| `topic-init` §2 Requirements section | **Mandatory and blocking.** Every topic must cite where its requirement came from and state its type. Stops and asks the user if it cannot be determined. |
| `${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/topic-main-doc-writing.md` | Full enforcement details for the Requirements section. |
| `topic-init` Step 2 — Explore the codebase | Minimum 1 grep + 2 source files read — surfaces contradictions between the requirement and existing code. |
| `topic-plan` Requirement Coverage table | **Required table.** Maps each main-doc §2.1 requirement item to its phase(s) and test case ID(s). Every requirement must have at least one phase and one test case. |
| `${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/topic-plan-doc-writing.md` | Full enforcement details for the Requirement Coverage table. |
| `topic-plan` Open Questions gate | All open questions (including requirement ambiguities) must be `✅ Resolved` before execution or test doc creation. |
| Open-questions gate (if present) | A deterministic gate may exist in the adopting repo's `.claude/hooks/` — e.g. one that mechanically blocks test doc creation if the plan doc has unresolved open questions. Check before relying on it. |
| `topic-test` Post-run update | After tests are run, each test case gets a `**Result:**` line (✅ PASS / ❌ FAIL); the plan doc's Progress Tracker is updated. |
| `topic-plan` Progress Tracker | Each phase has a status (☐ Not Started / 🔄 In Progress / ✅ Complete) and a `Steps` count (`<ticked>/<total>` from that phase's step checkboxes) — phase + step completion visible at a glance, no scrolling. |
| `topic-test` Test Results Dashboard | Each test doc has a `## Test Results Dashboard` table at the top — one row per case (Status / NEG pre-post-fix results / Last Run) synced with the case's `**Result:**` line in the same edit — pass/fail state visible without scrolling to each case. |
| `topic-implement` execution | Executes the plan's phases per its execution rules and keeps the Progress Tracker in sync after every phase — the tracker is only trustworthy because the executor updates it immediately. |
| `topic-plan` "Done When" per phase | Each phase has a verifiable outcome, not a vague "it works". |

---

### 4. Deep Research & Codebase Analysis

**Why this principle is needed:** AI generates code by pattern-matching, not by understanding the codebase. It will confidently reference files, functions, and config keys that don't exist unless forced to verify them against the actual source.

**Goal:** Analyze existing code before writing a single line of new logic.

- Index **AST, dependencies, and imports** to understand the codebase structure.
- **Grep before you write** — check for existing helpers, services, and patterns (see the adopting repo's `AGENTS.md`, if present — Step 3: ≥1 grep + ≥2 source files read).
- Ground every technical claim in real code, never assumptions.
- Use `<!-- TODO: confirm -->` for anything not yet verified.

**Anti-pattern:** Writing a plan that references a helper that doesn't exist because the AI assumed it from the name.

**Enforcement:**

| Enforcer | What it does |
|----------|-------------|
| `topic-init` Step 2 — Explore the codebase | Minimum 1 grep + 2 source files read. The AI must ground its writing in real codebase findings, not assumptions. |
| `topic-plan` Step 3 — Explore the codebase | Deeper exploration: exact functions, line numbers, config keys, call sites. The plan needs implementation-level detail, not guesses. |
| `topic-test` Step 3 — Explore the codebase | Verification-level detail: exact endpoints, request/response shapes, cache keys, DB collections, error bodies. |
| Helper-reuse gate (if present) | A deterministic gate may exist in the adopting repo's `.claude/hooks/` — e.g. one that mechanically checks that the plan doc's "Current Code" section references real files before allowing test doc creation. Check before relying on it. |

---

### 5. Token & Infrastructure Cost Optimization

**Why this principle is needed:** Sending the same large context to a heavy reasoning model for every trivial task burns cost and latency for no benefit. Unmanaged, AI-assisted development becomes expensive at scale.

**Goal:** Minimize API and infrastructure costs.

- Leverage **prompt caching** for repeated context (system prompts, `AGENTS.md`/`CLAUDE.md`, stable doc blocks).
- Use **sticky model selection** — don't re-send large context to a fresh model unnecessarily.
- Prefer **MCP servers / lightweight runners** for mechanical tasks over heavy reasoning models.
- Right-size the model to the task (see item 11).

**Anti-pattern:** Sending a 200k-token context to a premium reasoning model for a one-line typo fix.

**Enforcement:** `topic-init` Step 1.1 classification (scale flow to risk) — **Skill**.

---

### 6. Dynamic & Intelligent Workflow (Graph Engine)

**Why this principle is needed:** A single linear chat cannot branch on test failure, loop back on a requirement ambiguity, or skip steps for a minor change. Work has conditional paths — forcing it into one rigid sequence produces either over-engineering (every step for every task) or skipped steps (when the sequence doesn't fit the case).

**Goal:** Structure work as a state graph (Nodes & Edges) with conditional routing, not a single long chat.

- Model the task as **nodes** (research → plan → implement → test → deploy) with **edges** (conditional transitions).
- Route conditionally: e.g. test failure → repair node; requirement ambiguity → human-query node.
- Avoid linear mega-prompts; prefer **branching workflows** that can loop back on failure.
- This is the conceptual basis for the [topic workflow](#terminology--the-workflow-as-a-state-graph) (see `${CLAUDE_PLUGIN_ROOT}/docs/TOPIC_WORKFLOW_GUIDE.md`) — a state graph of nodes (skills/agents/hooks) connected by edges. New nodes are added from time to time; the `workflow-self-correct` node keeps the graph's docs in sync and keeps node counts/names generic so a new node needs only the canonical lists updated.

**Anti-pattern:** A single linear chat that cannot branch or recover when a step fails.

**Enforcement:**

| Enforcer | What it does |
|----------|-------------|
| `topic-init` Step 1.1 — Classification | Asks 7 classification questions before writing any doc. Determines the case (new feature, bug fix, minor change, investigation, refactor, config/infra, hotfix, test-only). |
| `${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/topic-classification.md` | Single source of truth for the 7 cases and their recommended flows. |
| `topic-init` early exit | If classification = "Minor change", stops immediately — no doc written, tells user to make the change manually. |
| Main doc frontmatter | Records `Classification` and `Recommended flow` so the AI and user always know which skills to use. |
| `${CLAUDE_PLUGIN_ROOT}/docs/TOPIC_WORKFLOW_GUIDE.md` decision matrix | Quick lookup table showing which docs/tests to use per case type. |

---

### 7. Planning & Progress Monitoring

**Why this principle is needed:** AI can generate code instantly but cannot self-verify that it's 'done'. Without an inspectable plan with checkable acceptance criteria, there is no way to confirm the work is complete — only that code was produced.

**Goal:** Generate inspectable specs with checkable acceptance criteria before execution.

- Produce a **`PLAN.md`** with phases, steps, and **checkable acceptance criteria** ("Done When") before writing code.
- Track progress per phase (☐ Not Started / 🔄 In Progress / ✅ Complete).
- Record branch, deployment status, risks, and rollback per phase.
- See the [topic-plan skill](`${CLAUDE_PLUGIN_ROOT}/skills/topic-plan/SKILL.md`) for the plan-doc template.

**Anti-pattern:** Jumping straight to code with no plan and no way to verify "done".

**Enforcement:** `topic-plan` (phases, progress tracker, "Done When", rollback per phase, Risks table) — **Skill**; `topic-implement` (executes the phases and updates the tracker after every phase) — **Skill**.

---

### 8. Automated & Edge-Case Testing

**Why this principle is needed:** AI-generated tests tend to cover only the happy path — the path the AI just made work — and a change that passes its own tests can still silently break other modules that depend on the same shared code path. Without explicit coverage of boundary, null, error, and negative-impact states, the test suite gives false confidence and a fix in a shared helper becomes a regression in three other places.

**Goal:** Unit and integration suites covering boundary conditions, null states, error paths, and negative-impact verification — so the change does not break existing functionality, especially in shared code paths (e.g. middleware/, helpers/, utils/, config/, or any file imported by 2+ modules — *adapt the directories to your repository's layout*).

- Cover **boundary conditions**, **null/empty states**, and **error paths** — not just the happy path.
- Write tests that assert **business logic**, not pass-through behavior (see item 16).
- Run **negative-flow** tests before AND after a fix — before to capture the original behavior, after to confirm the fix resolves it without breaking the rejection path.
- Run **regression** tests when shared code paths are touched — verify existing endpoints/behavior are unchanged.
- Document **side-effects** for each test case (cache keys, DB documents, logs, external calls) with verification commands — e.g. via redis-cli/mongosh if your stack uses Redis/Mongo.
- Include **SMK (Smoke & Sanity)** cases to verify the service boots, core endpoints are reachable, and backing stores (DB/cache) are connected — baseline health.
- Include **PERF cases** (optional) for response time, throughput, latency percentiles with measured metrics and target thresholds.

**Anti-pattern:** A test suite that only exercises the happy path and never the failure modes — or fixing a bug in a shared helper, passing the fix's test, but silently breaking 3 other modules that depend on the helper.

**Enforcement:**

| Enforcer | What it does |
|----------|-------------|
| `topic-test` NEG test cases (required) | Run **before AND after** the fix. Before: captures the bug/original behavior. After: confirms the fix resolves it without breaking the rejection path. |
| Negative-flow gate (if present) | A deterministic gate may exist in the adopting repo's `.claude/hooks/` — e.g. one that mechanically checks that each `NEG-###` case has BOTH `**Result (pre-fix):**` and `**Result (post-fix):**` lines. One line = incomplete. Check before relying on it. |
| `topic-test` REG test cases (conditionally required) | Required when the plan touches shared code paths. Verifies existing endpoints/behavior are unchanged. |
| Regression gate (if present) | A deterministic gate may exist in the adopting repo's `.claude/hooks/` — e.g. one that checks: if the plan doc's "Current Code" section references files under shared directories, the test doc MUST contain at least one `### REG-###` heading. Check before relying on it. |
| `topic-test` side-effect checks | Each test case documents side effects (cache keys, DB documents, logs, external calls) with verification commands. |
| `topic-test` SMK (Smoke & Sanity) cases | Verify the service boots, core endpoints are reachable, backing stores are connected — baseline health. |
| `topic-test` PERF cases (optional) | Response time, throughput, latency percentiles with measured metrics and target thresholds. |
| `topic-plan` Rollback per phase | Each phase has a rollback step — how to undo if it goes wrong. |
| `topic-plan` Risks table | Likelihood / Impact / Mitigation for each implementation risk. |

---

### 9. Self-Correction & Healing Loops

**Why this principle is needed:** When a deterministic hook or test fails, the AI either retries indefinitely (burning cost and drifting) or silently swallows the failure and continues. Neither is safe. A bounded repair loop with re-verification is what makes the workflow resilient without losing accountability.

**Goal:** Intercept failures and allow a dedicated repair agent bounded fix attempts.

- Intercept test failures via **OS/IDE hooks** (e.g. deterministic gates and watchers, if the adopting repo has them in its `.claude/hooks/`).
- Allow a dedicated **repair agent** up to **3 automated fix attempts** before escalating to a human.
- Each attempt must re-run the failing check to confirm the fix.
- Log the root cause as a **post-mortem rule** for future prevention (see item 10).
- The `workflow-self-correct` node is the **meta self-correction loop** for the workflow infrastructure itself: it fixes redundancy/duplication across the topic-doc ecosystem, and registers newly added workflow nodes across all related docs (keeping node counts/names generic so future nodes need no doc edits).

**Anti-pattern:** Letting the AI retry indefinitely, or silently swallowing a failure without re-verification.

**Enforcement:** Deterministic gates + watchers (if present in the adopting repo); `hook-fix` skill (bounded repair) — **Hook + skill**.

---

### 10. Persistent Memory & Self-Improvement

**Why this principle is needed:** AI is stateless between sessions. Without persistent steering files and post-mortem rules, the same mistake is repeated across sessions — the cost of a bug is paid every time instead of once.

**Goal:** Maintain repo-level steering files and log post-mortem rules when bugs are resolved.

- Keep **`AGENTS.md`** (or the repo's equivalent AI-instructions file, e.g. `CLAUDE.md`) as the single source of truth for AI-assisted development in the adopting repo.
- When a bug is resolved, **log the post-mortem rule** so the same mistake is not repeated.
- Maintain **memory files** (user / session / repo scopes) for cross-session learning.
- Update or remove stale memories — memory that is wrong is worse than no memory.

**Anti-pattern:** Repeating the same mistake across sessions because the fix was never recorded.

**Enforcement:** `AGENTS.md` (or equivalent); memory files; post-mortem logging — **Human SOP + memory**.

---

### 11. Proper Model Selection & Tiering

**Why this principle is needed:** Using a premium reasoning model for every task — including one-line typo fixes — wastes cost and latency. Conversely, using a cheap model for architecture decisions produces shallow designs. The model must match the task's reasoning depth.

**Goal:** Match tasks to right-sized models.

### Recommended models (updated based on cost, availability, and performance)

> **Note:** This table is an example and is updated from time to time — adapt it to your team's provider lineup and budget. Provider priority = the order to try if a provider is unavailable. The human selects the model; the AI **must remind** the human to select the right model at the end of every workflow skill (see item 1 enforcement).

| Task type | Recommended model | Provider priority | Rationale |
|-----------|------------------|-------------------|-----------|
| Most coding tasks, investigation, minor bugfix, small tasks, quick checks | **DeepSeek V4 Flash 0731** | OpenRouter / DeepSeek platform / Ollama (local) | High volume, low reasoning depth, cost-effective |
| Complex tasks, planning, deep research, complex multi-file logic checks, heavy tasks | **GLM 5.2 / 5.3** or **Qwen 3.8** | Cortex / Ollama (local) / OpenRouter | High-stakes, needs deep reasoning |
| Human supplies image to AI model (free, limited) | **Dots Studio: Dots3-Note Preview** | OpenRouter | Free on OpenRouter with limit — use when the human needs to share an image with the AI |

### How the AI enforces model selection

- **Sticky selection** — keep the same model for a session to preserve context.
- Escalate to a heavier model only when the task genuinely requires it.
- **Mandatory post-task model reminder** — at the end of every workflow skill's Confirm step, the AI **must** remind the human:
  > *"Before starting the next step, ensure you're using the right model. For <next task type>, the recommended model is <model name>. See the model recommendation table in `AI_ASSISTED_DEVELOPMENT_PRINCIPLES.md` §11."*
- The reminder is **non-blocking** (the human decides) but **mandatory** (the AI must always say it). This closes the gap where the AI completes a task without prompting the human to verify their model choice.

**Anti-pattern:** Using a premium reasoning model for every trivial task, burning cost and latency. Also: the AI completing a task without reminding the human to check their model selection.

**Enforcement:** Provider-switch tooling (e.g. a `toggle-claude-provider.sh` script if the adopting repo uses one); `settings.local.*.json`; mandatory post-task model reminder in every topic skill's Confirm step — **Config + skill rule**.

---

## Category B — Production & Governance

### 12. Security, Vulnerability & Secret Defense

**Why this principle is needed:** AI can generate code that looks correct but contains injection vulnerabilities, missing input validation, or hardcoded secrets. Without automated scanning, these flaws reach production because no human reviewer catches every line.

**Goal:** Automatically scan generated code for OWASP Top 10 flaws, un-sanitized inputs, and secret leakage.

- Scan for **OWASP Top 10** flaws (injection, XSS, broken auth, etc.) in generated code.
- Check for **un-sanitized inputs** and missing validation on all user-facing endpoints.
- Run **secret scanners** (e.g. `gitleaks`, `trufflehog`) to catch API keys, tokens, and credentials before they reach the repo.
- **Never read sensitive files** (stack-dependent: env/config files, profile files, keys, credentials — even "just to check a value"). All placeholder/env values come from the adopting repo's placeholder reference doc (e.g. `docs/PLACEHOLDER_REFERENCE.md`) — see the plugin's Shared: Sensitive File Scope rule.
- A deterministic secret-scan gate may exist in the adopting repo's `.claude/hooks/` (e.g. enforcing the "no real secrets in docs" rule repo-wide) — check before relying on it.

**Anti-pattern:** Shipping an endpoint that echoes raw user input into a query without sanitization.

**Enforcement:** Secret-scan gate for docs (if present); external scanners (`gitleaks`/`trufflehog`) for code; sensitive-file-scope rule for AI file access — **Hook + external tool + skill rule**.

---

### 13. Data Privacy & Supply Chain Compliance

**Why this principle is needed:** AI can suggest packages that don't exist (typosquatting), carry copyleft licenses incompatible with proprietary code, or introduce vulnerable dependencies. Blindly installing AI-suggested packages injects supply-chain risk into the project.

**Goal:** Audit AI-suggested third-party packages to prevent typosquatting, malicious dependencies, copyleft violations, and PII leaks.

- Verify every AI-suggested package is **real** (guard against **typosquatting** / malicious lookalikes).
- Check **license compatibility** — avoid copyleft (GPL/AGPL) in proprietary code.
- Audit the **supply chain** for known-vulnerable or abandoned dependencies.
- Ensure **PII** is not sent to model training sets or third-party services.

**Anti-pattern:** Blindly installing a package the AI suggested (e.g. `npm install`, or your package manager's equivalent) without checking its provenance or license.

**Enforcement:** Human review of AI-suggested deps; license/provenance audit — **Human SOP**.

---

### 14. Architectural Integrity & Anti-Spaghetti Code

**Why this principle is needed:** AI creates new logic by default rather than reusing existing helpers, producing duplicate implementations that diverge from the established pattern. Over time this erodes code quality and maintainability.

**Goal:** Enforce project-wide architectural patterns so AI code reuses existing utilities instead of creating duplicate, unmaintainable logic.

- Enforce the repo's **layering** and patterns (see the adopting repo's `AGENTS.md`, if present — e.g. in an Express.js app the feature triple endpoint → controller → service layering).
- **Reuse existing utility functions and design systems** — grep before writing new helpers.
- Reject duplicate logic that diverges from the established pattern.
- Keep the architecture **Clean / DDD-aligned** as the project dictates.

**Anti-pattern:** Writing a new `formatDuration()` when an existing utils module (e.g. `server/utils/time.js` in a Node backend — *adapt to your repo*) already has one.

**Enforcement:**

| Enforcer | What it does |
|----------|-------------|
| `topic-plan` "Reuse" field per phase | **Required for Phase 1+.** Each phase must list the existing helper/service/function to reuse, or `none (grep: <keywords>)` if none was found. |
| `${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/topic-plan-doc-writing.md` | "Reuse Existing Code" rule — grep the repo's helper/utility/service directories for equivalents before specifying new functions. |
| `topic-init` Step 2 — Explore the codebase | Minimum 2 source files read + 1 grep. The exploration phase naturally surfaces existing helpers and patterns. |
| Adopting-repo instructions (`CLAUDE.md`/`AGENTS.md`) architecture patterns | Documents existing patterns (e.g. "When adding a new external database, follow the existing pattern...") so the AI knows what to reuse. |
| Helper-reuse gate (if present) | A deterministic gate may exist in the adopting repo's `.claude/hooks/` — e.g. one that mechanically checks the plan doc's "Current Code" section references real files. Check before relying on it. |
| `topic-plan` "Current Code" per phase | Documents the file(s) and function(s) as they exist today, so the implementation matches the existing style. |

---

### 15. Algorithmic Complexity & Resource Leaks

**Why this principle is needed:** AI generates code that works for small inputs but hides $O(N^2)$ loops, N+1 query patterns, and unclosed resources. These failures only surface under production load, not in local testing.

**Goal:** Check AI code for hidden bottlenecks and resource leaks.

- Watch for hidden **$O(N^2)$** bottlenecks and **unindexed database queries**.
- Detect **N+1 API calls** / query patterns.
- Check for **unclosed event listeners**, timers, streams, and **memory leaks**.
- Verify connection pools and external clients are properly released.

**Anti-pattern:** A loop that issues one DB query per item (N+1) instead of a single indexed query.

**Enforcement:** Human code review; `topic-test` PERF cases (optional) — **Human SOP + skill**.

---

### 16. Assertion & Test Quality Verification

**Why this principle is needed:** AI-generated tests often mock the dependency and assert the mock returns what was fed to it — proving nothing about the real business logic. Without auditing test quality, the suite is full of tests that pass but verify nothing.

**Goal:** Audit AI-generated tests to verify they test actual business logic, not pass-through assertions or over-mocking.

- Reject **pass-through assertions** (asserting the mock returns what you fed it).
- Avoid **over-mocking** real dependencies — prefer integration tests where feasible.
- Verify tests assert **business behavior**, not implementation trivia.
- Ensure **boundary, null, and error** cases are covered (see item 8).

**Anti-pattern:** A test that mocks the service and asserts the mock's return value — proving nothing about the real logic.

**Enforcement:** `topic-test` test-case quality rules — **Skill**.

---

### 17. Git Hygiene & Change Auditability

**Why this principle is needed:** AI produces large multi-file changes that mix code, docs, and config. Without atomic, logically grouped commits, the history becomes unreadable and rollback becomes impossible.

**Goal:** Break AI outputs into atomic, logically grouped commits with an explicit audit trail.

- Split AI output into **atomic, logically grouped commits** — not massive multi-file dumps.
- Maintain an **audit trail** of what was AI-generated vs. human-edited.
- Follow the repo's [Branch & Commit Strategy](`${CLAUDE_PLUGIN_ROOT}/docs/TOPIC_WORKFLOW_GUIDE.md#branch--commit-strategy`) (adapt to your repo's own branching convention): one logical change per commit, `feat:`/`fix:`/`docs:`/`chore(claude):` prefixes.
- The **human** performs all git operations (see the adopting repo's `AGENTS.md`, if present).

**Anti-pattern:** A single 40-file commit mixing code, docs, and tooling with no logical grouping.

**Enforcement:** [Branch & Commit Strategy](`${CLAUDE_PLUGIN_ROOT}/docs/TOPIC_WORKFLOW_GUIDE.md#branch--commit-strategy`) — **Human SOP**.

---

### 18. Production Observability & Telemetry

**Why this principle is needed:** AI-generated endpoints often lack structured logging, error handling, and health checks. Without these, production failures are invisible — the team can't diagnose what went wrong or even know the endpoint is failing.

**Goal:** Ensure AI-generated endpoints include structured logging, error handling, health checks, and tracing.

- Use **structured logging** via the repo's own logger wrapper (e.g. a pino-based `loggerFor('ComponentName')` in a Node.js backend — *use whatever structured logger your repo provides; never raw `console.log`/print statements in production code*).
- Every `catch` block must **log the error** before responding; every error `res.status()` must be preceded by `return` (adapt to your framework's response idiom — see the adopting repo's `AGENTS.md`, if present).
- Add **health checks** and **OpenTelemetry tracing** for production monitoring.
- Ensure sensitive fields are **redacted** from logs (prefer a central redaction config over hand-rolled redaction).

**Anti-pattern:** A new endpoint with `console.log` debugging and no error logging or health check.

**Enforcement:**

| Enforcer | What it does |
|----------|-------------|
| `topic-init` §5.5 Non-Functional Requirements | **Required for Feature type.** Performance, scalability, security, observability targets. If a target is not known, mark `<!-- TODO: confirm -->` and list as an open question. |
| Adopting-repo instructions (`CLAUDE.md`/`AGENTS.md`) "Working in this repo" section | Documents the codebase conventions (language/runtime, async vs callback style, existing data-connection patterns, logging via the repo's logger) — *if present; adapt as needed*. |
| Adopting-repo instructions logging standards | Use the repo's structured logger/child-logger factory, structured fields, auto-redaction — don't use `console.log`. |
| `${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/error-handling.md` | Every `catch` block must `log.error({ err: e }, '<handlerName> failed')` before responding; every error response must be preceded by `return`. |

---

### 19. Engineering Culture & Skill Preservation

**Why this principle is needed:** If developers merge AI-generated code they don't understand, the team loses the ability to maintain and debug it. AI becomes a liability when it replaces engineering judgment instead of accelerating it.

**Goal:** Ensure developers actively review, understand, and own every line of code pushed to production.

- **No blind AI reliance** — every line must be reviewed and understood by a human.
- Guard against **skill atrophy** — developers must be able to explain and maintain the code.
- Pair AI output with **human code review** as a mandatory step.
- Treat AI as an **accelerator**, not a replacement for engineering judgment.

**Anti-pattern:** Merging AI-generated code that no human can explain or maintain.

**Enforcement:** Human code review as mandatory step — **Human SOP**.

---

## Related Artifacts

| Artifact | Location | Purpose |
|----------|----------|---------|
| Topic Workflow Guide | `${CLAUDE_PLUGIN_ROOT}/docs/TOPIC_WORKFLOW_GUIDE.md` | Decision matrix, scaling, branch & commit strategy |
| Hooks Reference | `.claude/hooks/README.md` (if present in the adopting repo — adapt as needed) | Every `check-*.js` gate, shared core pattern, watchers |
| `AGENTS.md` | Repo root (if present in the adopting repo) | Single source of truth for AI-assisted development |
| `CLAUDE.md` | Repo root (if present in the adopting repo) | Auto-loaded project instructions |
| Topic skills | `${CLAUDE_PLUGIN_ROOT}/skills/topic-*/SKILL.md` | init / plan / implement / test / hook-fix / hook-init skills |