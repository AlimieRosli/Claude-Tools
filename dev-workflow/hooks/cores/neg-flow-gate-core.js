// Shared Negative-Flow-Gate check logic. Enforces the topic-test rule:
// "Negative Flow is required TWICE — once BEFORE and once AFTER the feature/fix
// is implemented."
//
// The gate fires when a plan doc's Progress Tracker marks any Phase 1+ row as
// active (🔄 In Progress / ✅ Complete). At that point the sibling test doc's
// NEG-### cases must each carry BOTH a `**Result (pre-fix):**` line (proof the
// negative flow was run before implementation began) AND a `**Result
// (post-fix):**` line (proof it was re-run after the fix to confirm correct
// rejection). A case with only one result line is incomplete.
//
// Phase 0 (Prerequisites & Setup) is exempt — it is environment setup, not the
// fix/feature itself.
//
// Used by the plugin hook surfaces (PostToolUse adapter, shim watcher / on-save
// check). Standard gate contract: returns null when OK, or a multi-line problem
// summary string.
//
// Per-repo code surface: which code files the code-file entry point pre-filters
// on is REPO-SPECIFIC data, read from the adopting repo's
// .claude/hooks.config.json `codeGlobs` via lib/project-config.js (the plugin
// must not hardcode one repo's layout). A repo with no `codeGlobs` gets the
// plan-doc check only — the code-file entry point no-ops.
//
// Opt-out: some topics genuinely have no negative-flow surface to test, or the
// topic is already complete and the team has decided not to backfill NEG- cases.
// Add this marker anywhere in the plan doc OR the test doc to skip the gate:
//   <!-- neg-flow-gate: exempt — <reason this topic has no negative-flow test cases> -->
// A reason is required — an empty marker is itself flagged as a problem.
const fs = require('fs');
const { relPath, parseActiveImplPhases, siblingDocPath, checkExemption, findActivePlansReferencingFile, getProjectRoot } = require('../lib/gate-helpers');
const { loadConfig } = require('../lib/project-config');
const { matchesFiles } = require('../lib/match');

// Parse NEG-### cases in a test doc and check each for BOTH required result
// lines. Returns null when the test doc does not exist, otherwise:
//   { total, complete, missingPre, missingPost, missingEither }
// A case "has a pre-fix result" when a `**Result (pre-fix):**` line bearing
// ✅ or ❌ appears between its `### NEG-###` heading and the next `###` or
// `---`. The post-fix result follows the same rule for `**Result (post-fix):**`.
//
// A result is only counted when the ✅/❌ appears OUTSIDE an HTML comment —
// a placeholder like `**Result (pre-fix):** <!-- ✅ PASS / ❌ FAIL + notes -->`
// is NOT a real result (the AI must actually run the case and record the
// outcome). We strip `<!-- ... -->` comment spans before scanning for the
// emoji so a commented-out placeholder never counts as a recorded result.
function checkNegResults(testPath) {
  if (!fs.existsSync(testPath)) return null;
  const lines = fs.readFileSync(testPath, 'utf8').split('\n').map((l) => l.replace(/\r$/, ''));

  const cases = [];
  lines.forEach((line, i) => {
    const m = /^###\s+(NEG-\d+)\s*—\s*(.*)$/.exec(line);
    if (m) cases.push({ id: m[1], title: m[2].trim(), line: i, hasPre: false, hasPost: false });
  });

  // Strip HTML comment spans (`<!-- ... -->`) from a line so emoji inside a
  // comment placeholder never counts as a recorded result.
  const stripComments = (line) => line.replace(/<!--[\s\S]*?-->/g, '');

  for (const c of cases) {
    for (let i = c.line + 1; i < lines.length; i++) {
      if (/^###\s/.test(lines[i]) || /^---\s*$/.test(lines[i])) break;
      const stripped = stripComments(lines[i]);
      if (/^\*\*Result\s*\(pre-fix\):\s*\*/.test(stripped) && /[✅❌]/.test(stripped)) c.hasPre = true;
      if (/^\*\*Result\s*\(post-fix\):\s*\*/.test(stripped) && /[✅❌]/.test(stripped)) c.hasPost = true;
    }
  }

  const complete = cases.filter((c) => c.hasPre && c.hasPost);
  const missingPre = cases.filter((c) => !c.hasPre);
  const missingPost = cases.filter((c) => c.hasPre && !c.hasPost);
  const missingEither = cases.filter((c) => !(c.hasPre && c.hasPost));

  return {
    total: cases.length,
    complete: complete.length,
    missingPre,
    missingPost,
    missingEither,
  };
}

// Per-plan check. Returns null when the gate passes (or does not apply), or a
// multi-line problem summary string when it fails. Shared by the *_PLAN.md
// entry point (checkNegFlowGate) and the code-file entry point
// (checkNegFlowGateForCodeFile) so the logic stays in one place.
function checkNegFlowGateForPlan(planPath) {
  const active = parseActiveImplPhases(planPath);
  if (active.length === 0) return null; // no Phase 1+ active — gate does not apply

  const testPath = siblingDocPath(planPath, '_PLAN', '_TEST');
  if (!testPath) return null; // not a plan doc — nothing to check

  const exemption = checkExemption(planPath, 'neg-flow-gate') || checkExemption(testPath, 'neg-flow-gate');
  if (exemption) {
    if (!exemption.reason) {
      return [
        `  ✖ Negative-flow gate: exemption marker is missing a reason.`,
        `      Plan doc: ${relPath(planPath)}`,
        `      Use: <!-- neg-flow-gate: exempt — <reason this topic has no negative-flow test cases> -->`,
      ].join('\n');
    }
    return null; // explicitly exempt — gate does not apply to this topic
  }

  const neg = checkNegResults(testPath);

  if (neg === null) {
    return [
      `  ✖ Negative-flow gate: implementation phases are active but the test doc is missing.`,
      `      Plan doc:        ${relPath(planPath)}`,
      `      Expected test doc: ${relPath(testPath)}`,
      `      Active phase(s): ${active.map((a) => `Phase ${a.phase} (${a.status.replace(/\s+/g, ' ').trim()})`).join(', ')}`,
      `      → Run the topic-test skill to create the test doc and execute NEG- cases BEFORE continuing implementation.`,
    ].join('\n');
  }

  if (neg.total === 0) {
    return [
      `  ✖ Negative-flow gate: implementation phases are active but no NEG-### cases exist in the test doc.`,
      `      Plan doc:        ${relPath(planPath)}`,
      `      Test doc:        ${relPath(testPath)}`,
      `      Active phase(s): ${active.map((a) => `Phase ${a.phase} (${a.status.replace(/\s+/g, ' ').trim()})`).join(', ')}`,
      `      → Add NEG-### cases (topic-test skill) and run them BEFORE continuing implementation.`,
    ].join('\n');
  }

  if (neg.missingEither.length > 0) {
    const parts = [];
    if (neg.missingPre.length > 0) {
      parts.push(`      Missing pre-fix result (${neg.missingPre.length}):`);
      neg.missingPre.forEach((c) => parts.push(`        - ${c.id} — ${c.title}`));
    }
    if (neg.missingPost.length > 0) {
      parts.push(`      Missing post-fix result (${neg.missingPost.length}):`);
      neg.missingPost.forEach((c) => parts.push(`        - ${c.id} — ${c.title}`));
    }
    return [
      `  ✖ Negative-flow gate: ${neg.missingEither.length}/${neg.total} NEG-### case(s) missing result line(s) — each needs BOTH **Result (pre-fix):** and **Result (post-fix):**.`,
      `      Plan doc:        ${relPath(planPath)}`,
      `      Test doc:        ${relPath(testPath)}`,
      `      Active phase(s): ${active.map((a) => `Phase ${a.phase} (${a.status.replace(/\s+/g, ' ').trim()})`).join(', ')}`,
      ...parts,
      `      → Run each NEG- case before the fix (record **Result (pre-fix):**) and again after the fix (record **Result (post-fix):**).`,
    ].join('\n');
  }

  return null; // gate passes — all NEG cases have results
}

// Main check — fires on a *_PLAN.md edit. Returns null when the gate passes
// (or does not apply), or a multi-line problem summary string when it fails.
function checkNegFlowGate(planPath) {
  return checkNegFlowGateForPlan(planPath);
}

// Code-file entry point — fires when a code file referenced by an active plan
// phase's "Current Code" section is edited. This closes the gap where the AI
// could implement code (editing the project's source files) without the NEG
// pre-fix results being recorded first. Returns null when no active plan
// references the file (or all pass), or a multi-line problem summary string
// when any fails.
//
// Pre-filter: the file must match the adopting repo's `codeGlobs`
// (.claude/hooks.config.json) before the plan-doc walk runs — codeGlobs are the
// repo's declaration of which files count as "code". A repo without codeGlobs
// gets no code-file gating (the plan-doc check still applies).
function checkNegFlowGateForCodeFile(codePath) {
  const config = loadConfig(getProjectRoot());
  const codeGlobs = config && Array.isArray(config.codeGlobs) ? config.codeGlobs : [];
  if (codeGlobs.length === 0) return null; // repo declares no code surface — code-file check does not apply
  if (!matchesFiles(relPath(codePath), codeGlobs)) return null; // not a code file in this repo's layout

  const plans = findActivePlansReferencingFile(codePath);
  if (plans.length === 0) return null; // no active plan references this code file — gate does not apply

  const problems = [];
  for (const planPath of plans) {
    const problem = checkNegFlowGateForPlan(planPath);
    if (problem) problems.push(problem);
  }
  if (problems.length === 0) return null;

  return [
    `  ✖ Negative-flow gate: code file ${relPath(codePath)} is referenced by an active implementation phase, but the sibling test doc's NEG-### cases are not complete.`,
    `      → The negative flow must be run BEFORE the fix is implemented. Record **Result (pre-fix):** for each NEG-### case in the test doc before editing this code file.`,
    ...problems,
  ].join('\n');
}

// Gate metadata. `files` is the registry's coarse matcher — plan docs plus any
// .js source; the per-repo `codeGlobs` pre-filter inside
// checkNegFlowGateForCodeFile narrows the code-file surface to the repo's own
// declaration. (meta.files cannot be per-repo: the registry contract is static.)
const meta = {
  name: 'neg-flow-gate',
  kind: 'gate',
  firesOn: '`*_PLAN.md` (Phase 1+ active) or a code file (repo `codeGlobs`) referenced by an active phase',
  enforces: 'Sibling `*_TEST.md` `NEG-###` cases have both pre-fix and post-fix results',
  exemption: true,
  files: ['docs/ref/*/**/*_PLAN.md', '**/*.js'],
};

module.exports = {
  meta,
  checkNegResults,
  checkNegFlowGate,
  checkNegFlowGateForPlan,
  checkNegFlowGateForCodeFile,
};