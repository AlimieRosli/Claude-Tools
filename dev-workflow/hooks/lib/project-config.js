// Per-repo adoption config — the opt-in gate for the plugin-shipped hooks.
//
// The dev-workflow plugin is installed at USER scope, so its hooks would fire in
// every project the user opens. That is not the contract: hooks apply only to
// repos that ADOPT the plugin's hook system. Adoption is declared by the
// presence of `<projectRoot>/.claude/hooks.config.json`:
//
// {
//   "enabled": true,                    // false = explicitly not adopted
//   "gates": { "toc-sync": true },      // per-gate opt-out: "name": false
//   "codeGlobs": [...],                 // consumed by gates as they migrate
//   "sharedDirs": [...]                 //   (neg-flow pre-filter / regression dirs)
// }
//
// loadConfig() returns null when the project is NOT adopted (no file, disabled,
// or unparseable) — every adapter short-circuits to a silent no-op on null.
const fs = require('fs');
const path = require('path');
const { getProjectRoot } = require('./project');

const CONFIG_PATH = path.join('.claude', 'hooks.config.json');

// Load the adoption config for `projectRoot`. Returns the config object when the
// project is adopted, or null when it is not (missing file / enabled:false /
// parse failure — a parse failure is reported to stderr but still treated as
// not-adopted so a broken config never blocks unrelated work).
function loadConfig(projectRoot = getProjectRoot()) {
  const p = path.join(projectRoot, CONFIG_PATH);
  if (!fs.existsSync(p)) return null;
  try {
    const cfg = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (!cfg || typeof cfg !== 'object' || cfg.enabled === false) return null;
    return cfg;
  } catch (e) {
    console.error(`hooks.config.json parse failed — treating project as not adopted: ${e.message}`);
    return null;
  }
}

// Is `gateName` enabled under `config`? Default ON once a project is adopted;
// individual gates opt out with `"gates": { "<name>": false }`.
function gateEnabled(config, gateName) {
  if (!config) return false;
  const gates = config.gates && typeof config.gates === 'object' ? config.gates : {};
  return gates[gateName] !== false;
}

module.exports = { loadConfig, gateEnabled };