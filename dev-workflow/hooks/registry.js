// The single source of truth for the plugin-shipped hook gate system
// (dev-workflow plugin). Mirrors the repo-local registry shape
// (`{ gates, transforms, validate }`) so adapters port unchanged between the
// two. Both the Claude Code PostToolUse adapter and the shim-launched
// watcher / on-save adapters read from this registry — no per-surface gate lists.
//
// MIGRATION COMPLETE (2026-09-07): all gates are plugin-shipped — toc-sync
// (pilot, 2026-09-05), the four doc-only gates (env-scope, doc-reference-gate,
// open-questions-gate, secret-scan — 2026-09-07), and the final pair
// neg-flow-gate + regression-gate plus the helper-reuse load-time check.
// neg-flow-gate and regression-gate consume their repo-specific data
// (codeGlobs / sharedDirs) from the adopting repo's .claude/hooks.config.json
// via lib/project-config.js — no per-repo values are hardcoded here. The
// repo-local .claude/hooks/ machinery in adopting repos is retired; the
// plugin registry + adapters are the only copy.
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
  {
    meta: require('./cores/neg-flow-gate-core').meta,
    check: (filePath) => {
      const core = require('./cores/neg-flow-gate-core');
      // Dispatch on file type: *_PLAN.md edits run the plan check; code-file
      // edits (per the adopting repo's codeGlobs) run the code-file check that
      // finds active plans referencing the edited file.
      return /_PLAN\.md$/i.test(filePath)
        ? core.checkNegFlowGate(filePath)
        : core.checkNegFlowGateForCodeFile(filePath);
    },
  },
  { meta: require('./cores/regression-gate-core').meta, check: require('./cores/regression-gate-core').checkRegressionGate },
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

// Load-time validation. Runs the helper-reuse check over every core in cores/
// (and any other *-core.js there) and returns an array of problem strings.
// A non-empty result means the hook system itself is misconfigured — the
// adapters report it loudly rather than silently disabling a gate.
const path = require('path');
const fs = require('fs');
const { checkHelperReuse } = require('./cores/helper-reuse-core');

const CORES_DIR = path.join(__dirname, 'cores');

function validate() {
  const problems = [];
  const files = fs.existsSync(CORES_DIR)
    ? fs.readdirSync(CORES_DIR).filter((f) => f.endsWith('-core.js')).map((f) => path.join(CORES_DIR, f))
    : [];
  for (const corePath of files) {
    const problem = checkHelperReuse(corePath);
    if (problem) problems.push(problem);
  }
  return problems;
}

module.exports = { gates, transforms, validate };