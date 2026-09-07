#!/usr/bin/env node
// Claude Code PreToolUse secret-scan adapter for the plugin-shipped hooks —
// BLOCKS a Write/Edit that would introduce sensitive values into a doc BEFORE
// the tool executes. Registered from the plugin's hooks/hooks.json via
// ${CLAUDE_PLUGIN_ROOT} with matcher "Write|Edit".
//
// Why this exists: the PostToolUse secret-scan gate (claude-code.js → post-tool-use.js)
// runs AFTER the edit has been applied to disk — it detects and reports, but cannot
// prevent the write. This hook scans the INCOMING tool_input content (the exact
// bytes about to be written) and exits 2 to block the tool call when a sensitive
// value is found. The PostToolUse gate stays as the safety net for anything that
// slips through (transforms, manual edits, multi-tool writes).
//
// Per-repo adoption: unlike the repo-local predecessor (which only ran because
// the adopting repo's settings.json registered it), this plugin-level hook fires
// in EVERY repo — so it consults lib/project-config.js itself and stays silent
// (exit 0) when the project has not adopted the hooks or has disabled the
// secret-scan gate via .claude/hooks.config.json.
//
// Event shape (stdin JSON): { tool_name: "Write"|"Edit", tool_input: { file_path,
// content /* Write */ | new_string /* Edit */ } }. Exits:
//   0  — no sensitive values in the incoming content (allow)
//   2  — sensitive value(s) found (block; stderr fed back to the agent)
const { getProjectRoot } = require('../lib/gate-helpers');
const { loadConfig, gateEnabled } = require('../lib/project-config');
const { checkSecretScanContent } = require('../cores/secret-scan-core');

let input = '';
process.stdin.on('data', (chunk) => (input += chunk));
process.stdin.on('end', () => {
  let event;
  try {
    event = JSON.parse(input);
  } catch {
    process.exit(0); // not a valid hook event — stay silent
  }

  const toolName = event?.tool_name;
  const toolInput = event?.tool_input || {};
  const filePath = toolInput.file_path || toolInput.filePath;

  // Only docs matter — same scope as the PostToolUse secret-scan gate (**/*.md).
  if (!filePath || !String(filePath).toLowerCase().endsWith('.md')) process.exit(0);

  // Per-repo adoption + per-gate toggle — stay silent in non-adopted projects.
  const config = loadConfig(getProjectRoot());
  if (!config || !gateEnabled(config, 'secret-scan')) process.exit(0);

  // The incoming content that will be written:
  //   Write -> tool_input.content (full file body)
  //   Edit  -> tool_input.new_string (the replacement chunk; this is what could
  //            introduce a leak — the pre-existing file already passed its gate)
  const incoming = toolName === 'Edit' ? toolInput.new_string : toolInput.content;
  if (!incoming) process.exit(0);

  const problem = checkSecretScanContent(incoming, filePath);
  if (problem) {
    console.error(`Hook gate failed (PreToolUse) in ${filePath}:\n${problem}`);
    process.exit(2); // block the tool call
  }
  process.exit(0);
});