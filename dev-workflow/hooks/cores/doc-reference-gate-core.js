// Shared Doc-Reference-Gate check logic. Enforces BOTH directions of the
// topic-doc cross-linking rules:
//
// 1. "Only link docs within this topic folder, and only if they actually exist"
//    (dangling-link direction). The topic-init/plan/test templates previously
//    pre-populated placeholder links to sibling docs (e.g. `<TOPIC_UPPER>_PLAN.md`,
//    `<TOPIC_UPPER>_TEST.md`) that did not exist yet, and the AI copied them
//    verbatim — producing dangling links to docs that were never created.
//
// 2. "Cross-link to the plan and test docs in the References section only if
//    they already exist" (missing-link direction). Once a sibling topic doc
//    exists it MUST be linked from its siblings' References sections — main
//    doc → plan/test, plan doc → main/test, test doc → main/plan. Found in the
//    wild 2026-09-08: a topic whose plan/test docs existed while the main doc's
//    References section still held only the placeholder comment — the
//    dangling-link check passed vacuously because the main doc had no links.
//
// Standard gate contract: returns null when OK (or not applicable), or a
// multi-line problem summary string when it fails. No `fix` — removing a
// dangling link or adding a missing one requires judgment (the doc may
// legitimately need to be created via topic-plan/topic-test, or the link
// removed), so this is a pure check.
const fs = require('fs');
const path = require('path');
const { relPath } = require('../lib/gate-helpers');

// Collect every same-folder `.md` filename linked from `content`.
function linkedSameFolderMdNames(content) {
  const linked = new Set();
  // Match markdown links with a `.md` target: [text](./foo.md) or [text](foo.md).
  const linkRe = /\[[^\]]*\]\(([^)]*\.md)\)/g;
  let m;
  while ((m = linkRe.exec(content)) !== null) {
    const target = m[1].trim();
    // Skip non-same-folder targets: absolute URLs, anchors, repo-root paths,
    // and subfolder paths (the convention is same-folder links only).
    if (/^(?:https?:)?\/\//.test(target)) continue; // http(s):// or //host
    if (target.startsWith('#')) continue;           // in-doc anchor
    if (target.startsWith('/')) continue;           // repo-root absolute
    const clean = target.replace(/^\.\//, '');
    if (clean.includes('/')) continue;              // subfolder link — out of scope
    linked.add(path.basename(clean));
  }
  return linked;
}

// Derive the sibling topic docs this doc is expected to link, from its own
// filename: main `<PREFIX>.md` ↔ `<PREFIX>_PLAN.md` / `<PREFIX>_TEST.md`.
// Siblings that don't exist on disk are filtered out by the caller — docs are
// NOT required to pre-link plan/test docs that were never created
// (topic-plan/topic-test are optional per the classification).
function expectedSiblings(base) {
  // Strip the _PLAN/_TEST suffix (exact suffix only — a topic prefix may
  // legitimately contain other underscores).
  const prefix = base.replace(/_(?:PLAN|TEST)$/i, '');
  if (prefix === base) {
    return [`${prefix}_PLAN.md`, `${prefix}_TEST.md`]; // main doc → plan + test
  }
  const other = base.endsWith('_PLAN') ? `${prefix}_TEST.md` : `${prefix}_PLAN.md`;
  return [`${prefix}.md`, other]; // plan/test doc → main + the third sibling
}

// Scan a topic doc for cross-linking violations in both directions. Returns
// null when OK, otherwise a multi-line problem summary string.
function checkDocReferences(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const dir = path.dirname(filePath);
  const base = path.basename(filePath, '.md');

  const problems = [];

  // Direction 1 — dangling links (link → non-existent same-folder file).
  let m;
  const linkRe = /\[[^\]]*\]\(([^)]*\.md)\)/g;
  while ((m = linkRe.exec(content)) !== null) {
    const target = m[1].trim();
    if (/^(?:https?:)?\/\//.test(target)) continue;
    if (target.startsWith('#')) continue;
    if (target.startsWith('/')) continue;
    const clean = target.replace(/^\.\//, '');
    if (clean.includes('/')) continue;
    if (!fs.existsSync(path.join(dir, clean))) {
      problems.push(`link "${target}" → file not found`);
    }
  }

  // Direction 2 — sibling topic docs that exist but are never linked
  // (References gap — typically because the sibling was created after this doc
  // was last edited).
  const linked = linkedSameFolderMdNames(content);
  const unlinkedSiblings = expectedSiblings(base)
    .filter((sib) => sib !== `${base}.md`) // a doc is never its own sibling
    .filter((sib) => fs.existsSync(path.join(dir, sib)))
    .filter((sib) => !linked.has(sib));

  if (problems.length === 0 && unlinkedSiblings.length === 0) return null;

  const out = [];
  if (problems.length > 0) {
    out.push(
      `  ✖ Doc-reference gate: ${problems.length} link(s) point to a doc that does not exist in this folder.`,
      `      Doc: ${relPath(filePath)}`
    );
    problems.forEach((p) => out.push(`        - ${p}`));
    out.push(
      `      → Only link docs within this topic folder that actually exist. Do not pre-populate links to plan/test docs before they are created (run topic-plan / topic-test first, then add the link).`
    );
  }
  if (unlinkedSiblings.length > 0) {
    out.push(
      `  ✖ Doc-reference gate: ${unlinkedSiblings.length} sibling topic doc(s) exist in this folder but are not linked from this doc.`,
      `      Doc: ${relPath(filePath)}`,
      ...unlinkedSiblings.map((s) => `        - ${s} (exists, not linked)`),
      `      → Cross-link existing sibling topic docs (References section): main doc → plan/test, plan doc → main/test, test doc → main/plan. The sibling docs may have been created after this doc was last edited.`
    );
  }
  return out.join('\n');
}

// Gate metadata — consumed by sync-readme-core.js to auto-generate the README's
// Hook Index table + exemption-support list. Add this to every new gate core.
const meta = {
  name: 'doc-reference-gate',
  kind: 'gate',
  firesOn: 'Any topic doc (`docs/ref/*/**/*.md`)',
  enforces: 'Every relative `.md` link in a topic doc resolves to a file that actually exists in the same folder (no dangling links), AND every sibling topic doc that exists (main/plan/test) is linked from this doc — no orphaned References gaps',
  exemption: false, // unconditional — a dangling link or an unlinked existing sibling is always wrong
  // Repo-relative forward-slash globs — which changed files apply to this gate.
  files: ['docs/ref/*/**/*.md'],
};

module.exports = { meta, checkDocReferences };