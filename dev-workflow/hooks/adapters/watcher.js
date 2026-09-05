#!/usr/bin/env node
// Continuous, editor-agnostic hook-watcher backstop for the plugin-shipped
// hooks — deterministic (no LLM), fires on filesystem changes regardless of
// which editor/agent made the edit. This catches HUMAN manual edits (typing +
// Ctrl+S), which native PostToolUse hooks do NOT fire for (they only fire on
// agent tool calls).
//
// Ported from the ServerJP repo-local adapter: logic identical, but the watched
// project root is passed in by the user-level shim (tools/run-dev-workflow-hook.js
// in the Claude-Tools repo) as `run({ projectRoot })` — the plugin's __dirname
// is the cache install dir, not the project. Launched via the shim because
// ${CLAUDE_PLUGIN_ROOT} only exists inside Claude Code hook execution and the
// plugin cache path moves on every update; the shim sits at a fixed user-level
// path and resolves the active install at runtime.
//
// Reuses the exact same logic as the native hooks via `runForFile` from
// adapters/post-tool-use.js (which enforces per-repo adoption) — no logic
// duplication.
//
// Loads the registry, derives per-gate watch roots from each gate's meta.files,
// and runs the initial full scan + fs.watch recursive with a 500 ms debounce.
// Unlike the per-file PostToolUse report (which only ever holds the last file
// checked), the watcher aggregates the latest results for every file it has
// scanned and writes ONE report per cycle to latest.json — so /hook-fix (which
// reads that file) sees all known issues, not just the last one.
const fs = require('fs');
const path = require('path');
const { gates, validate } = require('../registry');
const { runForFile } = require('./post-tool-use');
const { writeReport, printIssue, latestPath } = require('../lib/report');
const { getProjectRoot, setProjectRoot, relPath } = require('../lib/gate-helpers');

const CYAN = '\x1b[36m', YELLOW = '\x1b[33m', GREEN = '\x1b[32m', RED = '\x1b[31m', RESET = '\x1b[0m',
      GRAY = '\x1b[90m', BOLD = '\x1b[1m', MAGENTA = '\x1b[35m',
      BRIGHT_CYAN = '\x1b[96m', BRIGHT_GREEN = '\x1b[92m', BRIGHT_YELLOW = '\x1b[93m';

// Opt-in terminal bell on NEW issues — alerts a human who isn't actively
// watching the terminal. Enable with `HOOK_WATCHER_BELL=1` in the env.
const BELL_ON = process.env.HOOK_WATCHER_BELL === '1';

// Compact HH:MM:SS timestamp for cycle headers — when the issue was captured.
function ts() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

const EXCLUDED_DIRS = new Set(['node_modules', 'production', '.git', 'temp', 'reports', 'logs', 'nul', '.claude']);

// Enumerate every file a gate applies to, from its meta.files globs (walked
// under the project root).
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

// Latest known results per project-relative file path. Kept across cycles so the
// aggregated report always reflects every file the watcher has scanned — not
// just the last file of the last cycle.
const reportState = new Map();

// Failing (gate, file) keys from the PREVIOUS cycle. Used to print only NEW
// issues per cycle instead of re-listing every known issue on every save —
// re-listing stale issues made it impossible to tell what the current save
// actually triggered. The full open-issue list always lives in latest.json.
let prevFailKeys = new Set();
const failKey = (r) => `${r.gate}::${r.file}`;

// Run all applicable gates over a set of files, then write ONE aggregated
// report for the cycle (no console print — the caller prints so it can show
// the trigger + only-new issues). Returns { anyBad, results }.
function runCycle(files) {
  let anyBad = false;
  for (const file of files) {
    if (!fs.existsSync(file)) {
      reportState.delete(relPath(file)); // deleted — drop stale results
      continue;
    }
    const { ok, results } = runForFile(file, { writeReport: false });
    if (!ok) anyBad = true;
    reportState.set(relPath(file), results);
  }
  const aggregated = Array.from(reportState.values()).flat();
  writeReport('watcher', aggregated, { print: false });
  return { anyBad, results: aggregated };
}

// Print a scannable, human-readable summary for one watch cycle:
//   1. a divider + timestamp + TRIGGER header (which file(s) changed, and when),
//   2. only the NEW issues since the previous cycle (gate + file + summary on
//      one line + indented detail + a /hook-fix hint),
//   3. a colored totals line carrying the `Hook watch cycle complete` marker
//      the VS Code problemMatcher's background endsPattern requires,
//   4. a latest.json status line — tells the human the report was updated,
//      cleared, or where to refer for the full open-issue list.
// Each issue line stays `[gate] file: summary` (Problems-panel compatible).
function printCycle(triggerFiles, results, ROOT, { initial = false } = {}) {
  const curFails = results.filter((r) => r.status === 'fail');
  const curKeys = new Set(curFails.map(failKey));
  const newFails = curFails.filter((r) => !prevFailKeys.has(failKey(r)));
  const prevOpen = prevFailKeys.size;
  const totalOpen = curFails.length;
  const REPORT_REL = path.relative(ROOT, latestPath()).split(path.sep).join('/');

  // Header: `── HH:MM:SS [saved|initial scan] <file|count> ────────`
  const label = initial ? '[initial scan]' : '[saved]';
  const labelCol = initial ? MAGENTA : BRIGHT_CYAN;
  const detail = initial
    ? `${reportState.size} file(s) checked`
    : (triggerFiles.map((f) => relPath(f)).filter(Boolean).join(', ') || '(unknown)');
  const plain = `── ${ts()} ${label} ${detail}`; // visible length, no ANSI
  const fill = '─'.repeat(Math.max(6, 80 - plain.length));
  console.log(`${GRAY}── ${ts()} ${labelCol}${BOLD}${label}${RESET} ${GRAY}${detail} ${fill}${RESET}`);

  // New issues only — gate (red) + file (cyan) + summary (bold white) on one
  // line via printIssue, then a /hook-fix hint.
  for (const r of newFails) {
    printIssue(r);
    console.log(`  ${BRIGHT_YELLOW}💡 fix: run /hook-fix ${r.gate}${RESET}`);
  }
  if (BELL_ON && newFails.length > 0) process.stdout.write('\x07'); // audible alert

  // Totals — carries the `Hook watch cycle complete` endsPattern marker.
  let totals;
  if (totalOpen === 0 && prevOpen > 0) {
    totals = `${BRIGHT_GREEN}✅ Hook watch cycle complete — all issues resolved${RESET}`;
  } else if (totalOpen === 0) {
    totals = `${GREEN}✔ Hook watch cycle complete — all clear${RESET}`;
  } else if (newFails.length > 0) {
    totals = `${RED}✖ Hook watch cycle complete — ${newFails.length} new · ${totalOpen} total open${RESET}`;
  } else {
    totals = `${YELLOW}• Hook watch cycle complete — no new · ${totalOpen} total open${RESET}`;
  }
  console.log(totals);

  // latest.json status — updated (N added) / cleared (all resolved) / refer
  // (open issues exist but weren't re-listed this cycle). Always shows the path
  // so the human can open it directly.
  if (totalOpen === 0 && prevOpen > 0) {
    console.log(`${CYAN}📄 latest.json cleared${RESET} ${GRAY}→ ${REPORT_REL}${RESET}`);
  } else if (totalOpen > 0 && newFails.length > 0) {
    console.log(`${CYAN}📄 latest.json updated${RESET} ${GRAY}— ${newFails.length} added → ${REPORT_REL}${RESET}`);
  } else if (totalOpen > 0) {
    console.log(`${CYAN}📄 see latest.json${RESET} ${GRAY}— ${totalOpen} open → ${REPORT_REL}${RESET}`);
  }

  prevFailKeys = curKeys;
}

// Entry point. `projectRoot` is passed by the user-level shim (the VS Code task
// cwd); when omitted (direct `node watcher.js` from a repo), it falls back to
// the standard resolution (CLAUDE_PROJECT_DIR / cwd). Long-running: the adoption
// config is read once at start — a config added mid-watch needs a restart.
function run({ projectRoot } = {}) {
  if (projectRoot) setProjectRoot(projectRoot);
  const ROOT = getProjectRoot();

  // Load-time validation — a misconfigured registry/core must fail loudly.
  const validationProblems = validate();
  if (validationProblems.length > 0) {
    console.error(`Hook registry validation failed:\n${validationProblems.join('\n')}`);
    process.exit(2);
  }

  // Per-repo adoption — do not watch a project that hasn't adopted the hooks.
  const { loadConfig } = require('../lib/project-config');
  if (!loadConfig(ROOT)) {
    console.log(`${YELLOW}👁  Hook watcher: project not adopted${RESET} — no ${path.join('.claude', 'hooks.config.json')} in ${ROOT}. Nothing to watch; exiting.`);
    process.exit(0);
  }

  const REPORT_REL = path.relative(ROOT, latestPath()).split(path.sep).join('/');

  console.log(`${CYAN}👁  Hook watcher running${RESET} — ${gates.length} gate(s): ${gates.map((g) => g.meta.name).join(', ')}`);
  console.log(`${GRAY}📄 report: ${REPORT_REL}${BELL_ON ? '  ·  🔔 bell on (HOOK_WATCHER_BELL=1)' : ''}${RESET}`);
  console.log('');

  // Initial full scan.
  printCycle([], runCycle(gates.flatMap((g) => listFilesForGate(g, ROOT))).results, ROOT, { initial: true });

  // Watch the project root recursively with a 500 ms debounce.
  let debounceTimer = null;
  const pending = new Set();
  function scheduleRun() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const files = Array.from(pending);
      pending.clear();
      printCycle(files, runCycle(files).results, ROOT);
    }, 500);
  }

  fs.watch(ROOT, { recursive: true }, (eventType, filename) => {
    if (!filename) return;
    const full = path.join(ROOT, filename);
    // fs.watch returns filenames with platform-native separators (backslash on
    // Windows, forward slash elsewhere). Normalize to forward slashes so the
    // first-segment exclusion works on every platform. Exclude the watcher's own
    // output dirs to avoid a feedback loop.
    const normalized = filename.split(path.sep).join('/');
    const firstSegment = normalized.split('/')[0];
    if (EXCLUDED_DIRS.has(firstSegment)) return;
    pending.add(full);
    scheduleRun();
  });
}

if (require.main === module) {
  run();
}

module.exports = { run };