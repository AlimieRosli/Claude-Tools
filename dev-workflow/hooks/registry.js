// The single source of truth for the plugin-shipped hook gate system
// (dev-workflow plugin). Mirrors the repo-local registry shape
// (`{ gates, transforms, validate }`) so adapters port unchanged between the
// two. Both the Claude Code PostToolUse adapter and the shim-launched
// watcher / on-save adapters read from this registry — no per-surface gate lists.
//
// MIGRATION SCOPE: toc-sync (pilot, 2026-09-05) + the four doc-only gates
// (env-scope, doc-reference-gate, open-questions-gate, secret-scan — 2026-09-07).
// Still repo-local in ServerJP: neg-flow-gate and regression-gate (they need the
// per-repo codeGlobs/sharedDirs adoption values wired through lib/project-config.js).
// The helper-reuse load-time check (registry.validate() in the repo copy) moves
// when those last two gates migrate.
//
// Per-repo adoption is NOT decided here — adapters consult
// lib/project-config.js (presence of <project>/.claude/hooks.config.json) so a
// user-scope plugin install never fires hooks into non-adopting repos.
const gates = [
  { meta: require('./cores/toc-sync-core').meta, check: require('./cores/toc-sync-core').checkTocSync, fix: require('./cores/toc-sync-core').fixTocSync },
  { meta: require('./cores/env-scope-core').meta, check: require('./cores/env-scope-core').checkEnvScope },
  { meta: require('./cores/doc-reference-gate-core').meta, check: require('./cores/doc-reference-gate-core').checkDocReferences },
  {
    meta: require('./cores/open-questions-gate-core').meta,
    check: (filePath) => {
      const core = require('./cores/open-questions-gate-core');
      // Dispatch on file type: *_PLAN.md edits run the plan check; *_TEST.md
      // edits run the test check (blocks on the sibling plan's open questions).
      return /_PLAN\.md$/i.test(filePath)
        ? core.checkOpenQuestionsGatePlan(filePath)
        : core.checkOpenQuestionsGateTest(filePath);
    },
  },
  { meta: require('./cores/secret-scan-core').meta, check: require('./cores/secret-scan-core').checkSecretScan },
];

// Ordered list of transform cores. Each entry is { meta, apply }; `meta.files`
// decides which changed files apply. A transform REWRITES the file content
// rather than only checking it — the shared adapter runs transforms after gates
// and returns the rewritten content via updatedToolOutput so the agent's
// in-context view stays accurate.
//
// Currently empty — no transforms are registered. Add a transform core here
// (e.g. `{ meta, apply }`) when a content-rewriting hook is needed.
const transforms = [];

// Load-time validation. In the repo-local copy this ran the demoted
// helper-reuse check over every core; that check migrates with the remaining
// gates. Until then it is a no-op so the adapter contract (validate() -> string[])
// stays identical.
function validate() {
  return [];
}

module.exports = { gates, transforms, validate };