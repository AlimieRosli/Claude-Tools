#!/usr/bin/env node
// Shared PostToolUse adapter for the plugin-shipped hooks — the single hook
// command that runs all gates AND transforms for every registered surface
// (Claude Code PostToolUse, on-save, watcher).
//
// Ported from the ServerJP repo-local adapter with three changes:
//   1. the project root resolves dynamically (lib/project.js) instead of
//      __dirname (which would point at the plugin's cache install dir);
//   2. per-repo adoption — runForFile no-ops unless the project has
//      .claude/hooks.config.json (the user-scope plugin must not fire into
//      non-adopting repos);
//   3. the repo-local README auto-sync trigger is dropped (the hooks README is
//      a repo-local artifact; the plugin's hooks docs live in the plugin repo).
//
// Reads the PostToolUse event JSON from stdin, extracts the changed file path
// from EITHER event.tool_input.file_path (snake_case) OR
// event.tool_input.filePath (camelCase, defensive fallback), asks the registry
// which gates and transforms apply via each core's meta.files matcher, runs each
// check / apply, writes the report via lib/report.js, and exits 2 with a stderr
// summary on gate failure (else 0).
//
// Auto-fix: on this native path, mechanical gates that export `fix` are
// auto-corrected (reusing lib/fix.js), and transforms rewrite the file. When the
// file content changes, the adapter returns `updatedToolOutput` on stdout so the
// agent's in-context view stays accurate.
//
// The core logic is exported as `runForFile(filePath)` so the on-save backstop
// and the (future) pre-commit backstop reuse the exact same
// gate/transform/report path — no logic duplication.
const fs = require('fs');
const { gates, transforms, validate } = require('../registry');
const { matchesFiles } = require('../lib/match');
const { writeReport, normalizeResult } = require('../lib/report');
const { runFixes } = require('../lib/fix');
const { getProjectRoot, relPath } = require('../lib/gate-helpers');
const { loadConfig, gateEnabled } = require('../lib/project-config');

// Per-process adoption config, loaded lazily on first use. For the one-shot
// native hooks this is effectively "once per hook invocation"; for the shim-
// launched watcher it is "once per watch session" (a config added mid-watch is
// picked up on the next watcher start).
let configCache; // undefined = not loaded yet, null = not adopted
function getAdoptionConfig() {
  if (configCache === undefined) configCache = loadConfig(getProjectRoot());
  return configCache;
}

// Which gates apply to a changed file, via meta.files + per-repo enablement.
function applicableGates(filePath) {
  const config = getAdoptionConfig();
  return gates.filter(
    (g) => gateEnabled(config, g.meta.name) && matchesFiles(relPath(filePath), g.meta.files)
  );
}

// Which transforms apply to a changed file, via meta.files.
function applicableTransforms(filePath) {
  const config = getAdoptionConfig();
  return transforms.filter(
    (t) => gateEnabled(config, t.meta.name) && matchesFiles(relPath(filePath), t.meta.files)
  );
}

// Run all applicable gates + transforms over a single file, write the report,
// and return { ok, failures, finalContent, results }. `ok` is false when any
// gate failed. Shared by the native PostToolUse hook, the on-save backstop, and
// the pre-commit backstop.
//
// `opts.writeReport === false` skips the per-file report write (the watcher
// aggregates a whole cycle and writes one report itself, so latest.json reflects
// every file it scanned rather than only the last one). Every other caller keeps
// the default per-file write.
//
// When the project is not adopted (no hooks.config.json), returns a clean pass
// with no results — every adapter short-circuits to a silent no-op.
function runForFile(filePath, opts = {}) {
  if (!getAdoptionConfig()) {
    return { ok: true, failures: [], finalContent: null, results: [] };
  }

  // Load-time validation — a misconfigured registry/core must fail loudly.
  const validationProblems = validate();
  if (validationProblems.length > 0) {
    console.error(`Hook registry validation failed:\n${validationProblems.join('\n')}`);
    return { ok: false, failures: validationProblems, finalContent: null, results: [] };
  }

  // 1. Run gates (checks). Auto-fix mechanical gates on this native path.
  let results = [];
  for (const gate of applicableGates(filePath)) {
    const problem = gate.check(filePath);
    results.push(normalizeResult(gate.meta.name, filePath, problem));
  }
  results = runFixes(results, gates, { onSave: true });

  // 2. Run transforms (rewrites). Collect the final content if any changed.
  let finalContent = null;
  for (const transform of applicableTransforms(filePath)) {
    try {
      const r = transform.apply(filePath);
      if (r && r.changed) finalContent = r.content;
    } catch (e) {
      console.error(`transform ${transform.meta.name} failed: ${e.message}`);
    }
  }

  if (opts.writeReport !== false) writeReport('post-tool-use', results);

  const failures = results.filter((r) => r.status === 'fail');
  return { ok: failures.length === 0, failures, finalContent, results };
}

// CLI entry — reads the PostToolUse event from stdin (used by the native hooks).
// Exported as `runCli()` so the claude-code.js wrapper can invoke the SAME logic
// when IT is the main module. A bare `require('./post-tool-use')` in the wrapper
// would load this module but never register the stdin handler (the
// `require.main === module` guard below only matches a direct `node
// post-tool-use.js` run), silently turning the native hook into a no-op —
// exit 0, nothing scanned. That exact bug shipped in a previous claude-code.js;
// runCli() exists to prevent it.
function runCli() {
  let input = '';
  process.stdin.on('data', (chunk) => (input += chunk));
  process.stdin.on('end', () => {
    let event;
    try {
      event = JSON.parse(input);
    } catch {
      process.exit(0); // not a valid hook event — stay silent
    }

    // Not adopted — stay silent (never fire into non-adopting repos).
    if (!getAdoptionConfig()) process.exit(0);

    // Accept both Claude Code (file_path) and VS Code (filePath) input formats.
    const filePath = event?.tool_input?.file_path || event?.tool_input?.filePath;
    if (!filePath || !fs.existsSync(filePath)) process.exit(0);

    const { ok, failures, finalContent } = runForFile(filePath);
    if (!ok) {
      console.error(`Hook gate(s) failed in ${filePath}:\n${failures.map((f) => f.problem).join('\n')}`);
      process.exit(2); // stderr fed back to the agent for self-correction
    }

    // If a transform rewrote the file, return the updated content so the agent's
    // in-context view reflects the change.
    if (finalContent !== null) {
      process.stdout.write(JSON.stringify({ updatedToolOutput: { content: finalContent } }));
    }
    process.exit(0);
  });
}

// Direct `node adapters/post-tool-use.js` runs use the CLI; the wrapper
// (claude-code.js) calls runCli() explicitly when it is the main module.
if (require.main === module) {
  runCli();
}

module.exports = { runForFile, runCli };