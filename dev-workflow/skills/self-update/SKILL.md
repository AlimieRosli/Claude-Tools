---
name: self-update
description: "Update the dev-workflow plugin from its marketplace to the latest commit SHA. The plugin ships no version field (SHA-based updates) and third-party marketplaces have no auto-update in current builds, so the install must be re-pinned after every push to the plugin repo."
---

Run this exact command via the Bash tool and show me the output:

```
claude plugin update dev-workflow@claude-tools
```

Use the fully qualified `plugin@marketplace` name — the bare name is rejected ("Plugin not found").

If it fails, report the error. If it succeeds:

1. Confirm the re-pin by reading the installed state file — `~/.claude/plugins/installed_plugins.json` (adjust the path for the OS; on Windows `%USERPROFILE%\.claude\plugins\installed_plugins.json`) — and report the new `gitCommitSha`/`version` for `dev-workflow@claude-tools`.
2. Remind me that the update applies only after starting a **fresh chat session** — the current chat keeps the old loaded version.
3. Compare the reported SHA against the plugin repo's latest commit if I ask ("is my plugin up to date?").