---
name: self-update
description: "Update the dev-workflow plugin from its marketplace to the latest commit SHA. The plugin manifest deliberately omits `version`, so Claude Code resolves the version from the git commit SHA — `claude plugin update` is SHA-faithful and is the primary tool. Refresh the marketplace clone first, update, then verify every installed scope actually moved to the new SHA (fall back to uninstall+install per stale scope). Never install at a scope that did not already hold the plugin — extra scope entries shadow the real install and go stale, and local-scope keys are raw cwd paths with no Windows drive-letter casing normalization."
---

## Step 1 — Refresh the marketplace clone

```
claude plugin marketplace update claude-tools
```

Always run this first — it guarantees the local clone has the latest commits before any version comparison.

## Step 2 — Record the current state

Read the installed state file — `%USERPROFILE%\.claude\plugins\installed_plugins.json` (on Windows; `~/.claude/plugins/installed_plugins.json` elsewhere) — and list every entry under the key `dev-workflow@claude-tools` with its `scope`, `projectPath`, `version`, and `gitCommitSha`. These are the scopes that must end up updated; no other scope may be created.

## Step 3 — Update

```
claude plugin update dev-workflow@claude-tools
```

Because the manifest omits `version`, the resolved version **is** the commit SHA — a moved SHA means the update proceeds and re-copies files. If it ever reports "already at the latest version" while the repo's latest commit is newer (a known stale-cache class of bug), fall back to the explicit re-pin for each installed scope:

- `user`: `claude plugin uninstall dev-workflow@claude-tools -s user` then `claude plugin install dev-workflow@claude-tools -s user`
- `local`: run from the **exact `projectPath` spelling recorded in the registry** (the key is the raw path string — a casing mismatch makes uninstall miss while install appends a duplicate), then the same uninstall+install with `-s local`. Other projects' local entries: list and ask, never touch unprompted.
- `project`: from the repo root, the same uninstall+install with `-s project`. If it fails because the repo does not register the `claude-tools` marketplace under `extraKnownMarketplaces`, stop and point the user at `/dev-workflow:workflow-adopt`.

## Step 4 — Verify and report

Re-read the state file and confirm:

1. **Every** scope entry recorded in Step 2 now shows the new `gitCommitSha` (the `version` will be a SHA-derived string, since the manifest has no `version` field). Re-pin any stale entry per Step 3's fallback.
2. **No new scope entries appeared** and there are no casing-duplicate entries (same path, different drive-letter case) — list any and offer to remove them from the JSON.
3. Remind me the update applies only after a **fresh chat session** (or `/reload-plugins` in some builds).
4. Compare the reported SHA against the plugin repo's latest commit if I ask ("is my plugin up to date?").

## Notes

- **Auto-update:** members can enable per-marketplace auto-update (`/plugin` → Marketplaces → `claude-tools` → Enable auto-update, or `"autoUpdate": true` on the `extraKnownMarketplaces` entry in managed settings). With auto-update on, the marketplace refreshes in the background after session start and this skill is only the explicit fallback/verification path.
- Never pass a scope flag that the plugin was not already installed in — a stray install in another scope shadows the real one instead of updating it.