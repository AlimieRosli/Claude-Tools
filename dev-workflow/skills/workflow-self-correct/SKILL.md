---
description: "Workflow Self-Correction for the adopting repo. Detects and fixes redundancy/duplication in the workflow infrastructure — topic docs, skills, rules, templates. Consolidates universal rules into a shared rules location, replaces duplicated content with references, and verifies zero duplication remains. Also owns the node-registration pass (when a new workflow node is added, it updates every related doc and keeps node counts/names generic). USE FOR: fixing duplicate rules/OQs/content across the topic-doc ecosystem; consolidating a universal rule into shared; tightening the workflow to reduce token usage; registering a newly added node across all related docs. INVOKE WITH: /workflow-self-correct <target>"
argument-hint: "<target>"
---

# Workflow Self-Correct

## Table of Contents

1. [Overview](#overview)
2. [When to Use](#when-to-use)
3. [Step 1 — Classify the Request](#step-1--classify-the-request)
4. [Step 2 — Audit for Duplication](#step-2--audit-for-duplication)
5. [Step 3 — Consolidate & Fix](#step-3--consolidate--fix)
6. [Step 4 — Verify Zero Duplication](#step-4--verify-zero-duplication)
7. [Step 5 — Human Review Checkpoint (Blocking)](#step-5--human-review-checkpoint-blocking)
8. [Step 6 — Report](#step-6--report)
9. [Constraints](#constraints)

---

## Overview

The topic workflow produces docs, skills, rules, and templates. Over time these drift into **redundancy**: the same rule written into multiple rule files, a universal rule living in a doc-specific file instead of the shared rules location, the same open question duplicated across the main/plan/test docs, or template content that repeats itself. Redundant context is not acceptable — it wastes tokens every time the AI loads the workflow.

This skill is the **self-correction node** for the workflow infrastructure itself. It has two responsibilities:

1. **Detect and fix redundancy/duplication** — consolidate universal rules into the shared location, replace duplicated content with references, and verify zero duplication remains.
2. **Register newly added nodes** — when a new workflow node (a skill, agent, or hook) is added, update every related doc to reference it, and keep node counts/names **generic** so future nodes require no doc edits.

The workflow is modeled as a **state graph** — nodes (skills/agents/hooks) connected by edges (conditional transitions). New nodes are added from time to time to improve the workflow. This skill is the meta-layer that keeps the graph's docs in sync and free of hard-coded node counts.

**Key principle:** *A rule or fact lives in exactly ONE place. Everything else references it.*

*Adapt paths/commands to your repository's actual layout and tooling.* The shared-rules convention referenced throughout this skill lives at `${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/topic-doc-writing-conventions.md`; the doc-ecosystem paths below (`docs/ref/<MODULE>/<TOPIC>/`, `.claude/docs/`, `AGENTS.md`, `CLAUDE.md`) apply if present in the adopting repo — check and adapt as needed.

---

## When to Use

**Use this skill when:**
- The same rule text appears in more than one rule file (e.g. the "one doc per OQ" rule was written into all three topic rule files).
- A universal rule (applies to all topic docs) lives in a doc-specific rule file instead of the shared rules location.
- The same open question is duplicated across the main/plan/test docs instead of being referenced.
- Template content repeats itself or duplicates a rule that already exists elsewhere.
- You need to tighten the workflow to reduce token usage by removing redundant context.
- **A new workflow node (skill/agent/hook) was added** and every related doc needs to reference it (see Step 1, "New node registration").

**Do NOT use this skill when:**
- You need to write a topic doc — use `topic-init` / `topic-plan` / `topic-test`.
- You need to tighten a single doc's prose — use `doc-conciseness-review`.
- You need to add or fix a hook — use `hook-init` / `hook-fix` (if present in the adopting repo).
- It's a one-line tweak to a single rule file — edit it directly.

---

## Step 1 — Classify the Request

Determine what kind of self-correction is needed. The `$ARGUMENTS` may name a target (a file, a rule, a doc, or "all"). Classify into one of:

| Case | What it is | Action |
|------|-----------|--------|
| **Duplicate rule** | Same rule text in 2+ rule files | Consolidate into the shared rules location (if universal) or keep in one owner + reference |
| **Universal rule misplaced** | A rule that applies to all docs lives in a doc-specific file | Move to the shared rules location, leave a reference in the doc-specific file |
| **Duplicate OQ** | Same open question in main + plan + test docs | Keep in the doc where it was raised; reference it elsewhere |
| **Redundant template** | Template content repeats a rule or itself | Remove the repetition; reference the rule instead |
| **New node registration** | A new workflow node (skill/agent/hook) was added | Update every related doc to reference it; keep counts/names generic (see below) |
| **General audit** | No specific target — sweep the ecosystem | Run Step 2 across all of the skills tree, the workflow-guide docs, and the topic-doc tree (e.g. `docs/ref/` if that convention is present) |

If the request is a **minor one-line tweak** to a single file, tell the user to edit it directly — no skill run needed.

### New node registration

When a new node is added, this skill is responsible for updating **every related doc** so the graph stays in sync. The related docs are (adapt to the adopting repo — update whichever of these exist):

- The workflow guide doc (e.g. a `TOPIC_WORKFLOW_GUIDE.md` under the repo's workflow-guide docs) — the skills table, dependency diagram, and any node-specific section.
- `AGENTS.md` (if present) — the topic-workflow ownership section (skill/agent lists and the flow description).
- `CLAUDE.md` (if present) — the topic-workflow skills list (if it enumerates skills).
- The workflow governance/master checklist doc (if one exists and enumerates nodes) — the graph-engine and self-correction sections.
- The new node's own skill/agent/rule files (created by the node's own init, e.g. `topic-init` for a topic skill).

**Keep counts and names generic.** When updating these docs, prefer **general descriptions** over specific node counts or names, so future nodes require no doc edits:

- **Do NOT write** "the three topic skills" or "the 3-doc flow" — write "the topic skills" or "the topic-doc flow".
- **Do NOT enumerate** every node in prose where a general reference suffices — write "the topic workflow nodes" and let the skills table / diagram carry the specifics.
- **Do NOT hard-code** a node count anywhere — the count changes as nodes are added.
- **DO** add the new node to the **skills table** and **dependency diagram** in the workflow guide — those are the canonical, specific lists that must stay accurate.
- **DO** add the new node to the **skill/agent registries** (e.g. the `AGENTS.md` ownership section and any `CLAUDE.md` skills list) — those are the canonical command/agent registries.

The rule of thumb: **specific node lists live in exactly ONE canonical place** (the skills table + diagram + command/agent registries). Everywhere else, reference the workflow generically so a new node needs only the canonical lists updated, not every doc.

---

## Step 2 — Audit for Duplication

Grep the ecosystem for redundancy. The minimum audit:

1. **Duplicate rule text** — grep the shared rules directory and each skill's `rules/` for the same distinctive phrase appearing in 2+ files. Example: `grep -rn "exactly ONE doc" ${CLAUDE_PLUGIN_ROOT}/skills/**/rules/` (and the adopting repo's own skills tree, if it has one).
2. **Universal rule in a doc-specific file** — for each rule in a skill's `rules/` file, ask: does it apply to all topic docs? If yes, it belongs in the shared conventions file (`${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/topic-doc-writing-conventions.md`).
3. **Duplicate OQs** — for a given topic folder, compare the Open Questions tables across `<PREFIX>.md`, `<PREFIX>_PLAN.md`, `<PREFIX>_TEST.md`. The same question should appear in only one.
4. **Redundant template content** — read each skill's `templates/*.md` and check for repeated blocks or content that duplicates a rule already stated in the skill's `rules/` file.
5. **Hard-coded node counts/names** — grep the workflow docs for specific node counts ("three", "3-doc", "the N skills") and specific node enumerations in prose. Flag any that should be generic (see Step 1, "New node registration").

Record every finding with its file path and the exact duplicated text.

---

## Step 3 — Consolidate & Fix

Apply the fix per the classification:

- **Universal rule** → move the canonical text into the shared conventions file (`${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/topic-doc-writing-conventions.md` — the shared file already loaded by the topic rule files). In each doc-specific rule file, replace the duplicated text with a one-line reference: `The "<rule>" rule is in the shared conventions — see ${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/topic-doc-writing-conventions.md.` Keep only the doc-specific application detail in the doc-specific file.
- **Duplicate OQ** → keep the question in the doc where it was raised (main/plan/test). In the other docs, replace the duplicated row with a reference line (e.g. `All open questions for this topic were raised and resolved in the [Main Doc §7 Open Questions](./<TOPIC_UPPER>.md#7-open-questions) — they are not duplicated here.`). When referencing a question elsewhere, write `main doc OQ N` / `plan doc OQ N`.
- **Redundant template** → remove the repeated block; if it restates a rule, replace with a reference to the rule file.
- **New node registration** → update the canonical references (skills table + dependency diagram in the workflow guide; the command/agent registries in `AGENTS.md`/`CLAUDE.md` if present). Replace any hard-coded node counts/names in prose with generic references (see Step 1, "New node registration").

Never delete a fact, link, path, or number — only remove duplication. Never invent new content.

---

## Step 4 — Verify Zero Duplication

Re-run the Step 2 greps. Confirm:
- The distinctive phrase now appears in exactly **one** canonical location (the shared file or the single owner).
- Every other file that needs the rule **references** it (contains the shared-conventions reference or a `main doc OQ N` style reference).
- No fact was lost in the consolidation.
- For a new node registration: the node appears in the canonical lists (skills table, diagram, command/agent registries), and no hard-coded node count remains in prose.

If any duplication remains, return to Step 3. Do not proceed until the audit is clean.

---

## Step 5 — Human Review Checkpoint (Blocking)

After the consolidation and before reporting, run a **blocking human review checkpoint**. Present a summary table of what was consolidated, moved, or referenced, with concrete file paths and the exact duplicated text that was removed. For a new node registration, also present which docs were updated to reference the new node. Wait for the human to explicitly approve before proceeding. If the human raises concerns, apply the fixes and re-present the affected rows.

---

## Step 6 — Report

Report:
- What was duplicated and where (file paths + the duplicated text).
- What was consolidated / moved / referenced (the canonical location now).
- For a new node registration: which docs were updated to reference the new node, and which hard-coded counts/names were made generic.
- Verification result (zero duplication confirmed).
- Any `<!-- TODO -->` items or facts that could not be verified.
- What to run next (e.g. re-run the affected skill, or — if the adopting repo enforces deterministic doc gates in its `.claude/hooks/`, which may include a hook watcher — re-run those gate checks to confirm no regressions; check before relying on them, they are not guaranteed present).

---

## Constraints

- **Never delete a fact, link, path, or number** — only remove duplication.
- **Never invent new content** — consolidation references existing rules; it does not add new ones.
- **A rule or fact lives in exactly ONE place. Everything else references it.**
- **Keep node counts/names generic** — specific node lists live in exactly ONE canonical place (skills table + diagram + command/agent registries); everywhere else reference the workflow generically.
- **Never run `git commit` / `git push`** — the human owns all git operations.
- Match the existing skill/rule/agent structure and conventions in the adopting repo.