// Shared helpers for the plugin-shipped hook gate cores (dev-workflow/hooks/cores/).
// Pure functions only — no stdin/stdout, no side effects beyond reading files.
//
// Ported from the ServerJP repo-local .claude/hooks/lib/gate-helpers.js with one
// change: the project root is no longer a __dirname-derived constant (that would
// point at the plugin's cache install dir) — it resolves dynamically via
// lib/project.js. Function signatures and contracts are unchanged, so gate cores
// port over without modification.
//
// Reuse these instead of re-implementing. (The repo copy additionally runs a
// helper-reuse check over cores at registry load time; that check migrates with
// the remaining gates.)
const fs = require('fs');
const path = require('path');
const { getProjectRoot, setProjectRoot } = require('./project');

// Project-root-relative, forward-slash path for human-readable messages and
// meta.files matching. Resolves against the CURRENT project (see project.js).
function relPath(p) {
  return path.relative(getProjectRoot(), p).split(path.sep).join('/');
}

// Find a markdown section bound by a heading: returns { start, end } where
//   start = index of the first line matching headingRegex (or -1 if absent)
//   end   = index of the next `## ` heading, or (when stopAtHr) a `---` HR,
//           or lines.length if neither follows.
// Callers iterate `lines.slice(start + 1, end)`.
function findSectionRange(lines, headingRegex, { stopAtHr = true } = {}) {
  const start = lines.findIndex((l) => headingRegex.test(l));
  if (start === -1) return { start: -1, end: lines.length };
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) { end = i; break; }
    if (stopAtHr && /^---\s*$/.test(lines[i])) { end = i; break; }
  }
  return { start, end };
}

// Parse the Progress Tracker table in a plan doc -> active Phase 1+ rows
// (status contains ✅ or 🔄). Phase 0 (Prerequisites) is exempt. Returns []
// when the tracker is absent or no Phase 1+ row is active.
//
// Column-layout tolerant: older trackers are `| Phase | Name | Status |` and the
// template now ships `| Phase | Name | Steps | Status |`. The Status column is
// located via the header row (first row whose cell 1 is "Phase"): it is the
// "Status" header cell's index, falling back to the header row's last cell.
function parseActiveImplPhases(planPath) {
  if (!fs.existsSync(planPath)) return [];
  const lines = fs.readFileSync(planPath, 'utf8').split('\n').map((l) => l.replace(/\r$/, ''));
  const { start, end } = findSectionRange(lines, /^##\s+Progress Tracker\s*$/i);
  if (start === -1) return [];
  const active = [];
  let statusIdx = 3; // default for the legacy 3-column layout (| Phase | Name | Status |)
  let headerSeen = false;
  for (let i = start; i < end; i++) {
    const line = lines[i];
    if (!/^\|/.test(line)) continue;
    const cells = line.split('|').map((c) => c.trim());
    if (cells.length < 4) continue;
    if (!headerSeen) {
      // Header row: cell 1 === "Phase". Locate the Status column by header text.
      if (cells[1].toLowerCase() === 'phase') {
        const idx = cells.findIndex((c, j) => j >= 2 && c.toLowerCase() === 'status');
        if (idx !== -1) statusIdx = idx;
        headerSeen = true;
        continue;
      }
      // Not a header row (e.g. a stray table before the header) — keep scanning.
      continue;
    }
    const phase = parseInt(cells[1], 10);
    if (Number.isNaN(phase)) continue;      // not a data row
    if (phase === 0) continue;              // Phase 0 = Prerequisites, exempt
    const status = cells[statusIdx] || '';
    if (/✅|🔄/.test(status)) {
      active.push({ phase, name: cells[2] || '', status });
    }
  }
  return active;
}

// Resolve a sibling doc path by suffix swap in the same folder, e.g.
//   siblingDocPath(planPath, '_PLAN', '_TEST') -> <base>_TEST.md
// Returns null when docPath's basename doesn't end in fromSuffix + '.md'.
function siblingDocPath(docPath, fromSuffix, toSuffix) {
  const base = path.basename(docPath);
  const re = new RegExp(fromSuffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\.md$', 'i');
  if (!re.test(base)) return null;
  return path.join(path.dirname(docPath), base.replace(re, toSuffix + '.md'));
}

// Look for the `<!-- <gateName>: exempt — <reason> -->` marker anywhere in a file.
// Returns null when absent (or the file doesn't exist), otherwise { reason }
// (reason may be '' when the marker is present but the reason is empty). The
// caller checks `if (exemption && !exemption.reason)` to flag the empty-reason
// case.
function checkExemption(filePath, gateName) {
  if (!fs.existsSync(filePath)) return null;
  return checkExemptionInContent(fs.readFileSync(filePath, 'utf8'), gateName);
}

// Look for the `<!-- <gateName>: exempt — <reason> -->` marker in an in-memory
// content string (e.g. a PreToolUse tool_input that has not been written to disk
// yet). Same contract as checkExemption: null when absent, else { reason }.
function checkExemptionInContent(content, gateName) {
  if (!content) return null;
  const pattern = new RegExp(
    `<!--\\s*${gateName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\s*exempt\\s*(?:[—-]\\s*(.*?))?-->`,
    'i'
  );
  const match = content.match(pattern);
  if (!match) return null;
  return { reason: (match[1] || '').trim() };
}

// Extract "Current Code" file paths from a plan doc's phase blocks.
// Matches lines like:  - File: `server/helpers/cache.js`
// Returns an array of file path strings (empty if none found).
function extractPlanCurrentCodeFiles(planPath) {
  if (!fs.existsSync(planPath)) return [];
  const lines = fs.readFileSync(planPath, 'utf8').split('\n').map((l) => l.replace(/\r$/, ''));
  const files = [];
  for (const line of lines) {
    const m = /^\s*-\s*File:\s*`([^`]+)`/i.exec(line);
    if (m) files.push(m[1]);
  }
  return files;
}

// Find all plan docs under <project>/docs/ref/ that (a) have an active Phase 1+
// row AND (b) reference `codePath` in a "Current Code" section. Returns an array
// of absolute plan doc paths (empty if none). Used by the neg-flow gate so it
// can fire on code-file edits, not just *_PLAN.md edits.
function findActivePlansReferencingFile(codePath) {
  const rel = relPath(codePath); // already forward-slash, project-relative
  const plans = [];
  const refRoot = path.join(getProjectRoot(), 'docs', 'ref');
  if (!fs.existsSync(refRoot)) return plans;
  (function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('_PLAN.md')) {
        if (parseActiveImplPhases(full).length === 0) continue; // no active Phase 1+ — not relevant
        const files = extractPlanCurrentCodeFiles(full);
        if (files.some((f) => f.split(path.sep).join('/') === rel)) plans.push(full);
      }
    }
  })(refRoot);
  return plans;
}

module.exports = {
  getProjectRoot,
  setProjectRoot,
  relPath,
  findSectionRange,
  parseActiveImplPhases,
  siblingDocPath,
  checkExemption,
  checkExemptionInContent,
  extractPlanCurrentCodeFiles,
  findActivePlansReferencingFile,
};