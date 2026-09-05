# <Topic Name> — Implementation Plan

> **Service / Module:** `<!-- repository/app name -->`
> **Status:** Not Started
> **Last Updated:** <!-- date -->

---

## Table of Contents

- [ — Implementation Plan](#--implementation-plan)
  - [Table of Contents](#table-of-contents)
  - [Branch \& Deployment](#branch--deployment)
    - [Commits](#commits)
    - [Deployment Status](#deployment-status)
  - [Action Overview](#action-overview)
  - [Progress Tracker](#progress-tracker)
  - [Requirement Coverage](#requirement-coverage)
  - [Prerequisites](#prerequisites)
  - [Phase 0 — Prerequisites \& Setup](#phase-0--prerequisites--setup)
  - [Phase 1 — ](#phase-1--)
  - [Phase 2 — ](#phase-2--)
  - [**Done When:**](#done-when)
  - [**Rollback:**](#rollback)
  - [Phase 3 — ](#phase-3--)
  - [**Done When:**](#done-when-1)
  - [**Rollback:**](#rollback-1)
  - [Phase 4 — Documentation Update](#phase-4--documentation-update)
  - [Phase 5 — Testing \& Validation](#phase-5--testing--validation)
  - [Risks](#risks)
  - [Open Questions](#open-questions)
  - [References](#references)

---

## Branch & Deployment

**Branch:** `<!-- branch name -->`

### Commits

| Commit Message |
|----------------|
| `<!-- commit subject — append [HOTFIX] if this is a hotfix -->` |

### Deployment Status

<!-- Adapt the environment rows to the repo's actual deployment environments; Working Branch / Development / Staging / Production is the typical shape. -->

| Environment | Status | Branch / Note |
|---|---|---|
| Working Branch | ☐ Not Started | `<!-- branch -->` |
| Development | ☐ Not Started | `<!-- dev branch -->` |
| Staging (STG) | ☐ Not Started | `<!-- stg branch -->` |
| Production (PRD) | ☐ Not Started | `<!-- prd branch -->` |

> **Staging Post-Deploy Verification:** When `Staging (STG)` is marked **Deployed**, run the `STG-###` cases in the test doc's "Staging Post-Deploy Verification" section against the staging environment (via the repo's staging API gateway, if it has one) and record their `**Result:**` lines. This is **required** for New feature / Bug fix / Config-infra / Hotfix classifications, optional for Refactor / Test-only, and skipped for Investigation / Minor change. See the topic workflow guide (`TOPIC_WORKFLOW_GUIDE.md` → "Staging Post-Deploy Verification"), if present in the adopting repo — adapt as needed.

---

## Action Overview

<!-- Draft the action overview here (see SKILL.md Step 4.4). A short summary of what this topic does and why. This overview is recommended for use as the PR description. -->

<!-- Short body — what changed and why, in a few lines. -->

---

## Progress Tracker

| Phase | Name | Steps | Status |
|-------|------|-------|--------|
| 0 | Prerequisites | 0/1 | ☐ Not Started |
| 1 | <!-- name --> | 0/3 | ☐ Not Started |
| 2 | <!-- name --> | 0/3 | ☐ Not Started |
| 3 | <!-- name --> | 0/3 | ☐ Not Started |
| 4 | Documentation Update | 0/3 | ☐ Not Started |
| 5 | Testing & Validation | 0/4 | ☐ Not Started |

> **Steps column:** `<ticked>/<total>` from that phase's **Steps** checklist below — e.g. `2/3` means 2 of the phase's 3 step checkboxes are ticked. Read the tracker (Steps + Status) for where the topic stands without scrolling; the phase body's ticked checkboxes show *which* steps inside the active phase are done. Update the Steps count in the same edit as the Status column (see the progress-sync rule in [`${CLAUDE_PLUGIN_ROOT}/skills/topic-implement/rules/topic-implementation-execution.md`](${CLAUDE_PLUGIN_ROOT}/skills/topic-implement/rules/topic-implementation-execution.md) — "Progress Sync After Every Phase").

> **Execution tip:** implementation is executed by the [`topic-implement` skill](${CLAUDE_PLUGIN_ROOT}/skills/topic-implement/SKILL.md) — its execution rules ([`${CLAUDE_PLUGIN_ROOT}/skills/topic-implement/rules/topic-implementation-execution.md`](${CLAUDE_PLUGIN_ROOT}/skills/topic-implement/rules/topic-implementation-execution.md)) carry the per-phase-per-prompt session rule and the progress-sync obligation (tracker ✅ after every phase, `Last Updated` updated).

---

## Requirement Coverage

**Required.** Maps each requirement item from the main doc's §2.1 Requirement Statement to the phase(s) that implement it and the test case ID(s) that verify it. Every §2.1 item must map to ≥1 phase and ≥1 test case ID — a requirement item with no phase or no test case is a coverage gap. See [`${CLAUDE_PLUGIN_ROOT}/skills/topic-plan/rules/topic-plan-doc-writing.md`](${CLAUDE_PLUGIN_ROOT}/skills/topic-plan/rules/topic-plan-doc-writing.md) ("Requirement Coverage") for the full rule.

| §2.1 Item | Phase(s) | Test Case ID(s) |
|-----------|----------|-----------------|
| 1 | <!-- Phase N --> | <!-- TC-### / NEG-### / etc. --> |
| 2 | | |
| 3 | | |

---

## Prerequisites

- [ ] <!-- e.g. the app's database/cache running locally (e.g. via mongosh/redis-cli/docker compose if your stack uses Mongo/Redis) -->
- [ ] <!-- e.g. Env var X is set -->
- [ ] <!-- e.g. Read file Y before changing it -->

---

## Phase 0 — Prerequisites & Setup

**Goal:** Ensure environment and codebase are ready.

**Steps:**
- [ ] <!-- e.g. Verify the config keys for the new dependency in the repo's config module -->

**Done When:**
- <!-- e.g. Service starts with new env vars without errors -->

**Rollback:**
- <!-- How to undo -->

---

## Phase 1 — <!-- Name -->

**Goal:** <!-- One sentence -->

**Current Code:**
- File: `<path/to/file>`
- Behavior: <!-- what it currently does -->

**Reuse:** <!-- existing helper/service to call, or "none (grep: <keywords>)" — before adding a new utility, grep the repo's shared-helper directories (e.g. server/helpers/, server/utils/, server/services/) for an existing equivalent -->

**Steps:**
<!-- Step checkboxes: tick each as it is completed, and update this phase's Progress Tracker Steps count + Status in the same edit (progress-sync rule). -->
- [ ] <!-- File + function to touch, and what to do -->
- [ ]
- [ ]

**Done When:**
- <!-- Verifiable outcome -->

**Rollback:**
- <!-- How to undo -->

---

## Phase 2 — <!-- Name -->

**Goal:**

**Current Code:**
- File: `<path/to/file>`
- Behavior:

**Reuse:** <!-- existing helper/service to call, or "none (grep: <keywords>)" -->

**Steps:**
- [ ]
- [ ]
- [ ]

**Done When:**
-

**Rollback:**
-

---

## Phase 3 — <!-- Name -->

**Goal:**

**Current Code:**
- File: `<path/to/file>`
- Behavior:

**Reuse:** <!-- existing helper/service to call, or "none (grep: <keywords>)" -->

**Steps:**
- [ ]
- [ ]
- [ ]

**Done When:**
-

**Rollback:**
-

---

## Phase 4 — Documentation Update

**Goal:** Keep the repo's API reference and architecture docs (e.g. `docs/API_REFERENCE.md` and `docs/ARCHITECTURE.md`, if present in the adopting repo — adapt doc names as needed) in sync with the code changes from the implementation phases — completed **before** testing.

**Doc Impact (required — determine before writing steps):**
- API reference doc (e.g. `docs/API_REFERENCE.md`): ☐ Impacted  ☐ Not impacted
- Architecture doc (e.g. `docs/ARCHITECTURE.md`): ☐ Impacted  ☐ Not impacted

> **Trigger:** This phase is **mandatory when any code change in the implementation phases touches information documented in the repo's API reference or architecture docs**. Examples:
> - **API reference** — new/changed/removed endpoint, route prefix, HTTP method, request/response field, auth guard, API version tag, or error code.
> - **Architecture doc** — change to the boot sequence, request layering (e.g. endpoint → controller → service in an Express.js app), database connections/models (e.g. a connection builder / `config.js` in a Mongo-backed app), config keys, middleware order, logging setup, or deployment shape.
>
> If **neither** doc is impacted, check both as *Not impacted*, record a one-line justification, and skip the steps — the phase is N/A for this topic.

**Affected sections (list every heading/section that must change):**
- API reference → <!-- e.g. "Endpoints → <feature domain>" -->
- Architecture doc → <!-- e.g. "Database layer — connections and models" -->

**Content to add/change (per section — be specific: exact paths, methods, fields, diagram changes):**
1. <!-- e.g. API reference: add row for the new endpoint — method, path, auth, controller, description -->
2. <!-- e.g. Architecture doc: add the new DB connection to the connection list + schema-registration branch -->

**Steps:**
- [ ] Update each affected section listed above to reflect the new code — match the existing doc's style, heading levels, and Table of Contents.
- [ ] If the API reference was impacted, ensure its Table of Contents stays in sync (a TOC-sync gate may exist in the adopting repo's `.claude/hooks/` — check before relying on it).
- [ ] Re-read every changed section against the actual source to confirm no drift — file paths, function names, endpoints, route prefixes, and config keys must match the code.

**Done When:**
- Every affected section listed above reflects the code changes from the implementation phases.
- Changed sections re-read against source — no stale paths, endpoints, function names, or config keys.
- TOC of any edited doc is in sync.
- If both docs are *Not impacted*: a one-line justification is recorded above and the steps are skipped.

**Rollback:**
- Revert the doc edits for the affected sections only (e.g. `git checkout -- docs/API_REFERENCE.md docs/ARCHITECTURE.md`).

---

## Phase 5 — Testing & Validation

**Goal:** All test cases pass, no regressions.

**Steps:**
- [ ] Run test cases in [Test Doc](./<TOPIC_UPPER>_TEST.md) <!-- only if created -->, following its **Testing Flow** order exactly — do not invent a different order:
   ```
   Phase 0 — Smoke & Sanity → Phase 1 — Negative Flow pre-fix pass →
   implement the fix → Phase 2 — Positive Flow → Phase 2b — Negative Flow post-fix pass →
   Phase 3+ — optional categories (Edge / Error / Regression / Performance) →
   Phase 7 — Side-Effect Spot Checks
   ```
- [ ] Verify the Negative Flow post-fix pass (Phase 2b): each NEG case now returns the correct rejection instead of the original bug — both `Result (pre-fix)` and `Result (post-fix)` must be recorded.
- [ ] Confirm regression checks (REG), if included, show no change to existing endpoints/behavior.
- [ ] <!-- Any smoke/load test steps -->

**Done When:**
- Test doc's "Pass Criteria (Feature Complete)" checklist is fully checked off.
- All NEG (Negative Flow) cases have both `Result (pre-fix)` and `Result (post-fix)` recorded.
- All REG (Regression Checks), if included, confirm no existing functionality broken.

**Rollback:**
- <!-- How to undo -->

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| <!-- e.g. external API rate limits, cache key collisions, breaking changes to the client wire format, config drift between environments --> | Low/Med/High | Low/Med/High | <!-- mitigation --> |

---
## Open Questions

**Required.** Any assumption, missing detail, unclear behavior, or unresolved decision the AI encountered while writing this plan must be listed here — never guess or silently fill in an answer. **All open questions must be resolved before proceeding to execution or creating the test doc.** The `open-questions-gate` hook enforces this — a deterministic gate may exist in the adopting repo's `.claude/hooks/` (check before relying on it); the convention stands regardless: if any question has Status `Open`, execution phases (Phase 1+) and test doc creation are blocked.

<!-- Completed topic not being backfilled with an Open Questions section? See "Opt-out for topics with no open questions to track" in ${CLAUDE_PLUGIN_ROOT}/skills/topic-plan/rules/topic-plan-doc-writing.md to exempt this doc from the open-questions-gate. Delete this comment once resolved. -->

| # | Question | Status |
|---|---------|--------|
| 1 | <!-- e.g. What is the expected TTL for the new cache key? --> | Open |

<!-- When a question is answered, update Status to: ✅ Resolved — <answer> -->

---
## References

- [Main Doc](./<TOPIC_UPPER>.md)

<!-- The test doc is NOT created by default — add its link here ONLY once the test doc actually exists in this folder. Only link docs within this topic folder. Do not link to other topic folders, external docs, or cross-project references. -->

*Adapt paths/commands to your repository's actual layout and tooling.*