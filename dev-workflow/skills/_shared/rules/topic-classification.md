# Shared: Topic Classification

Used by `topic-init` (Step 1) to classify the topic before writing the main doc, so the right workflow depth is selected and over-engineering is avoided. This is a shared reference file, not a skill itself — it is loaded when linked from `topic-init`'s Step 1.

## Purpose

Not every piece of work needs the full topic-doc flow. This rule forces a deliberate classification step **before** any doc is written, so:

1. The AI model and the user are explicitly aware of which case applies.
2. The recommended flow (which skills to use, which to skip) is recorded in the main doc frontmatter.
3. Minor changes are caught early — `topic-init` stops before wasting time writing a doc for a one-liner.
4. Over-engineering is prevented by design, not by accident.

## The 7 Cases

| Case | Definition | Default Flow |
|------|-----------|--------------|
| **New feature (heavy)** | Adding new functionality — new endpoint, new module, new external integration, or significant enhancement to existing behavior. Multi-file, multi-phase, or multi-session expected. | Full: `topic-init` + `topic-plan` + `topic-test` (all required categories) |
| **Bug fix (non-trivial)** | Fixing incorrect behavior that is NOT a one-liner. Spans multiple files, has side effects, or requires understanding of existing flow to fix correctly. | `topic-init` + `topic-test` (NEG before/after). `topic-plan` if multi-file/phase. |
| **Minor change** | One-liner: config value, label text, typo, log level, single constant. No logic change, no side effects, single file. | **Skip all skills.** Make the change, run a quick manual check. |
| **Investigation & code check** | Exploring how something works, diagnosing a reported issue, evaluating a library, checking for regressions — no code changes planned (yet). | `topic-init` only (main doc). Plan/test docs only if investigation leads to a code change. |
| **Refactor (no behavior change)** | Restructuring code without changing external behavior — extracting functions, renaming, splitting files, improving readability. | `topic-init` + `topic-test` (REG cases). `topic-plan` if complex. |
| **Config/infra change with risk** | Changing cache key schema, adding/removing env vars, changing database collection/table structure, modifying middleware order. Not a code logic change but affects runtime behavior. | `topic-init` + `topic-test` (SMK + NEG). `topic-plan` if complex. |
| **Hotfix (production incident)** | Production is broken — fix first, document after. | Fix first → `topic-init` retroactively → `topic-test` for regression. Skip `topic-plan`. |

## Classification Questions

Ask these questions **in order**. Stop at the first one that gives a definitive answer.

### Q1 — Is this a production incident requiring immediate action?

- **Yes** → Case: **Hotfix (production incident)**. Fix first, document retroactively.
- **No** → Continue to Q2.

### Q2 — Is this a one-liner with no logic change and no side effects?

Examples: config value, label text, typo, log level, single constant.

- **Yes** → Case: **Minor change**. **Stop — do not write any doc.** Tell the user to make the change and verify manually.
- **No** → Continue to Q3.

### Q3 — Are there code changes planned?

- **No** (testing an existing feature, auditing behavior, baseline characterization) → Case: **Test-only (existing feature audit)**. Flow: `topic-init` + `topic-test` (test-only mode, no plan doc).
- **Yes** → Continue to Q4.

### Q4 — Is this purely exploratory with no code changes planned (yet)?

Investigating how something works, diagnosing a reported issue, evaluating a library, checking for regressions — no code changes planned *at this time*.

- **Yes** → Case: **Investigation & code check**. Flow: `topic-init` only.
- **No** → Continue to Q5.

### Q5 — Is this a refactor with no external behavior change?

Restructuring, renaming, extracting, splitting — the external API/behavior stays the same.

- **Yes** → Case: **Refactor (no behavior change)**. Flow: `topic-init` + `topic-test` (REG cases). `topic-plan` if complex.
- **No** → Continue to Q6.

### Q6 — Is this a config/infra change that affects runtime behavior but not code logic?

Examples: cache/Redis key schema changes, env vars, database collection/table structure changes, middleware or pipeline ordering changes — adapt the examples to the target repo's stack.

- **Yes** → Case: **Config/infra change with risk**. Flow: `topic-init` + `topic-test` (SMK + NEG). `topic-plan` if complex.
- **No** → Continue to Q7.

### Q7 — Default: This is a new feature or non-trivial bug fix.

- If the work is **adding new functionality** → Case: **New feature (heavy)**. Flow: Full topic-doc flow.
- If the work is **fixing incorrect behavior** → Case: **Bug fix (non-trivial)**. Flow: `topic-init` + `topic-test` (NEG before/after). `topic-plan` if multi-file/phase.

## Recording the Classification

Once the case is determined, record it in the main doc frontmatter:

```markdown
> **Classification:** <case name>
> **Recommended flow:** <skills to use>
```

For the **Minor change** case, do **not** write any doc — the classification result itself is the output. Tell the user:

> *"This is classified as a **minor change** (one-liner, no logic change, no side effects). No topic doc is needed — make the change and verify manually. If the change turns out to be more complex than expected, re-run `/topic-init`."*

## Updating the Classification

If the work evolves (e.g. an investigation leads to a code change, or a minor change turns out to be complex), re-run the classification by re-invoking `topic-init`. Update the frontmatter `Classification` and `Recommended flow` fields in the existing main doc — do not create a new doc.

## Reference

The full decision matrix and practical guidance by case are in the adopting repo's Topic Workflow Guide — e.g. `.claude/docs/WORKFLOW-GUIDE/TOPIC_WORKFLOW_GUIDE.md` if present in the adopting repo (adapt the path as needed).

*Adapt paths/commands to your repository's actual layout and tooling.*