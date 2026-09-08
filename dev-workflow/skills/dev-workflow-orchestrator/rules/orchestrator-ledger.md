# Rule: Orchestrator Ledger & Resume

The single source of truth for the orchestrator's durable gate state — the ledger file — and for resuming a dropped orchestrator session. The `SKILL.md` sections defer to this file instead of restating it.

Follow the [Shared: Topic Doc Writing Conventions](`${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/topic-doc-writing-conventions.md`) for file paths, never-guess, and plain language — do not restate those here. The ledger is **not a topic doc**: the TOC and Last Updated rules do not apply to it.

## Why the Ledger Exists

- The topic docs ARE the topic's state: the plan doc's Progress Tracker, the test doc's Test Results Dashboard, and each doc's Open Questions already cover stage-level recovery (reading them is `topic-status`'s job).
- The orchestrator additionally holds **gate-level state that exists nowhere in the topic docs**: which stages completed, each verifier's PASS/FAIL, every human gate approval, and the accumulated DECISIONS. In-session this lives in the orchestrator's context — a dropped session loses it, and the gate rule then forces re-asking the human about gates already approved.
- The ledger makes that state durable: a git-tracked file in the topic folder. It does not weaken the gate rule — an approval is still never inferred from flow momentum; it is **read from the ledger, which the orchestrator itself wrote at the moment of the gate**.

## Ledger File

- Path: `docs/ref/<MODULE>/<TOPIC>/<PREFIX>_ORCH.md` — same folder as the topic docs; `<PREFIX>` per the topic-path-derivation rule.
- Written **only by the orchestrator, only when a gate resolves or the graph finishes**. Stage subagents never read or write it — their STATE/DECISIONS come only from their task text.
- Created on first write. An absent ledger means the orchestrator never reached a gate (or the topic was never orchestrated) — absence is not an error.
- The ledger carries **orchestrator-session state only**. Topic facts (requirements, progress, test results) stay in the topic doc that owns them; the ledger references them, never restates them.

## Ledger Format

```markdown
# <TOPIC> — Orchestrator Ledger

## Gate Ledger

| Stage | Verifier | Human Approval | Date | Notes |
|-------|----------|----------------|------|-------|
| topic-init | — | approved | <YYYY-MM-DD> | suggested commit: docs(<module>): add <topic> main doc |
| main-doc-verify | PASS | approved | <YYYY-MM-DD> | |

## DECISIONS (verbatim, in order)

- <YYYY-MM-DD> <the human's words, exactly as said>
```

Fields:

- **Stage** — the skill that reached a gate (`topic-init`, `main-doc-verify`, `topic-plan`, `topic-test`, `topic-implement`).
- **Verifier** — the verification node's result for that stage's doc: `PASS` / `FAIL` / `—` (stage has no verifier).
- **Human Approval** — `approved` / `changes requested` / `pending` (checkpoint presented, human has not answered yet).
- **Notes** — outstanding commit reminders, explicitly waived gates, anything the next session must know. The human's words that accompany an approval go in DECISIONS, not here.
- **DECISIONS** — every human decision folded into subagent DECISIONS, appended verbatim, one dated line each. This is the durable DECISIONS source on resume; the orchestrator never re-derives, paraphrases, or softens them.

## Ledger Writes (when)

1. When a verifier subagent returns — record its result row (`pending` until the human answers).
2. When the human answers the checkpoint — set the row's approval and append their words to DECISIONS. A `changes requested` answer records the feedback verbatim, exactly like an approval.
3. When the classification's graph completes — record the final row (`topic complete`).
4. **Never batch ledger writes to the end of the run** — same rationale as the plan doc's progress-sync rule: a drop between writes reports a wrong position.

## Resume Protocol

Trigger: the human starts a fresh session and asks to resume/continue a topic, or gives a requirement while the topic folder already exists.

1. **Locate** the topic (per the locate-topic rule) and **read what exists**: the topic docs (main/plan/test) plus the ledger, if present. Never continue from memory of a previous session — the docs + ledger are the state.
2. **Rebuild the control plane**: stage graph from the main doc's `> **Classification:**` line; gate approvals and DECISIONS from the ledger; current position from the docs (Progress Tracker / Test Results Dashboard).
3. **Present a resumption summary** — stages completed, gates approved, current position, next stage — and get one explicit human confirm before spawning anything.
4. **Continue the stage graph** from that position. Every gate, verifier, and audit rule applies unchanged — resume is not a shortcut past a gate.

Edge cases:

- **No ledger, docs exist** — the drop happened before the first gate: rebuild what the docs show, run the verifier for the last written doc (a doc must never reach approval unverified), present, continue.
- **Ledger row `pending` or `changes requested`** — that checkpoint was never resolved: re-present it. Do not skip past it.
- **Mid-implementation** — the position comes from the plan doc's Progress Tracker (the docs' job); the ledger only records that the implementation checkpoint was approved. Confirm the resume point with the human per the [Shared: Human Review Checkpoint](`${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/human-review-checkpoint.md`) Current-Position row.
- **Topic complete** (final ledger row, or the docs show completion) — report the finished state; nothing to resume.

## Constraints

- The ledger is a recovery artifact, not a second source of topic truth — where a fact exists in a topic doc, the doc wins.
- Never invent an approval — a row is `approved` only because the human said so at that gate.
- The ledger is stack-agnostic and repo-agnostic: no repo-specific file names, commands, or environment names in it.