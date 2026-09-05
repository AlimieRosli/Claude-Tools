# Rule: Writing the Topic Plan Doc

Follow the [Shared: Topic Doc Writing Conventions](${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/topic-doc-writing-conventions.md) for Table of Contents, Last Updated, file paths, never-guess, and cross-linking rules — do not restate those here.

- Do NOT record commit hashes — only the commit message, in Conventional Commits format (see Step 4.1/4.3 in `SKILL.md`). Never query `git log`/`git branch` to auto-detect or verify these — suggest, then confirm with the user, and let the user update them at any time.
- **Hotfix commits carry a `[HOTFIX]` marker** — when the topic is a hotfix (deployed directly to production outside the normal release cycle), append `[HOTFIX]` to the end of the commit subject (e.g. `feat(payments): migrate shipping-cost API to new endpoints [HOTFIX]`). This is the repo SOP for flagging hotfix commits. Only add it for genuine hotfixes, not normal feature/fix commits.
- Do not duplicate information from the main doc. The plan doc references the main doc for "what" and "why"; the plan doc owns "how", "when", and "where".
- Keep the Status line at the top accurate: `Not Started`, `In Progress`, `Complete`, `Blocked`, or `On Hold`.
- When the work is fully deployed to Production and all phases are complete, set Status to `Complete`.
- **Link the test doc in the References section only if it already exists** — test docs are created later by `topic-test`. A freshly-written plan doc should not have a broken Test Doc link.

## Step Checkboxes & Progress Tracker (at-a-glance progress)

- **Every phase's `Steps` list is a task-list (checkbox) list — `- [ ]` per step, never plain numbered items.** This makes step completion visually scannable and tickable in VS Code / GitHub rendering without opening the phase body.
- **Tick a step's checkbox the moment the step is completed** — do not wait for the phase to finish. An unticked step in an `✅ Complete` phase is a sync failure.
- **The Progress Tracker's `Steps` column records `<ticked>/<total>` from that phase's Steps checklist** (e.g. `2/3`) — a per-phase step-completion summary so the tracker alone shows both phase status and internal step progress without scrolling to the phase body.
- **Update in the same edit:** whenever a step is ticked, the tracker's Steps count and (when the phase completes) the tracker's Status are updated in the same edit — never batched. The full progress-sync obligation (after every phase) is in the `topic-implement` execution rules ("Progress Sync After Every Phase"); this rule adds the per-step granularity.
- **Steps counts must match the body** — the tracker's `<total>` must equal the number of step checkboxes in that phase's Steps list. `plan-doc-verify` flags a mismatch (e.g. tracker says `0/3` but the phase has 4 steps). When steps are added/removed mid-execution (with human approval), update both the checklist and the count in the same edit.
- **All `<total>` counts in a freshly-written plan are `0`** (e.g. `0/3`) — no step is ticked at authoring time. Ticking starts only when `topic-implement` executes the phase.

## Action Overview

- The plan doc must have an **Action Overview** section (a `## Action Overview` heading) that records the confirmed action overview for the topic. It is required, not optional.
- The action overview is drafted in SKILL.md Step 4.4 and confirmed by the user, then recorded in this section. It is a short plain-text summary of what the topic does and why.
- **Text only — never use emoji** in the action overview (or anywhere in the plan doc). Use plain text only.
- This overview is **recommended for use as the PR description** when the pull request is opened.
- Do not fabricate the action overview — draft it from the main doc (what/why) and the plan (how), and let the user confirm or edit it before recording.

## Reuse Existing Code

- **Before specifying a new helper, service function, or utility in a phase step, grep the repo's shared-helper directories (e.g. `server/helpers/`, `server/utils/`, `server/services/` in an Express.js-style layout) for an existing equivalent.** If one exists, the step must say "reuse `<existing>(...)`" rather than "add a new function." If none exists, state "No existing utility found (verified by grep on <keywords>)."
- Every Phase 1+ block in the plan doc must include a **Reuse** field (after Current Code). It records: the existing helper/service/function to be reused, or `none (grep: <keywords>)` if none was found.
- This avoids spaghetti code — duplicating logic that already exists elsewhere in the codebase — and ensures the plan builds on existing utilities rather than reinventing them.
- The Reuse field is **required** for Phase 1+ blocks. Phase 0 (Prerequisites & Setup) is exempt (it is environment setup, not feature code).

*Adapt the helper-directory paths to your repository's actual layout and tooling.*

## Unit Tests Field (recommended)

- Every Phase 1+ block in the plan doc that touches **non-trivial function-level logic** in the repo's service/helper/util layers (e.g. `server/database/service/`, `server/helpers/`, `server/utils/`, `server/service/` in an Express.js/Mongoose-style backend) should include a **Unit Tests** field (after Reuse) naming the colocated test file (e.g. `__tests__/*.test.js` mirroring the source tree) and the `UNIT-###` cases that verify it. State `N/A — no service/helper/util logic touched` when the phase is pure wiring, doc, or config-only.
- This field is **recommended, not gating** — it mirrors the `UNIT-` category's recommendation in `topic-test` (see the `UNIT` column in the topic workflow guide's Decision Matrix, if present in the adopting repo). It exists so the plan author thinks up-front about which functions deserve white-box, infrastructure-free coverage, rather than leaving unit tests as an afterthought discovered only at test-doc time.
- **Implementation timing & session (explicit):** the phase that names a colocated test file **implements it as part of its own steps** — the test file and every `UNIT-###` case it names are written (not run) during that phase. The canonical implementation-timing rule (fresh implementation session, seeded from this plan doc and the test doc's `UNIT-` specs) lives in [`${CLAUDE_PLUGIN_ROOT}/skills/topic-implement/rules/topic-implementation-execution.md`](${CLAUDE_PLUGIN_ROOT}/skills/topic-implement/rules/topic-implementation-execution.md) ("Unit-Test Implementation Timing") — reference it; do not restate it here.
- The full unit-test suite (e.g. `npm test`) runs once, **after ALL implementation phases** and **before the NEG post-fix pass** — the Unit Tests field names the cases, it does not change run order. The canonical run-order rule is in [`${CLAUDE_PLUGIN_ROOT}/skills/topic-test/rules/topic-test-doc-writing.md`](${CLAUDE_PLUGIN_ROOT}/skills/topic-test/rules/topic-test-doc-writing.md); Phase 0 is exempt.

## Requirement Coverage

- The plan doc must have a **Requirement Coverage** section (a `## Requirement Coverage` heading with a `| §2.1 Item | Phase(s) | Test Case ID(s) |` table). It is required, not optional.
- **Every requirement item in the main doc's §2.1 Requirement Statement must map to ≥1 phase and ≥1 test case ID in the Coverage table.** A requirement item with no phase is an implementation gap; a requirement item with no test case is a verification gap. Both are coverage failures.
- The §2.1 Item column references the item number from the main doc (1, 2, 3, ...) — it does **not** restate the requirement text. The requirement text lives only in the main doc.
- The Coverage table is the traceability link between the requirement (main doc), the implementation (plan phases), and the verification (test cases). Without it, a requirement can be silently dropped between main→plan or plan→test.
- When the test doc is created later, update the Test Case ID(s) column to reference the actual case IDs (TC-###, NEG-###, REG-###, etc.). Until then, leave the column as `<!-- TODO: fill from test doc -->`.

## Open Questions

- The plan doc must have an **Open Questions** section (a `## Open Questions` heading with a `| # | Question | Status |` table). It is required, not optional.
- **The "one doc per open question" rule is in the [shared conventions](${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/topic-doc-writing-conventions.md)** — each OQ lives only in the doc where it was raised; other docs reference it. Applied to the plan doc: list only **plan-specific** questions (those raised during implementation planning). For questions already tracked in the main doc, add a reference line pointing to the main doc's Open Questions section (e.g. `All open questions for this topic were raised and resolved in the [Main Doc §7 Open Questions](./<TOPIC_UPPER>.md#7-open-questions) — they are not duplicated here.`) and do not re-list them. When referencing a main-doc question elsewhere in the plan (e.g. in a phase step or risk), write `main doc OQ N` rather than `OQ N`.
- **Any assumption, missing detail, unclear behavior, or unresolved decision the AI encounters while writing the plan must be listed as an open question** — never guess or silently fill in an answer. If a config value, endpoint behavior, cache key format, or any other detail is not confirmed in the codebase or by the user, add a row with Status `Open`.
- **All open questions must be resolved (Status set to `✅ Resolved — <answer>`) before proceeding to execution or test doc creation.** Execution (marking any Phase 1+ row in the Progress Tracker active) and test doc creation must not start while any question is `Open`. This is enforced by the `open-questions-gate` hook on `*_PLAN.md` and `*_TEST.md` edits — a deterministic gate may exist in the adopting repo's `.claude/hooks/`; check before relying on it (the gate behavior below stands as the convention regardless).
- When a question is answered, update the row's Status to `✅ Resolved — <answer>` inline. Do not delete the row — it keeps the decision history.
- The open-questions section is the plan doc's gate between planning and doing. A plan with an unresolved question is a draft, not an executable plan.
- **Opt-out for topics with no open questions to track:** a completed topic the team has decided not to backfill an Open Questions section for may skip the `open-questions-gate` gate entirely. Add one marker anywhere in the plan doc or the test doc, with a stated reason: `<!-- open-questions-gate: exempt — <reason> -->`. An exemption marker with no reason is itself flagged by the gate (where the gate is present).

## Documentation Update Phase

- The plan doc must include a **Documentation Update** phase as the fixed penultimate phase — placed after all code-implementation phases and immediately before the final **Testing & Validation** phase. It is a fixed phase (like Phase 0 and the Testing phase), not one of the variable implementation phases.
- **Trigger:** the phase is **mandatory when any code change in the implementation phases touches information documented in the repo's API reference or architecture docs** (e.g. `docs/API_REFERENCE.md` / `docs/ARCHITECTURE.md` if present in the adopting repo — adapt doc names as needed) — for example, a new/changed/removed endpoint, route prefix, request/response field, auth guard, or API version tag (→ API reference); or a change to the boot sequence, request layering (e.g. endpoint → controller → service in an Express.js app), database connections/models (e.g. connection builder / `config.js` in a Mongo-backed app), config keys, middleware order, logging setup, or deployment shape (→ architecture doc).
- **If neither doc is impacted**, both *Doc Impact* checkboxes are set to *Not impacted* with a one-line justification, the steps are skipped, and the phase is N/A. A blank *Doc Impact* (no per-doc choice and no justification) is a verification failure — the writer must make an explicit impact determination, never skip silently.
- **Required fields** for this phase (different from code phases): **Doc Impact** (per doc: Impacted / Not impacted), **Affected sections** (exact headings in the API reference / architecture docs), **Content to add/change** (specific paths/methods/fields/diagrams), **Steps**, **Done When**, **Rollback**. It is **exempt from the Reuse field** — it edits docs, not feature code.
- The phase's **Done When** must require re-reading each changed doc section against the actual source (no stale paths, endpoints, function names, or config keys) and TOC sync for any edited doc. See the plan doc template for the phase block shape. (A TOC-sync gate may exist in the adopting repo's `.claude/hooks/` — check before relying on it.)