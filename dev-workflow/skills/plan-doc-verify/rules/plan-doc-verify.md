# Rule: Verifying the Topic Plan Doc

Follow the [Shared: Topic Doc Writing Conventions](${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/topic-doc-writing-conventions.md) for Table of Contents, Last Updated, file paths, never-guess, and cross-linking rules — do not restate those here.

This rule is the **verification checklist** for the plan doc. It is the single source of truth for what `plan-doc-verify` checks. It references (does not duplicate) the writing rules in `${CLAUDE_PLUGIN_ROOT}/skills/topic-plan/rules/topic-plan-doc-writing.md`, the coding conventions in the adopting repo's guidance (e.g. `AGENTS.md` "Coding conventions" / "Working in this repo" sections, or its `CLAUDE.md` equivalent, if present in the adopting repo — adapt as needed), and the Branch & Commit Strategy in `${CLAUDE_PLUGIN_ROOT}/docs/TOPIC_WORKFLOW_GUIDE.md` (if bundled — otherwise the repo's own strategy doc, if present).

*Adapt paths, conventions, and commands to your repository's actual layout and tooling.*

## Scope

- **Plan doc only** (`docs/ref/<MODULE>/<TOPIC>/<PREFIX>_PLAN.md`). Main docs are verified by `main-doc-verify`; test docs have their own future verifier — do not apply this checklist to them.
- The security check here is **design-level** (the planned changes, before code exists). It does not duplicate `/security-review`, which reviews the actual diff after coding.

## Verification Checklist

For each check, the verifier must produce **PASS / FAIL** with concrete evidence (file path, line number, the exact claim and its source, the specific convention violated).

### 1. Requirements Met & Valid Delivery

- **Requirement Coverage table** exists and **every** §2.1 requirement item from the main doc maps to ≥1 phase AND ≥1 test case ID (per the "Requirement Coverage" rule in `topic-plan-doc-writing.md`).
- A requirement item with no phase is an implementation gap; a requirement item with no test case is a verification gap. Both fail.
- **Target-state delivery** — the phases collectively deliver the main doc's Target State (§3). No required outcome is silently dropped between main→plan.
- The Coverage table references item numbers only — it does not restate requirement text (that lives in the main doc).

### 2. Coding Standards Conformance

- **Feature layering** — new routes follow the repo's established layering pattern (e.g. in an Express.js app, the feature triple `endpoint → controller → service`) per the repo's guidance ("Request layering" / "Architecture" sections, if present); no layer skipping.
- **Error handling** — each touched file's existing pattern is respected (e.g. an inline-response pattern vs a structured error-response helper + error constants). Every `catch` logs via the repo's logger before responding; every error response is preceded by `return` (per the repo's "Error handling" guidance, if present).
- **Logging** — the repo's structured logger/child-logger helper is used, never raw `console.log`. Sensitive fields go through the repo's logger redaction config (if it has one), not hand-rolled redaction (per the repo's "Logging" guidance).
- **Reuse / anti-spaghetti** — every Phase 1+ block has a Reuse field that is genuinely grep-verified (per the "Reuse Existing Code" rule in `topic-plan-doc-writing.md`). A `none (grep: <keywords>)` must actually have been grepped. Flag any Phase 1+ that specifies a new helper/service/utility when an existing equivalent exists in the repo's shared helper/utility/service directories (e.g. in an Express.js backend: `server/helpers/`, `server/utils/`, `server/services/`).

### 3. Design-Level Security / OWASP

A design-level review of the *planned* changes (before code exists). Check the plan for:

- **Input validation** — new/changed endpoints validate/sanitize params, query, and body before use; no raw user input into database queries, external API calls, or template strings.
- **Auth & permission guards** — new routes wire the repo's auth/permission middleware (or document why a route is public, e.g. guest/public access paths). No unguarded sensitive endpoint.
- **Injection surface** — no concatenation of user input into database queries or external API URLs; aggregation operators do not take raw user input.
- **PII / secret logging** — no logging of tokens, passwords, keys, or PII outside the repo's redaction config; error responses do not leak internals (stack traces, config values, connection strings).
- **External data egress** — new outbound calls send only required data; no over-sharing of user PII to third parties.
- **Secrets in docs** — no real connection info/credentials in the plan doc (placeholders only — see the `<UPPER_SNAKE_CASE>` placeholder convention). (A `secret-scan` gate in the adopting repo's `.claude/hooks/` backstops this, if present — see check 7.)

This is design-level: flag the concern and the mitigation the plan needs. It is not a code-level exploit audit (that is `/security-review`, after coding).

### 4. Accuracy vs Current Code

- Every referenced file path, function name, config key, env var, endpoint, cache/DB key, and DB/collection name in the plan's phases is verified against the actual source (grep + read).
- File paths exist, function names are real, endpoints/route prefixes match, DB/collection names match the repo's model/schema registration and config wiring (e.g. in a Mongoose/Express app: the schema/model registry and `config.js`), config keys exist in the repo's config module.
- Anything unverifiable is marked `<!-- TODO: confirm -->`, not guessed.

### 5. Rollback, NFR Coverage & Phasing Sanity

- **Rollback plausibility** — every phase has a Rollback that is concrete and executable (revert commit, delete a file, toggle a config flag, drop a cache key — e.g. a Redis key, if your stack uses Redis). A vague "restore previous state" fails.
- **NFR coverage** — the main doc's §5.5 Non-Functional Requirements are addressed by some phase. If the main doc marked NFR `N/A`, confirm the plan does not contradict that.
- **Phasing sanity** — Phase 0 prerequisites are real prerequisites; no phase depends on a later phase; each phase's Done When is a verifiable outcome; the Progress Tracker phase list matches the phase headings in the body.

### 6. Branch & Commit Hygiene

Check against the adopting repo's branch & commit strategy (see `${CLAUDE_PLUGIN_ROOT}/docs/TOPIC_WORKFLOW_GUIDE.md` → "Branch & Commit Strategy", if bundled — otherwise the repo's own strategy doc, if present) and the `topic-plan` rules:

- Commit messages are in Conventional Commits format; no commit hashes recorded (messages only).
- `[HOTFIX]` is appended to the commit subject **only** for genuine hotfixes — not present on normal feature/fix commits.
- One logical change per commit — code, topic docs, and tooling are not mixed in a single commit.
- Deployment Status covers Working Branch and the repo's deployment environments (e.g. Development, Staging, Production).

### 7. Deterministic Gates (reference, don't re-run)

The following may be enforced mechanically by gates in the adopting repo's `.claude/hooks/` (if present — check before relying on them) — the verifier confirms they apply but does not duplicate their logic:

- **TOC sync** — `toc-sync` gate (if present)
- **Open questions resolved** — `open-questions-gate` gate (if present; all plan-doc open questions `✅ Resolved` before execution or test doc creation)
- **No dangling doc links** — `doc-reference-gate` gate (if present)
- **No secrets** — `secret-scan` gate (if present)

### 8. Documentation Update Phase

- **Phase present and placed correctly** — the plan doc has a **Documentation Update** phase as the fixed penultimate phase, after all code-implementation phases and immediately before the Testing & Validation phase. Missing or misplaced = FAIL.
- **Doc Impact determination is explicit** — the phase has a *Doc Impact* entry for the repo's main reference docs (e.g. an API reference and an architecture doc, such as `docs/API_REFERENCE.md` and `docs/ARCHITECTURE.md` if present in the adopting repo), each marked Impacted or Not impacted. A blank/missing determination (no per-doc choice and no justification) = FAIL — the writer must make an explicit call, never skip silently.
- **Trigger correctness** — verify the Impacted/Not-impacted call against the actual code changes the plan describes (read the referenced source):
  - If the implementation phases add/change/remove an endpoint, route prefix, HTTP method, request/response field, auth guard, API version tag, or error code → the API reference doc (e.g. `docs/API_REFERENCE.md`) **must** be marked Impacted. Marking it Not impacted here = FAIL.
  - If the implementation phases touch the boot sequence, request layering (e.g. `endpoint → controller → service` in an Express.js app), database connections/models (the repo's schema/model registry and config wiring, e.g. the connection builder / `config.js` in a Mongo-backed app), config keys, middleware order, logging setup, or deployment shape → the architecture doc (e.g. `docs/ARCHITECTURE.md`) **must** be marked Impacted. Marking it Not impacted here = FAIL.
  - A *Not impacted* call with no one-line justification = FAIL.
- **Affected sections are real** — every listed section heading is verified to exist in the named doc (grep + read the repo's reference docs, e.g. `docs/API_REFERENCE.md` / `docs/ARCHITECTURE.md` if present). A heading that does not exist = FAIL.
- **Content specificity** — the *Content to add/change* entries are concrete (exact paths, methods, fields, diagram changes), not generic placeholders like "update the docs". Vague content = FAIL. Anything not yet confirmable is marked `<!-- TODO: confirm -->`, not guessed.
- **Done When & Rollback** — Done When requires re-reading each changed section against source (no stale paths/endpoints/function names/config keys) and TOC sync for edited docs; Rollback is concrete (revert the affected doc sections). Vague = FAIL.

## Human Review Checkpoint

After verification and before reporting, the verifier **must** run a blocking human review checkpoint: present a PASS/FAIL findings table with concrete evidence, and wait for explicit human approval before proceeding. If the human raises concerns, apply the fixes and re-present only the affected rows.

## Constraints

- **Never invent technical details** — use `<!-- TODO: confirm -->` for anything unverifiable.
- **Design-level security only** — this is not a replacement for `/security-review` on the actual diff.
- **Never run `git commit` / `git push`** — the human owns all git operations.