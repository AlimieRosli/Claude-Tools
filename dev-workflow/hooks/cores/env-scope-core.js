// Shared Environment-Scope check logic. Enforces the topic-test rule:
// "Tests run on exactly two environments — Local and Staging only."
//
// Two checks on a *_TEST.md file:
//   1. The "## Test Environment" section must contain BOTH "### Local" and
//      "### Staging" subsections.
//   2. No "How to run" command or env reference may target a disallowed
//      environment — Production/PRD, Development, or any environment other
//      than Local and Staging.
//
// Used by the plugin hook surfaces (PostToolUse adapter, shim watcher / on-save
// check). Standard gate contract: the check function returns null when OK, or a
// multi-line problem summary string.
//
// Opt-out: a *_TEST.md that is not a runnable Local/Staging test suite (e.g. an
// investigation/known-issues doc) may carry a single exemption marker anywhere in
// the file to skip this gate entirely:
//   <!-- env-scope: exempt — <reason this doc has no runnable Local/Staging tests> -->
// A reason is required — an empty marker is itself flagged as a problem.
const fs = require('fs');
const { relPath, findSectionRange, checkExemption } = require('../lib/gate-helpers');

// Environments allowed for test execution. Case-insensitive matching.
const ALLOWED_ENVS = ['local', 'staging', 'stg'];

// Indicators of DISALLOWED environments in URLs / host references. We deliberately
// avoid matching "stg" (allowed) and match the production / development labels
// instead. We do NOT hardcode the actual PRD/staging domain names — those are kept
// out of the source for security. The hook relies on explicit env labels (prd,
// production, dev, development) and the placeholder convention used in the template.
const DISALLOWED_PATTERNS = [
  /prd/i,                            // explicit prd label
  /production/i,                     // explicit production label
  /\bdev\b/i,                        // development env label
  /development/i,                    // development env label
];

// Parse the Test Environment section: returns { hasLocal, hasStaging }.
function checkEnvSubsections(testPath) {
  if (!fs.existsSync(testPath)) return null;
  const lines = fs.readFileSync(testPath, 'utf8').split('\n').map((l) => l.replace(/\r$/, ''));

  const { start: envStart, end: envEnd } = findSectionRange(
    lines, /^##\s+Test Environment\s*$/i, { stopAtHr: false }
  );
  if (envStart === -1) return { hasLocal: false, hasStaging: false };

  let hasLocal = false, hasStaging = false;
  for (let i = envStart + 1; i < envEnd; i++) {
    if (/^###\s+Local\s*$/i.test(lines[i])) hasLocal = true;
    if (/^###\s+Staging\s*$/i.test(lines[i])) hasStaging = true;
  }
  return { hasLocal, hasStaging };
}

// Scan "How to Run" blocks and curl/URL references for disallowed environments.
// Returns an array of { line, text, pattern } violations, empty if none.
function checkDisallowedEnvs(testPath) {
  if (!fs.existsSync(testPath)) return [];
  const lines = fs.readFileSync(testPath, 'utf8').split('\n').map((l) => l.replace(/\r$/, ''));
  const violations = [];

  lines.forEach((line, i) => {
    // Only scan lines that look like commands or URLs (code blocks / curl).
    // Pattern-based, not subsection-aware: relies on the placeholder convention
    // and DISALLOWED_PATTERNS matching only prd/production/dev/development labels.
    const trimmed = line.trim();
    if (!trimmed) return;
    if (!/^(curl|redis-cli|mongosh|http|https|wss|ws|node|npm|npx|docker|kubectl)\b/i.test(trimmed)
      && !/^["']?(https?|wss?):\/\//.test(trimmed)) return;

    for (const pat of DISALLOWED_PATTERNS) {
      if (pat.test(line)) {
        violations.push({ line: i + 1, text: trimmed.slice(0, 120), pattern: pat.source });
        break;
      }
    }
  });
  return violations;
}

// Main check. Returns null when the gate passes (or does not apply), or a
// multi-line problem summary string when it fails.
function checkEnvScope(testPath) {
  if (!fs.existsSync(testPath)) return null;

  const exemption = checkExemption(testPath, 'env-scope');
  if (exemption) {
    if (!exemption.reason) {
      return [
        `  ✖ Environment scope: exemption marker is missing a reason.`,
        `      Test doc: ${relPath(testPath)}`,
        `      Use: <!-- env-scope: exempt — <reason this doc has no runnable Local/Staging tests> -->`,
      ].join('\n');
    }
    return null; // explicitly exempt — gate does not apply to this doc
  }

  const problems = [];

  const env = checkEnvSubsections(testPath);
  if (env && (!env.hasLocal || !env.hasStaging)) {
    const missing = [];
    if (!env.hasLocal) missing.push('### Local');
    if (!env.hasStaging) missing.push('### Staging');
    problems.push(
      `  ✖ Environment scope: Test Environment section is missing subsection(s): ${missing.join(', ')}.`,
      `      Test doc: ${relPath(testPath)}`,
      `      Both Local and Staging subsections are required — they document the different URLs, data access, and connection details for each environment.`
    );
  }

  const disallowed = checkDisallowedEnvs(testPath);
  if (disallowed.length > 0) {
    problems.push(
      `  ✖ Environment scope: ${disallowed.length} command(s) reference a disallowed environment (Production/PRD/Development).`,
      `      Test doc: ${relPath(testPath)}`,
      `      Tests may run on Local and Staging only — no other environment.`
    );
    disallowed.slice(0, 5).forEach((v) => {
      problems.push(`        - line ${v.line}: \`${v.text}\``);
    });
    if (disallowed.length > 5) {
      problems.push(`        - ...and ${disallowed.length - 5} more`);
    }
  }

  if (problems.length === 0) return null;
  return problems.join('\n');
}

// Gate metadata — consumed by sync-readme-core.js to auto-generate the README's
// Hook Index table + exemption-support list. Add this to every new gate core.
const meta = {
  name: 'env-scope',
  kind: 'gate',
  firesOn: '`*_TEST.md`',
  enforces: 'Test docs only reference Local/Staging environments — no PRD/production/dev',
  exemption: true,
  files: ['docs/ref/*/**/*_TEST.md'],
};

module.exports = {
  meta,
  checkEnvSubsections,
  checkDisallowedEnvs,
  checkEnvScope,
};