// Project-root resolution for the plugin-shipped hooks.
//
// The plugin code lives under ~/.claude/plugins/cache/... — its __dirname is NOT
// the project being edited (this is the one structural change the plugin move
// required: every repo-local adapter derived the repo root from __dirname). The
// current project root resolves dynamically, in order:
//   1. an explicit override (setProjectRoot) — used by the shim-launched
//      adapters (watcher / check-on-save), which pass the workspace cwd;
//   2. process.env.CLAUDE_PROJECT_DIR — set by Claude Code on every hook command;
//   3. process.cwd() — fallback (e.g. running an adapter manually from a repo).
//
// Resolved lazily (not at require time) so a shim can set the override before
// the registry/adapters are required in the same process.
const path = require('path');

let override = null;

function setProjectRoot(p) {
  override = p ? path.resolve(p) : null;
}

function getProjectRoot() {
  if (override) return override;
  if (process.env.CLAUDE_PROJECT_DIR) return path.resolve(process.env.CLAUDE_PROJECT_DIR);
  return path.resolve(process.cwd());
}

module.exports = { getProjectRoot, setProjectRoot };