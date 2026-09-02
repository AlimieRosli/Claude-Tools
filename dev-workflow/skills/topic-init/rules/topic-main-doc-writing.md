# Rule: Writing the Topic Main Doc

Follow the [Shared: Topic Doc Writing Conventions](${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/topic-doc-writing-conventions.md) for Table of Contents, Last Updated, file paths, never-guess, and cross-linking rules — do not restate those here.

- **The Requirements section (§2) is mandatory and blocking.** A topic/task with no stated requirement and no cited source is invalid — do not write §3 onward until §2 is complete. This applies regardless of the topic's nature (feature, task, investigation, or fix).
  - **Source** must always be cited: an official document (SRS section, ticket ID, spec, meeting notes — with a link or precise reference) OR `Direct request (prompt)` when the requirement was given directly by the user/stakeholder in conversation. Never leave Source blank, generic, or as `<!-- TODO -->`.
  - **Type** must be exactly one of `Feature`, `Bugfix`, or `Investigation` — matching what §2.1 and §4 describe. Never leave unset or use another label.
  - **Requirement Statement (§2.1)** must say precisely what is to change/be added (Feature), what is to be fixed (Bugfix), or what is to be explored/answered (Investigation). Quote or closely paraphrase the source wording — do not just restate the Overview.
  - If the requirement's source cannot be identified from `$ARGUMENTS`, the task file, or the conversation, **stop and ask the user directly** before writing any other section. Do not fabricate or infer a source.
- The Overview section must state: what this is, what problem it solves, and why work is being done now. Never leave it as a placeholder.
- Cross-link to the plan and test docs in the References section **only if they already exist** (in addition to the same-topic-folder rule above).
- **For any third-party pricing or limits (cloud provider APIs, paid SaaS, etc.), always link to the official pricing page.** Never state costs or quotas without a source URL. Example: `[Google Maps Platform Pricing](https://mapsplatform.google.com/pricing/)`
- **Do NOT list files to be modified in the main doc.** The main doc covers objectives and technical design only. Specific file changes, function touches, and implementation steps belong exclusively in the plan doc.
- **Do NOT include code blocks in the main doc** — no implementation code, no existing function bodies, no config object literals. Describe behavior and structure in prose or tables. Code belongs in the plan doc or inline in source files.
- **Do NOT include unverified metric claims** — no percentage estimates (hit ratios, cost reductions, latency improvements) unless backed by actual measurement data. Use qualitative terms (High/Moderate/None) instead of invented numbers.
- **Open Questions table has no Owner column** — use `| # | Question | Status |` only. Status starts as `Open`. When a question is answered, update Status to `✅ Resolved — <answer>` inline in the same row. The "one doc per open question" rule (each OQ lives only in the doc where it was raised; other docs reference it) is in the [shared conventions](${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/topic-doc-writing-conventions.md).

## Non-Functional Requirements (§5.5)

- The main doc must have a **§5.5 Non-Functional Requirements** subsection (a `### 5.5 Non-Functional Requirements` heading with a `| NFR | Target | Constraint / Note |` table). It covers four NFR categories: **Performance, Scalability, Security, and Observability**.
- **Required for `Feature` type.** For `Bugfix` type, fill it if the fix has performance/scale/security implications; otherwise state `N/A — no NFR impact` with a one-line reason. For `Investigation` type, it may be `N/A — investigation only` with a stated reason.
- If a target value is not known from the codebase or the user, mark it `<!-- TODO: confirm -->` and add a corresponding row to §7 Open Questions — never guess a metric.
- When §5.5 sets a Performance NFR with a concrete target (e.g. `p95 < 500ms`), the test doc's Performance category (`PERF-`) becomes **conditionally required** — see the test rule file's conditional-requirement policy.

*Adapt paths/commands to your repository's actual layout and tooling.*