// Shared Open-Questions-Gate check logic. Enforces the topic-plan rule:
// "All open questions must be resolved before proceeding to execution or
// test doc creation."
//
// Two checks:
//   1. On a *_PLAN.md edit where any Phase 1+ row is active (🔄/✅): the plan's
//      Open Questions table must have no row with Status "Open". Any "Open"
//      row blocks execution.
//   2. On a *_TEST.md edit (creation/update): the sibling *_PLAN.md's Open
//      Questions table must have no row with Status "Open". Any "Open" row
//      blocks test doc creation.
//
// Phase 0 (Prerequisites & Setup) is exempt — it is environment setup, not
// the fix/feature itself, and may run while questions are still open.
//
// Used by the plugin hook surfaces (PostToolUse adapter, shim watcher / on-save
// check). Standard gate contract: returns null when OK, or a multi-line problem
// summary string.
//
// Opt-out: a topic that genuinely has no open questions to track, or a
// completed topic the team has decided not to backfill, may skip this gate
// entirely. Add one marker anywhere in the plan doc or the test doc, with a
// stated reason:
//   <!-- open-questions-gate: exempt — <reason this topic has no open questions to track> -->
// A reason is required — an empty marker is itself flagged as a problem.
const fs = require('fs');
const { relPath, findSectionRange, parseActiveImplPhases, siblingDocPath, checkExemption } = require('../lib/gate-helpers');

// Parse the Open Questions table — returns { total, open: [{ num, question }] }.
// A row is "Open" when its Status cell (3rd column) contains "Open" and does
// NOT contain "✅ Resolved".
function parseOpenQuestions(docPath) {
  if (!fs.existsSync(docPath)) return null;
  const lines = fs.readFileSync(docPath, 'utf8').split('\n').map((l) => l.replace(/\r$/, ''));

  const { start: oqStart, end: oqEnd } = findSectionRange(lines, /^##\s+Open Questions\s*$/i);
  if (oqStart === -1) return { total: 0, open: [], missing: true };

  const open = [];
  let total = 0;
  for (let i = oqStart; i < oqEnd; i++) {
    const line = lines[i];
    if (!/^\|/.test(line)) continue;
    const cells = line.split('|').map((c) => c.trim());
    // cells: ['', num, question, status, ''] — need at least 4
    if (cells.length < 4) continue;
    const num = parseInt(cells[1], 10);
    if (Number.isNaN(num)) continue; // header row | # | Question | Status |
    total++;
    const status = cells[3] || '';
    // A row is "Open" if it contains "Open" and does NOT contain "✅ Resolved"
    if (/Open/i.test(status) && !/✅\s*Resolved/i.test(status)) {
      open.push({ num, question: cells[2] || '' });
    }
  }
  return { total, open, missing: false };
}

// Main check for a *_PLAN.md edit.
// Returns null when the gate passes (or does not apply), or a multi-line
// problem summary string when it fails.
function checkOpenQuestionsGatePlan(planPath) {
  const active = parseActiveImplPhases(planPath);
  if (active.length === 0) return null; // no Phase 1+ active — gate does not apply

  const exemption = checkExemption(planPath, 'open-questions-gate');
  if (exemption) {
    if (!exemption.reason) {
      return [
        `  ✖ Open-questions gate: exemption marker is missing a reason.`,
        `      Plan doc: ${relPath(planPath)}`,
        `      Use: <!-- open-questions-gate: exempt — <reason this topic has no open questions to track> -->`,
      ].join('\n');
    }
    return null; // explicitly exempt — gate does not apply to this topic
  }

  const oq = parseOpenQuestions(planPath);
  if (oq && oq.missing) {
    return [
      `  ✖ Open-questions gate: implementation phases are active but the plan doc has no ## Open Questions section.`,
      `      Plan doc:        ${relPath(planPath)}`,
      `      Active phase(s): ${active.map((a) => `Phase ${a.phase}`).join(', ')}`,
      `      → Add an Open Questions section (topic-plan skill) and resolve all questions before continuing execution.`,
    ].join('\n');
  }

  if (oq && oq.open.length > 0) {
    return [
      `  ✖ Open-questions gate: ${oq.open.length} open question(s) must be resolved before continuing execution.`,
      `      Plan doc:        ${relPath(planPath)}`,
      `      Active phase(s): ${active.map((a) => `Phase ${a.phase}`).join(', ')}`,
      `      Open questions:`,
      ...oq.open.map((q) => `        - #${q.num} — ${q.question}`),
      `      → Resolve each question (update Status to ✅ Resolved — <answer>) before continuing execution.`,
    ].join('\n');
  }

  return null; // gate passes
}

// Main check for a *_TEST.md edit — blocks test doc creation if the sibling
// plan has open questions.
// Returns null when the gate passes (or does not apply), or a multi-line
// problem summary string when it fails.
function checkOpenQuestionsGateTest(testPath) {
  const planPath = siblingDocPath(testPath, '_TEST', '_PLAN');
  if (!planPath || !fs.existsSync(planPath)) return null; // no sibling plan — nothing to check

  const exemption = checkExemption(testPath, 'open-questions-gate') || checkExemption(planPath, 'open-questions-gate');
  if (exemption) {
    if (!exemption.reason) {
      return [
        `  ✖ Open-questions gate: exemption marker is missing a reason.`,
        `      Test doc: ${relPath(testPath)}`,
        `      Use: <!-- open-questions-gate: exempt — <reason this topic has no open questions to track> -->`,
      ].join('\n');
    }
    return null; // explicitly exempt — gate does not apply to this topic
  }

  const oq = parseOpenQuestions(planPath);
  if (!oq || oq.missing) {
    return [
      `  ✖ Open-questions gate: test doc created/updated but the sibling plan doc has no ## Open Questions section.`,
      `      Test doc:        ${relPath(testPath)}`,
      `      Plan doc:        ${relPath(planPath)}`,
      `      → Add an Open Questions section to the plan doc (topic-plan skill) and resolve all questions before creating/updating the test doc.`,
    ].join('\n');
  }

  if (oq.open.length > 0) {
    return [
      `  ✖ Open-questions gate: ${oq.open.length} open question(s) in the plan doc must be resolved before creating/updating the test doc.`,
      `      Test doc:        ${relPath(testPath)}`,
      `      Plan doc:        ${relPath(planPath)}`,
      `      Open questions:`,
      ...oq.open.map((q) => `        - #${q.num} — ${q.question}`),
      `      → Resolve each question in the plan doc (update Status to ✅ Resolved — <answer>) before creating/updating the test doc.`,
    ].join('\n');
  }

  return null; // gate passes
}

// Gate metadata — consumed by sync-readme-core.js to auto-generate the README's
// Hook Index table + exemption-support list. Add this to every new gate core.
const meta = {
  name: 'open-questions-gate',
  kind: 'gate',
  firesOn: '`*_PLAN.md` (Phase 1+ active) or `*_TEST.md`',
  enforces: 'Sibling plan doc\'s Open Questions table has no row still marked "Open"',
  exemption: true,
  files: ['docs/ref/*/**/*_PLAN.md', 'docs/ref/*/**/*_TEST.md'],
};

module.exports = {
  meta,
  parseOpenQuestions,
  checkOpenQuestionsGatePlan,
  checkOpenQuestionsGateTest,
};