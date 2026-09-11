# Stack: Redis (cache)

Reference commands and notes for repos whose **cache** is Redis. Loaded on demand per the Stack Content Layer rule (once per session, when a task inspects or resets the cache). Connection host comes from the repo's test-doc placeholders (e.g. `<LOCAL_CACHE_HOST>`).

## Verify reachable

```bash
redis-cli -h <LOCAL_CACHE_HOST> PING   # → PONG
```

## Inspect keys

```bash
redis-cli -h <LOCAL_CACHE_HOST> EXISTS <key>        # does a key exist
redis-cli -h <LOCAL_CACHE_HOST> TYPE <key>          # key type
redis-cli -h <LOCAL_CACHE_HOST> TTL <key>           # seconds remaining
redis-cli -h <LOCAL_CACHE_HOST> GET <key>           # string value
redis-cli -h <LOCAL_CACHE_HOST> HGET <key> <field>  # hash field
redis-cli -h <LOCAL_CACHE_HOST> KEYS "<prefix>*"    # list keys matching a pattern
```

## Reset between tests (local only — scoped cleanup)

Delete ONLY the keys the topic owns — the prefixes documented in the test doc's Side-Effects section. **NEVER FLUSHDB / FLUSHALL on a shared cache** — it wipes unrelated keys.

```bash
redis-cli -h <LOCAL_CACHE_HOST> --scan --pattern '<prefix>:*' | xargs -r redis-cli -h <LOCAL_CACHE_HOST> DEL
```

## Fault injection (cache-down scenario)

```bash
redis-cli -h <LOCAL_CACHE_HOST> SHUTDOWN        # stop the cache (or kill the process / stop the container)
redis-server                                    # restart (or start the container)
```

## Staging

No CLI access. Read-only via **Redis Insight** (desktop app) — manual, human-performed inspection only.