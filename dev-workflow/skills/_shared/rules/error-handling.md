# Shared: Error Handling Conventions

Error handling rules for all code in the adopting repo — handlers, controllers, services, middleware. Followed by AI and human developers alike.

*Adapt paths/commands to your repository's actual layout and tooling.* The examples below use Express.js-style handler code; in a different framework, apply the same principles (log before responding, return early, don't leak internals) with that framework's idioms.

---

## 1. Two error-response patterns — pick based on the file you're editing

Many codebases (e.g. an Express.js backend) carry **two coexisting error-response patterns** — a legacy inline pattern and a newer structured helper pattern. **Always match the pattern already used in the file you are editing.** Do not mix patterns within a single file or introduce the newer pattern into a legacy file unless the user explicitly asks for a migration.

### Pattern A — Legacy inline (example: a long-lived API router file)

Inline `res.status(code).json(...)` / `res.status(code).send(...)` calls directly in the handler. No shared error-response helper, no error constants.

**400 validation errors (missing/invalid input):**
```js
return res.status(400).json({ error: 'Descriptive message' });
```
> Match the dominant 400 pattern already used in that file (e.g. `.json({ error: '...' })` vs `.send(...)`) — don't introduce a different response shape mid-file.

**404 not-found errors:**
```js
return res.status(404).send({ message: 'Descriptive message' });
```
> Match the existing 404 pattern in that file.

**500 catch block:**
```js
catch (e) {
  log.error({ err: e }, '<handlerName> failed');
  res.status(500).send(e.message || e);
}
```
> Always log the error before sending the 500 response. An `e.message || e` fallback handles non-Error throws. Do not omit the log — silent 500s are the #1 debugging bottleneck in any repo. Match the file's established 500 response shape rather than inventing a new one.

### Pattern B — Structured error-response (example: a newer endpoint/controller file)

Uses a shared `sendErrorResponse` helper (e.g. `server/util/errorResponse.js`) with structured error constants (e.g. `server/constants/error.constants.js`). The file imports `sendErrorResponse` and `ERRORS`.

**400 validation errors:**
```js
import sendErrorResponse from '../util/errorResponse';
import { ERRORS } from '../constants/error.constants';
import * as httpStatusCode from '../util/httpStatusCode';

// ...in handler:
return sendErrorResponse(res, httpStatusCode.BAD_REQUEST,
  ERRORS.SOME_ERROR.errorCode, ERRORS.SOME_ERROR.errorKey,
  ERRORS.SOME_ERROR.userTitle, ERRORS.SOME_ERROR.userMessage);
```

**Adding a new error to the error-constants file:**
```js
SOME_NEW_ERROR: {
  errorCode: '40020',      // 5-digit: first 3 = HTTP status, last 2 = sequential
  errorKey: 'ERR_SOME_NEW_ERROR',  // SCREAMING_SNAKE_CASE, prefixed ERR_
  userTitle: 'User-Facing Title',
  userMessage: 'User-facing message with guidance.',
},
```

**500 catch block (Pattern B):**
```js
catch (err) {
  log.error({ err }, '<handlerName> failed');
  return sendErrorResponse(res, httpStatusCode.SERVER_ERROR,
    ERRORS.SERVER_ERROR.errorCode, ERRORS.SERVER_ERROR.errorKey,
    ERRORS.SERVER_ERROR.userTitle, ERRORS.SERVER_ERROR.userMessage);
}
```

### How to decide which pattern a file uses

| Signal | Pattern |
|--------|---------|
| File imports the structured helper (e.g. `sendErrorResponse`) | **B** (structured) |
| File imports the structured error constants (e.g. `ERRORS`) | **B** (structured) |
| File has inline `res.status(400).json({ error: ... })` / `res.status(500).send(e.message \|\| e)` | **A** (legacy inline) |
| File has neither import | **A** (legacy inline) — default to Pattern A |

---

## 2. Universal rules (apply to both patterns)

### Always log before responding on errors
Every `catch` block must log the error before sending the HTTP response. Use the repo's logger (e.g. a `loggerFor` child logger from the centralized logging module) — never `console.log`.

```js
// CORRECT
catch (e) {
  log.error({ err: e }, 'getGeocodeWithGoogle failed');
  res.status(500).send(e.message || e);
}

// WRONG — silent 500, no log
catch (e) {
  res.status(500).send(e.message || e);
}
```

> **Note:** in a legacy file, many existing catch blocks may omit the `log.error` line. This is a known tech-debt gap, not a pattern to follow. When **writing or editing** a catch block, always include the log — even if the surrounding blocks don't. New code must not perpetuate the silent-500 pattern.

### Use status-code constants, not magic numbers — in Pattern B files only

If the repo has a status-code constants module (e.g. `httpStatusCode` with `SUCCESS` (200), `CREATED` (201), `BAD_REQUEST` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409), `NOT_ACCEPTABLE` (406), `SERVER_ERROR` (500)), use it in structured-pattern files instead of numeric literals.

Pattern A files (legacy) typically use numeric literals (`400`, `404`, `500`) directly — match that.

### Guard clauses go before the try block's business logic, not after

Input validation guards (missing params, empty strings, invalid types) should be the **first thing** in the handler, before any database/external API calls or session/token handling. Return early — don't nest validation inside `if/else` chains.

```js
// CORRECT — guard first, before any work
async function getGeocodeWithGoogle(req, res, next) {
  try {
    let params = req.query;
    if (!params.query || !params.query.trim()) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }
    // ... business logic starts here
  }
  catch (e) {
    log.error({ err: e }, 'getGeocodeWithGoogle failed');
    res.status(500).send(e.message || e);
  }
}
```

### `return` every error response — never fall through

Every `res.status(4xx|5xx)` call in an Express handler must be preceded by `return`. Without `return`, execution continues past the error response, potentially sending a second response (headers already sent → crash).

```js
// CORRECT
return res.status(400).json({ error: '...' });

// WRONG — falls through, sends a second response
res.status(400).json({ error: '...' });
// ... code continues, hits res.status(200).send(...) → "headers already sent" crash
```

### 500 catch blocks must not leak stack traces in production

A pattern like `res.status(500).send(e.message || e)` sends only the error message, not the full stack. This is correct — never send `e.stack` or the full Error object to the client. The structured log (`log.error({ err: e }, ...)`) captures the stack server-side for debugging.

### Don't catch errors you can't handle — let the framework handle them

If a function doesn't have a meaningful recovery action for an error, don't add a try/catch just to swallow it. Let it propagate to the framework's error handler (e.g. the Express error middleware). Only catch errors where you can:
- Return a meaningful HTTP error response (validation, not-found, bad-input).
- Recover gracefully (fallback to cached data, default value, degraded response).
- Log and rethrow (rare — usually just let it propagate).

---

## 3. Pattern quick-reference

| Scenario | Pattern A (legacy inline) | Pattern B (structured helper) |
|----------|---------------------------|-------------------------------|
| 400 missing/invalid input | `return res.status(400).json({ error: '...' })` | `return sendErrorResponse(res, httpStatusCode.BAD_REQUEST, ERRORS.X.errorCode, ERRORS.X.errorKey, ERRORS.X.userTitle, ERRORS.X.userMessage)` |
| 404 not found | `return res.status(404).send({ message: '...' })` | `return sendErrorResponse(res, httpStatusCode.NOT_FOUND, ...)` |
| 401 unauthorized | `return res.status(401).send(...)` | `return sendErrorResponse(res, httpStatusCode.UNAUTHORIZED, ...)` |
| 500 catch | `log.error({ err: e }, 'X failed'); res.status(500).send(e.message \|\| e)` | `log.error({ err }, 'X failed'); return sendErrorResponse(res, httpStatusCode.SERVER_ERROR, ERRORS.SERVER_ERROR...)` |
| Response shape | `{ error: "string" }` or `{ message: "string" }` or raw string | `{ errorCode, errorKey, userTitle, userMessage }` |

---

## 4. When to migrate a file from Pattern A to Pattern B

Only when the user explicitly requests it. A migration involves:
1. Import the structured helper and error constants (and the status-code constants module, if not already imported).
2. Define new error constants in the repo's error-constants file for each validation case.
3. Replace every inline `res.status(4xx).json/send(...)` with the structured helper call.
4. Replace every `res.status(500).send(e.message || e)` with the structured `SERVER_ERROR` response.
5. Add `log.error({ err: e }, '<handlerName> failed')` to every catch block that lacks it.

Do not do this incrementally (one handler at a time) — it creates a mixed-pattern file that violates the "match the file's existing pattern" rule. Migrate the entire file in one pass or not at all.