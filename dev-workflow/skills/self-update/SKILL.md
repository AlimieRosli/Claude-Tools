---
name: self-update
description: "Update the dev-workflow plugin from its marketplace to the latest commit SHA. Do NOT use `claude plugin update` — it is version-gated (it compares plugin.json versions and skips the copy when they are equal), so pushes without a version bump are silently missed. Re-pin with uninstall + install instead, which copies fresh from the marketplace clone regardless of version."
---

Run these commands via the Bash tool, in order, and show me the output:

```
claude plugin marketplace update claude-tools
claude plugin uninstall dev-workflow@claude-tools -s local
claude plugin uninstall dev-workflow@claude-tools -s user
claude plugin install dev-workflow@claude-tools -s user
claude plugin install dev-workflow@claude-tools -s local
```

Notes:

- Use the fully qualified `plugin@marketplace` name — the bare name is rejected ("Plugin not found").
- The uninstall of a stale/duplicate local scope may error with "not installed"; that is fine — continue with the remaining commands as long as the final install succeeds in both scopes.
- `marketplace update` refreshes the local marketplace clone, but only uninstall+install actually re-copies files to the installed cache. Never substitute `claude plugin update` — it short-circuits to "already at the latest version" whenever the manifest `version` is unchanged, even if the commit SHA has moved.

If any install fails, report the error. If the installs succeed:

1. Confirm the re-pin by reading the installed state file — `~/.claude/plugins/installed_plugins.json` (on Windows `%USERPROFILE%\.claude\plugins\installed_plugins.json`) — and report the new `gitCommitSha`/`version` for `dev-workflow@claude-tools` in **both** scopes.
2. Remind me that the update applies only after starting a **fresh chat session** — the current chat keeps the old loaded version.
3. Compare the reported SHA against the plugin repo's latest commit if I ask ("is my plugin up to date?").