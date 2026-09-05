#!/usr/bin/env node
// One-shot save-trigger backstop for the plugin-shipped hooks — runs all
// applicable gates + transforms once against a changed file and exits. This is
// the "save-trigger" counterpart to the native PostToolUse hooks: it catches
// HUMAN manual edits (typing + Ctrl+S), which native hooks do NOT fire for
// (they only fire on agent tool calls).
//
// Ported from the ServerJP repo-local adapter: logic identical, but the project
// root is passed in by the user-level shim (tools/run-dev-workflow-hook.js) as
// `run({ projectRoot, targetFile })` — the plugin's __dirname is the cache
// install dir, not the project.
//
// Reuses the exact same logic as the native hooks via `runForFile` from
// adapters/post-tool-use.js (which enforces per-repo adoption) — no duplication.
//
// Usage: node run-dev-workflow-hook.js check [file-path]
// If no file argument is given, runs the initial full scan (like the watcher).
const fs = require('fs');
const path = require('path');
const { runForFile } = require('./post-tool-use');
const { gates } = require('../registry');
const { getProjectRoot, setProjectRoot } = require('../lib/gate-helpers');

const GREEN = '\x1b[32m', RED = '\x1b[31m', RESET = '\x1b[0m';

// Enumerate every file a gate applies to, for the full-scan mode. Derives the
// file list from each gate's meta.files globs by walking the project tree and
// matching project-relative forward-slash paths. Excludes gitignored/derived dirs.
const EXCLUDED_DIRS = new Set(['node_modules', 'production', '.git', 'temp', 'reports', 'logs', 'nul']);

function listFilesForGate(gate, ROOT) {
  const files = [];
  const patterns = gate.meta.files || [];
  if (patterns.length === 0) return files;
  (function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (EXCLUDED_DIRS.has(entry.name)) continue;
        walk(full);
      } else {
        const rel = path.relative(ROOT, full).split(path.sep).join('/');
        if (patterns.some((p) => new RegExp('^' + p.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*') + '$').test(rel))) {
          files.push(full);
        }
      }
    }
  })(ROOT);
  return files;
}

// Run a single-file check (targetFile) or a full scan (no arg). Returns whether
// any issue was found. Prints the human summary line (so both the shim path and
// a direct run get identical output). Exported so the shim can invoke it.
function run({ targetFile, projectRoot } = {}) {
  if (projectRoot) setProjectRoot(projectRoot);

  // Per-repo adoption — stay silent in projects that haven't adopted the hooks.
  const { loadConfig } = require('../lib/project-config');
  if (!loadConfig(getProjectRoot())) {
    console.log('Doc check: project not adopted (no .claude/hooks.config.json) — nothing to check.');
    return false;
  }

  const anyBad = (function () {
    if (targetFile) {
      const { ok } = runForFile(targetFile);
      return !ok;
    }
    // Full scan — run every gate over every applicable file.
    const ROOT = getProjectRoot();
    let bad = false;
    for (const gate of gates) {
      for (const file of listFilesForGate(gate, ROOT)) {
        const { ok } = runForFile(file);
        if (!ok) bad = true;
      }
    }
    return bad;
  })();

  console.log(anyBad
    ? `${RED}✖ Doc check — issues found${RESET}`
    : `${GREEN}✔ Doc check — ${targetFile ? path.basename(targetFile) : 'full scan'} passed${RESET}`);
  return anyBad;
}

if (require.main === module) {
  const anyBad = run({ targetFile: process.argv[2] || null });
  process.exit(anyBad ? 1 : 0);
}

module.exports = { run, listFilesForGate };