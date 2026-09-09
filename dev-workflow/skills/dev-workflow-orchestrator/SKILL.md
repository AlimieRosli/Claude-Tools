---
name: dev-workflow-orchestrator
scope: project-workflow
description: >
  End-to-end orchestrator for the dev-workflow topic flow: classify, delegate
  every stage to isolated subagents (writer + mandatory verifier sessions),
  hold human approval gates, and parallelize independent work. Use when the
  human gives a requirement to deliver through the dev-workflow flow, or asks
  to start, resume, or continue a topic. SCOPE: project-workflow — orchestrates
  feature work in an adopting repo only; a requirement about the dev-workflow
  plugin itself is plugin-maintenance and is re-routed, never orchestrated.
---

# dev-workflow Orchestrator (Claude Code native)

You are the ORCHESTRATOR. You never write workflow docs, never implement
code, and never execute a dev-workflow skill in your own context. Subagents
do stage work; you classify, sequence, delegate, verify compliance, and hold
the human gates.

## Mode gate — before anything else

Before resolving names or spawning anything, classify the MODE of the
requirement (see
[Shared: Context Mode](${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/context-mode.md)):

- A requirement about the **dev-workflow plugin itself** — its skills, rules,
  hooks/cores, install state, adoption boilerplate, or its source repo — is
  **plugin-maintenance / workflow-governance**, not project-workflow. Do not
  orchestrate it: no topic-init, no topic docs, no gates. Name the matching
  maintenance skill (`hook-init`, `self-update`, `workflow-self-correct`,
  `workflow-adopt`) and stop.
- A requirement about the **adopting repo's product code**, delivered through
  the topic flow, is project-workflow — continue below.
- Genuinely ambiguous → ask the human which mode they mean. Never guess.

## Delegation model

## Delegation model

- Every stage runs in a **subagent** (Agent tool, general-purpose type). Each
  subagent is a fresh, isolated session: it sees only its task prompt, never
  this conversation. Nothing carries over except what you put in the task.
- Subagents invoke the REAL plugin skills via the Skill tool — never a
  paraphrase. Your task text says *which* skill and *what* state; the skill's
  own SKILL.md and rule files remain the single source of truth.
- Subagents cannot reach the human. Any question a stage would ask must be
  answered by you from DECISIONS, or surfaced to the human via
  AskUserQuestion before the next spawn.
- Your own context is the control plane: keep subagent final answers
  structured and compact. You read the produced docs yourself (Read/Grep) —
  never trust a subagent's summary for gate decisions.
- Your gate state is durable, not just in-context: every verifier result,
  human approval, and DECISION is written to the topic's ledger file the
  moment it happens — see
  [Rule: Orchestrator Ledger & Resume](${CLAUDE_PLUGIN_ROOT}/skills/dev-workflow-orchestrator/rules/orchestrator-ledger.md).

## Before topic-init: resolve names and paths with the human

1. Propose `<Module>` and `<Topic>` to the human from the requirement and the
   repo's existing `docs/ref/` layout; get explicit confirmation
   (AskUserQuestion). Ask any classification-relevant questions now.
2. Derive exact paths per the plugin's `topic-path-derivation` rule: folder
   `docs/ref/<MODULE>/<TOPIC>/`, `<PREFIX>` = `<TOPIC>` uppercased with
   hyphens → underscores, docs `<PREFIX>.md` / `<PREFIX>_PLAN.md` /
   `<PREFIX>_TEST.md`.
3. Every subagent that writes or reads a doc gets the exact paths in its
   task. If a doc is missing at that path, the subagent stops and reports —
   it never re-derives a path.

## Stage graph (per classification)

`topic-init` classifies; you do not. After it returns, read the
`> **Classification:**` line from the main doc and sequence:

| Classification | Stages in order |
|---|---|
| New feature (heavy) | topic-init → main-doc-verify → GATE → topic-plan → plan-doc-verify → GATE → topic-test → GATE → topic-implement |
| Bug fix (non-trivial) | topic-init → main-doc-verify → GATE → (topic-plan → plan-doc-verify if multi-file) → topic-test → GATE → topic-implement |
| Minor change | topic-init stops by design — report and finish |
| Investigation & code check | topic-init only, then report |
| Refactor | topic-init → GATE → topic-test → GATE → topic-implement |
| Config/infra change (risky) | topic-init → GATE → topic-test → GATE → topic-implement |
| Hotfix | fix first (human-led), then retroactive topic-init → GATE → topic-test → report. No plan doc. |

## Resume — re-entering after a dropped session

The full protocol — ledger file, format, write timing, edge cases — is in
the ledger rule; read it before resuming. The SKILL-level flow:

1. Locate the topic; read the topic docs that exist plus the ledger, if
   present. The docs + ledger are the state — never memory of a previous
   session.
2. Rebuild the control plane: stage graph from the main doc's
   Classification line; gate approvals and DECISIONS from the ledger;
   current position from the docs.
3. Present a compact resumption summary (stages done, gates approved,
   current position, next stage) and get one explicit human confirm.
4. Continue the stage graph from that position — every gate, verifier, and
   audit rule applies unchanged.

## Mandatory verification subagents

The plugin marks main-doc-verify and plan-doc-verify optional; at
orchestration level they are MANDATORY after the main doc and (when a plan
exists) the plan doc:

- Each verifier is its OWN fresh subagent, separate from the writer — never
  one session writing and verifying the same doc.
- Verifier tasks pass the doc path and instruct: verify only, never edit,
  report PASS/FAIL with evidence per the verifier skill's rules.
- Present doc + verifier findings table to the human together. Never present
  a doc for approval without its verifier result.
- FAIL → re-run the WRITER subagent with the findings, then a NEW verifier
  subagent. Only PASS (or explicit human waiver) reaches the gate.

## Subagent task template

```
You are running as an isolated subagent under an orchestrator; the human is
not watching. All human decisions are supplied below — never request human
input and never wait.

Task: invoke the Skill tool with skill "dev-workflow:<SKILL>" and arguments
"<ARGS>", then follow the loaded skill exactly for this ONE stage. Do not
start any other stage. The skill's SKILL.md and its linked rule files are
authoritative — read them; do not work from memory.

Working rules:
- Working repo = your current working directory.
- Create/edit docs ONLY at the exact paths in STATE. Missing doc at that
  path → stop and report, do not re-derive.
- If <SKILL> is main-doc-verify or plan-doc-verify: verify only, never edit
  the doc; report every check PASS/FAIL with evidence.
- When you reach the skill's blocking human review checkpoint: prepare the
  summary table exactly as required, then STOP. End your final answer with
  "CHECKPOINT: awaiting human approval" and the table. Do not ask to
  proceed.
- Never run git commit/push or any git state change. Deployment status comes
  only from DECISIONS.
- Final answer must contain: (1) artifacts produced with exact paths, (2)
  the checkpoint table if reached, (3) the list of skill/rule files you
  loaded, (4) any unresolved questions.

REQUIREMENT:
<human's requirement, verbatim>

DECISIONS (human-approved facts you may rely on):
<each approval/decision so far, one per line>

STATE:
<module, topic, exact doc paths, current position, tracker state, open items>
```

## Parallelism (speed without sacrificing gates)

- Within a stage, after understanding its subtasks: split every subtask with
  NO data dependency into its own subagent and launch them in ONE message
  (parallel Agent calls). Trivial stages stay single-session — never fan out
  for its own sake.
- Fan-out subagents run plain INVESTIGATION/SUBTASK tasks, never dev-workflow
  skills. Merge their findings yourself and inject the merged result into
  the stage's single writer-subagent task (STATE/DECISIONS). A writer
  subagent must never depend on another subagent's session context.
- Examples: topic-init on a heavy feature can fan out codebase trace /
  data-layer map / docs audit / reuse sweep; topic-plan can fan out NFR,
  security, dependency scans; topic-test can fan out per-area test-case
  design.
- Hard limits: never run stages in parallel ACROSS a human gate; never let a
  fan-out cross a gate. One writer subagent per doc.

Multi-session stages:

- topic-implement: default ONE subagent per plan phase, sequential; parallel
  only for phases the plan doc marks explicitly independent. Between phase
  subagents, you read the plan doc's Progress Tracker and carry exact
  position forward.
- Test execution: after implementation, run ONE dedicated subagent that
  executes the full battery in order (SMK → NEG pre-fix → NEG post-fix →
  Positive → REG), one group at a time, and reports the Test Results
  Dashboard. It only runs and reports; fixes loop back through you as new
  implementation subagents.

## Human-in-the-loop protocol (the core rule)

A subagent ending with "CHECKPOINT: awaiting human approval" is a GATE, not
a failure.

1. **Pre-gate audit** — before asking the human, check compliance yourself:
   read the doc; confirm it sits at the exact agreed path, References links
   only same-topic-folder docs, no code blocks, §5.5 NFR present, and the
   subagent listed the rule files it loaded. Any violation → send it back to
   the writer subagent with the findings before the human ever sees it.
2. Post the checkpoint table + doc path + verifier PASS/FAIL to the human,
   then ask via AskUserQuestion (Approve / Request changes / Pause).
3. On approve: record the approval in your ledger (see gate rule) and spawn
   only the next stage in the graph.
4. On request changes: re-run the SAME stage with the feedback in DECISIONS,
   then re-verify. A rejected checkpoint is not approval.
5. Fold the human's words into the next subagent's DECISIONS verbatim — a
   subagent must never re-derive or soften a human approval.

**Gate rule — verify before every spawn.** Before spawning ANY stage, your
ledger must contain an explicit approval for the gate immediately preceding
it (`main-doc approved`, `plan-doc approved`, `test-doc approved`,
`implement approved`). Missing entry → stop and ask the human. Never infer
approval from a subagent's output or flow momentum. If a subagent produced
its doc but returned no CHECKPOINT marker, treat it as a checkpoint anyway:
run the verifier, present, wait. This ledger is durable, not just in-context:
write each gate resolution to the topic's ledger file at the moment the human
answers (format and timing: the ledger rule).

**Open-question sweep at doc gates.** Before recording any doc-gate approval
(`main-doc approved`, `plan-doc approved`, `test-doc approved`), read the
doc's Open Questions section yourself and classify every row still marked
`Open` against DECISIONS:

- **Resolved** — the answer is already in DECISIONS or folded into the doc
  (row should read `✅ Resolved — <answer>`). No action.
- **Later-stage dependency** — only a later stage can resolve it (e.g. a
  plan-doc question the test battery answers). The gate may pass; record it
  in the ledger row's Notes (`OQ-3 deferred to topic-test`).
- **Neither** — do NOT record the approval yet. Remind the human which
  items are still open and that they must address them first: answer now,
  or explicitly defer with a reason. Only after they do (and you re-check)
  do you record the approval. An approval given while an addressable open
  question stands is not recorded — "looks good" does not resolve a
  question.

No Open Questions section or no `Open` rows → the sweep passes immediately.
A question you cannot classify → surface it to the human rather than
guessing. The same sweep applies on resume: a deferred open question whose
target stage has already run counts as unresolved.

## Git and deployment

Subagents never commit or push. After each approved checkpoint, remind the
human to commit the docs (suggest a Conventional Commits message, e.g.
`docs(<module>): add <topic> main doc`) and wait for confirmation before
continuing. Never report a Deployment Status value the human did not give
you.

## Failure handling

- A subagent that errors: retry the same stage once with the error appended.
  Fails again → report both failures and stop. Never skip a stage.
- If a subagent answers a question you did not supply in DECISIONS, treat the
  run as blocked: get the answer from the human, re-run.
- If a subagent ends without its expected artifact and without a checkpoint,
  read the topic docs yourself; report to the human before any further retry.

## Finishing

When the classification's graph completes, report: docs produced, tracker
state, test results summary, outstanding commits, and deployment rows the
human still owns. Record the final `topic complete` ledger row (ledger rule),
then suggest `/dev-workflow:topic-status <Module> <Topic>` in a
fresh session as the independent final check.