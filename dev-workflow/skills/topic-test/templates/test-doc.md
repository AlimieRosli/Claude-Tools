# <Topic Name> — Test Cases

> *Adapt paths/commands to your repository's actual layout and tooling — service name, dev-start command, test runner, logger, gateway prefixes. Command syntax for the cache, database, and any other stack technology comes from the repo's **stack file** — see the Stack Content Layer rule (`${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/stack-content-layer.md`); where no stack file exists, write `<!-- TODO: confirm -->` placeholders and ask the human.*

> **Service / Module:** `<ServiceName>`
> **Status:** Draft
> **Last Updated:** <!-- date -->

---

## Table of Contents

- [ — Test Cases](#--test-cases)
  - [Table of Contents](#table-of-contents)
  - [Test Results Dashboard](#test-results-dashboard)
  - [Test Scope](#test-scope)
  - [Test Environment](#test-environment)
    - [Local](#local)
    - [Staging](#staging)
    - [Setup / Reset](#setup--reset)
  - [Test Cases — Smoke \& Sanity](#test-cases--smoke--sanity)
    - [SMK-001 — ](#smk-001--)
    - [SMK-002 — ](#smk-002--)
  - [Test Cases — Negative Flow](#test-cases--negative-flow)
    - [NEG-001 — ](#neg-001--)
    - [NEG-002 — ](#neg-002--)
    - [NEG-003 — ](#neg-003--)
  - [Test Cases — Positive Flow](#test-cases--positive-flow)
    - [TC-001 — ](#tc-001--)
    - [TC-002 — ](#tc-002--)
    - [TC-003 — ](#tc-003--)
  - [Test Cases — Unit Tests (Recommended)](#test-cases--unit-tests-recommended)
    - [UNIT-001 — ](#unit-001--)
  - [Test Cases — Edge Cases (Optional)](#test-cases--edge-cases-optional)
    - [EC-001 — ](#ec-001--)
    - [EC-002 — ](#ec-002--)
    - [EC-003 — ](#ec-003--)
  - [Test Cases — Error Scenarios (Optional)](#test-cases--error-scenarios-optional)
    - [ERR-001 — ](#err-001--)
    - [ERR-002 — ](#err-002--)
    - [ERR-003 — ](#err-003--)
  - [Test Cases — Regression Checks (Optional)](#test-cases--regression-checks-optional)
    - [REG-001 — ](#reg-001--)
    - [REG-002 — ](#reg-002--)
  - [Staging Post-Deploy Verification (Conditionally Required)](#staging-post-deploy-verification-conditionally-required)
    - [STG-001 — ](#stg-001--)
    - [STG-002 — ](#stg-002--)
  - [Test Cases — Performance (Optional)](#test-cases--performance-optional)
    - [PERF-001 — ](#perf-001--)
  - [Testing Flow](#testing-flow)
  - [Side-Effect Verification Guide](#side-effect-verification-guide)
    - [Cache](#cache)
    - [Database](#database)
    - [Logs](#logs)
  - [Pass Criteria (Feature Complete)](#pass-criteria-feature-complete)
  - [Open Questions](#open-questions)
  - [References](#references)

---

## Test Results Dashboard

**Required.** The at-a-glance status board at the top of the doc — one row per test case so pass/fail state is visible without scrolling to each case's `**Result:**` line. Updated in the **same edit** as every `**Result:**` line change (see the "Dashboard is synced with result lines" rule in [`${CLAUDE_PLUGIN_ROOT}/skills/topic-test/rules/topic-test-doc-writing.md`](${CLAUDE_PLUGIN_ROOT}/skills/topic-test/rules/topic-test-doc-writing.md)).

| Case | Category | Status | Result (pre-fix) | Result (post-fix) | Last Run |
|------|----------|--------|------------------|-------------------|----------|
| SMK-001 | Smoke | ☐ Not Run | — | — | |
| SMK-002 | Smoke | ☐ Not Run | — | — | |
| NEG-001 | Negative | ☐ Not Run | | | |
| NEG-002 | Negative | ☐ Not Run | | | |
| NEG-003 | Negative | ☐ Not Run | | | |
| TC-001 | Positive | ☐ Not Run | — | — | |
| TC-002 | Positive | ☐ Not Run | — | — | |
| TC-003 | Positive | ☐ Not Run | — | — | |
| UNIT-001 | Unit | ☐ Not Run | — | — | |

> **Status vocabulary:** `☐ Not Run` / `🔄 In Progress` / `✅ PASS` / `❌ FAIL` — mirrors the plan-doc Progress Tracker vocabulary. `Result (pre-fix)` and `Result (post-fix)` columns are filled **only** for NEG rows (the pre/post-fix columns of every other row stay `—`); a NEG row's Status reflects the **post-fix** result once recorded. `Last Run` = date of the latest run (or the latest of pre/post-fix runs for NEG rows). Keep rows in the doc's case order (SMK → NEG → TC → UNIT → optional categories as generated). **Status derives from the case's actual `**Result:**` line(s)** — never mark a row ✅ without the matching result line in the case body; if they disagree, the case body wins and the dashboard row must be corrected in the same edit.

---

## Test Scope

**In Scope:**
- <!-- e.g. New endpoint /api/<feature> happy path and cache behavior -->
- <!-- e.g. Fallback when an external API is unavailable -->
- <!-- e.g. Negative input validation for all new params -->

**Out of Scope:**
- <!-- e.g. Load testing / performance benchmarks -->
- <!-- e.g. End-to-end client-app integration -->
- <!-- e.g. Changes to existing endpoints not touched by this feature -->

---

## Test Environment

Tests run on exactly two environments — **Local** and **Staging** only. No other environment (Development, Production/PRD, or any other) may be used for test execution. See the rule file's "Environment Scope" rule.

<!-- Not a runnable Local/Staging test suite (e.g. an investigation/known-issues doc)? See "Opt-out for non-runnable test docs" in the rules file (${CLAUDE_PLUGIN_ROOT}/skills/topic-test/rules/topic-test-doc-writing.md) to exempt this doc from the env-scope gate (if the adopting repo wires it in .claude/hooks/). Delete this comment once resolved. -->

### Local

The service running on the developer's machine. Direct access — no API Gateway, no gateway prefix.

- [ ] **Service running locally** — reuse the already-running instance. **Do NOT run the repo's dev-start command if it is already up** — if it has a port-killing pre-start step, it kills any existing instance on the port. First verify it is up: `curl -s -o /dev/null -w "%{http_code}" "<LOCAL_API_URL>/<endpoint>"` (expect `200`/`401`, not `000`). If a restart is needed, ask the user to do it manually and continue only after they confirm. URL: `<LOCAL_API_URL>` <!-- TODO: confirm — e.g. http://localhost:<port> -->.
- [ ] **Config source (stack-dependent):** the dev-start command loads the repo's gitignored env/config file (file name varies by stack — see the Sensitive File Scope rule). Set local config vars (e.g. an external-service API key) in that gitignored file, not in committed files.
- [ ] **Log level:** the repo's structured logger typically defaults to `debug` for non-production runs (a log-level env var overrides it, if supported). For local debugging, debug-level output is visible in the dev-server terminal — no need to change the level unless you want to filter. **Do NOT use raw console output for debugging** — use the repo's logger helper so output is structured and redacted.
- [ ] **Cache:** `<LOCAL_CACHE_HOST>` <!-- TODO: confirm — host:port of the cache -->. Inspect with the cache CLI — command syntax from the repo's stack file (Stack Content Layer rule).
- [ ] **Database:** `<LOCAL_DB_HOST>` <!-- TODO: confirm -->. Databases named `<db-prefix><name>` (no staging prefix). Inspect with the database CLI — command syntax from the repo's stack file.
- [ ] Env vars set (e.g. external API keys).
- [ ] Seed data loaded (see Setup / Reset below).

```bash
# Verify local service is up
curl -s "<LOCAL_API_URL>/<endpoint>" | jq .
# Verify cache and database — command syntax from the repo's stack file
# (Stack Content Layer rule); without one, leave <!-- TODO: confirm -->.
```

### Staging

Staging service reached **via the API Gateway** — the endpoint path **must include the gateway's route prefix** (the segment the gateway strips before forwarding the request to the service — confirm the actual prefix for the target deployment). Requires VPN or office network access if the gateway is internal.

- **API endpoint:** `<STG_GATEWAY_URL>/<gateway-prefix>/api/<endpoint>` <!-- TODO: confirm the gateway domain and prefix -->.
- **Headers:** `<role-header>: <default-role>` <!-- TODO: confirm — the repo's default role/auth header for staging calls -->.
- **Database:** No CLI access. Read-only via the stack's management web UI (the repo's stack file names the console, if declared). Databases prefixed with the staging prefix (e.g. `<stg-prefix><name>`). No database CLI commands.
- **Cache:** No CLI access. Read-only via the stack's management web UI (the repo's stack file names the console, if it defines one). No cache CLI commands.
- **Access:** VPN or office network required (if the gateway is internal).
- **⚠️ Prohibited on Staging:** never run the cache/database CLI (or any CLI or direct connection) against staging databases or caches, and never write/delete/update staging data. Staging data is inspected **only** via the stack's management web UIs — **manual, human-performed** steps. The AI must not attempt to connect to staging infrastructure; it prepares the manual steps and asks the user to run them.

```bash
# Example staging call — note the gateway prefix and the repo's default role header
curl -s -H "<role-header>: <default-role>" \
  "<STG_GATEWAY_URL>/<gateway-prefix>/api/<endpoint>" | jq .
```

### Setup / Reset

Run this before each **local** test session to restore a clean state (staging is read-only — no reset needed):

```bash
# --- Cache --- (local only)
# Reset ONLY the keys this topic owns — the prefixes documented in the Side-Effects section.
# NEVER wipe the whole cache on a shared instance — it destroys unrelated keys (scoped-cleanup rule in the test-doc rules).
# Command syntax: the repo's stack file (Stack Content Layer rule).

# --- Database --- (local only)
# Drop and re-seed the relevant collections — command syntax from the repo's stack file.

# --- Service ---
# Restart to clear in-memory state
# (from the repo directory — the user's documented run practice)
```

---

## Test Cases — Smoke & Sanity

Fast baseline checks — confirm the service and its critical dependencies are up before running any other category. **Required. Must pass before continuing to Negative Flow.**

### SMK-001 — <!-- Service health / boot check -->

**Scenario:** <!-- e.g. "Service starts and responds on its health/status endpoint" -->
**Why This Test Is Needed:** Confirms the service is up before spending time on deeper test categories.
**Precondition:** <!-- e.g. "Service freshly started" -->

**How to Run:**
```bash
curl -s -X GET "<LOCAL_API_URL>/<health-or-any-lightweight-endpoint>" | jq .
```

**Expected Result:**
```
HTTP 200
```

**Pass Criteria:**
- [ ] Service responds within a few seconds
- [ ] No startup errors in the service logs

---

### SMK-002 — <!-- Critical dependency reachability (cache/DB) -->

**Scenario:** <!-- e.g. "Cache and database are reachable from the service" -->
**Why This Test Is Needed:** Confirms the environment is correctly configured before functional testing begins.
**Precondition:**

**How to Run:**
```bash
# Verify the cache and database respond to their ping/health command —
# command syntax from the repo's stack file (Stack Content Layer rule)
```

**Expected Result:**
```
Each technology's success response for its ping/health command (e.g. a pong-style or ok-style output)
```

**Pass Criteria:**
- [ ] Cache responds to its ping/health command
- [ ] Database responds to its ping/health command

---

## Test Cases — Negative Flow

**Required. Run these TWICE — once BEFORE implementing the fix/feature (pre-fix pass) and once AFTER (post-fix pass).** The pre-fix pass confirms the bug genuinely exists (bugfix) or the behavior is genuinely missing (feature) prior to any code changes. The post-fix pass confirms each case now returns the correct rejection instead of the original bug. Both passes are required.

<!-- Topic has no negative-flow surface to test (e.g. a read-only enrichment/filter feature with no invalid-input path), or is a completed topic not being backfilled? See "Opt-out for topics with no negative-flow surface" in the rules file (${CLAUDE_PLUGIN_ROOT}/skills/topic-test/rules/topic-test-doc-writing.md) to exempt this doc from the neg-flow-gate (if the adopting repo wires it in .claude/hooks/). Delete this comment once resolved. -->

### NEG-001 — <!-- Missing required field -->

**Scenario:** <!-- e.g. "Request omits required 'origin' param" -->
**Why This Test Is Needed:** <!-- e.g. "Confirms input validation rejects missing required fields — prevents processing invalid requests that could cause downstream null pointer errors" -->
**Category:** Missing Required Field
**Precondition:**

**Request:**
```http
GET /api/endpoint?param2=value2
Host: <LOCAL_API_URL>
```

**How to Run:**
```bash
curl -s -X GET "<LOCAL_API_URL>/api/endpoint?param2=value2" | jq .
```

**Expected Positive Result (correct implementation — graceful rejection):**
```
HTTP 400
{
  "error": "Missing required parameter: param1"
}
```

**Expected Negative Result (broken implementation — anti-pattern to detect):**
```
HTTP 500
{ "error": "Cannot read property 'split' of undefined" }
```
<!-- e.g. "Returns 500 because param1 is used without null check — crashes instead of validating" -->

**Expected Side Effects:**
- Cache: No writes
- Database: No writes
- Logs: WARN log for validation failure

**Result (pre-fix):** <!-- ✅ PASS / ❌ FAIL + notes — recorded during Phase 1, before the fix -->
**Result (post-fix):** <!-- ✅ PASS / ❌ FAIL + notes — recorded during Phase 2b, after the fix -->

**Pass Criteria:**
- [ ] Response status is `400`
- [ ] Error message names the missing field
- [ ] No 500 error
- [ ] No cache/database writes

---

### NEG-002 — <!-- Invalid input type / format -->

**Scenario:**
**Why This Test Is Needed:**
**Category:** Invalid Type | Invalid Format | Out-of-Range Value
**Precondition:**

**Request:**
```http

```

**How to Run:**
```bash

```

**Expected Positive Result (correct implementation — graceful rejection):**
```

```

**Expected Negative Result (broken implementation — anti-pattern to detect):**
```

```

**Expected Side Effects:**
- Cache:
- Database:
- Logs:

**Result (pre-fix):** <!-- ✅ PASS / ❌ FAIL + notes — recorded during Phase 1, before the fix -->
**Result (post-fix):** <!-- ✅ PASS / ❌ FAIL + notes — recorded during Phase 2b, after the fix -->

**Pass Criteria:**
- [ ]

---

### NEG-003 — <!-- Auth failure -->

**Scenario:** <!-- e.g. "Request with expired or missing auth token" -->
**Why This Test Is Needed:** <!-- e.g. "Confirms auth middleware blocks unauthorized access — prevents data leakage to unauthenticated callers" -->
**Category:** Auth Failure
**Precondition:**

**Request:**
```http

```

**How to Run:**
```bash

```

**Expected Positive Result (correct implementation — graceful rejection):**
```
HTTP 401
{ "error": "Unauthorized" }
```

**Expected Negative Result (broken implementation — anti-pattern to detect):**
```
HTTP 200
{ "data": { /* sensitive data leaked to unauthenticated caller */ } }
```

**Expected Side Effects:**
- Cache: No writes
- Database: No writes
- Logs: WARN log for auth failure

**Result (pre-fix):** <!-- ✅ PASS / ❌ FAIL + notes — recorded during Phase 1, before the fix -->
**Result (post-fix):** <!-- ✅ PASS / ❌ FAIL + notes — recorded during Phase 2b, after the fix -->

**Pass Criteria:**
- [ ] Response status is `401`
- [ ] No data in response body
- [ ] No cache/database writes

---

## Test Cases — Positive Flow

**Required. Run these AFTER implementing the fix/feature** — confirms the intended behavior now works. The Negative Flow pre-fix pass (Phase 1) must be complete before implementing the fix; the post-fix pass (Phase 2b) runs after this Positive Flow — see Testing Flow.

### TC-001 — <!-- Happy path: standard request returns expected result -->

**Scenario:** <!-- One-line description, e.g. "Valid request returns 200 with the expected data" -->
**Why This Test Is Needed:** <!-- What bug or regression this test prevents. e.g. "Confirms the core feature works end-to-end — if this fails, nothing else matters." -->
**Category:** Happy Path
**Precondition:** <!-- System state before test. e.g. "Cache empty, database seeded with test data" -->

**Request:**
```http
GET /api/endpoint?param1=value1&param2=value2
Host: <LOCAL_API_URL>
Authorization: Bearer <valid-token>
```

**How to Run:**
```bash
curl -s -X GET "<LOCAL_API_URL>/api/endpoint?param1=value1&param2=value2" \
  -H "Authorization: Bearer <valid-token>" | jq .
```

**Expected Positive Result (correct implementation):**
```
HTTP 200
{
  "status": "success",
  "data": { /* expected response body */ }
}
```

**Expected Negative Result (broken implementation — anti-pattern to detect):**
```
HTTP 500
{ "error": "Internal Server Error" }
```
<!-- Describe what a broken implementation would return. e.g. "Returns 500 because of unhandled null in response builder" or "Returns 200 but with missing 'routes' array — silent data loss" -->

**Expected Side Effects:**
- Cache: Key `<cache-key-prefix>:<value1>` written with TTL `300`s
- Database: No writes (read-only operation)
- Logs: `INFO` log entry with request ID and response time

**Pass Criteria:**
- [ ] Response status is `200`
- [ ] Response body matches expected schema
- [ ] Cache key exists with correct TTL (verify with the cache CLI — syntax from the repo's stack file)
- [ ] No error logs in service output

---

### TC-002 — <!-- Second positive case -->

**Scenario:**
**Why This Test Is Needed:**
**Category:** <!-- Happy Path | Cache Hit | Cache Miss | Default Behavior | Multiple Valid Inputs -->
**Precondition:**

**Request:**
```http

```

**How to Run:**
```bash

```

**Expected Positive Result (correct implementation):**
```

```

**Expected Negative Result (broken implementation — anti-pattern to detect):**
```

```

**Expected Side Effects:**
- Cache:
- Database:
- Logs:

**Pass Criteria:**
- [ ]

---

### TC-003 — <!-- Third positive case -->

**Scenario:**
**Why This Test Is Needed:**
**Category:**
**Precondition:**

**Request:**
```http

```

**How to Run:**
```bash

```

**Expected Positive Result (correct implementation):**
```

```

**Expected Negative Result (broken implementation — anti-pattern to detect):**
```

```

**Expected Side Effects:**
- Cache:
- Database:
- Logs:

**Pass Criteria:**
- [ ]

---

## Test Cases — Unit Tests (Recommended)

**Recommended — generate when a plan phase touches function-level logic in the repo's service/helper/util layer; skip for pure route/doc/config-only changes.** Unit tests are white-box, in-process, and infrastructure-free: mock at the seam the repo's data-access layer actually uses (e.g. the shared model/schema module the services import) and any module with import-time side effects (e.g. a structured logger's transport worker); supply stand-in chain methods for the data-access API the services call. No real DB/cache/HTTP, no container infra, no running server. The repo's full test-suite command runs **after ALL implementation phases** and **before the NEG post-fix pass** — do not run it between phases. Use the repo's logger helper for diagnostic output, never raw console output. See the `UNIT-` rule in the rules file (`${CLAUDE_PLUGIN_ROOT}/skills/topic-test/rules/topic-test-doc-writing.md`).

<!-- Topic touches no service/helper/util logic (pure endpoint/doc/config change)? Omit this section entirely — do not leave empty placeholders. Delete this comment once resolved. -->

### UNIT-001 — <!-- Function-level happy path / error branch with mocked data access -->

**Scenario:** <!-- One line, e.g. "UserService.findByX calls the underlying model lookup with the active-email filter and returns the result, with the models seam mocked" -->
**Why This Test Is Needed:** <!-- e.g. "Exercises an error-path branch (switch on e.name) invisible to HTTP-level tests — proves the mocking seam works" -->
**Category:** <!-- Happy Path | Error Path — ValidationError | Error Path — Default | Mocking Seam / No-Infra -->
**Precondition:** <!-- Phase adding the logic is complete; a colocated test file exists in the repo's test location, with the data-access seam mocked per the repo's test conventions -->

**How to Run:**
```bash
# Run a single case (adapt the flags to the repo's test runner)
<test-runner> -- <case filter> 2>&1 | tee /tmp/unit001.log
grep -E "PASS|FAIL|Tests" /tmp/unit001.log

# Or run the full suite (all UNIT-### + any future cases)
<full-test-suite-command> 2>&1 | tee /tmp/unit.log
```

**Expected Positive Result (correct implementation):**
```
PASS <path>/<Service>.test.js
  <Service>.<method>
    ✓ <case name>
Tests  1 passed
```

**Expected Negative Result (broken implementation — anti-pattern to detect):**
```
FAIL ... <Service>.test.js
  ✕ <case name>
    <data-access driver error, e.g. a "model called without a connection" style error>   # mock not applied → real data-access layer reached
```

**Expected Side Effects:**
- Database: No reads/writes (mocked). Cache: none.
- Logs: none (raw console output prohibited; mocked logger is a no-op).

**Pass Criteria:**
- [ ] The mocked data-access method was called with the expected argument
- [ ] The mocked resolve/reject value flows through the service unchanged (happy path) or maps to the correct thrown error (error path)
- [ ] No real database connection attempted (no DB infra needed; no driver or connection errors)

---

## Test Cases — Edge Cases (Optional)

**Optional — include only when the user explicitly requests edge-case coverage.** Omit this section entirely by default; do not leave empty placeholders.

### EC-001 — <!-- First edge case: boundary value -->

**Scenario:** <!-- Boundary or unusual-but-valid condition. e.g. "Request with single-element array param" -->
**Why It Matters:** <!-- What breaks if unhandled. e.g. "Empty array handling could throw TypeError if code assumes array.length > 0" -->
**Precondition:**

**Steps:**
1. <!-- How to trigger the edge condition -->

**How to Run:**
```bash

```

**Expected Positive Result (correct implementation):**
```

```

**Expected Negative Result (broken implementation — anti-pattern to detect):**
```

```

**Expected Side Effects:**
- Cache:
- Database:
- Logs:

**Pass Criteria:**
- [ ]

---

### EC-002 — <!-- Second edge case: large payload or timing -->

**Scenario:**
**Why It Matters:**
**Precondition:**

**Steps:**
1.

**How to Run:**
```bash

```

**Expected Positive Result (correct implementation):**
```

```

**Expected Negative Result (broken implementation — anti-pattern to detect):**
```

```

**Expected Side Effects:**
- Cache:
- Database:
- Logs:

**Pass Criteria:**
- [ ]

---

### EC-003 — <!-- External service timing / TTL expiry -->

**Scenario:** <!-- e.g. "Cache entry expires mid-request" -->
**Why It Matters:**
**Precondition:**

**Steps:**
1.

**How to Run:**
```bash

```

**Expected Positive Result (correct implementation):**
```

```

**Expected Negative Result (broken implementation — anti-pattern to detect):**
```

```

**Expected Side Effects:**
- Cache:
- Database:
- Logs:

**Pass Criteria:**
- [ ]

---

## Test Cases — Error Scenarios (Optional)

**Optional — include only when the user explicitly requests error/failure-injection coverage.** Omit this section entirely by default; do not leave empty placeholders.

### ERR-001 — <!-- Cache down -->

**Scenario:** <!-- e.g. "Cache is unavailable — cache reads/writes fail" -->
**Trigger:** <!-- How to simulate. e.g. "Stop the cache with the stop command from the repo's stack file, or kill the process" -->

**Steps:**
1. Stop the cache — stop command from the repo's stack file (or stop its container)
2. Send a normal request to the endpoint
3. Observe response and service logs
4. Restart the cache — start command from the repo's stack file (or start its container)

**Expected Status:** `200` (if fallback) or `500` (if the cache is mandatory)
**Expected Response Body:**
```json
{
  <!-- e.g. "status": "success", "data": { } — fallback to the database or stale cache -->
  <!-- OR -->
  "error": "Service temporarily unavailable"
}
```

**Expected Side Effects:**
- Logs: ERROR log for cache connection failure
- Fallback: <!-- e.g. Data fetched from the database directly -->
- Alert: <!-- e.g. Alert fired if monitoring is configured -->

**Pass Criteria:**
- [ ] Service does not crash
- [ ] Response is graceful (not a raw stack trace)
- [ ] Cache connection error logged
- [ ] Service recovers after the cache restarts

---

### ERR-002 — <!-- Database down -->

**Scenario:**
**Trigger:**

**Steps:**
1.

**Expected Status:**
**Expected Response Body:**
```json

```

**Expected Side Effects:**
- Logs:
- Fallback:
- Alert:

**Pass Criteria:**
- [ ]

---

### ERR-003 — <!-- External API timeout -->

**Scenario:** <!-- e.g. "External API does not respond within timeout" -->
**Trigger:** <!-- How to simulate. e.g. "Block outbound traffic to the external host or use a mock server with artificial delay" -->

**Steps:**
1.

**Expected Status:**
**Expected Response Body:**
```json

```

**Expected Side Effects:**
- Logs:
- Fallback:
- Alert:

**Pass Criteria:**
- [ ]

---

## Test Cases — Regression Checks (Conditionally Required)

**Conditionally required.** Required when the plan doc touches any shared code path: e.g. middleware, shared helpers, utils, config, or any file imported/used by 2 or more modules (adapt the path list to the repo's layout). When required, generate by default alongside SMK/NEG/TC. When the plan touches only self-contained feature files with no shared-path impact, this section is optional — omit it entirely; do not leave empty placeholders. If the adopting repo wires a deterministic `regression-gate` in `.claude/hooks/`, it enforces this — check before relying on it.

### REG-001 — <!-- Existing endpoint unchanged -->

**Scenario:** <!-- e.g. "Existing /api/<resource> endpoint still returns same format" -->
**Why This Test Is Needed:** <!-- e.g. "Confirms new feature code did not accidentally modify shared middleware or config affecting existing endpoints" -->

**How to Run:**
```bash

```

**Expected Result:**
```

```

**Pass Criteria:**
- [ ] Response matches pre-change behavior
- [ ] No new fields added or removed
- [ ] No status code changes

---

### REG-002 — <!-- Existing cache key -->

**Scenario:**
**Why This Test Is Needed:**

**How to Run:**
```bash

```

**Expected Result:**
```

```

**Pass Criteria:**
- [ ]

---

## Staging Post-Deploy Verification (Conditionally Required)

**Conditionally required.** Required when the topic is deployed to Staging (STG) **and** the classification is one of: New feature (heavy), Bug fix (non-trivial), Config/infra change, or Hotfix. Optional for Refactor and Test-only; skipped for Investigation and Minor change. When required, generate by default alongside SMK/NEG/TC/REG. The trigger is the plan doc's Deployment Status table marking STG as Deployed. These `STG-###` cases run **after** deployment, against the staging environment only (via the API Gateway route prefix). Each case records a `**Result:**` line from the staging run. Do not run Local-only cases (e.g. ones requiring direct database/cache CLI access) against staging — staging is read-only. See the "Staging Post-Deploy Verification" section in the workflow guide (e.g. `TOPIC_WORKFLOW_GUIDE.md` in the adopting repo's `.claude/docs/`, if present — adapt as needed) for the full policy.

### STG-001 — <!-- Deployed endpoint responds via the gateway -->

**Scenario:** <!-- e.g. "After STG deployment, /<gateway-prefix>/api/<endpoint> returns the expected response through the API Gateway" -->
**Why This Test Is Needed:** <!-- e.g. "Confirms the deployed change works behind the real API Gateway with staging config, staging databases/caches, and the staging network path — not just on a developer's machine" -->
**Precondition:** <!-- e.g. "Topic deployed to STG; plan doc Deployment Status marks STG as Deployed" -->

**How to Run:**
```bash
# Staging call — note the gateway prefix and the repo's default role header
curl -s -H "<role-header>: <default-role>" \
  "<STG_GATEWAY_URL>/<gateway-prefix>/api/<endpoint>" | jq .
```

**Expected Result:**
```
HTTP 200
<expected response shape>
```

**Pass Criteria:**
- [ ] Response status is `200`
- [ ] Response structure matches the expected shape
- [ ] No errors in staging logs

**Result:** <!-- ✅ PASS / ❌ FAIL + notes + date -->

---

### STG-002 — <!-- Staging config / DB prefix / gateway header -->

**Scenario:**
**Why This Test Is Needed:**

**How to Run:**
```bash

```

**Expected Result:**
```
```

**Pass Criteria:**
- [ ]

**Result:** <!-- ✅ PASS / ❌ FAIL + notes + date -->

---

## Test Cases — Performance (Optional)

**Optional — include only when the topic has performance-sensitive changes AND the user explicitly asks for it.** Delete the section entirely if not applicable — do not leave empty placeholders.

### PERF-001 — <!-- Response time under normal load -->

**Scenario:** <!-- e.g. "Endpoint responds within acceptable latency under typical single-user load" -->
**Why This Test Is Needed:** <!-- e.g. "New external API call adds network latency — confirms it stays within an acceptable bound" -->
**Precondition:**

**How to Run:**
```bash
# e.g. run N sequential requests and measure timing
for i in {1..20}; do curl -s -o /dev/null -w "%{time_total}\n" "<LOCAL_API_URL>/api/endpoint"; done
```

**Target Threshold:** <!-- e.g. p95 < 500ms -->
**Measured Result:** <!-- fill in after running -->

**Pass Criteria:**
- [ ] Measured latency/throughput meets the target threshold
- [ ] No errors under the tested load

---

## Testing Flow

Execute tests in this order. Confirm each category passes before moving to the next. **Negative Flow is required TWICE — a pre-fix pass BEFORE the fix/feature is implemented, and a post-fix pass AFTER, to confirm each case now rejects correctly.** **Unit Tests (recommended) run after ALL implementation phases as a full test-suite run (the repo's test-suite command), before the NEG post-fix pass** — do not run the suite between implementation phases. Positive Flow runs AFTER the fix.

```
Phase 0 — Smoke & Sanity (required, run first)
  1. SMK-001 → Confirm service is up
  2. SMK-002 → Confirm cache/database reachable

Phase 1 — Negative Flow pre-fix pass (required, run BEFORE implementing the fix/feature)
  3. NEG-001 → Confirm the missing/invalid-input case currently reproduces the bug or shows the feature is missing
  4. NEG-002 → Confirm invalid type case currently reproduces the bug or shows the feature is missing
  5. NEG-003 → Confirm auth failure case currently reproduces the bug or shows the feature is missing

  --- `/topic-implement` executes ALL implementation phases here (plan doc is the source of truth; DO NOT run tests between phases — see ${CLAUDE_PLUGIN_ROOT}/skills/topic-implement/rules/topic-implementation-execution.md) ---

Phase 1.5 — Unit Tests (recommended, run after ALL implementation phases, full test suite, before NEG post-fix)
  6. UNIT-001 → Confirm function-level logic with mocked data access (happy path / error branch / mocking seam)

Phase 2 — Positive Flow (required, run AFTER implementing the fix/feature)
  7. TC-001 → Confirm happy path now works
  8. TC-002 → Confirm secondary positive behavior (e.g. cache hit)
  9. TC-003 → Confirm tertiary positive behavior

Phase 2b — Negative Flow post-fix pass (required, re-run AFTER the fix)
  10. Re-run NEG-001 → NEG-003 → Confirm each now returns the correct rejection instead of the bug

Phase 3 — Edge Cases (optional, only if section is included)
  11. EC-001 → Confirm boundary handling
  12. EC-002 → Confirm large/timing edge
  13. EC-003 → Confirm TTL/timing edge

Phase 4 — Error Scenarios (optional, only if section is included)
  14. ERR-001 → Confirm cache-down handling
  15. ERR-002 → Confirm database-down handling
  16. ERR-003 → Confirm external API timeout handling

Phase 5 — Regression Checks (optional, only if section is included)
  17. REG-001 → Confirm existing endpoints unchanged
  18. REG-002 → Confirm existing cache keys intact

Phase 5b — Staging Post-Deploy Verification (conditionally required — run AFTER deployment to STG)
  19. STG-001 → Confirm deployed endpoint responds via the gateway
  20. STG-002 → Confirm staging config / DB prefix / gateway header

Phase 6 — Performance (optional, only if section is included)
  21. PERF-001 → Confirm latency/throughput meets target threshold

Phase 7 — Side-Effect Spot Checks
  22. Verify cache keys from TC-001 (cache CLI per the repo's stack file)
  23. Verify database documents if any test writes data (database CLI per the repo's stack file)
  24. Check service logs for unexpected errors across all phases
```

---

## Side-Effect Verification Guide

Reference checklist for verifying side effects mentioned in individual test cases. Command syntax for the cache and database comes from the repo's **stack file** — load it per the Stack Content Layer rule (`${CLAUDE_PLUGIN_ROOT}/skills/_shared/rules/stack-content-layer.md`), which also governs what to do when the repo's stack list names no technology for the category.

### Cache

Checklist (commands from the repo's stack file):

- [ ] Key exists
- [ ] Key type matches what the implementation writes
- [ ] TTL matches the expected value
- [ ] Stored value (string or field-level) matches the expected shape
- [ ] Reset between tests deletes ONLY this topic's documented keys (local only; never a whole-instance wipe — scoped-cleanup rule in the test-doc rules)

### Database

Checklist (commands from the repo's stack file):

- [ ] Document count matches the expected number of writes
- [ ] The expected document(s) exist and match the query shape
- [ ] Recent writes carry the expected timestamps
- [ ] Reset between tests (local only) removes only the collections/documents the topic owns

### Logs

```bash
# Tail service logs in real-time (run in separate terminal)
# If using nodemon/PM2 (or your repo's process manager), check the process output directly
# Look for:
#   - ERROR level entries (should not appear during positive flow tests)
#   - WARN entries during negative/error tests (expected)
#   - Request ID correlation across log lines
```

---

## Pass Criteria (Feature Complete)

- [ ] All SMK-00X (Smoke & Sanity) pass — **required, blocks all other categories if failing**
- [ ] All NEG-00X (Negative Flow) reproduced the bug/missing behavior BEFORE the fix, and return correct 4XX/expected rejection AFTER the fix — **required**
- [ ] All TC-00X (Positive Flow) pass — **required, run AFTER the fix**
- [ ] All UNIT-00X (Unit Tests) pass with mocked data access and no DB/cache running — **recommended, run after ALL implementation phases (full test suite), before the NEG post-fix pass**
- [ ] All EC-00X (Edge Cases) produce expected behavior — **optional, only if section is included**
- [ ] All ERR-00X (Error Scenarios) handle failures gracefully — no crashes, no stack traces in responses — **optional, only if section is included**
- [ ] All REG-00X (Regression Checks) confirm existing behavior unchanged — **optional, only if section is included**
- [ ] All PERF-00X (Performance) meet target thresholds — **optional, only if section is included**
- [ ] All side-effect verifications pass (cache keys, database docs, logs)
- [ ] No unexpected ERROR logs during positive flow tests
- [ ] No regressions detected in any existing endpoint

---

## Open Questions

| # | Question | Status |
|---|---------|--------|
| 1 | <!-- e.g. What is the expected TTL for the new cache key? --> | Open |

<!-- When a question is answered, update Status to: ✅ Resolved — <answer> -->

---

## References

- [Main Doc](./<TOPIC_UPPER>.md)

<!-- The plan doc is NOT created by default — add its link here ONLY once the plan doc actually exists in this folder. Only link docs within this topic folder. Do not link to other topic folders, external docs, or cross-project references. -->