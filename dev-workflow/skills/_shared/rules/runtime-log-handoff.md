# Shared: Runtime Log Handoff (Human-Run Evidence)

Used by `topic-implement` (diagnosing failures during execution), `topic-test` (capturing test-run and service output as evidence), and `topic-init` / `topic-plan` (any runtime probe only the human can run). This is a shared reference file, not a skill itself — it is loaded when linked from a skill's own SKILL.md.

## Purpose

The AI never runs the service, app, server, or any environment-dependent command — that is the human's job (runtime environments hold secrets and state the AI must not touch — see [Shared: Sensitive File Scope](`${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/sensitive-file-scope.md`)). When the AI needs runtime evidence — an error, a log line, a command's output — the human runs it. The chat-paste pattern (human copies log fragments into the conversation, AI asks for more) is slow, lossy, and floods the context. This rule makes the handoff a **file**, not a paste.

## The Rule

- **Handoff is a file path, not a chat paste.** The human runs the service/command and saves the output to a file — the repo-root `.ai-tmp/` folder is the natural home (see [Shared: Temporary Artifacts & Scratch Work](`${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/temporary-artifacts.md`)) — then tells the AI the path plus one line of context: what they expected vs what happened. The AI reads and searches the file itself with its file tools.
- **The AI never asks the human to paste logs into chat.** If the output is a few lines, the human may paste it anyway; the AI's default request is still "run this, save the output to a file, give me the path".
- **Ask with a concrete command.** The AI hands the human a ready-to-run command (adapted to the repo's stack) whose output lands in a file — never a vague "share the logs".
- **One round-trip per diagnosis.** Before asking for a run, the AI lists everything it needs from that run, so one human run answers all its open questions — not a paste-by-paste conversation.
- **Read targeted, not wholesale.** The AI searches the handoff file for the relevant section (errors around the symptom — module, timestamp, request id) instead of loading a large log end-to-end into context.
- **Logs are evidence, not doc content.** Never copy raw log output into a topic doc; quote only the minimal decisive lines and describe the rest. Logs may contain secrets — treat them like sensitive material (see [Shared: Sensitive File Scope](`${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/sensitive-file-scope.md`)) and never commit them.
- **Captured logs are temporary artifacts.** A log file captured for diagnosis follows the `.ai-tmp/` home-and-disposal rule — deleted when the diagnosis or the task ends.

## Enforcement

LLM-enforced (best-effort) in the plugin: the AI formulates every runtime-evidence request as a command-with-output-file and reads the handoff file itself. An adopting repo may additionally wire a deterministic gate in `.claude/hooks/` that reminds about this rule on log-related tool calls — where such a gate exists it backstops this rule mechanically; where absent, the rule remains LLM-enforced.

*Adapt paths/commands to your repository's actual layout and tooling.*