---
name: self-update
description: "Update the dev-workflow plugin from its marketplace to the latest commit SHA. Do NOT use `claude plugin update` — it is version-gated (it compares plugin.json versions and skips the copy when they are equal), so pushes without a version bump are silently missed. Re-pin with uninstall + install at USER scope only, which copies fresh from the marketplace clone regardless of version. Never use -s local: local-scope entries are keyed by the raw cwd path (Windows drive-letter casing is NOT normalized, so C:\\X and c:\\X create duplicates) and shadow the user install."
---

Run these commands via the Bash tool, in order, and show me the output:

```
claude plugin marketplace update claude-tools
claude plugin uninstall dev-workflow@claude-tools -s user
claude plugin install dev-workflow@claude-tools -s user
```

Notes:

- Use the fully qualified `plugin@marketplace` name — the bare name is rejected ("Plugin not found").
- **USER scope only.** Never pass `-s local` or `-s project`: local entries are per-project, keyed by the exact cwd path string (drive-letter casing differences create duplicate entries), and they shadow the user install and go stale.
- If uninstall errors with "not installed" or a scope mismatch, continue anyway — the goal is that the final `install -s user` succeeds.
- `marketplace update` refreshes the local marketplace clone, but only uninstall+install actually re-copies files to the installed cache. Never substitute `claude plugin update` — it short-circuits to "already at the latest version" whenever the manifest `version` is unchanged, even if the commit SHA has moved.

If the install fails, report the error. If it succeeds:

1. Confirm the re-pin by reading the installed state file — `~/.claude/plugins/installed_plugins.json` (on Windows `%USERPROFILE%\.claude\plugins\installed_plugins.json`) — and report the new `gitCommitSha`/`version` for `dev-workflow@claude-tools`. There should be **exactly one entry, scope `user`**. If extra `local`-scope entries exist, list them and offer to remove them from the JSON.
2. Remind me that the update applies only after starting a **fresh chat session** — the current chat keeps the old loaded version.
3. Compare the reported SHA against the plugin repo's latest commit if I ask ("is my plugin up to date?").