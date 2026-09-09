---
name: hook-fix
scope: consumer-hook-ops
description: "SCOPE: consumer-hook-ops — fixes a hook-gate failure in the repo that adopted the hooks; reads the plugin's cores but never edits them (a broken core is a plugin-maintenance defect — see the context-mode rule). Hook Fixer for the dev-workflow plugin's deterministic doc gates. Resolves an issue captured by a hook gate (or transform) and confirms the report goes green. Reads <project>/.claude/hooks/reports/latest.json (or a named gate), locates the failing core in the plugin's hooks/cores/, applies the fix (mechanical or AI-authored), re-runs the check via the user shim. Works in any repo that adopted the hooks via .claude/hooks.config.json. USE FOR: fixing a hook-gate failure. INVOKE WITH: /dev-workflow:hook-fix <GateName | report-file>"
argument-hint: "<GateName | report-file>"
---

# Hook Fix

## Table of Contents

1. [Overview](#overview)
2. [When to Use](#when-to-use)
3. [Step 1 — Identify the Failure](#step-1--identify-the-failure)
4. [Step 2 — Locate and Read the Failing Core](#step-2--locate-and-read-the-failing-core)
5. [Step 3 — Apply the Fix](#step-3--apply-the-fix)
6. [Step 4 — Re-run the Check](#step-4--re-run-the-check)
7. [Step 5 — Confirm the Report Goes Green](#step-5--confirm-the-report-goes-green)
8. [Step 6 — Report](#step-6--report)
9. [Constraints](#constraints)

---

## Overview

The plugin's `hooks/` system is the deterministic (no-LLM) backstop that mechanically enforces the topic-doc rules in every adopting repo (adoption = `<project>/.claude/hooks.config.json` — without it the adapters no-op). It has **gates** (checks) and **transforms** (rewrites), both driven by the single shared adapter (`hooks/adapters/post-tool-use.js`) for every registered surface (Claude Code `PostToolUse`, on-save, watcher). When a gate captures an issue in a doc, this skill fixes it: it locates the failing gate, applies the fix (deterministic auto-fix where the gate exports one, or a hand-authored doc edit), re-runs the check, and confirms the report goes green.

---

## When to Use

**Use this skill when:**
- A hook gate has flagged a problem in a topic doc or gate core (the shared adapter reported a `fail`).
- You were given a gate name and need to find and resolve what it flagged.
- You need to confirm the report is green again after making a fix.

**Do NOT use this skill when:**
- You only need to add a brand-new hook gate or transform — use `/dev-workflow:hook-init` instead.
- You need to write a topic doc from scratch — use `/dev-workflow:topic-init` instead.

---

## Step 1 — Identify the Failure

Read these source-of-truth files first:

- **Registry & layout:** [`${CLAUDE_PLUGIN_ROOT}/hooks/registry.js`](../../hooks/registry.js) (the single source of truth — `gates`, `transforms`, `validate()`)
- **Gate core contract:** [`${CLAUDE_PLUGIN_ROOT}/hooks/cores/`](../../hooks/cores/) (each gate core exports `{ meta, check, fix? }` or `{ meta, apply }` for a transform)
- **Report file:** `<project>/.claude/hooks/reports/latest.json` (written by the shared adapter via [`lib/report.js`](../../hooks/lib/report.js), relative to the project root)
- **Fix runner:** [`${CLAUDE_PLUGIN_ROOT}/hooks/lib/fix.js`](../../hooks/lib/fix.js) (deterministic fix, run by the shared adapter on the native path)
- **Shared adapter:** [`${CLAUDE_PLUGIN_ROOT}/hooks/adapters/post-tool-use.js`](../../hooks/adapters/post-tool-use.js) (the ONE adapter for all surfaces)

If a gate name was given (`$ARGUMENTS`), locate its core in `hooks/cores/`. Otherwise read `.claude/hooks/reports/latest.json` in the project and find the failing `results` entries (`status: "fail"`). Note the failing gate name(s) and the file path(s) they reference.

Per-repo context that may bear on the failure: the adopting repo's `.claude/hooks.config.json` supplies `codeGlobs` (neg-flow code-file pre-filter) and `sharedDirs` (regression-gate shared paths), and per-gate opt-outs under `gates`. Read it when the failure involves those gates.

---

## Step 2 — Locate and Read the Failing Core

Read the failing gate's core in full. Understand what the check enforces and why the file failed. Cross-reference the gate's rule — the topic-workflow rules under [`${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/`](../../skills/_shared/) define the doc conventions several gates enforce; if the core's header links a rule file, read it there.

---

## Step 3 — Apply the Fix

Two paths:

- **Mechanical** — if the gate exports a `fix` function (e.g. `fixTocSync`), run it on the failing file. The shared adapter auto-fixes mechanical gates on the native path (via `updatedToolOutput`). To run it manually, re-check the file through the user shim:
  ```
  node ~/.claude/tools/run-dev-workflow-hook.js check <file-path>
  ```
  (The shim resolves the active plugin install; run it from the project root.)
- **AI-authored** — if the fix requires editing the doc content (e.g. adding a missing NEG result line, resolving an open question, replacing a real secret with a placeholder), make the edit directly, following the gate's rule and the adopting repo's doc conventions (cite external claims, use placeholders for secrets).

---

## Step 4 — Re-run the Check

Re-run the check on the fixed file:

```
node ~/.claude/tools/run-dev-workflow-hook.js check <file-path>
```

Or run a direct node one-liner against the active plugin install's core:

```
node -e "const {check<Name>} = require('<plugin-install>/hooks/cores/<name>-core'); console.log(check<Name>('<file-path>') || 'PASS');"
```

Confirm it passes (exit 0, `✔ passed`).

---

## Step 5 — Confirm the Report Goes Green

Re-run the shim check and verify `.claude/hooks/reports/latest.json` in the project shows `status: "pass"` for the gate. If other gates are still failing, repeat Steps 2–4 for each.

---

## Step 6 — Report

Report to the user:
- The failing gate(s) found and what they enforced.
- The fix applied (mechanical or AI-authored, with the file changed).
- The re-check result and final report status.

## Constraints

- **Never invent technical details** — use `<!-- TODO: confirm -->` for unknowns.
- Match the existing code style in `hooks/cores/` (CommonJS, `require`/`module.exports`) if the fix touches a core.
- If the fix is a doc-content edit, follow the gate's rule and the repo's doc conventions (e.g. cite external claims, use placeholders for secrets).
- **Plugin changes need a re-pin** — if the fix required editing a plugin core (a plugin-side bug), the change only lands in sessions after the plugin is pushed and re-pinned (`/dev-workflow:self-update`); local session testing can use the `DEV_WORKFLOW_PLUGIN_ROOT` override on the shim.