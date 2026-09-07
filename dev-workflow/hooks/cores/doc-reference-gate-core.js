// Shared Doc-Reference-Gate check logic. Enforces the topic-doc writing rule:
// "Only link docs within this topic folder, and only if they actually exist."
//
// The topic-init/plan/test templates previously pre-populated placeholder links
// to sibling docs (e.g. `<TOPIC_UPPER>_PLAN.md`, `<TOPIC_UPPER>_TEST.md`) that
// did not exist yet, and the AI copied them verbatim — producing dangling links
// to docs that were never created. This gate makes that mechanically impossible:
// any relative `.md` link in a topic doc must resolve to a file that actually
// exists in the same folder, or the gate fails.
//
// Standard gate contract: returns null when OK (or not applicable), or a
// multi-line problem summary string when it fails. No `fix` — removing a
// dangling link requires judgment (the doc may legitimately need to be created
// via topic-plan/topic-test, or the link removed), so this is a pure check.
const fs = require('fs');
const path = require('path');
const { relPath } = require('../lib/gate-helpers');

// Scan a topic doc for relative `.md` links that point to a file that does not
// exist in the same folder. Returns null when every same-folder `.md` link
// resolves to an existing file (or there are none), otherwise a multi-line
// problem summary string.
function checkDocReferences(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const dir = path.dirname(filePath);

  const missing = [];
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
    const resolved = path.join(dir, clean);
    if (!fs.existsSync(resolved)) {
      missing.push({ target, resolved });
    }
  }

  if (missing.length === 0) return null; // all links resolve (or none)

  const out = [
    `  ✖ Doc-reference gate: ${missing.length} link(s) point to a doc that does not exist in this folder.`,
    `      Doc: ${relPath(filePath)}`,
  ];
  missing.forEach((x) => out.push(`        - ${x.target} → ${relPath(x.resolved)} (file not found)`));
  out.push(
    `      → Only link docs within this topic folder that actually exist. Do not pre-populate links to plan/test docs before they are created (run topic-plan / topic-test first, then add the link).`
  );
  return out.join('\n');
}

// Gate metadata — consumed by sync-readme-core.js to auto-generate the README's
// Hook Index table + exemption-support list. Add this to every new gate core.
const meta = {
  name: 'doc-reference-gate',
  kind: 'gate',
  firesOn: 'Any topic doc (`docs/ref/*/**/*.md`)',
  enforces: 'Every relative `.md` link in a topic doc resolves to a file that actually exists in the same folder — no dangling links to not-yet-created plan/test docs',
  exemption: false, // unconditional — a link to a non-existent doc is always wrong
  // Repo-relative forward-slash globs — which changed files apply to this gate.
  files: ['docs/ref/*/**/*.md'],
};

module.exports = { meta, checkDocReferences };
