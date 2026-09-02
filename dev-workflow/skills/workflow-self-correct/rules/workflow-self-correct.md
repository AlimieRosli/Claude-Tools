# Rule: Workflow Self-Correction

Follow the shared topic doc writing conventions at `${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/topic-doc-writing-conventions.md` for Table of Contents, Last Updated, file paths, never-guess, and cross-linking rules — do not restate those here.

## Core Principle

- **A rule or fact lives in exactly ONE place. Everything else references it.** Redundant context in any doc, skill, rule, or template is not acceptable — it wastes tokens every time the workflow is loaded.
- **Consolidate universal rules into the shared rules location.** A rule that applies to all topic docs (main/plan/test) belongs in the shared conventions file (`${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/topic-doc-writing-conventions.md`), not in a doc-specific rule file. The doc-specific rule file keeps only its doc-specific application detail and references the shared rule.
- **Do not duplicate open questions across docs.** Each OQ lives only in the doc where it was raised; other docs reference it (see the shared conventions' "one doc per OQ" rule).
- **Never delete a fact, link, path, or number** — only remove duplication. Never invent new content.
- **The workflow is a state graph.** Nodes (skills/agents/hooks) are added from time to time. This skill owns keeping the graph's docs in sync when a node is added, keeping node counts/names **generic** so future nodes need no doc edits.

## New Node Registration

When a new workflow node (skill/agent/hook) is added, this skill updates **every related doc** to reference it (adapt to the adopting repo — update whichever of these exist):

- The workflow guide doc (e.g. a `TOPIC_WORKFLOW_GUIDE.md` under the repo's workflow-guide docs, if present) — the skills table, dependency diagram, and any node-specific section.
- `AGENTS.md` (if present in the adopting repo) — the topic-workflow ownership section (skill/agent lists, flow description).
- `CLAUDE.md` (if present in the adopting repo) — the topic-workflow skills list (if it enumerates skills).
- The workflow governance/master checklist doc (if one exists and enumerates nodes) — the graph-engine and self-correction sections.
- The new node's own skill/agent/rule files (created by the node's own init).

**Keep counts and names generic.** Specific node lists live in exactly **ONE canonical place** — the skills table + dependency diagram in the workflow guide, and the command/agent registries (e.g. `AGENTS.md`/`CLAUDE.md`, if present). Everywhere else, reference the workflow generically:

- **Do NOT write** "the three topic skills" or "the 3-doc flow" — write "the topic skills" or "the topic-doc flow".
- **Do NOT enumerate** every node in prose where a general reference suffices — write "the topic workflow nodes" and let the canonical lists carry the specifics.
- **Do NOT hard-code** a node count anywhere — the count changes as nodes are added.
- **DO** add the new node to the canonical lists (skills table, diagram, command/agent registries) — those must stay accurate.

## Audit Checklist

Before editing, grep the ecosystem for duplication:

1. **Duplicate rule text** — the same distinctive phrase in 2+ rule files.
2. **Universal rule misplaced** — a rule that applies to all docs living in a doc-specific rule file.
3. **Duplicate OQs** — the same question in main + plan + test docs.
4. **Redundant template content** — a template repeating a rule or itself.
5. **Hard-coded node counts/names** — specific node counts ("three", "3-doc", "the N skills") or node enumerations in prose that should be generic.

## Consolidation Rules

- **Universal rule** → canonical text in the shared conventions file (`${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/topic-doc-writing-conventions.md`); doc-specific files get a one-line reference: `The "<rule>" rule is in the shared conventions — see ${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/topic-doc-writing-conventions.md.`
- **Duplicate OQ** → keep in the doc where raised; other docs get a reference line (e.g. `All open questions for this topic were raised and resolved in the [Main Doc §7 Open Questions](./<TOPIC_UPPER>.md#7-open-questions) — they are not duplicated here.`). Reference elsewhere as `main doc OQ N` / `plan doc OQ N`.
- **Redundant template** → remove the repeated block; if it restates a rule, replace with a reference to the rule file.
- **New node registration** → update the canonical lists (skills table + diagram in the workflow guide; command/agent registries in `AGENTS.md`/`CLAUDE.md` if present). Replace hard-coded node counts/names in prose with generic references.

## Verification

Re-run the audit greps after editing. Confirm the distinctive phrase appears in exactly **one** canonical location, every other file references it, and no fact was lost. For a new node registration, confirm the node appears in the canonical lists and no hard-coded node count remains in prose. Do not report until the audit is clean.