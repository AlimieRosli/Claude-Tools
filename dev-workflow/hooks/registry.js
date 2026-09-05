// The single source of truth for the plugin-shipped hook gate system
// (dev-workflow plugin). Mirrors the repo-local registry shape
// (`{ gates, transforms, validate }`) so adapters port unchanged between the
// two. Both the Claude Code PostToolUse adapter and the shim-launched
// watcher / on-save adapters read from this registry — no per-surface gate lists.
//
// PILOT SCOPE: toc-sync only. The remaining six gates migrate from the
// ServerJP repo-local registry once the pilot is validated. The helper-reuse
// load-time check (registry.validate() in the repo copy) migrates with them.
//
// Per-repo adoption is NOT decided here — adapters consult
// lib/project-config.js (presence of <project>/.claude/hooks.config.json) so a
// user-scope plugin install never fires hooks into non-adopting repos.
const gates = [
  { meta: require('./cores/toc-sync-core').meta, check: require('./cores/toc-sync-core').checkTocSync, fix: require('./cores/toc-sync-core').fixTocSync },
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