// Shared reporter for the plugin-shipped hook adapters. Writes a machine-readable
// report to `<project>/.claude/hooks/reports/latest.json` (gitignored in adopting
// repos) and console-prints the human notification using the `[gate] relpath`
// header + problem lines so the VS Code task problemMatcher
// (`^\[(.+?)\] (.*): (.*)$`) stays aligned.
//
// The report path resolves against the CURRENT project (lib/project.js) — not
// the plugin's install dir, which is version-replaced on every update.
//
// Every adapter (Claude Code PostToolUse, on-save, watcher) writes the same
// structured result via this module — no per-surface reporting logic.
const fs = require('fs');
const path = require('path');
const { relPath, getProjectRoot } = require('./gate-helpers');

// Report lives under the project's hooks folder (gitignored), not the plugin dir.
// Functions, not constants — the project root is only known after setProjectRoot
// (shim path) or on first getProjectRoot() call.
function reportsDir() {
  return path.join(getProjectRoot(), '.claude', 'hooks', 'reports');
}
function latestPath() {
  return path.join(reportsDir(), 'latest.json');
}

const YELLOW = '\x1b[33m', RED = '\x1b[31m', RESET = '\x1b[0m',
      BOLD = '\x1b[1m', DIM = '\x1b[2m',
      CYAN = '\x1b[36m', MAGENTA = '\x1b[35m',
      BRIGHT_RED = '\x1b[91m', WHITE = '\x1b[97m';

// Normalize a result entry: { gate, file, status, problem? }.
// `file` is stored project-relative forward-slash; `problem` is the multi-line
// summary from the core's check (or null on pass).
function normalizeResult(gateName, filePath, problem) {
  return {
    gate: gateName,
    file: relPath(filePath),
    status: problem ? 'fail' : 'pass',
    problem: problem || null,
  };
}

// Derive a single-line, colon-free summary from a gate's multi-line problem
// string (its first non-empty line, with the leading `✖` icon and any colons
// stripped). Colons are removed on purpose: the VS Code problemMatcher is
// `^\[(.+?)\] (.*): (.*)$` — a `:` inside the message would be swallowed into
// the file group, so the problem would never surface in the Problems panel.
function summaryLine(problem) {
  const first = (String(problem).split('\n')[0] || '').trim().replace(/^✖\s*/, '').trim();
  const clean = first.replace(/:\s+/g, ' — ').replace(/:$/, '').trim();
  return clean || 'failed';
}

// Print one issue as a scannable two-part block:
//   `[gate] file: <summary>`   ← one line, matches the VS Code problemMatcher
//   `<indented detail>`        ← the rest of the gate's problem string
// Shared by writeReport (native PostToolUse) and the watcher so the two
// surfaces print identically.
function printIssue(r) {
  console.log(`${BOLD}${BRIGHT_RED}[${r.gate}]${RESET} ${CYAN}${r.file}${RESET}: ${BOLD}${WHITE}${summaryLine(r.problem)}${RESET}`);
  const detail = String(r.problem).split('\n').slice(1).join('\n');
  if (detail.trim()) {
    console.log(`${DIM}${detail.replace(/line (\d+)/g, `${MAGENTA}line $1${RESET}${DIM}`)}${RESET}`);
  }
}

// Write the report file and print the human notification. Returns the report
// object. `results` is an array of normalized result entries.
//
// Only issues (failures) are persisted to latest.json — passes carry no signal
// and would bloat the file as gates multiply. A `summary` keeps total/fail
// counts visible so "all green" stays distinguishable from "nothing scanned".
//
// `opts.print` (default true) controls the console notification. The watcher
// passes `print: false` and runs its own trigger-aware, new-issues-only print
// loop; it still calls this for the JSON write.
function writeReport(adapterName, results, opts = {}) {
  const issues = results.filter((r) => r.status === 'fail');
  const report = {
    generatedAt: new Date().toISOString(),
    adapter: adapterName,
    summary: { total: results.length, failed: issues.length },
    results: issues,
  };

  // Machine-readable report (gitignored in adopting repos).
  fs.mkdirSync(reportsDir(), { recursive: true });
  fs.writeFileSync(latestPath(), JSON.stringify(report, null, 2));

  // Human notification — one scannable `[gate] file: summary` line per issue
  // (matches the VS Code problemMatcher) plus the indented detail. The watcher
  // opts out and does its own printing.
  if (opts.print !== false) {
    for (const r of issues) printIssue(r);
  }

  return report;
}

module.exports = { writeReport, normalizeResult, summaryLine, printIssue, reportsDir, latestPath };