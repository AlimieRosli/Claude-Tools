// Shared Regression-Gate check logic. Enforces the topic-test rule:
// "Regression (REG-) is conditionally required — required when the plan doc
// touches any shared code path."
//
// On a *_TEST.md edit, reads the sibling *_PLAN.md's phase "Current Code"
// file paths. If any path is under a shared directory, the test doc MUST
// contain at least one `### REG-###` heading. If no shared path is touched,
// the gate does not apply (REG remains optional).
//
// Per-repo shared dirs: WHICH directories count as "shared code paths" is
// REPO-SPECIFIC data, read from the adopting repo's .claude/hooks.config.json
// `sharedDirs` via lib/project-config.js (the plugin must not hardcode one
// repo's layout). A repo with no `sharedDirs` (or none matching) gets a no-op
// gate — REG stays optional there.
//
// Used by the plugin hook surfaces (PostToolUse adapter, shim watcher / on-save
// check). Standard gate contract: returns null when OK (or not applicable), or
// a multi-line problem summary string.
const fs = require('fs');
const { relPath, siblingDocPath, extractPlanCurrentCodeFiles, getProjectRoot } = require('../lib/gate-helpers');
const { loadConfig } = require('../lib/project-config');

// Convert the repo's `sharedDirs` strings (e.g. "server/utils/", "config/")
// into anchored case-insensitive RegExp patterns tested against the
// project-relative forward-slash file path. A dir without a trailing slash is
// normalized to one so "server/utils" matches only under that directory, not
// any path merely containing the fragment.
function sharedDirPatterns(sharedDirs) {
  return (Array.isArray(sharedDirs) ? sharedDirs : [])
    .filter((d) => typeof d === 'string' && d.trim() !== '')
    .map((d) => {
      const normalized = d.split('\\').join('/').replace(/\/+$/, '') + '/';
      return new RegExp('^' + normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    });
}

// Check whether any file path is under a shared directory, given the patterns.
function hasSharedPath(files, patterns) {
  return files.some((f) => patterns.some((pat) => pat.test(f)));
}

// Check whether the test doc has any `### REG-###` heading.
function hasRegressionCases(testPath) {
  if (!fs.existsSync(testPath)) return false;
  const lines = fs.readFileSync(testPath, 'utf8').split('\n').map((l) => l.replace(/\r$/, ''));
  return lines.some((l) => /^###\s+REG-\d+/i.test(l));
}

// Main check. Returns null when the gate passes (or does not apply), or a
// multi-line problem summary string when it fails.
function checkRegressionGate(testPath) {
  if (!fs.existsSync(testPath)) return null;

  const config = loadConfig(getProjectRoot());
  const patterns = sharedDirPatterns(config ? config.sharedDirs : []);
  if (patterns.length === 0) return null; // repo declares no shared dirs — REG is optional

  const planPath = siblingDocPath(testPath, '_TEST', '_PLAN');
  if (!planPath || !fs.existsSync(planPath)) return null; // no sibling plan

  const files = extractPlanCurrentCodeFiles(planPath);
  if (files.length === 0) return null; // no Current Code paths found — can't determine

  const sharedFiles = files.filter((f) => patterns.some((pat) => pat.test(f)));

  if (sharedFiles.length === 0) return null; // no shared paths — REG is optional

  if (hasRegressionCases(testPath)) return null; // shared paths touched, REG cases exist — passes

  return [
    `  ✖ Regression gate: the plan doc touches shared code paths but the test doc has no REG-### cases.`,
    `      Test doc:        ${relPath(testPath)}`,
    `      Plan doc:        ${relPath(planPath)}`,
    `      Shared path(s) touched:`,
    ...sharedFiles.map((f) => `        - ${f}`),
    `      → Regression (REG-###) cases are required when the plan touches a shared code path (repo sharedDirs: ${(config.sharedDirs || []).join(', ')}). Add REG cases (topic-test skill) verifying existing endpoints/behavior are unchanged.`,
  ].join('\n');
}

// Gate metadata — the `files` matcher is doc-convention based (the topic-doc
// layout is the plugin-wide standard); only the shared-dir DATA is per-repo.
const meta = {
  name: 'regression-gate',
  kind: 'gate',
  firesOn: '`*_TEST.md`',
  enforces: 'If the sibling plan doc touches shared code paths (repo `sharedDirs`), the test doc has at least one `REG-###` case',
  exemption: false,
  files: ['docs/ref/*/**/*_TEST.md'],
};

module.exports = {
  meta,
  sharedDirPatterns,
  hasSharedPath,
  hasRegressionCases,
  checkRegressionGate,
};