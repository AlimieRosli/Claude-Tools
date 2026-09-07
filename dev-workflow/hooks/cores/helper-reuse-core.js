// Helper-Reuse detection gate. Enforces the maintainability rule:
// "Gate cores must reuse the shared helpers in lib/gate-helpers.js instead of
// re-implementing them."
//
// This is a meta-gate: it scans the SOURCE of other `*-core.js` files for
// idioms that signal a helper was re-implemented locally rather than imported
// from lib/gate-helpers.js (relPath, findSectionRange, parseActiveImplPhases,
// siblingDocPath, checkExemption). When a gate author hand-rolls one of these,
// this gate flags it so the author imports the shared helper instead.
//
// Why a source-scan instead of a runtime check: the duplicated helpers are
// gone once a core imports from lib/gate-helpers.js, so we detect the
// *re-implementation idiom* in the text — the same signal whether the file
// loads or not. This also catches leftovers the refactor may have missed.
//
// Runs at registry load time via validate() (registry.js) — not a per-file
// edit gate. A non-empty validate() result means the hook system itself is
// misconfigured, and the adapters fail loudly rather than silently disabling
// a gate.
const fs = require('fs');
const path = require('path');
const { relPath } = require('../lib/gate-helpers');

// Files that legitimately define or own these helpers — never flagged.
const SELF = path.basename(__filename);            // helper-reuse-core.js
const HELPERS_LIB = 'gate-helpers.js';              // lib/gate-helpers.js (the shared lib itself)

// Idioms that signal a shared helper was re-implemented instead of imported.
// Each pattern is tested against the core's source text. Keep this list in sync
// with the helpers exported by lib/gate-helpers.js — when you add a helper that
// is tempting to re-implement, add its re-implementation signature here.
const REIMPLEMENTATIONS = [
  {
    id: 'exemption-pattern',
    pattern: /(?:const|let|var)\s+EXEMPTION_PATTERN\s*=/,
    helper: 'checkExemption(filePath, gateName)',
    fix: 'require(\'./lib/gate-helpers\') and use checkExemption() instead of a local EXEMPTION_PATTERN regex.',
  },
  {
    id: 'per-gate-exemption-wrapper',
    pattern: /function\s+(?:checkNegExemption|checkOpenQuestionsExemption|checkEnvExemption|checkSecretExemption)\s*\(/,
    helper: 'checkExemption(filePath, gateName)',
    fix: 'require(\'./lib/gate-helpers\') and use checkExemption() instead of a per-gate exemption wrapper function.',
  },
  {
    id: 'parse-active-impl-phases',
    pattern: /function\s+parseActiveImplPhases\s*\(/,
    helper: 'parseActiveImplPhases(planPath)',
    fix: 'require(\'./lib/gate-helpers\') and use parseActiveImplPhases() instead of redefining it.',
  },
  {
    id: 'sibling-doc-path',
    pattern: /function\s+sibling\w*[Pp]ath\s*\(/,
    helper: 'siblingDocPath(docPath, fromSuffix, toSuffix)',
    fix: 'require(\'./lib/gate-helpers\') and use siblingDocPath() instead of a local sibling*DocPath/siblingPath function.',
  },
  {
    id: 'rel-path-idiom',
    pattern: /path\.relative\(\s*path\.resolve\(\s*__dirname/,
    helper: 'relPath(p)',
    fix: 'require(\'./lib/gate-helpers\') and use relPath() instead of the path.relative(path.resolve(__dirname, ...)) idiom.',
  },
];

// Determine whether a `*-core.js` file is a gate (vs a non-gate core like a
// sync/transform core). Non-gates are skipped — this rule only applies to gates.
// Uses meta.kind === 'gate' when the module loads; falls back to a source scan
// for `kind: 'gate'` if the module fails to require (so a syntax-broken core
// is still classified, not silently skipped).
function isGateCore(corePath, source) {
  try {
    const mod = require(corePath);
    delete require.cache[require.resolve(corePath)];
    return !!(mod && mod.meta && mod.meta.kind === 'gate');
  } catch {
    // Module won't load — classify from source text instead.
    return /kind:\s*['"]gate['"]/.test(source);
  }
}

// Main check. Returns null when the gate passes (or does not apply), or a
// multi-line problem summary string when it fails.
function checkHelperReuse(corePath) {
  const base = path.basename(corePath);

  // Never flag the shared lib itself, or this detection gate.
  if (base === HELPERS_LIB || base === SELF) return null;
  if (!base.endsWith('-core.js')) return null; // only gate cores
  if (!fs.existsSync(corePath)) return null;

  const source = fs.readFileSync(corePath, 'utf8');

  // Only gate cores are subject to this rule — skip non-gate cores.
  if (!isGateCore(corePath, source)) return null;

  const hits = [];
  for (const sig of REIMPLEMENTATIONS) {
    if (sig.pattern.test(source)) hits.push(sig);
  }
  if (hits.length === 0) return null; // all clear — reuses the shared helpers

  const problems = [
    `  ✖ Helper reuse: ${hits.length} shared helper(s) re-implemented locally instead of imported from lib/gate-helpers.js.`,
    `      Gate core: ${relPath(corePath)}`,
    `      lib/gate-helpers.js provides these helpers so every gate stays consistent and bug fixes land in one place.`,
  ];
  hits.forEach((h) => {
    problems.push(`        - ${h.id}: re-implements ${h.helper}`);
    problems.push(`          ${h.fix}`);
  });
  problems.push(`      → Replace the local re-implementation with the shared helper import.`);
  return problems.join('\n');
}

// Gate metadata (kind: 'gate' so this core is itself subject to the reuse rule
// minus itself; it is wired into the registry's validate(), not the gates list).
const meta = {
  name: 'helper-reuse',
  kind: 'gate',
  firesOn: 'Registry load time (validate) — scans every `cores/*-core.js` source',
  enforces: 'Gate cores reuse `lib/gate-helpers.js` (relPath, findSectionRange, parseActiveImplPhases, siblingDocPath, checkExemption) instead of re-implementing them',
  exemption: false,
};

module.exports = {
  meta,
  REIMPLEMENTATIONS,
  checkHelperReuse,
};