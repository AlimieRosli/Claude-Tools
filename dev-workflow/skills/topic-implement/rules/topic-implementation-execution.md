# Rule: Executing the Topic Implementation

The single source of truth for how `topic-implement` executes a plan doc. The `SKILL.md` steps defer to this file instead of restating it.

Follow the [Shared: Topic Doc Writing Conventions](`${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/topic-doc-writing-conventions.md`) for Table of Contents, Last Updated, file paths, never-guess, and cross-linking rules — and for the per-prompt and per-session discipline — do not restate those here.

## Plan Is the Single Source of Truth for Execution

- Execute phases in the plan doc's recorded order — Phase 0 (Prerequisites & Setup) → implementation phases → the fixed **Documentation Update** phase → the final **Testing & Validation** phase. Never skip, reorder, or merge phases without the human's explicit approval and a plan-doc update recording the change.
- Follow each phase's **Steps 1-by-1** as written. Each step names the file + function to touch and what to do — complete one step before the next.
- Verify the phase's **Done When** before marking it complete — it is a verifiable outcome, not a vague "it works". If it cannot be verified, the phase is not complete. If the phase goes wrong, execute its **Rollback** plan.
- All plan open questions must be `✅ Resolved` before any Phase 1+ execution (the open-questions gate — see the plan-doc rules; a deterministic gate may exist in the adopting repo's `.claude/hooks/` — check before relying on it).

## Progress Sync After Every Phase

- **Immediately after a phase's Done When is verified — and before starting the next phase** — mark the phase's Progress Tracker row `✅ Complete`, set the next phase `🔄 In Progress` when work on it starts, and update the plan doc's `Last Updated` date.
- **Never batch progress updates to the end of the run.** `topic-status` reads the Progress Tracker to report where the topic is — a stale tracker reports an incorrect next step.
- The AI or the human can write the update; the obligation is that it **is written after every phase completion**.

## Session & Granularity

- **One phase per prompt is the recommendation, not a mandate**: for complex multi-phase plans suggest one phase per prompt (within the same session, so context carries over); for simple plans multiple phases per prompt may be fine. **The human decides the granularity.** Avoid splitting a single phase across different sessions (loses context on what's already been done).
- Implementation runs in a **fresh session seeded from the plan doc and the test doc** — not continued from the session that wrote the docs (per the shared per-session discipline). When resuming, re-read the plan doc and test doc; the docs are the state.

## No Tests Between Phases

- **Complete ALL implementation phases before running any post-implementation test** (NEG post-fix, Positive, REG, and the full unit-test suite). The only tests that run before implementation are Smoke & Sanity and the NEG pre-fix pass.
- The full-suite unit run is a **single post-implementation gate that runs after ALL phases** — not a per-phase check. The canonical run-order rule lives in the test-doc rules ([`${CLAUDE_PLUGIN_ROOT}/skills/topic-test/rules/topic-test-doc-writing.md`](`${CLAUDE_PLUGIN_ROOT}/skills/topic-test/rules/topic-test-doc-writing.md`)) — reference it; do not restate it here.

## Unit-Test Implementation Timing

- The plan phase that names a colocated test file **implements it as part of its own steps** — the test file and every `UNIT-###` case it names are **written (not run) during that phase**. Unit-test code is written in the implementation session seeded from the plan doc (its phases and Unit Tests fields) and the test doc's `UNIT-` specs.
- The suite is only **run** once, after ALL implementation phases and before the NEG post-fix pass (see the run-order rule above). Never run it between phases.

## Reuse Is Binding

- The phase's **Reuse** field binds the implementation: call the named existing helper/service/function — never write a duplicate of logic that already exists. Phase 0 (environment setup) is exempt.
- Before adding any helper the plan did not name, grep the repo's shared-helper directories (e.g. `server/helpers/`, `server/utils/`, `server/services/` — *adapt to the repo's layout*) for an existing equivalent. If one exists, use it and note the substitution in the plan doc phase; if none exists, record `No existing utility found (verified by grep on <keywords>)` in the phase.
- If the named helper does **not** exist in the codebase, **stop** — treat it as plan/codebase drift ("When Reality Diverges" below) instead of writing a new one from memory.

## When Reality Diverges from the Plan

- If the code, behavior, or Done-When verification does not match the plan (missing helper, changed behavior, failing verification): attempt a **bounded repair — up to 3 fix attempts**, re-running the failing check after each attempt to confirm the fix.
- Still failing after 3 attempts: **stop**. Record the finding in the plan doc — add an Open Questions row or revise the affected phase per the plan-doc update rules — and tell the human. Never silently improvise a different design.
- **Never expand scope** beyond the main doc's §2.1 Requirement Statement and the plan's Requirement Coverage — ideas discovered mid-implementation become Open Questions or follow-up topics, not silent additions.

## Coding Conventions During Implementation

- Match the repo's layering and patterns (e.g. endpoint → controller → service in an Express.js-style backend — *adapt to the repo's layout*).
- Error handling and logging follow [Shared: Error Handling Conventions](`${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/error-handling.md`) — every `catch` logs before responding, every error response is returned, guard clauses first; use the repo's structured logger, never `console.log`.
- **Never read sensitive files** — env/config values come from the adopting repo's placeholder reference doc (see [Shared: Sensitive File Scope](`${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/sensitive-file-scope.md`)).

## Related-Doc Sync During Implementation

- **Any action that changes what a doc says must update that doc in the same action:**
  - **Plan doc** — Progress Tracker (per phase), Commits table and Deployment Status (**only as the user reports them** — per the `topic-plan` Step 4 rules), newly discovered Risks, `Last Updated`.
  - **Test doc** — results are recorded **through the `topic-test` skill's post-run update rules**; this skill never invents its own result format.
  - **Main doc** — if implementation reveals drift (current state, key files, limitations changed), make targeted edits per the main-doc update rules in `topic-init` (its §3.2 update path) — never a wholesale rewrite.
- A rule or fact lives in exactly ONE place — each doc is updated according to its owning skill's rules; this skill does not create new doc formats.

## Final Cleanup Sweep

After all phases are ✅ and the post-implementation test gates have run:

- **Remove temporary instrumentation** — debug logs added only for verification, scratch files, commented-out experiments. Production code keeps only the logging the plan specified.
- **Resolve every `<!-- TODO: confirm -->`** the implementation was meant to answer; anything still unknown becomes an Open Question in the doc where it was raised.
- **Doc-sync sweep** — every doc the work touched reflects the final state: plan doc (tracker, Status field, `Last Updated`, deployment as reported), test doc results (per `topic-test`), main doc drift (per `topic-init` update rules).
- **Plan doc `Status` field per its vocabulary** — `Complete` only when fully deployed to Production and all phases are ✅; otherwise `In Progress` (or `Blocked` / `On Hold` as applicable). Deployment is human-driven; record each environment's status as the user reports it.

## Git Ownership

- The human performs all git operations. Suggest commit messages in Conventional Commits format when the user asks; record commit messages and deployment status **only as the user reports them** (per the `topic-plan` Step 4 rules — never query `git log`/`git branch` to auto-detect or verify).

*Adapt paths/commands to your repository's actual layout and tooling.*