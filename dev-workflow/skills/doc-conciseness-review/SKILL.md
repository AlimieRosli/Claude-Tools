---
description: "Second-pass conciseness reviewer for topic docs in the adopting repo. Tightens prose without dropping any fact, link, TODO, or number. USE FOR: running right after /topic-init, /topic-plan, or /topic-test. INVOKE WITH: /doc-conciseness-review <path-to-doc.md>"
argument-hint: "<path-to-doc.md>"
disable-model-invocation: true
---

# Doc Conciseness Review

## Table of Contents

1. [Overview](#overview)
2. [Step 1 — Load the Doc](#step-1--load-the-doc)
3. [Step 2 — Extract Every Fact](#step-2--extract-every-fact)
4. [Step 3 — Rewrite for Concision](#step-3--rewrite-for-concision)
5. [Step 4 — Verify Nothing Was Lost](#step-4--verify-nothing-was-lost)
6. [Step 5 — Report](#step-5--report)

---

## Overview

`/topic-init`, `/topic-plan`, and `/topic-test` write thorough docs, but thoroughness drifts into padding. This is the layer-2 pass: it tightens an already-written doc's prose without deleting any fact, path, link, number, or TODO marker. Run it manually right after any of the three topic skills.

*Adapt paths/commands to your repository's actual layout and tooling — this skill operates on any doc under the adopting repo's topic-doc tree (e.g. `docs/ref/<MODULE>/<TOPIC>/` if that convention is present).*

---

## Mandatory reads

This skill references no plugin rule/template files — it is self-contained. The one mandatory read is the target doc itself, bound below. Read it with the Read tool at the indicated point; inline references in the steps below are reminders, not substitutes. Do not execute any step from memory alone.

1. BEFORE any step: the target doc at `$ARGUMENTS` — the full file must be Read before Step 2 extracts facts from it. Never summarize or rewrite a doc you have not actually Read in this run.

---

## Step 1 — Load the Doc

Read the full file at `$ARGUMENTS` now (Mandatory reads #1). If the path doesn't exist, stop and report the error.

---

## Step 2 — Extract Every Fact

Before editing, note every checkable fact in the file: file paths, links/URLs, numbers/versions/dates, `<!-- TODO: confirm -->` markers, and every heading with its TOC entry. This list is what Step 4 checks against.

---

## Step 3 — Rewrite for Concision

Edit the doc in place:
- Merge sentences repeating the same point
- Delete filler ("As we can see...", "It's worth noting that...")
- Shorten multi-sentence intros to one sentence
- Prefer a table row over a paragraph where a table already exists

Never remove code blocks, tables, links, or TODO markers. Never add claims or numbers that weren't already there. In particular, never weaken citation discipline: every externally-sourced factual claim (pricing, quota, rate limit, SLA) keeps its source + URL + date-checked citation, and every `[UNVERIFIED — needs source]` marker survives the pass untouched.

---

## Step 4 — Verify Nothing Was Lost

Re-check every item from Step 2 is still present. Restore anything missing. Fix the Table of Contents if headings changed. If the adopting repo enforces deterministic doc gates (e.g. in its `.claude/hooks/` — check before relying on them), the TOC-sync rule above is what keeps those gates passing.

---

## Step 5 — Report

State which sections were shortened and roughly by how much. Flag anything you were unsure about cutting instead of silently deleting it.