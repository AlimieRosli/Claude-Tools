# Shared: Stack Content Layer

The plugin's always-loaded layer (templates, rules, skills, subagents) must stay stack-agnostic so a repo pays tokens only for the technology it actually uses. This rule is the **single source of truth** for how stack-specific content is stored, named, and loaded — no other plugin file defines the mechanism or names a `stack-*` file's convention.

---

## 1. Two layers

**Layer 1 — always-loaded core (category-shaped).** Templates, rules, skills, and docs speak in categories, never technologies:

| Category | Use for |
|---|---|
| *the cache* | key-value / caching stores |
| *the database* | persistent stores (document, relational, …) |
| *the API gateway* | the routing/prefix layer in front of the service |
| *the service* | the app under discussion |
| *the stack CLI* | command-line tools for the above |

Hard-coded product names, CLI binaries, vendor consoles, connection examples, or stack-specific file paths must not appear in the always-loaded layer — with canonical exceptions for the rules that **own** per-stack detail: `sensitive-file-scope.md` (its per-stack file table) and `error-handling.md` (its framework-idiom examples, which it applies "adapt to the framework" from).

**Layer 2 — on-demand stack files.** Per-technology detail lives in tiny reference files at `skills/_shared/stack/stack-<tech>.md` (lowercase tech name, one file per technology, e.g. the cache and database files seeded from the test-doc template). They carry what the core files no longer inline: CLI command syntax, verify/reset/seed snippets, staging console names, connection-string shapes.

## 2. The stack list (per-repo, human-owned)

Each adopting repo declares its stack in a **repo-owned file** (proposed by `workflow-adopt`'s adaptation table as `.claude/stack.yml`; the team owns and edits it directly). The managed boilerplate references the file — it never contains the list itself, so team edits survive adopt re-runs.

- Consumers: topic skills, hooks (via their config), and any future subagent — all read the same list.
- `topic-init` treats the list as an input: if codebase exploration finds a technology the list does not declare, propose adding it and get human approval — never edit it silently.

## 3. Load-on-demand contract

When a task touches a category (e.g. the cache must be inspected or reset):

1. Check the repo's stack list for the technology behind that category.
2. If listed and a matching `stack-<tech>.md` exists — read it **once per session** and use its commands.
3. If listed but no file exists, or not listed — proceed category-shaped: write placeholders (`<LOCAL_CACHE_HOST>`) and `<!-- TODO: confirm -->` markers, and ask the human for the concrete commands. Never invent commands for an unknown stack.

## 4. Writing rules for any plugin file

- Stack detail goes **only** into `stack-<tech>.md` files (and the canonical exception above). Everywhere else: category phrasing plus, where the reader needs commands, a pointer to this rule's load-on-demand contract — not a pointer to a specific stack file.
- Before finishing any plugin-file edit, grep for stack terms (product names, CLIs, vendor consoles); every hit must be inside a `stack-<tech>.md` file or the canonical exception.
- Illustrations inside the core stay generic ("a web-framework request layering", "the repo's model/schema registration") — a stack-specific example is not made acceptable by an *e.g.* qualifier.