---
name: todo-board
scope: plugin-maintenance
description: "SCOPE: plugin-maintenance — this plugin source repo only; edits `monitor/todo.html` (the TODO board) and `dev-workflow/` source, never an adopting repo, never an adopting repo's topic docs. Single entry point for all plugin maintenance work: logs findings as TODO items on the board, picks items up and performs the plugin change / fix / upgrade, moves finished items to the Completed Log, parks/unparks, and reports board status. Any request to add, change, fix, or extend the plugin starts here. USE FOR: adding a TODO item, working an item (plugin changes, fixes, upgrades), closing items, progress checks. INVOKE WITH: /dev-workflow:todo-board [verb] [T-XX]"
argument-hint: "[add|work|done|park|unpark|status] [T-XX] <details>"
---

# TODO Board

## Overview

The plugin's TODO tracking lives in **`monitor/todo.html`** — a static HTML board in the repo root. One item = one `<article class="item">` with an ID; statuses flow `OPEN → WIP → DONE` (or park as `KIV`).

This skill is the only writer of the board and the single entry point for plugin-maintenance work: every request to add work, change, fix, or upgrade the plugin starts here.

**The board is a repo file, not a plugin file:** edit `monitor/todo.html` in the session's working directory (the repo root) — never the installed plugin copy under `%USERPROFILE%\.claude\plugins\`.

## Mandatory read

BEFORE any step: Read `monitor/todo.html` end to end. Note the next free ID, the current counts (hero tiles, flow bar, rail counts), and the Open items. Do not execute any step from memory alone.

## Step 1 — Classify the request

| Request | Verb |
|---------|------|
| A finding / idea / bug to track later | `add` |
| A plugin change with no item yet | `add` (log it), then `work` it |
| "Do this item" / work an existing item | `work <ID>` |
| Work finished outside this flow | `done <ID> <resolution>` |
| Park / unpark an item | `park <ID>` / `unpark <ID>` |
| "Where are we", progress check | `status` (also the default with no verb) |

## Step 2 — Execute the verb

### `status` (default)

Read the board and report: Open items (HIGH priority first as next-up), WIP items, parked items, the most recent Completed entries, and the suggested next item. No edits.

### `add <finding>`

- Assign the next free ID (from the board's "next free ID" note; grep the board to confirm it is actually unused).
- Insert one new card at the **top of `#openGrid`** (put HIGH-priority items above existing MEDIUM ones):

```html
<article class="item open-item rv in" id="t-XX">
  <div class="item-top"><span class="iid">T-XX</span><h3><title></h3></div>
  <div class="badges"><span class="chip st-open"><span class="d"></span>OPEN</span><span class="chip pr-high|pr-med|pr-low"><span class="d"></span>HIGH|MEDIUM|LOW</span></div>
  <p><b>Problem / observation:</b> ...</p>
  <p><b>Goal:</b> ...</p>
  <div class="done-when"><span class="dw-tag">Done when</span>...<span</div>
</article>
```

- Default priority: MEDIUM. HIGH only when the finding destroys data or blocks all work.
- Keep `rv in` on the card class so it renders even if the reveal observer did not re-run.

### `work <ID>`

1. Find the card in `#openGrid`; flip it to WIP — chip `st-open` → `st-wip` (text `WIP`), item class `open-item` → `wip-item`.
2. Do the actual work: the item's Problem/Goal defines it. Follow the plugin-maintenance boundaries ([Shared: Context Mode](${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/context-mode.md)) — edit `dev-workflow/` source and the board only; never create `docs/ref/` topic docs here; never route maintenance through the orchestrator or topic skills.
3. If the item adds a new workflow node (skill, rule, hook), follow the New-node registration duties in `workflow-self-correct` Step 1 — update every related doc to reference it, keep node counts/names generic.
4. On completion, move the card to the **top of `#doneGrid`** as a completed entry:

```html
<article class="item done-item rv in" id="t-XX">
  <div class="item-top"><span class="iid">T-XX</span><h3><title></h3></div>
  <div class="badges"><span class="chip st-done"><span class="d"></span>DONE</span><span class="datechip">📅 <YYYY-MM-DD></span></div>
  <p><b>Objective:</b> <one line on what the item was about></p>
  <div class="kv-res"><span class="dw-tag">Resolved</span><how it was resolved — concrete paths, where the detail lives></div>
</article>
```

- Use today's real date, never `—`, for newly closed items.
- Capture the resolution with concrete paths — a bare "done." only when nothing more is known.
5. Remind: the change lands in consumer sessions only after push + `/dev-workflow:self-update` + a fresh chat session.

### `done <ID> <resolution>`

Move to the Completed Log without doing work (finished externally) — same card structure as `work` step 4.

### `park <ID>` / `unpark <ID>`

Move the card between the KIV grid and `#openGrid`; swap chip `st-open` ↔ `st-kiv` (text `OPEN` ↔ `KIV`) and item class `open-item` ↔ `kiv-item`. KIV entries keep an Objective line plus a parked/revisit note.

## Step 3 — Sync the board (every edit, no exceptions)

The board's counts are hand-maintained. After any add/move/close, bump **all** of:

1. The 5 hero stat tiles (OPEN / WIP / KIV / DONE / HIGH).
2. The flow bar: each segment's width (that status's share of total items, rounded to whole %, sum ≈ 100%) and the legend counts.
3. The rail counts: Overview (total), Open items, KIV, Completed log.
4. The "next free ID" note (flow bar head) and the intake section's "Next free" line.
5. Dates: the topbar "last updated" badge and the footer "synced" line — today, `YYYY-MM-DD`.
6. Filter chips on Open items (All / HIGH / MEDIUM) — whenever open-item priorities changed.
7. Prose counts in section subtitles (e.g. "Six items in flight") — rewrite to match.

## Constraints

- One item = one `<article>` with one ID; IDs are never reused, numbers only move forward.
- The board is the single TODO source — never recreate a markdown TODO tracker.
- Never run `git commit` / `git push` — the human owns git.
- Never touch an adopting repo's project code or topic docs (plugin-maintenance scope).
- Plugin changes reach consumers only after push + `/dev-workflow:self-update` + a fresh session — always remind.