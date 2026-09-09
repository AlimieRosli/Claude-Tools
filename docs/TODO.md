# dev-workflow plugin — TODO & Maintenance Log

Monitor doc for everything to **do / upgrade / fix** in this plugin. One item = one entry with an ID.
Statuses: `OPEN` → `WIP` → `DONE` (or `KIV` if parked). Move items down to the Completed Log when done, with the date and how it was resolved.

Last updated: 2026-09-09

## Status snapshot

| Status | Items |
| ------ | ----- |
| OPEN   | 6     |
| WIP    | 2     |
| KIV    | 1     |
| DONE   | 6     |

## In progress / uncommitted

Tracked from `git status` — clear these (commit or drop) before starting new work.

| Work | Where |
| ---- | ----- |
| Runtime log handoff rule (T-01, finished) — uncommitted, review & commit | `dev-workflow/skills/_shared/rules/runtime-log-handoff.md` |
| topic-dashboard skill (new, untracked) — validate & commit | `dev-workflow/skills/topic-dashboard/` |
| Several modified rule/skill files, uncommitted | see `git status` |

---

## Open items

### T-02 — HITL explanations: compact, readable, diagrammed

- **Status:** OPEN · **Priority:** MEDIUM
- Goal: every human-approval / HITL moment should present a compact explanation — short, scannable, with a diagram where the flow is non-obvious (mermaid or ASCII).
- **Done when:** approval gates rendered by orchestrator/topic skills follow a compact format; doc templates updated if needed.

### T-03 — Test isolation: flush only the data under test

- **Status:** OPEN · **Priority:** HIGH
- Problem: running tests currently flushes all Redis data — destroys unrelated state.
- Goal: tests flush only the keys/prefixes related to the data being tested.
- **Done when:** test skill/setup no longer issues a blanket FLUSH; scoped cleanup documented.

### T-04 — Post-implementation hooks-log sweep

- **Status:** OPEN · **Priority:** MEDIUM
- Goal: after all implementation is done, check the hooks logs and (a) auto-fix anything the AI can fix, (b) hand remaining issues to the human **with a recommended solution**.
- **Done when:** orchestrator (or a rule) performs this sweep as a finishing step.

### T-05 — Infra ownership: AI checks, human runs

- **Status:** OPEN · **Priority:** MEDIUM
- Goal: AI never starts Docker/Redis infra — that stays with the human. AI only: (1) checks whether infra is up, (2) runs tests, (3) reminds the human when infra is down or broken.
- Needs: a **standard way** to check infra connectivity (one defined command/contract, not ad-hoc checks).
- **Done when:** skills state the ownership split and use the standard connectivity check.

### T-06 — Coding conventions: no long/metadata comments

- **Status:** OPEN · **Priority:** MEDIUM
- Goal: do not write long comments in code; never leave implementation-tracking comments like `// step 3` / `// phase 2`.
- Best placed as a shared rule so all implement-phase skills enforce it.
- **Done when:** rule exists (or existing rule extended) and is referenced by topic-implement.

### T-07 — Coding quality bar: readable, maintainable, reusable

- **Status:** OPEN · **Priority:** MEDIUM
- Goal: codify the quality bar — easy to read, no spaghetti, extract functions, shared utilities, constants/enums files, proper file split for reuse.
- Related to T-06; consider one "coding standards" rule covering both.
- **Done when:** quality bar written as a shared rule enforced in implementation guidance.

---

## KIV (parked)

### T-08 — Reusable across harnesses

- **Status:** KIV
- Make the workflow/skills reusable outside Claude Code (other AI harnesses).
- Revisit after current skill/phase work settles.

---

## Completed Log

| ID | Item | Resolved as | Date |
| -- | ---- | ----------- | ---- |
| T-01 | Runtime log handoff: stop the copy-paste loop | Shared rule `dev-workflow/skills/_shared/rules/runtime-log-handoff.md` (evidence handed over as a file path the AI reads, never a chat paste; one concrete command per round-trip); wired into `topic-implement` (Mandatory read #9) and `topic-test` (Mandatory read #8); registered in the guide's Shared Rules table. Orchestrator inherits via delegation — no direct reference needed. Uncommitted | 2026-09-09 |
| T-14 | Separate project-workflow mode from plugin-maintenance mode | Shared rule `_shared/rules/context-mode.md` (4 scopes: project-workflow / consumer-hook-ops / plugin-maintenance / workflow-governance; mode detection; hard boundaries; mode-crossing requests stopped & re-routed); `scope:` field + leading `SCOPE:` sentence added to all 15 SKILL.md; orchestrator mode gate before topic-init; root `CLAUDE.md` declares this repo is the plugin source (topic flow never run here). Uncommitted | 2026-09-09 |
| T-09 | Test doc needs a header table for all test-status checks | Done | — |
| T-10 | Move all hooks to the plugin; watcher still works | Done | — |
| T-11 | On human approval of main/plan/test doc, all open questions must be resolved (except blockers like "needs test first") — remind human before proceeding | LLM-enforced, no hook | — |
| T-12 | How to start implementation once all docs approved | Always use `topic-implement` | — |
| T-13 | Human-approval check on reading PLACEHOLDER files | LLM-enforced | — |

---

## New item intake

Add new findings here, then move them into Open items with an ID (next free: T-15).

```markdown
### T-XX — <title>

- **Status:** OPEN · **Priority:** HIGH|MEDIUM|LOW
- Problem / observation:
- Goal:
- **Done when:**
```