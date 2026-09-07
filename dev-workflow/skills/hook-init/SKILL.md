---
name: hook-init
description: "Hook Initializer for the dev-workflow plugin's deterministic hook system. Adds a new hook (gate OR transform) to the plugin's hooks/ registry: classifies the request, greps cores/ + lib/ for an existing core/helper to reuse, writes hooks/cores/<name>-core.js with { meta (incl. files), check|apply, fix? }, adds the registry entry (gates[] or transforms[]), and verifies via validate() + a direct check run. Per-repo data goes through lib/project-config.js, never hardcoded. USE FOR: adding a new hook gate or transform. INVOKE WITH: /dev-workflow:hook-init <HookName> <Description>"
argument-hint: "<HookName> <Description>"
---

# Hook Init

## Table of Contents

1. [Overview](#overview)
2. [When to Use](#when-to-use)
3. [Step 1 — Classify the Request](#step-1--classify-the-request)
4. [Step 2 — Explore Before Writing](#step-2--explore-before-writing)
5. [Step 3 — Write the Core](#step-3--write-the-core)
6. [Step 4 — Add the Registry Entry](#step-4--add-the-registry-entry)
7. [Step 5 — Verify](#step-5--verify)
8. [Step 6 — Report](#step-6--report)
9. [Constraints](#constraints)

---

## Overview

The plugin's `hooks/` system is a deterministic (no-LLM) backstop that mechanically enforces the topic-doc rules in every adopting repo (adoption = `<project>/.claude/hooks.config.json` — without it the adapters no-op). It has **two kinds of cores**, both driven by the **single shared adapter** (`hooks/adapters/post-tool-use.js`) for every registered surface (Claude Code `PostToolUse`, on-save, watcher):

- **Gate** — a *check* that returns `null` (pass) or a problem string (fail). Enforces a doc rule.
- **Transform** — a *rewrite* that changes file content. Runs after gates.

This skill adds a new core to that system, reusing the existing cores/helpers and avoiding redundancy. **No logic is ever duplicated** — a new hook is always a core in the registry, never a standalone script. Cores must stay repo-agnostic: repo-specific data (code-file globs, shared dirs) is read from the adopting repo's `hooks.config.json` via [`lib/project-config.js`](../../hooks/lib/project-config.js), never hardcoded in a core.

---

## When to Use

**Use this skill when:**
- You need to add a genuinely new deterministic doc-enforcement rule as a hook **gate**.
- You need to add a deterministic content **transform** (a rewrite applied to files the agent writes/edits).
- The new rule fits the existing core shape (`{ meta, check|apply, fix? }`) and the registry-driven surfaces.

**Do NOT use this skill when:**
- It's a minor tweak to an existing gate/transform (a regex, a label) — edit the existing core directly.
- A gate/transform already does what you need — reuse it instead.
- You need to fix a hook-gate failure — use `/dev-workflow:hook-fix` instead.

---

## Step 1 — Classify the Request

Determine whether the request is a **gate** (a check that enforces a rule) or a **transform** (a rewrite of file content). If it's a **minor tweak** to an existing core (a regex, a label), tell the user to edit the existing core directly — no new hook. If it's genuinely new, proceed.

---

## Step 2 — Explore Before Writing

Read these source-of-truth files first:

- **Registry & layout:** [`${CLAUDE_PLUGIN_ROOT}/hooks/registry.js`](../../hooks/registry.js) (the single source of truth — `gates`, `transforms`, `validate()`)
- **Gate core contract:** [`${CLAUDE_PLUGIN_ROOT}/hooks/cores/toc-sync-core.js`](../../hooks/cores/toc-sync-core.js) (reference gate — `{ meta, check, fix? }`)
- **Transform core shape:** the `transforms[]` comment block in [`registry.js`](../../hooks/registry.js) — `{ meta, apply }` returning `{ changed, content }`
- **Shared adapter:** [`${CLAUDE_PLUGIN_ROOT}/hooks/adapters/post-tool-use.js`](../../hooks/adapters/post-tool-use.js) (the ONE adapter for all surfaces — runs gates + transforms)
- **Shared helpers:** [`${CLAUDE_PLUGIN_ROOT}/hooks/lib/gate-helpers.js`](../../hooks/lib/gate-helpers.js) (`relPath`, `findSectionRange`, `parseActiveImplPhases`, `siblingDocPath`, `checkExemption`, `findActivePlansReferencingFile`)
- **Glob matcher:** [`${CLAUDE_PLUGIN_ROOT}/hooks/lib/match.js`](../../hooks/lib/match.js) (`matchesFiles` for `meta.files`)
- **Per-repo data:** [`${CLAUDE_PLUGIN_ROOT}/hooks/lib/project-config.js`](../../hooks/lib/project-config.js) (`loadConfig` / `gateEnabled` — the adoption gate and per-repo `codeGlobs`/`sharedDirs`)

Grep `hooks/cores/` and `hooks/lib/` for an existing core or helper that already does what's needed. If one exists, reuse it — do **NOT** create a duplicate. At least 1 grep on the topic keywords and read the closest existing core in full.

---

## Step 3 — Write the Core

Write `hooks/cores/<name>-core.js` following the existing shape:

**For a gate:**
- A `meta` export: `{ name, kind: 'gate', firesOn, enforces, exemption, files }` where `files` is an array of project-relative forward-slash globs deciding which changed files apply (matched via `lib/match.js`).
- A `check` function returning `null` (pass / not applicable) or a multi-line problem string.
- An optional `fix` function (idempotent) for mechanical gates — the shared adapter auto-fixes it on the native path.

**For a transform:**
- A `meta` export: `{ name, kind: 'transform', firesOn, enforces, exemption, files }`.
- An `apply` function returning `{ changed: boolean, content: string|null }` — `changed` is true when the file was rewritten, `content` is the full new content (or null when nothing changed). Idempotent.

- **Import the shared helpers** from `lib/gate-helpers.js` — never re-implement `relPath`, `findSectionRange`, `parseActiveImplPhases`, `siblingDocPath`, or `checkExemption`. The `registry.validate()` check (helper-reuse core) flags re-implementations at load time.
- **Resolve the project root dynamically** via `lib/gate-helpers.js`'s `getProjectRoot()` (or `lib/project.js`) — never `__dirname`, which points at the plugin's cache install dir, not the project being edited.
- **Per-repo data goes through config** — if the rule depends on the repo's layout (which files count as code, which dirs are shared), read `codeGlobs`/`sharedDirs` from the adopting repo's `hooks.config.json` via `lib/project-config.js` and no-op when absent. Never hardcode one repo's paths in a core.

---

## Step 4 — Add the Registry Entry

Add the registry entry in [`hooks/registry.js`](../../hooks/registry.js):
- A **gate** → one entry in the `gates` array (`{ meta, check, fix? }`).
- A **transform** → one entry in the `transforms` array (`{ meta, apply }`).

No new entry-point, watcher, or standalone script files are needed — the single shared adapter (`hooks/adapters/post-tool-use.js`) loads both arrays from the registry and runs them for every registered surface (Claude Code `PostToolUse`, on-save, watcher). Do **NOT** create standalone registration JSON files for a new hook — the shared adapter already covers it.

---

## Step 5 — Verify

Verify with a direct node one-liner before trusting it (run from the plugin checkout or use the `DEV_WORKFLOW_PLUGIN_ROOT` shim override against a test project):

```
node -e "const {check<Name>} = require('./hooks/cores/<name>-core'); console.log(check<Name>('<path>') || 'PASS');"
```

For a transform:
```
node -e "const {apply<Name>} = require('./hooks/cores/<name>-core'); console.log(apply<Name>('<path>'));"
```

Also confirm the load-time validation passes — `registry.validate()` returns no problems for the new core (the helper-reuse check runs over every `cores/*-core.js`). Prefer a fixture project (a temp dir with a `.claude/hooks.config.json` and minimal doc structure) over synthetic edits in a real repo. No linter is wired up for this folder — always run or require the file (a syntax error is invisible to `get_errors`).

---

## Step 6 — Report

Report to the user:
- The created core path, its `kind` (gate or transform), and its `meta.files` globs.
- The registry entry added (`gates[]` or `transforms[]`).
- The `validate()` result.
- Confirmation that the shared adapter (`hooks/adapters/post-tool-use.js`) covers it for all surfaces — no separate registration needed.
- **Re-pin reminder:** plugin changes only land in other sessions after the plugin is pushed and re-pinned (`/dev-workflow:self-update`); until then, sessions can test via the shim's `DEV_WORKFLOW_PLUGIN_ROOT` override.

## Constraints

- **Never duplicate a shared helper** — reuse `lib/gate-helpers.js`; the `registry.validate()` check enforces this mechanically.
- **Never duplicate hook logic** — a new hook is always a core in the registry, never a standalone script. The shared adapter is the single execution path for all surfaces.
- **Never hardcode a repo's layout** — per-repo data comes from `hooks.config.json` via `lib/project-config.js`; the plugin must work in any adopting repo.
- **Never invent technical details** — use `<!-- TODO: confirm -->` for unknowns.
- Match the existing code style in `hooks/cores/` (CommonJS, `require`/`module.exports`).