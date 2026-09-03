# Rule: Verifying the Topic Main Doc

Follow the [Shared: Topic Doc Writing Conventions](${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/topic-doc-writing-conventions.md) for Table of Contents, Last Updated, file paths, never-guess, and cross-linking rules — do not restate those here.

This rule is the **verification checklist** for the main doc. It is the single source of truth for what `main-doc-verify` checks. It references (does not duplicate) the writing rules in `${CLAUDE_PLUGIN_ROOT}/skills/topic-init/rules/topic-main-doc-writing.md` and the adopting repo's documentation standard (e.g. its `AGENTS.md` / `CLAUDE.md`, if present — adapt as needed).

## Scope

- **Main doc only** (`docs/ref/<MODULE>/<TOPIC>/<PREFIX>.md`). Plan and test docs have their own verifiers — do not apply this checklist to them.

## Verification Checklist

For each check, the verifier must produce **PASS / FAIL** with concrete evidence (file path, line number, the exact claim and its source).

### 1. Requirements (§2)

- **Source** is cited: an official document (SRS section, ticket ID, spec, meeting notes — with link/reference) OR `Direct request (prompt)`. Never blank, generic, or `<!-- TODO -->`.
- **Type** is exactly one of `Feature`, `Bugfix`, or `Investigation`, matching what §2.1 and §4 describe.
- **Requirement Statement (§2.1)** says precisely what changes/gets added (Feature), what gets fixed (Bugfix), or what gets explored/answered (Investigation) — not a restatement of the Overview.

### 2. External Claims (Pricing / Quota / SLA)

- Every external factual claim (third-party pricing, rate limits, quotas, SLAs, third-party API behavior) carries an inline citation: **source name, URL, and date checked**.
- Unverifiable claims are marked `[UNVERIFIED — needs source]`, not stated as fact.
- No plausible-sounding number is presented as confirmed unless a primary source was actually checked.

### 3. No Invented Metrics

- No unverified percentage/metric estimates (cost reductions, hit ratios, latency improvements, capacity numbers) stated as fact.
- Metrics are either backed by measurement data, or marked `<!-- TODO: confirm -->` and listed as an open question in §7.
- Otherwise the doc uses qualitative terms (High/Moderate/None).

### 4. Accuracy vs Current Code

- Every referenced file path, function name, endpoint, DB/collection name, config key, and service is verified against the actual source (grep + read).
- File paths exist, function names are real, endpoints/route prefixes match, and DB/collection names match the repo's actual schema/model registration and config layer (e.g. in an Express.js + Mongoose app, confirm against the schema-registration module and the central config file).
- Anything unverifiable is marked `<!-- TODO: confirm -->`, not guessed.

*Adapt verification targets to your repository's actual layout and tooling.*

### 5. Structural Rules

- **No code blocks** — no implementation code, no existing function bodies, no config object literals.
- **No files-to-modify listed** — specific file changes belong in the plan doc.
- **§5.5 Non-Functional Requirements** present — required for `Feature`; `N/A — no NFR impact` (with reason) for Bugfix; `N/A — investigation only` (with reason) for Investigation.
- **Open Questions table** uses `| # | Question | Status |` only (no Owner column); status starts `Open`, resolved rows are `✅ Resolved — <answer>`.

### 6. Readability for the Human

The doc is written for a human reader, not an LLM. Flag as FAIL (with the offending row quoted):

- **Open Questions rows over ~25 words** — an OQ is 1–2 sentences phrased as a question you'd ask a colleague; one question per row (an "and" joining two asks is two rows).
- **Undefined jargon** — inflated verbs ("leverage", "facilitate", "orchestrate") or technical terms with no plain-words parenthetical, per the [Shared: Topic Doc Writing Conventions](${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/topic-doc-writing-conventions.md) plain-language rule.
- **Full sentences in checkpoint-style tables** — cells should be references + noun phrases, not narrated prose (references, not explanations — the plain-language rule of the shared conventions).

### 7. Deterministic Hooks (reference, don't re-run)

The following **may be enforced mechanically by gates in the adopting repo's `.claude/hooks/`** — check whether they exist before relying on them. The verifier confirms they apply but does not duplicate their logic; if the repo has no such hooks, run these checks manually as part of this verification:

- **TOC sync** — `toc-sync` gate
- **No dangling doc links** — `doc-reference-gate` gate
- **No secrets** — `secret-scan` gate

## Human Review Checkpoint

After verification and before reporting, the verifier **must** run a blocking human review checkpoint: present a PASS/FAIL findings table with concrete evidence, and wait for explicit human approval before proceeding. The table follows the [Shared: Human Review Checkpoint](${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/human-review-checkpoint.md) Brevity Rules (one line per cell, noun phrases, word budget, plain language, no prose around the table). If the human raises concerns, apply the fixes and re-present only the affected rows.

## Constraints

- **Never invent technical details** — use `<!-- TODO: confirm -->` for anything unverifiable.
- **Never state an external claim as fact without a source** — mark `[UNVERIFIED — needs source]`.
- **Never invent metrics** — use qualitative terms unless backed by measurement data.
- **Never run `git commit` / `git push`** — the human owns all git operations.

*Adapt paths, sibling-skill names, and hook-gate references to your repository's actual layout and tooling.*