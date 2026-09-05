# Shared: Temporary Artifacts & Scratch Work

Used by `topic-implement` (implementation and cleanup), `topic-test` (running cases, disposable test data), `topic-init` and `topic-plan` (exploration one-offs), and `workflow-adopt` (onboarding installs the repo-level ignore entry) — anywhere the AI is tempted to create a script, scratch file, patch, or generated data file that is not itself the work product. This is a shared reference file, not a skill itself — it is loaded when linked from a skill's own SKILL.md.

## Purpose

Exploratory and verification work often needs a throwaway script or data file: a one-off conversion, a probe of an API, a synthetic payload, a migration dry-run. When those files land in source directories they pollute the repo, survive the task, and risk being committed. This rule gives every such artifact one designated home and one disposal rule.

## The Rule

- **One home — the repo-root temp folder.** All AI-created scratch scripts, generated data files, probe outputs, patches, and intermediate artifacts go under `.ai-tmp/` at the **repository root**. Create the folder only when first needed.
  - Path pattern: `./.ai-tmp/` — optionally nest per topic (`./.ai-tmp/<module>/<topic>/`) when scratch work should stay separated. Never scatter temp files in source directories or the OS temp dir (the repo root keeps them visible, git-ignored, and easy to sweep).
- **Scope the folder to what you created.** Delete only the files this task created. Never wipe the whole folder blindly — it may hold artifacts from another process or an earlier interrupted session. When unsure whether a file is yours, ask the human before deleting it.
- **Delete after finish.** Once the task (or the phase that needed the artifact) is complete, delete what you created — including after failure, where possible. If deletion must be deferred (e.g. the file feeds a deploy step), say so explicitly in the plan doc and treat it as a Final Cleanup Sweep item.
- **Permanent files are not artifacts.** Anything that should survive the task (real implementation code, colocated unit tests, topic docs, config) is written to its intended location — never parked in `.ai-tmp/` for "temporary" storage. If the artifact turns out to be worth keeping, move it to its real destination and note the decision in the plan doc; do not leave it in place.
- **No secrets in temp artifacts.** Never write real credentials, tokens, keys, or connection strings into `.ai-tmp/` files — use the placeholder/dummy values from the adopting repo's placeholder reference doc (see [Shared: Sensitive File Scope](`${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/sensitive-file-scope.md`)).
- **Tests use the folder for disposable data.** Synthetic payloads, generated fixtures, and captured probe responses used by a run go here — not next to real fixtures, not in the OS temp dir.
- **Gitignore is the backstop.** The folder must be ignored (`.ai-tmp/` in `.gitignore`). The `workflow-adopt` skill installs this entry on onboarding; if a task ever finds it missing, create it (or flag to the human if `.gitignore` itself is sensitive to edits) before using the folder.

## Enforcement

LLM-enforced (best-effort) in the plugin. `topic-implement`'s Final Cleanup Sweep owns the deletion pass; `workflow-adopt` owns the `.gitignore` entry. An adopting repo may additionally wire a deterministic gate in `.claude/hooks/` that flags write tool calls targeting source directories for disposable-looking scripts — where such a gate exists it backstops this rule mechanically; where absent, the rule remains LLM-enforced.

*Adapt paths/commands to your repository's actual layout and tooling.*