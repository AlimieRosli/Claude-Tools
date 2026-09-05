#!/usr/bin/env node
// Claude Code PostToolUse adapter for the plugin-shipped hooks — thin wrapper
// around the shared adapters/post-tool-use.js. Registered from the plugin's
// hooks/hooks.json via ${CLAUDE_PLUGIN_ROOT}. All logic (gates, transforms,
// auto-fix, report, per-repo adoption check) lives in the shared adapter.
//
// This wrapper must INVOKE runCli(), not just require() the module: the stdin
// handler in post-tool-use.js is registered under a `require.main === module`
// guard, so a bare require() here loads the module but never reads stdin —
// the native PostToolUse hook silently exits 0 and scans nothing (a real bug
// that shipped once in the repo-local copy; runCli() exists to prevent it).
const { runCli } = require('./post-tool-use');
runCli();