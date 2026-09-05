// TOC-sync gate — ported verbatim from the ServerJP repo-local
// .claude/hooks/cores/toc-sync-core.js. The core is fully generic (it is keyed
// to the topic-doc convention `docs/ref/<MODULE>/<TOPIC>/`, which is the plugin's
// own repo-agnostic convention), so this file is identical to the repo copy.
//
// Follows the standard gate contract: checkTocSync() returns null when the doc is
// in sync (or has no TOC to check), or a multi-line problem summary string when not.
const fs = require('fs');
const { findSectionRange } = require('../lib/gate-helpers');

function slugify(heading) {
  return heading.toLowerCase().replace(/[^\w\s-]/g, '').replace(/ /g, '-');
}

// GitHub de-dupes repeated heading anchors by appending -1, -2, ... in document order.
function dedupeSlug(baseSlug, seenCounts) {
  const count = seenCounts.get(baseSlug) || 0;
  seenCounts.set(baseSlug, count + 1);
  return count === 0 ? baseSlug : `${baseSlug}-${count}`;
}

// Returns null when the file has no TOC (nothing to check) or the TOC is in sync,
// otherwise a multi-line problem summary string.
function checkTocSync(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');

  const { start: tocStart, end: tocEnd } = findSectionRange(lines, /^##\s+Table of Contents\s*$/i);
  if (tocStart === -1) return null; // no TOC — nothing to check

  const tocLines = lines.slice(tocStart + 1, tocEnd);

  // allHeadings (any level) verifies TOC links resolve to something real — a TOC may
  // voluntarily link to H4+ subsections. requiredHeadings (##/### only, excluding the
  // TOC heading itself) is what the doc convention requires every TOC to list.
  const allHeadings = [];
  const requiredHeadings = [];
  const seenSlugCounts = new Map();
  lines.forEach((line, i) => {
    if (i > tocStart && i < tocEnd) return; // skip the TOC's own bullet list body
    const m = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (!m) return;
    const heading = { text: m[2], slug: dedupeSlug(slugify(m[2]), seenSlugCounts) };
    allHeadings.push(heading);
    if ((m[1].length === 2 || m[1].length === 3) && m[2].toLowerCase() !== 'table of contents') {
      requiredHeadings.push(heading);
    }
  });

  const tocAnchors = [];
  tocLines.forEach((line) => {
    const m = /\]\(#([a-z0-9_-]+)\)/i.exec(line);
    if (m) tocAnchors.push(m[1]);
  });

  const tocSlugSet = new Set(tocAnchors);
  const allHeadingSlugs = new Set(allHeadings.map((h) => h.slug));

  const missingFromToc = requiredHeadings.filter((h) => !tocSlugSet.has(h.slug)).map((h) => h.text);
  const brokenTocLinks = tocAnchors.filter((a) => !allHeadingSlugs.has(a));

  if (!missingFromToc.length && !brokenTocLinks.length) return null; // in sync

  const out = [];
  if (missingFromToc.length) {
    out.push(`  ✖ ${missingFromToc.length} heading(s) missing from TOC:`);
    missingFromToc.forEach((h) => out.push(`      - ${h}`));
  }
  if (brokenTocLinks.length) {
    out.push(`  ✖ ${brokenTocLinks.length} TOC link(s) with no matching heading:`);
    brokenTocLinks.forEach((a) => out.push(`      - ${a}`));
  }
  return out.join('\n');
}

// Deterministic auto-fix for the TOC gate. Regenerates the `## Table of Contents`
// block from the doc's `##`/`###` headings (excluding the TOC heading itself),
// reusing slugify/dedupeSlug so the generated anchors match what checkTocSync
// expects. Idempotent: running it twice produces no further change. Writes only
// inside the TOC section — everything outside it is preserved byte-for-byte.
//
// Returns { changed, problem? } where `changed` is true when the file was
// rewritten, and `problem` is the checkTocSync() summary of the pre-fix state
// (or null when there was no TOC to fix).
function fixTocSync(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  const { start: tocStart, end: tocEnd } = findSectionRange(lines, /^##\s+Table of Contents\s*$/i);
  if (tocStart === -1) return { changed: false, problem: null }; // no TOC — nothing to fix

  const problem = checkTocSync(filePath);

  // Collect ## and ### headings (excluding the TOC heading itself), in document
  // order, with GitHub-style deduped slugs. Track the level so H3 entries can be
  // indented under their parent H2.
  const headings = [];
  const seenSlugCounts = new Map();
  lines.forEach((line, i) => {
    if (i > tocStart && i < tocEnd) return; // skip the TOC's own bullet list body
    const m = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
    if (!m) return;
    const text = m[2];
    if (text.toLowerCase() === 'table of contents') return;
    headings.push({ text, slug: dedupeSlug(slugify(text), seenSlugCounts), level: m[1].length });
  });

  // Build the new TOC bullet list. Indent H3 entries under their parent H2.
  const bullets = [];
  for (const h of headings) {
    if (h.level === 2) {
      bullets.push(`- [${h.text}](#${h.slug})`);
    } else {
      bullets.push(`  - [${h.text}](#${h.slug})`);
    }
  }

  const newTocBlock = ['## Table of Contents', '', ...bullets, ''];
  const newLines = [...lines.slice(0, tocStart), ...newTocBlock, ...lines.slice(tocEnd)];
  const newContent = newLines.join('\n');

  if (newContent === content) return { changed: false, problem };

  fs.writeFileSync(filePath, newContent);
  return { changed: true, problem };
}

// Gate metadata — the single source of truth for this gate's identity and scope.
// `files` is the topic-doc convention glob (repo-agnostic): any doc under
// docs/ref/<MODULE>/<TOPIC>/ that declares a Table of Contents.
const meta = {
  name: 'toc-sync',
  kind: 'gate',
  firesOn: 'Any `.md` with a `## Table of Contents` section',
  enforces: 'Every `##`/`###` heading is listed in the TOC; every TOC link resolves to a real heading',
  exemption: false,
  // Project-relative forward-slash globs — which changed files apply to this gate.
  // Nested under a module folder (preserves the legacy skip of top-level docs/ref/*.md).
  files: ['docs/ref/*/**/*.md'],
};

module.exports = { meta, checkTocSync, fixTocSync };