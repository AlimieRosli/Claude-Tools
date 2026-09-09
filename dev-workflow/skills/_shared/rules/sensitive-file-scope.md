# Shared: Sensitive File Scope

Used by `topic-init` (Step 2 codebase exploration), `topic-plan` (env/deploy sections), `topic-implement` (implementation), and `topic-test` (test execution) — anywhere the AI might be tempted to read environment or secret files. This is a shared reference file, not a skill itself — it is loaded when linked from a skill's own SKILL.md.

## Purpose

Sensitive files (gitignored env files, credentials, keys) exist so the **human** controls real values. The AI must never read them — not to "understand the config", not to "just check one value", not to run a test. Reading them pulls real secrets into the conversation context, where they can be copied into docs, logs, or responses. The AI works entirely with **placeholder values** from the adopting repo's placeholder reference doc.

## The Rule

- **Never read sensitive files** — for any reason, in any step. What counts as "sensitive" is **stack-agnostic: any file that carries real credentials, tokens, keys, or connection info** — typically (but not only) gitignored files. There is no "just one value" exception.
- **Sensitive files by stack** — the names differ per stack; the *category* does not. Adapt to the adopting repo's actual convention:

  | Stack | Typically sensitive (never read) | Typically safe (normal config) |
  |-------|----------------------------------|--------------------------------|
  | Node / Python / general | `.env`, `.env.*`, gitignored env files, `*.pem`, `*.key`, service-account JSON, credential caches | committed config modules, `config/*.js` without secrets |
  | Spring Boot | gitignored profile files carrying real credentials (e.g. `application-local.yml`, `application-secret.properties`), committed profile files that contain real DB passwords/keys, JVM-level credential stores | committed `application.yml` / `application.properties` / `application-<profile>.yml` **without** embedded secrets (secrets injected via env vars / Vault / Spring Cloud Config) |
  | .NET | `appsettings.Development.json` / user-secrets stores carrying real values, `*.pfx` key files | committed `appsettings.json` structure without secrets |
  | Container / cloud | docker-compose override files with real values, k8s Secret manifests with decoded values, cloud credential files (`~/.aws`, `gcloud` configs) | committed compose/k8s manifests using env-var references |

  **When unsure whether a file is sensitive, treat it as sensitive and ask the human** — the cost of one extra question is a secret leaking into context; the cost of asking is nothing.
- **One source for placeholder and env values: the adopting repo's placeholder reference doc** (e.g. `docs/PLACEHOLDER_REFERENCE.md` — adapt the path to the repo's convention). It maps each `<UPPER_SNAKE_CASE>` placeholder to:
  - a safe placeholder/dummy value usable in docs, commands, and local test runs, and
  - where the real value lives (which env file, profile file, secret store, or config scope the human manages) — named only, never quoted.
- **When the AI needs a value, it looks it up there:**
  - *Writing a doc or command* → use the placeholder name and its dummy value from the reference doc.
  - *Running a test that needs env values* → use the dummy/placeholder values from the reference doc. The human sets real values in the actual environment (env file, profile file, secret store — stack-dependent); the AI never needs to see them.
- **Value not in the reference doc?** Do not hunt for it in sensitive files. Ask the human to add it to the reference doc (placeholder name + dummy value), or mark `<!-- TODO: confirm -->` in the doc and list it in Open Questions.
- **The reference doc itself is read only with human approval** — even though it carries only placeholder values, it is the repo's map of where real values live, so it stays human-gated: the AI reads it only when the human explicitly approves each read (a Claude Code `permissions.ask` rule — see Enforcement), never casually or wholesale into context.
- **Real values stay out of committed docs** — topic docs use the `<UPPER_SNAKE_CASE>` placeholder convention only (see the existing env-scope/secret-scan rules and the plugin's deterministic `env-scope` / `secret-scan` gates, which apply when the repo has adopted the hooks — a `.claude/hooks.config.json` in the repo root).

## Enforcement

LLM-enforced (best-effort) in the plugin. The mechanical backstop is Claude Code's built-in **permission deny rules** — enforced by the harness (not the model), evaluated deny-first, and applied to subagents as well. Paste-ready snippet for the adopting repo's `.claude/settings.json`:

```json
{
  "permissions": {
    "deny": [
      "Read(**/.env*)",
      "Read(**/*.pem)",
      "Read(**/*.key)",
      "Read(**/*.pfx)",
      "Read(**/secrets/**)"
    ]
  }
}
```

A `Read` deny rule also blocks Edit/Write on the same path, applies best-effort to Grep/Glob and `@file` mentions, and covers Bash file commands Claude Code recognizes (`cat`, `head`, `tail`, `sed`) plus Bash input redirects — so `cat .env` is blocked too. Bare filenames follow gitignore semantics: `Read(.env)` matches at any depth under the repo; `Read(//**/.env)` matches anywhere on the filesystem. Symlinks are covered — a symlink pointing at a denied file is itself denied.

The **placeholder reference doc is the one doc the AI must not read freely** — gate it behind an `ask` rule, which prompts the human on every read (evaluated deny → ask → allow, so an ask rule forces the prompt even over any allow rule; it fires in every permission mode):

```json
{
  "permissions": {
    "ask": [
      "Read(**/PLACEHOLDER_REFERENCE.md)"
    ]
  }
}
```

Adapt the pattern to the repo's actual reference-doc name/path. `ask` is the right level here (human approves each read); use `deny` instead only if the repo wants the AI blocked from it entirely, with the human pasting needed values.

**Residual gap (per Claude Code docs):** deny rules do not apply to arbitrary subprocesses that open files themselves (e.g. a Python/Node script reading the file). Claude Code's sandbox closes this at OS level — macOS/Linux/WSL2 only, not native Windows. The stronger fix, and this rule's default posture: real values never live in the AI's working tree — the human holds them (env injection, secret store); the AI works from the placeholder reference doc.

An adopting repo may additionally wire a deterministic Read-gate hook in `.claude/hooks/` (a PreToolUse hook with a `Read` matcher) — where such a gate exists it backstops this rule mechanically; where neither exists, the rule remains LLM-enforced. This rule complements the secret-scan gate: secret-scan catches secrets that reached a doc; this rule stops the AI from reading them in the first place.

*Adapt paths/commands to your repository's actual layout and tooling.*
