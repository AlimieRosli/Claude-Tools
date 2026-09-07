// Shared Secret-Scan check logic. Enforces the topic-test env-scope placeholder
// convention project-wide: "Never write real connection information (URLs,
// hostnames, ports, credentials, DB connection strings) anywhere in a doc —
// use placeholders (e.g. <STG_GATEWAY_URL>) and mark <!-- TODO: confirm -->."
//
// Unlike env-scope-core.js (which only checks *_TEST.md for Local/Staging
// subsections + disallowed env labels), this gate scans ANY doc for actual
// sensitive VALUES that may have been pasted in verbatim: real hostnames/URLs,
// non-loopback IPs, embedded URL credentials, and hardcoded secrets/tokens.
//
// Used by the plugin hook surfaces (PostToolUse adapter, shim watcher / on-save
// check). Standard gate contract: returns null when OK, or a multi-line problem
// summary string when not.
//
// Opt-out: a doc that intentionally includes a matched string as a documented
// false positive (e.g. a fake test credential, a public example domain) may
// carry a single exemption marker anywhere in the file:
//   <!-- secret-scan: exempt — <reason these matches are not real sensitive data> -->
// A reason is required — an empty marker is itself flagged as a problem.
const fs = require('fs');
const { relPath, checkExemptionInContent } = require('../lib/gate-helpers');

// Hosts considered safe/non-sensitive (loopback, wildcard, well-known example domains).
const SAFE_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', 'example.com', 'example.org', 'example.net']);

// Publicly documented third-party API/vendor domains referenced for integration
// purposes. These are the VENDOR's own published endpoint — not OUR infrastructure —
// so naming them in docs is normal and expected (like citing "https://api.stripe.com").
// Only add a domain here if it is the third party's own public API/docs host, never
// one of our own environments (that's exactly what this gate exists to catch).
const PUBLIC_API_HOSTS = new Set([
  'maps.googleapis.com',
  'places.googleapis.com',
  'routes.googleapis.com',
  'mapsplatform.google.com',
  'developers.google.com',
  'fcm.googleapis.com',
  'api.data.gov.my',
]);

// Public documentation hosts cited in docs for the AGENTS.md "cite with source +
// URL + date checked" requirement. These are the publisher's own docs sites — never
// our infrastructure — so a citation URL is expected and safe, not sensitive.
const PUBLIC_DOC_HOSTS = new Set([
  'code.claude.com',
  'docs.anthropic.com',
  'www.mongodb.com',
  'cloud.mongodb.com',
  'www.postman.com',
  'jestjs.io',
  'github.com',
  'sendgrid.com', // Twilio SendGrid public pricing/docs site — vendor's own host, cited for the SendGrid email migration topic
  'azure.microsoft.com', // Microsoft Azure public pricing/docs site — vendor's own host, cited for Azure pricing references
]);

// Value/key-based rules: value capture group is checked against the placeholder
// convention (`<SOMETHING>`) and skipped if it matches — real secrets never do.
//
// Keyword rules use a (?<![A-Za-z0-9]) negative lookbehind instead of \b: `_` is a
// word character, so \b never matches inside a prefixed variable name
// (e.g. GOOGLE_API_KEY, MY_SECRET) and the rule silently misses it. The lookbehind
// still rejects alphanumeric prefixes (avoiding matches inside longer words) while
// treating `_` as a valid boundary.
const VALUE_RULES = [
  {
    id: 'api-key-secret',
    pattern: /(?<![A-Za-z0-9])(api[_-]?key|apikey|secret|access[_-]?key|client[_-]?secret|private[_-]?key)\s*[:=]\s*['"]?([^\s'")]{6,})['"]?/gi,
    valueGroup: 2,
    describe: 'Possible hardcoded API key / secret',
  },
  {
    id: 'password-literal',
    pattern: /(?<![A-Za-z0-9])(password|pwd|passwd)\s*[:=]\s*['"]?([^\s'")]{4,})['"]?/gi,
    valueGroup: 2,
    describe: 'Possible hardcoded password',
  },
  {
    id: 'bearer-token',
    pattern: /\bBearer\s+([A-Za-z0-9\-_.]{10,})/g,
    valueGroup: 1,
    describe: 'Possible hardcoded bearer token',
  },
  {
    id: 'aws-access-key',
    pattern: /\b(AKIA[0-9A-Z]{16})\b/g,
    valueGroup: 1,
    describe: 'AWS access key ID pattern',
  },
  {
    // Google API key shape (AIza + 35 chars). Catches the value even when the
    // LHS variable name is unrecognized (e.g. `maps_cred=AIza...`). No trailing
    // \b — the char class includes `-`/`_`, which are non-word chars, so a \b
    // after a key ending in one would fail to match.
    id: 'google-api-key',
    pattern: /\b(AIza[0-9A-Za-z_\-]{35})/g,
    valueGroup: 1,
    describe: 'Google API key pattern',
  },
];

function isPlaceholderValue(value) {
  // '<...>' doc placeholders, '${...}'/'$VAR' shell/env-var references, and
  // 'process.env.X' JS env access are not literal hardcoded secrets — they're
  // resolved at runtime from the environment.
  return !value || value.startsWith('<') || value.startsWith('$') || value.startsWith('process.env.') || /^\{\{.*\}\}$/.test(value);
}

// scheme://user:pass@host — credentials embedded directly in a connection string/URL.
function checkEmbeddedCredentials(lines) {
  const violations = [];
  const pattern = /\b([a-z][a-z0-9+.-]*):\/\/([^/\s:@'"]+):([^/\s@'"]+)@/gi;
  lines.forEach((line, i) => {
    pattern.lastIndex = 0;
    let m;
    while ((m = pattern.exec(line))) {
      // Placeholder credentials (e.g. mongodb+srv://<username>:<password>@host) are
      // documentation examples, not real secrets — skip them.
      if (isPlaceholderValue(m[2]) && isPlaceholderValue(m[3])) continue;
      violations.push({
        line: i + 1,
        id: 'embedded-credentials',
        redact: true,
        describe: 'Embedded credentials in a connection string/URL (scheme://user:pass@host)',
      });
    }
  });
  return violations;
}

function checkPatternRules(lines) {
  const violations = [];
  lines.forEach((line, i) => {
    for (const rule of VALUE_RULES) {
      rule.pattern.lastIndex = 0;
      let m;
      while ((m = rule.pattern.exec(line))) {
        const value = m[rule.valueGroup];
        if (isPlaceholderValue(value)) continue;
        violations.push({ line: i + 1, id: rule.id, redact: true, describe: rule.describe });
      }
    }
  });
  return violations;
}

// Absolute URLs / connection strings pointing at a real (non-placeholder, non-loopback) host.
function checkRealHostUrls(lines) {
  const violations = [];
  const pattern = /\b(?:https?|wss?|mongodb(?:\+srv)?|rediss?|amqp):\/\/([^\s'")<>`]+)/gi;
  lines.forEach((line, i) => {
    pattern.lastIndex = 0;
    let m;
    while ((m = pattern.exec(line))) {
      const rest = m[1];
      const afterAuth = rest.includes('@') ? rest.split('@').slice(1).join('@') : rest;
      const host = afterAuth.split(/[/:?#]/)[0];
      // Skip doc placeholders (`<...>`), template placeholders (`{account}`), and
      // env-var references (`$VAR` / `${VAR}`) — resolved at runtime, not real hosts.
      if (!host || host.startsWith('<') || host.startsWith('{') || host.startsWith('$')) continue;
      const lowerHost = host.toLowerCase();
      if (SAFE_HOSTS.has(lowerHost) || PUBLIC_API_HOSTS.has(lowerHost) || PUBLIC_DOC_HOSTS.has(lowerHost)) continue;
      violations.push({ line: i + 1, id: 'real-host-url', redact: false, describe: `Real (non-placeholder, non-loopback) host in a URL/connection string: ${host}` });
    }
  });
  return violations;
}

// Bare internal/cluster-style hostnames, even without a URL scheme (e.g. k8s internal DNS).
// Also flags the company's own internal domain (`*.myrapid.com.my`) — our own
// environments are exactly what this gate exists to catch, whether written with
// a scheme or bare (e.g. `pulse-api-stg.myrapid.com.my`).
function checkInternalHostnames(lines) {
  const violations = [];
  const pattern = /\b([\w-]+(?:\.[\w-]+)*\.(?:svc\.cluster\.local|internal|corp|myrapid\.com\.my))\b/gi;
  lines.forEach((line, i) => {
    pattern.lastIndex = 0;
    let m;
    while ((m = pattern.exec(line))) {
      violations.push({ line: i + 1, id: 'internal-hostname', redact: false, describe: `Internal/cluster-style hostname: ${m[1]}` });
    }
  });
  return violations;
}

// The bare apex domain `myrapid.com.my` (no subdomain label) — the company's own
// internal domain root. The subdomain rule above requires at least one label
// before the domain, so the bare apex needs its own rule.
function checkApexInternalDomain(lines) {
  const violations = [];
  const pattern = /\b(myrapid\.com\.my)\b/gi;
  lines.forEach((line, i) => {
    pattern.lastIndex = 0;
    let m;
    while ((m = pattern.exec(line))) {
      violations.push({ line: i + 1, id: 'internal-hostname', redact: false, describe: `Internal company domain: ${m[1]}` });
    }
  });
  return violations;
}

// Non-loopback IPv4 addresses — internal infra IPs are sensitive even in private ranges.
function checkRealIps(lines) {
  const violations = [];
  const pattern = /\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/g;
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    // Dotted section numbers (e.g. a "4.1.1.1" heading, TOC entry, or "§4.1.1.1"
    // cross-reference) are indistinguishable from an IPv4 address by shape alone —
    // skip lines that are clearly a heading, TOC link, or section-symbol reference.
    const looksLikeSectionRef = /^#{1,6}\s/.test(trimmed) || /^-?\s*\[/.test(trimmed) || /§\d/.test(line);
    if (looksLikeSectionRef) return;
    pattern.lastIndex = 0;
    let m;
    while ((m = pattern.exec(line))) {
      const ip = m[1];
      if (ip === '127.0.0.1' || ip === '0.0.0.0') continue;
      // RFC 5737 TEST-NET ranges — reserved for documentation examples, not real infra.
      if (/^(192\.0\.2\.|198\.51\.100\.|203\.0\.113\.)/.test(ip)) continue;
      violations.push({ line: i + 1, id: 'real-ip', redact: false, describe: `Non-loopback IP address: ${ip}` });
    }
  });
  return violations;
}

// Main check — file-based (PostToolUse / on-save / pre-commit). Returns null when
// the gate passes (or does not apply), or a multi-line problem summary string when
// it fails. Delegates to the content-based check below so both paths share one rule.
function checkSecretScan(docPath) {
  if (!fs.existsSync(docPath)) return null;
  return checkSecretScanContent(fs.readFileSync(docPath, 'utf8'), relPath(docPath));
}

// Content-based check — scans an in-memory doc body (e.g. the incoming tool_input
// of a PreToolUse Write/Edit) instead of a file on disk. Same rules and message
// format as checkSecretScan. Returns null when clean, or a problem summary string.
// Exemption: the pre-write scan honors a marker present in the INCOMING content —
// the file hasn't been written yet, so a marker that only exists on disk is not
// visible here. (For the file-based path the content IS the file, so a marker in
// the doc is honored automatically.)
function checkSecretScanContent(content, displayPath = '(tool input)') {
  const incomingExemption = checkExemptionInContent(content, 'secret-scan');
  if (incomingExemption) {
    if (!incomingExemption.reason) {
      return [
        `  ✖ Secret scan: exemption marker is missing a reason.`,
        `      Doc: ${displayPath}`,
        `      Use: <!-- secret-scan: exempt — <reason these matches are not real sensitive data> -->`,
      ].join('\n');
    }
    return null; // explicitly exempt in the incoming content
  }

  const lines = content.split('\n');
  const all = [
    ...checkEmbeddedCredentials(lines),
    ...checkPatternRules(lines),
    ...checkRealHostUrls(lines),
    ...checkInternalHostnames(lines),
    ...checkApexInternalDomain(lines),
    ...checkRealIps(lines),
  ].sort((a, b) => a.line - b.line);

  if (all.length === 0) return null;

  const problems = [
    `  ✖ Secret scan: ${all.length} potential sensitive value(s) found.`,
    `      Doc: ${displayPath}`,
    `      Never write real connection information (URLs, hostnames, ports, credentials, DB connection strings, tokens) in docs — use placeholders (e.g. <STG_GATEWAY_URL>) and mark <!-- TODO: confirm -->.`,
  ];
  all.slice(0, 10).forEach((v) => {
    problems.push(`        - line ${v.line}: ${v.describe}${v.redact ? ' (value redacted — check the line)' : ''}`);
  });
  if (all.length > 10) problems.push(`        - ...and ${all.length - 10} more`);

  return problems.join('\n');
}

// Gate metadata — consumed by sync-readme-core.js to auto-generate the README's
// Hook Index table + exemption-support list. Add this to every new gate core.
const meta = {
  name: 'secret-scan',
  kind: 'gate',
  firesOn: 'Any `.md` file (repo-wide)',
  enforces: 'No real connection info/secrets in docs — use placeholders (`<STG_GATEWAY_URL>`) and `<!-- TODO: confirm -->`',
  exemption: true,
  // Repo-wide; excluded dirs (node_modules, production, .git, temp) applied at scan time, not in the matcher.
  files: ['**/*.md'],
};

module.exports = {
  meta,
  checkSecretScan,
  checkSecretScanContent,
  checkEmbeddedCredentials,
  checkPatternRules,
  checkRealHostUrls,
  checkInternalHostnames,
  checkApexInternalDomain,
  checkRealIps,
};