---
name: self-update
description: "Update the dev-workflow plugin from its marketplace to the latest commit SHA, scope-aware. Do NOT blindly use `claude plugin update` — it is version-gated (it compares plugin.json versions and skips the copy when they are equal), so pushes without a version bump are silently missed. First detect which scope(s) actually hold the install, then re-pin those scopes via uninstall + install, which copies fresh from the marketplace clone regardless of version. Never install at a scope that did not already hold the plugin — extra scope entries shadow the real install and go stale (local-scope entries are keyed by the raw cwd path, and Windows drive-letter casing is NOT normalized, so C:\\X and c:\\X create duplicates)."
---

## Step 1 — Refresh the marketplace clone

```
claude plugin marketplace update claude-tools
```

This refreshes the local clone, but **does not** re-copy files — only uninstall+install does. Never substitute `claude plugin update`: it short-circuits to "already at the latest version" whenever the manifest `version` is unchanged, even if the commit SHA has moved.

## Step 2 — Detect the installed scope(s)

Read the installed state file — `%USERPROFILE%\.claude\plugins\installed_plugins.json` (on Windows; `~/.claude/plugins/installed_plugins.json` elsewhere) — and list every entry under the key `dev-workflow@claude-tools` with its `scope`, `projectPath`, `version`, and `gitCommitSha`.

- **No entries** → the plugin is not installed. Stop and report; install nothing.
- **Scope-aware routing** — re-pin **only the scope(s) found**, never a scope that had no entry (a stray user-scope install silently shadows a local/project install, and vice versa).

## Step 3 — Re-pin each found scope

**3A. `user` scope (the common case):**

```
claude plugin uninstall dev-workflow@claude-tools -s user
claude plugin install dev-workflow@claude-tools -s user
```

**3B. `local` scope (per-project):** only for the **current project**, and run from the **exact `projectPath` spelling recorded in the registry** (the key is the raw path string — a casing mismatch makes uninstall miss while install appends a duplicate):

```
cd "<projectPath from the registry, verbatim>" && claude plugin uninstall dev-workflow@claude-tools -s local && claude plugin install dev-workflow@claude-tools -s local
```

Local entries belonging to **other projects**: do not touch them unprompted — list them and ask. If two entries differ only by path casing, flag the duplicate pair and offer to consolidate to one correctly-cased entry via a direct JSON edit (with the user's approval).

**3C. `project` scope (team-managed):** run from the repo root:

```
claude plugin uninstall dev-workflow@claude-tools -s project
claude plugin install dev-workflow@claude-tools -s project
```

If install at project scope fails (e.g. the repo's `.claude/settings.json` does not register the `claude-tools` marketplace under `extraKnownMarketplaces`), stop and report — point the user at `/dev-workflow:workflow-adopt`, which surfaces the registration snippet. Do **not** fall back to another scope.

If any uninstall errors with "not installed" or a scope mismatch, continue — the goal is that each re-pin ends with a successful install in the same scope it started in.

## Step 4 — Verify and report

Re-read the state file and confirm:

1. Every scope that was installed before is updated, with the new `gitCommitSha`/`version` reported.
2. **No new scope entries appeared** and there are no casing-duplicate entries — if any exist, list them and offer to remove them from the JSON.
3. Remind me the update applies only after a **fresh chat session**.
4. Compare the reported SHA against the plugin repo's latest commit if I ask ("is my plugin up to date?").