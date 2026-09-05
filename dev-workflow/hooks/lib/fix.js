// Deterministic fix runner for the hook adapters. Runs a gate's `fix` function
// ONLY for mechanical gates (those that export `fix`) and ONLY when the caller
// enables fixes (`onSave === true` — the native PostToolUse path and the
// on-save/one-shot path pass true).
//
// Re-running must be safe: every `fix` is idempotent (running it twice produces
// no further change), so calling runFixes repeatedly is harmless.
const { normalizeResult } = require('./report');

// Run fixes for the failed gates in `results`. `results` is an array of
// { gate, file, status, problem } entries (from lib/report.js). `gates` is the
// registry's gate list (each { meta, check, fix? }). `onSave` gates whether any
// fix runs at all.
//
// Returns an array of updated result entries — a gate that was fixed and now
// passes is re-checked and its status flipped to 'pass' (problem cleared).
function runFixes(results, gates, { onSave }) {
  if (!onSave) return results;

  const updated = [];
  for (const r of results) {
    if (r.status !== 'fail') {
      updated.push(r);
      continue;
    }
    const gate = gates.find((g) => g.meta.name === r.gate);
    if (!gate || typeof gate.fix !== 'function') {
      updated.push(r); // non-mechanical gate — report only, no fix
      continue;
    }
    // Mechanical gate with a fix — run it, then re-check.
    try {
      gate.fix(r.file);
    } catch (e) {
      // A fix failure must not crash the adapter; keep the fail status.
      updated.push({ ...r, problem: `${r.problem}\n      (fix failed: ${e.message})` });
      continue;
    }
    const problem = gate.check(r.file);
    updated.push(normalizeResult(gate.meta.name, r.file, problem));
  }
  return updated;
}

module.exports = { runFixes };