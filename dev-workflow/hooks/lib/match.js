// Dependency-free glob matcher for the hook registry's `meta.files` matcher.
// Decides whether a project-relative forward-slash path applies to a gate.
//
// Supported glob syntax (matched against the project-relative forward-slash path):
//   *  — matches within a single path segment (no `/`)
//   ** — matches zero-or-more path segments (may cross `/`)
//   ?  — matches a single character (not `/`)
//   !  — negation: a leading `!` pattern EXCLUDES a path (last match wins)
// Everything else is matched literally.
const path = require('path');
const { relPath } = require('./gate-helpers');

// Convert a glob pattern to a RegExp. `**` is handled first so it isn't consumed
// by the single-segment `*`. Anchored to the full path.
function globToRegExp(pattern) {
  let re = '';
  let i = 0;
  while (i < pattern.length) {
    const c = pattern[i];
    if (c === '*') {
      if (pattern[i + 1] === '*') {
        // `**` — zero-or-more segments. If followed by `/`, allow it to match
        // zero segments too (so `docs/ref/*/**/*.md` matches `docs/ref/a/b.md`).
        if (pattern[i + 2] === '/') {
          re += '(?:[^/]+/)*';
          i += 3;
        } else {
          re += '.*';
          i += 2;
        }
      } else {
        re += '[^/]*';
        i += 1;
      }
    } else if (c === '?') {
      re += '[^/]';
      i += 1;
    } else {
      re += c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      i += 1;
    }
  }
  return new RegExp(`^${re}$`);
}

// Normalize a path to project-relative forward-slash form (reuses relPath from
// gate-helpers.js). Accepts absolute or project-relative paths.
function normalize(p) {
  return relPath(path.resolve(p)).split(path.sep).join('/');
}

// Returns true when `relPathStr` (project-relative forward-slash) matches any of
// the glob `patterns`. Empty patterns array => false (gate does not apply).
// A leading `!` pattern negates: the LAST matching pattern wins, so a `!` pattern
// after a positive one excludes the path (e.g. ['**/*', '!.claude/hooks/**']).
function matchesFiles(relPathStr, patterns) {
  if (!relPathStr || !Array.isArray(patterns) || patterns.length === 0) return false;
  const normalized = relPathStr.split(path.sep).join('/');
  let matched = false;
  for (const p of patterns) {
    const negate = p.startsWith('!');
    const pattern = negate ? p.slice(1) : p;
    if (globToRegExp(pattern).test(normalized)) {
      matched = !negate;
    }
  }
  return matched;
}

module.exports = { matchesFiles, globToRegExp, normalize };