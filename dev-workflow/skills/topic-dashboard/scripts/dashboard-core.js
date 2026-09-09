#!/usr/bin/env node
// Topic Dashboard — deterministic generator core for the dev-workflow plugin.
//
// Scans the adopting repo's docs/ref/<MODULE>/<TOPIC>/ folders (the plugin's
// repo-agnostic topic-doc convention) and emits ONE self-contained HTML page
// listing every topic and its progress — a human-readable monitoring view of
// what topic-status reads per topic.
//
// Reads (per topic folder):
//   <PREFIX>.md        main doc  — Classification, Status, Last Updated, Open Questions
//   <PREFIX>_PLAN.md   plan doc  — Progress Tracker (Phase/Name/Steps/Status),
//                                  Deployment Status, Open Questions, Last Updated
//   <PREFIX>_TEST.md   test doc  — Test Results Dashboard (Status column), Last Updated
//   <PREFIX>_ORCH.md   orchestrator ledger — Gate Ledger rows, DECISIONS count
//
// Writes: <repoRoot>/.ai-tmp/topic-dashboard.html (see the shared
// temporary-artifacts rule — one home, git-ignored, regenerable on demand).
//
// Usage:  node dashboard-core.js [repoRoot] [--out <path>]
//         repoRoot defaults to process.cwd(). Exits 0 with a stdout summary;
//         exits non-zero when the docs/ref/ convention is not found.
//
// Never-invent rule: a section that exists but does not parse shows as
// "unparsed" in the page — malformed docs are surfaced, never guessed.
//
// Stack-agnostic and repo-agnostic: no repo-specific names or commands.

'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Markdown table/section helpers (mirrors hooks/lib/gate-helpers.js contracts
// so the dashboard reads the same tables the gates read).
// ---------------------------------------------------------------------------

// Find a markdown section bound by a heading: returns { start, end } where
// start = index of the first line matching headingRegex (or -1 if absent),
// end = next `## ` heading or `---` HR, or lines.length.
function findSectionRange(lines, headingRegex) {
  const start = lines.findIndex((l) => headingRegex.test(l));
  if (start === -1) return { start: -1, end: lines.length };
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) { end = i; break; }
    if (/^---\s*$/.test(lines[i])) { end = i; break; }
  }
  return { start, end };
}

// Parse all markdown table data rows in a line range.
// Returns { header, rows } where header is the first row's cells (without
// leading/trailing empties) and rows are arrays of trimmed cells. Empty when
// no table is present in the range.
function parseTables(lines) {
  const tables = [];
  let current = null;
  for (const line of lines) {
    if (!/^\s*\|/.test(line)) {
      if (current && current.rows.length) tables.push(current);
      current = null;
      continue;
    }
    if (/^\s*\|[\s:|-]+\|\s*$/.test(line)) continue; // separator row
    const cells = line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
    if (!current) current = { header: cells, rows: [] };
    else current.rows.push(cells);
  }
  if (current && current.rows.length) tables.push(current);
  return tables;
}

// Column index for a header cell name (case-insensitive), or -1.
function colIdx(header, name) {
  const want = name.toLowerCase();
  return header.findIndex((c) => c.toLowerCase().replace(/\*/g, '').trim() === want);
}

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---------------------------------------------------------------------------
// Doc parsers — every field tolerant; missing section = null, malformed = "unparsed"
// ---------------------------------------------------------------------------

// The `> **Key:** value` header block every topic doc carries.
function parseHeaderBlock(lines) {
  const out = {};
  for (const line of lines.slice(0, 30)) {
    const m = /^>\s*\*\*([^*]+):\*\*\s*(.*)$/.exec(line);
    if (m) out[m[1].trim().toLowerCase()] = m[2].trim();
  }
  return out;
}

// Count OQ table rows: {open, resolved} — Status cell says "Open" or contains ✅/Resolved.
// Heading is numbered in the main doc ("## 7. Open Questions"), plain in plan/test docs.
function countOQs(lines) {
  const { start, end } = findSectionRange(lines, /^#+\s*(?:\d+\.?\s+)?Open Questions\s*$/i);
  if (start === -1) return null;
  const tables = parseTables(lines.slice(start + 1, end));
  const t = tables.find((t) => colIdx(t.header, 'question') !== -1 || colIdx(t.header, 'status') !== -1);
  if (!t) return null;
  const sIdx = colIdx(t.header, 'status');
  let open = 0, resolved = 0, malformed = false;
  if (sIdx === -1) return { open: 0, resolved: 0, unparsed: true };
  for (const r of t.rows) {
    const s = (r[sIdx] || '').toLowerCase();
    if (!r[sIdx]) { malformed = true; continue; }
    if (s.includes('open')) open++;
    else if (s.includes('resolved') || s.includes('✅')) resolved++;
    else malformed = true;
  }
  return { open, resolved, unparsed: t.rows.length > 0 && malformed && open + resolved === 0 };
}

function parseMainDoc(p) {
  const lines = fs.readFileSync(p, 'utf8').split('\n').map((l) => l.replace(/\r$/, ''));
  const head = parseHeaderBlock(lines);
  return {
    classification: head['classification'] || '',
    status: head['status'] || '',
    lastUpdated: head['last updated'] || '',
    oq: countOQs(lines),
  };
}

// Progress Tracker -> {phases:[{phase,name,steps,stepsDone,stepsTotal,status}], unparsed}
function parseTracker(lines) {
  const { start, end } = findSectionRange(lines, /^##\s+Progress Tracker\s*$/i);
  if (start === -1) return null;
  const tables = parseTables(lines.slice(start + 1, end));
  const t = tables.find((t) => colIdx(t.header, 'phase') !== -1);
  if (!t) return { unparsed: true };
  const nameI = colIdx(t.header, 'name');
  const stepsI = colIdx(t.header, 'steps');
  const statusI = colIdx(t.header, 'status');
  if (statusI === -1) return { unparsed: true };
  const phases = [];
  for (const r of t.rows) {
    const phase = parseInt((r[colIdx(t.header, 'phase')] || '').replace(/[^0-9].*$/, ''), 10);
    if (Number.isNaN(phase)) continue;
    const steps = (stepsI !== -1 ? r[stepsI] : '') || '';
    const m = /^(\d+)\s*\/\s*(\d+)$/.exec(steps.trim());
    phases.push({
      phase,
      name: nameI !== -1 ? (r[nameI] || '') : '',
      stepsDone: m ? Number(m[1]) : null,
      stepsTotal: m ? Number(m[2]) : null,
      status: r[statusI] || '',
    });
  }
  if (!phases.length) return { unparsed: true };
  return { phases, unparsed: false };
}

// Deployment Status table -> rows [{env, status}] (only rows with an env name).
function parseDeploy(lines) {
  const { start, end } = findSectionRange(lines, /^#+\s*Deployment Status\s*$/i);
  if (start === -1) return null;
  const tables = parseTables(lines.slice(start + 1, end));
  const t = tables.find((t) => colIdx(t.header, 'environment') !== -1 || colIdx(t.header, 'status') !== -1);
  if (!t) return { unparsed: true };
  const envI = colIdx(t.header, 'environment');
  const statusI = colIdx(t.header, 'status');
  if (envI === -1 || statusI === -1) return { unparsed: true };
  const rows = t.rows
    .filter((r) => (r[envI] || '').trim())
    .map((r) => ({ env: r[envI].trim(), status: (r[statusI] || '').trim() }));
  if (!rows.length) return { unparsed: true };
  return { rows };
}

function parsePlanDoc(p) {
  const lines = fs.readFileSync(p, 'utf8').split('\n').map((l) => l.replace(/\r$/, ''));
  const head = parseHeaderBlock(lines);
  const tracker = parseTracker(lines);
  const deploy = parseDeploy(lines);
  return {
    lastUpdated: head['last updated'] || '',
    tracker: tracker && tracker.phases ? {
      phases: tracker.phases,
      total: tracker.phases.length,
      done: tracker.phases.filter((ph) => ph.status.includes('✅')).length,
      active: tracker.phases.filter((ph) => ph.status.includes('🔄')).length,
      stepsDone: tracker.phases.reduce((a, ph) => a + (ph.stepsDone || 0), 0),
      stepsTotal: tracker.phases.reduce((a, ph) => a + (ph.stepsTotal || 0), 0),
    } : { unparsed: !!tracker },
    deploy,
    oq: countOQs(lines),
  };
}

// Test Results Dashboard -> {total, pass, fail, inProgress, notRun, unparsed}
function parseTestDoc(p) {
  const lines = fs.readFileSync(p, 'utf8').split('\n').map((l) => l.replace(/\r$/, ''));
  const head = parseHeaderBlock(lines);
  const { start, end } = findSectionRange(lines, /^##\s+Test Results Dashboard\s*$/i);
  if (start === -1) return { lastUpdated: head['last updated'] || '', dashboard: { unparsed: true } };
  const tables = parseTables(lines.slice(start + 1, end));
  const t = tables.find((t) => colIdx(t.header, 'case') !== -1 && colIdx(t.header, 'status') !== -1);
  if (!t) return { lastUpdated: head['last updated'] || '', dashboard: { unparsed: true } };
  const caseI = colIdx(t.header, 'case');
  const statusI = colIdx(t.header, 'status');
  const d = { total: 0, pass: 0, fail: 0, inProgress: 0, notRun: 0 };
  for (const r of t.rows) {
    if (!(r[caseI] || '').trim() || !r[statusI]) continue;
    const s = (r[statusI] || '').toLowerCase();
    if (!s) continue;
    d.total++;
    if (s.includes('✅') || s.includes('pass')) d.pass++;
    else if (s.includes('❌') || s.includes('fail')) d.fail++;
    else if (s.includes('🔄')) d.inProgress++;
    else d.notRun++;
  }
  return { lastUpdated: head['last updated'] || '', dashboard: d.total ? d : { unparsed: true } };
}

// Orchestrator ledger -> {gates:[{stage,verifier,approval,date}], complete, decisions}
function parseLedger(p) {
  const lines = fs.readFileSync(p, 'utf8').split('\n').map((l) => l.replace(/\r$/, ''));
  const { start, end } = findSectionRange(lines, /^##\s+Gate Ledger\s*$/i);
  if (start === -1) return { unparsed: true };
  const tables = parseTables(lines.slice(start + 1, end));
  const t = tables.find((t) => colIdx(t.header, 'stage') !== -1 && colIdx(t.header, 'human approval') !== -1);
  if (!t) return { unparsed: true };
  const stageI = colIdx(t.header, 'stage');
  const apprI = colIdx(t.header, 'human approval');
  const gates = [];
  for (const r of t.rows) {
    if (!(r[stageI] || '').trim()) continue;
    gates.push({ stage: r[stageI].trim(), approval: (r[apprI] || '').trim().toLowerCase() });
  }
  if (!gates.length) return { unparsed: true };
  const dStart = lines.findIndex((l) => /^##\s+DECISIONS/i.test(l));
  let decisions = 0;
  if (dStart !== -1) {
    for (let i = dStart + 1; i < lines.length; i++) {
      if (/^##\s/.test(lines[i])) break;
      if (/^-\s/.test(lines[i])) decisions++;
    }
  }
  return {
    gates,
    pending: gates.filter((g) => g.approval.includes('pending') || g.approval.includes('changes')).length,
    complete: gates.some((g) => /complete/.test(g.stage.toLowerCase())),
    decisions,
  };
}

// ---------------------------------------------------------------------------
// Topic-folder scan
// ---------------------------------------------------------------------------

function scanTopics(repoRoot) {
  const refRoot = path.join(repoRoot, 'docs', 'ref');
  const topics = [];
  for (const moduleDir of fs.readdirSync(refRoot, { withFileTypes: true })) {
    if (!moduleDir.isDirectory()) continue;
    const modulePath = path.join(refRoot, moduleDir.name);
    for (const topicDir of fs.readdirSync(modulePath, { withFileTypes: true })) {
      if (!topicDir.isDirectory()) continue;
      const topicPath = path.join(modulePath, topicDir.name);
      const files = fs.readdirSync(topicPath).filter((f) => f.toLowerCase().endsWith('.md'));
      // Classify md files by suffix; the remaining bare <PREFIX>.md is the main doc.
      const prefixes = new Set();
      const planF = [], testF = [], orchF = [];
      for (const f of files) {
        const base = f.replace(/\.md$/i, '');
        if (/_PLAN$/i.test(base)) { prefixes.add(base.replace(/_PLAN$/i, '')); planF.push(f); }
        else if (/_TEST$/i.test(base)) { prefixes.add(base.replace(/_TEST$/i, '')); testF.push(f); }
        else if (/_ORCH$/i.test(base)) { prefixes.add(base.replace(/_ORCH$/i, '')); orchF.push(f); }
      }
      const mainF = files.filter((f) => {
        const base = f.replace(/\.md$/i, '');
        return !/_PLAN$|_TEST$|_ORCH$/i.test(base) && (prefixes.has(base) || prefixes.size === 0);
      });
      if (!mainF.length) continue; // no main doc -> not a topic folder
      const prefix = mainF[0].replace(/\.md$/i, '');
      const pick = (arr) => (arr.length ? path.join(topicPath, arr[0]) : null);
      const t = {
        module: moduleDir.name, topic: topicDir.name, prefix,
        folder: path.relative(repoRoot, topicPath).split(path.sep).join('/'),
      };
      const mainP = pick(mainF), planP = pick(planF), testP = pick(testF), orchP = pick(orchF);
      t.main = { exists: !!mainP };
      t.plan = { exists: !!planP };
      t.test = { exists: !!testP };
      t.orch = { exists: !!orchP };
      try { if (mainP) Object.assign(t.main, parseMainDoc(mainP)); } catch (e) { t.main.error = String(e.message || e); }
      try { if (planP) Object.assign(t.plan, parsePlanDoc(planP)); } catch (e) { t.plan.error = String(e.message || e); }
      try { if (testP) Object.assign(t.test, parseTestDoc(testP)); } catch (e) { t.test.error = String(e.message || e); }
      try { if (orchP) Object.assign(t.orch, parseLedger(orchP)); } catch (e) { t.orch.error = String(e.message || e); }
      topics.push(t);
    }
  }
  topics.sort((a, b) => a.module.localeCompare(b.module) || a.topic.localeCompare(b.topic));
  return topics;
}

// ---------------------------------------------------------------------------
// HTML rendering
// ---------------------------------------------------------------------------

const badge = (cls, text) => `<span class="b ${cls}">${esc(text)}</span>`;

function progressCell(plan) {
  if (!plan.exists) return '<span class="dim">no plan doc</span>';
  if (plan.error) return badge('warn', 'unreadable');
  const tr = plan.tracker;
  if (!tr || tr.unparsed || !tr.phases) return badge('warn', 'tracker unparsed');
  const pct = tr.stepsTotal ? Math.round((100 * tr.stepsDone) / tr.stepsTotal) : 0;
  const next = tr.phases.find((ph) => ph.status.includes('🔄')) || tr.phases.find((ph) => ph.status.includes('☐'));
  const activeLabel = next ? `phase ${next.phase} (${next.name || 'unnamed'})` : '';
  return `<div class="bar" title="${esc(tr.done + '/' + tr.total + ' phases, steps ' + tr.stepsDone + '/' + tr.stepsTotal)}">` +
    `<div class="fill" style="width:${pct}%"></div></div>` +
    `<div class="sub">${esc(tr.done + '/' + tr.total)} phases · steps ${esc(tr.stepsDone + '/' + tr.stepsTotal)} · ${esc(tr.active ? '🔄 ' + activeLabel : next ? '☐ next: ' + activeLabel : '✅ done')}</div>`;
}

function testCell(test) {
  if (!test.exists) return '<span class="dim">no test doc</span>';
  if (test.error) return badge('warn', 'unreadable');
  const d = test.dashboard;
  if (!d || d.unparsed) return badge('warn', 'dashboard unparsed');
  if (d.fail) return badge('fail', `❌ ${d.pass + d.fail === d.total ? d.fail + ' failing' : d.fail + '/' + d.total + ' failing'}`);
  if (d.inProgress) return badge('run', `🔄 running (${d.pass}/${d.total} pass)`);
  if (d.pass === d.total && d.total > 0) return badge('ok', `✅ ${d.pass}/${d.total}`);
  return `<span class="dim">☐ ${d.notRun}/${d.total} not run</span>`;
}

function deployCell(plan) {
  if (!plan.exists) return '<span class="dim">—</span>';
  const d = plan.deploy;
  if (!d || d.unparsed || !d.rows) return badge('warn', 'unparsed');
  const progressed = d.rows.filter((r) => r.status && !r.status.includes('☐'));
  if (!progressed.length) return '<span class="dim">☐ not started</span>';
  const last = progressed[progressed.length - 1];
  return badge('ok', `${last.env}: ${last.status.replace(/[☐🔄✅❌]\s*/g, '').trim() || 'progressed'}`);
}

function orchCell(orch) {
  if (!orch.exists) return '<span class="dim">not orchestrated</span>';
  if (orch.error) return badge('warn', 'unreadable');
  const o = orch;
  if (o.unparsed || !o.gates) return badge('warn', 'ledger unparsed');
  const stages = o.gates.map((g) => g.stage);
  const lastGate = stages[stages.length - 1];
  if (o.complete) return badge('ok', `✅ complete (${stages.length} gates)`);
  if (o.pending) return badge('fail', `⏸ ${o.pending} ${o.pending === 1 ? 'gate' : 'gates'} awaiting human`);
  return `${badge('run', `stage: ${esc(lastGate)}`)}<div class="sub">${esc(stages.length)} gates · ${esc(o.decisions)} decisions</div>`;
}

function oqCell(main, plan) {
  const parts = [];
  for (const [label, doc] of [['main', main], ['plan', plan]]) {
    if (!doc.exists || doc.error || !doc.oq) continue;
    if (doc.oq.unparsed) { parts.push(`${label}: unparsed`); continue; }
    if (doc.oq.open) parts.push(`${label}: ${doc.oq.open} open`);
  }
  if (!parts.length) return badge('ok', 'none open');
  return badge('fail', esc(parts.join(' · ')));
}

function lastUpdatedCell(topic) {
  const dates = [topic.main.lastUpdated, topic.plan.lastUpdated, topic.test.lastUpdated]
    .filter(Boolean).sort().reverse();
  return dates.length ? esc(dates[0]) : '<span class="dim">—</span>';
}

function docsCell(topic) {
  const chip = (ok, title) => ok
    ? `<span class="doc on" title="${title} exists">●</span>`
    : `<span class="doc off" title="${title} missing">○</span>`;
  return chip(topic.main.exists, 'Main doc') + chip(topic.plan.exists, 'Plan doc') +
    chip(topic.test.exists, 'Test doc') + chip(topic.orch.exists, 'Orchestrator ledger');
}

function renderHtml(repoRoot, topics) {
  const rows = topics.map((t) => `<tr>
  <td class="mono">${esc(t.module)}</td>
  <td class="mono">${esc(t.topic)}<div class="sub mono">${esc(t.folder)}</div></td>
  <td>${esc((t.main.classification || '—').replace(/<!--.*-->/g, '').trim() || '—')}</td>
  <td class="docs">${docsCell(t)}</td>
  <td>${progressCell(t.plan)}</td>
  <td>${testCell(t.test)}</td>
  <td>${deployCell(t.plan)}</td>
  <td>${oqCell(t.main, t.plan)}</td>
  <td>${orchCell(t.orch)}</td>
  <td class="mono">${lastUpdatedCell(t)}</td>
</tr>`).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Topic Dashboard</title>
<style>
  :root { color-scheme: light dark;
    --bg:#f6f6f4; --card:#fff; --ink:#1c1c1a; --sub:#6b6b66; --line:#e3e3de;
    --ok:#1a7f37; --fail:#b42318; --run:#8a6100; --warn:#8a6100; --accent:#2563eb; }
  @media (prefers-color-scheme: dark) { :root {
    --bg:#17171a; --card:#1f1f23; --ink:#e6e6e2; --sub:#9a9a94; --line:#33333a;
    --ok:#3fb950; --fail:#f85149; --run:#d29922; --warn:#d29922; --accent:#4493f8; } }
  * { box-sizing: border-box; }
  body { margin:0; padding:24px; background:var(--bg); color:var(--ink);
    font:14px/1.45 -apple-system, "Segoe UI", system-ui, sans-serif; }
  h1 { font-size:18px; margin:0 0 4px; }
  .meta { color:var(--sub); font-size:12px; margin-bottom:16px; }
  .scroll { overflow-x:auto; background:var(--card); border:1px solid var(--line);
    border-radius:10px; }
  table { border-collapse:collapse; width:100%; min-width:1100px; }
  th, td { text-align:left; padding:10px 12px; border-bottom:1px solid var(--line);
    vertical-align:top; }
  th { font-size:11px; text-transform:uppercase; letter-spacing:.04em;
    color:var(--sub); position:sticky; top:0; background:var(--card); }
  tr:last-child td { border-bottom:none; }
  td.mono, .mono { font-family:ui-monospace, Consolas, monospace; font-size:12.5px; }
  .sub { color:var(--sub); font-size:11px; margin-top:2px; }
  .dim { color:var(--sub); }
  .b { display:inline-block; padding:1px 8px; border-radius:99px;
    font-size:12px; white-space:nowrap; }
  .ok { background:color-mix(in srgb, var(--ok) 14%, transparent); color:var(--ok); }
  .fail { background:color-mix(in srgb, var(--fail) 12%, transparent); color:var(--fail); }
  .run { background:color-mix(in srgb, var(--run) 14%, transparent); color:var(--run); }
  .warn { background:color-mix(in srgb, var(--warn) 14%, transparent); color:var(--warn); }
  .bar { height:6px; width:160px; border-radius:4px; background:var(--line);
    overflow:hidden; margin-top:4px; }
  .fill { height:100%; background:var(--accent); }
  .docs .doc { font-size:13px; margin-right:3px; }
  .doc.on { color:var(--accent); }
  .doc.off { color:var(--line); }
</style>
</head>
<body>
<h1>Topic Dashboard</h1>
<div class="meta">${esc(topics.length)} topic${topics.length === 1 ? '' : 's'} · repo: ${esc(repoRoot)} · generated ${esc(new Date().toISOString().replace('T', ' ').slice(0, 16))} (UTC) · regenerate: rerun the topic-dashboard skill</div>
<div class="scroll"><table>
<thead><tr>
  <th>Module</th><th>Topic</th><th>Classification</th><th>Docs M·P·T·L</th>
  <th>Progress</th><th>Tests</th><th>Deploy</th><th>Open Questions</th>
  <th>Orchestration</th><th>Last Updated</th>
</tr></thead>
<tbody>
${rows}
</tbody>
</table></div>
<p class="meta">Docs: ● main · ● plan · ● test · ● ledger (M·P·T·L). Progress = plan doc's Progress Tracker (phases + Steps count). Tests = Test Results Dashboard. Orchestration = orchestrator ledger Gate Ledger. "unparsed" = the section exists but does not match the expected table format — fix the doc, then regenerate.</p>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  let repoRoot = process.cwd();
  let out = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--out') out = args[++i];
    else if (!args[i].startsWith('--')) repoRoot = path.resolve(args[i]);
  }
  const refRoot = path.join(repoRoot, 'docs', 'ref');
  if (!fs.existsSync(refRoot)) {
    console.error(`No docs/ref/ convention found at ${repoRoot} — nothing to scan.`);
    process.exit(1);
  }
  const topics = scanTopics(repoRoot);
  const outPath = path.resolve(out || path.join(repoRoot, '.ai-tmp', 'topic-dashboard.html'));
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, renderHtml(repoRoot, topics), 'utf8');

  const orchestrated = topics.filter((t) => t.orch.exists).length;
  const withOpenOQ = topics.filter((t) =>
    (t.main.oq && t.main.oq.open) || (t.plan.oq && t.plan.oq.open)).length;
  console.log(`Topic dashboard: ${topics.length} topic(s) (${orchestrated} orchestrated, ${withOpenOQ} with open questions)`);
  console.log(`Written: ${outPath}`);
}

main();