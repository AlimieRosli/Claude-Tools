# Shared: Code Comment Style

Comment rules for all code written during implementation — source files, test files, generated scripts. Applies to every line the AI writes, in every phase.

*Match the repo's existing comment idiom (language, casing, doc-comment format) in the file you are editing; the rules below apply on top of it in any language or stack.*

---

## 1. Comments explain the code, not the workflow

**Never leave implementation-tracking metadata in code.** No phase numbers, step numbers, plan-doc references, progress markers, or workflow bookkeeping:

```js
// WRONG — workflow metadata, not code knowledge
// Phase 2, step 3 of 5
// Implemented as part of T-XX plan
// Done when: endpoint returns 200
// Progress: step complete, next step pending
```

The plan doc owns *what to do and how far along it is* — the Progress Tracker and step checkboxes live there, never in the code. If a comment would be true only while the implementation is in progress, it does not belong in the code.

## 2. What a comment is for

A comment earns its place by saying something the code **cannot** say about itself:

- **Why** — intent, tradeoff, or constraint behind a choice ("retry capped at 3 — upstream rate-limits beyond that").
- **Gotcha / non-obvious behavior** — "must run before the session middleware is mounted".
- **Workaround reason** — "removed in v3; kept until <dependency> ships the fix".

Do not narrate what the code visibly does — `// increment counter` above `counter++` is noise, not documentation.

## 3. Keep it short

- Prefer **one line**; two only when genuinely needed. Plain, simple words.
- If a comment needs a paragraph to explain, the fix is not a longer comment — simplify the code, or put the explanation where long explanations live (the topic docs), and leave a one-line pointer at most.
- Never write long banners (`// ===== SECTION =====`) or multi-line restatements of a function's name.

## 4. No stale breadcrumbs

- No commented-out code — delete it; the VCS keeps history.
- No speculative `// TODO` placeholders for work the plan did not name — planned-but-undone work is an Open Question or plan step, not a code comment. A `TODO` left in code must correspond to a question or step the docs actually track.

## 5. Docstrings / API docs

Public-surface docstrings (e.g. JSDoc, docstrings) follow the repo's convention for whether and how they are written — when present, the same rules above apply to their body: say the why and the contract, keep it short, and never include workflow metadata.