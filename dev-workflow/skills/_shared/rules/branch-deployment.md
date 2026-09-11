# Shared: Branch & Deployment Strategy

A repo's branching and deployment flow — which branches exist, how changes move between them, and how they reach each environment — is a **team process convention**, not a plugin constant. It varies per company and per project, so the plugin's always-loaded layer speaks only in branch *roles*; the concrete strategy is a **repo-owned declaration**. This rule is the **single source of truth** for how that strategy is stored, read, and applied — no other plugin file defines the mechanism.

---

## 1. Two layers

**Layer 1 — always-loaded core (role-shaped).** Templates, rules, and skills speak in branch roles, never concrete branch names:

| Role | Use for |
| --- | --- |
| *the working branch* | where a topic's changes are prepared and reviewed |
| *the staging branch* | the integration branch changes reach before production |
| *the production branch* | the branch the production environment deploys from |

Canonical exception: the plan-doc template's environment table, whose typical shape (`Working Branch / Development / Staging / Production`) names the roles — concrete branch names still come from the declaration.

**Layer 2 — the repo-owned declaration.** One file at `.claude/deploy.yml` in the adopting repo holds the concrete strategy: the role → branch-name mapping, the flow between roles (e.g. cherry-pick vs merge, and in which direction), and any notes the team wants recorded (e.g. a branch that is cherry-pick-only because histories diverged).

## 2. The declaration (per-repo, human-owned)

- Created/confirmed during `workflow-adopt` onboarding (the adaptation table's "Branch & deployment strategy" row); the team owns and edits the file directly.
- The managed boilerplate references the file — it never contains the strategy itself, so team edits survive adopt re-runs.
- `topic-plan` consumes it in Step 4 (Branch, Commit Message & Deployment Status) as a stated input — never derived from `git`, and never edited silently.

## 3. Load contract

Before suggesting a branch name, preparing git commands, or recording deployment status:

1. Check for the repo's `.claude/deploy.yml`.
2. If present — read it **once per session** and phrase every branch reference and suggested command per it.
3. If absent — use the generic shape (the roles above / the plan-doc template's typical shape), present the suggestion to the human, and note that no strategy is declared. Never invent branch names or a flow.

## 4. Git-ownership stance (default — the declaration does not relax it)

The human executes every `git commit` and `git push`. The AI's part in the strategy is **preparation**: which branch to create or merge into, the cherry-pick/merge command list per the declared flow, and Conventional Commits messages — handed to the human as concrete commands, then recorded (commit messages, deployment status) only as the user reports them. The declaration records the flow; it never grants the AI git execution.

## 5. Writing rules for any plugin file

- Concrete branch names, company-specific flows, and deployment commands live **only** in the repo's declaration. Everywhere else: role phrasing plus, where the reader needs names or commands, a pointer to this rule's load contract — never to one repo's strategy.
- Before finishing any plugin-file edit, grep for concrete branch vocabulary beyond the three roles (short names, prefixes, company flows) — every hit must be inside the canonical exception or repo-side content.
