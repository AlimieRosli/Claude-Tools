#!/usr/bin/env node
// User-level launcher for the dev-workflow plugin's editor-side hooks
// (watcher / on-save backstops). Lives at a FIXED path
// (~/.claude/tools/run-dev-workflow-hook.js) so VS Code tasks and git hooks can
// reference it forever without ever changing.
//
// Why this shim exists: ${CLAUDE_PLUGIN_ROOT} only exists inside Claude Code
// hook execution, and the plugin's cache install path changes on every
// install/update/re-pin — so nothing outside a Claude Code session can point at
// the plugin directly. This shim resolves the ACTIVE install at runtime and
// dispatches. It contains no rules or logic of its own — path resolution +
// subcommand dispatch only — so it cannot drift from the plugin.
//
// Resolution order:
//   1. DEV_WORKFLOW_PLUGIN_ROOT env override — point at a source checkout
//      (e.g. C:\Projects\Claude-Tools\dev-workflow) to test un-pinned changes
//      without a version bump + re-pin.
//   2. ~/.claude/plugins/installed_plugins.json -> installPath (what Claude
//      Code itself uses; updated automatically by install/update/re-pin).
//   3. Fallback: newest dir under ~/.claude/plugins/cache/claude-tools/dev-workflow/
//      that actually contains a hooks/registry.js (covers the pre-hooks
//      active install and a missing/unreadable manifest).
//
// Usage: node run-dev-workflow-hook.js <watch | check [file] | precommit>
// The project root is the process cwd (VS Code task cwd = workspace folder).
const fs = require('fs');
const os = require('os');
const path = require('path');

const PLUGIN_KEY = 'dev-workflow@claude-tools';

// Resolve the active plugin root, or null when nothing usable is installed.
function resolvePluginRoot() {
  // 1. Explicit override (source checkout / un-pinned testing).
  if (process.env.DEV_WORKFLOW_PLUGIN_ROOT) {
    const p = path.resolve(process.env.DEV_WORKFLOW_PLUGIN_ROOT);
    if (fs.existsSync(path.join(p, 'hooks', 'registry.js'))) return p;
    console.error(`DEV_WORKFLOW_PLUGIN_ROOT is set but no hooks/registry.js exists at ${p}`);
    process.exit(1);
  }

  // 2. Claude Code's own plugin registry — the exact active install path.
  const manifest = path.join(os.homedir(), '.claude', 'plugins', 'installed_plugins.json');
  try {
    const data = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    const entries = data.plugins && data.plugins[PLUGIN_KEY];
    const entry = Array.isArray(entries) ? entries.find((e) => e && e.installPath) : null;
    if (entry && fs.existsSync(path.join(entry.installPath, 'hooks', 'registry.js'))) {
      return entry.installPath;
    }
  } catch {
    /* manifest missing/unreadable — fall through to the glob fallback */
  }

  // 3. Fallback: newest cache version dir that actually ships hooks/.
  const cacheDir = path.join(os.homedir(), '.claude', 'plugins', 'cache', 'claude-tools', 'dev-workflow');
  let best = null;
  try {
    for (const v of fs.readdirSync(cacheDir)) {
      const dir = path.join(cacheDir, v);
      if (fs.existsSync(path.join(dir, 'hooks', 'registry.js'))) {
        const m = fs.statSync(dir).mtimeMs;
        if (!best || m > best.m) best = { dir, m };
      }
    }
  } catch {
    /* no cache at all */
  }
  return best ? best.dir : null;
}

const root = resolvePluginRoot();
if (!root) {
  console.error('dev-workflow plugin with hooks/ not found. Install or update the plugin (claude plugin update), or set DEV_WORKFLOW_PLUGIN_ROOT to a source checkout.');
  process.exit(1);
}

const projectRoot = process.cwd();
const cmd = process.argv[2] || '';
const adapters = path.join(root, 'hooks', 'adapters');

if (cmd === 'watch') {
  require(path.join(adapters, 'watcher.js')).run({ projectRoot });
} else if (cmd === 'check') {
  const anyBad = require(path.join(adapters, 'check-on-save.js')).run({
    projectRoot,
    targetFile: process.argv[3] || null,
  });
  process.exit(anyBad ? 1 : 0);
} else if (cmd === 'precommit') {
  // Staged-file gate runner — arrives with the full hooks migration.
  console.error('precommit backstop is not shipped yet (pilot ships watch + check only).');
  process.exit(2);
} else {
  console.error(`Usage: node run-dev-workflow-hook.js <watch | check [file]>\n  plugin root:  ${root}\n  project root: ${projectRoot}`);
  process.exit(1);
}