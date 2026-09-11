# Stack: MongoDB (database)

Reference commands and notes for repos whose **database** is MongoDB. Loaded on demand per the Stack Content Layer rule (once per session, when a task inspects, seeds, or resets the database). Connection host comes from the repo's test-doc placeholders (e.g. `<LOCAL_DB_HOST>`).

Placeholder credentials (e.g. `mongodb+srv://<username>:<password>@host`) are the only acceptable form in docs — never real connection information (see the Sensitive File Scope rule).

## Verify reachable

```bash
mongosh "<LOCAL_DB_HOST>" --eval "db.adminCommand('listDatabases')"
mongosh "<LOCAL_DB_HOST>" --eval 'db.runCommand({ ping: 1 })'   # → { ok: 1 }
```

## Inspect documents

```bash
mongosh "<LOCAL_DB_HOST>" --eval 'db.<collection>.countDocuments({})'
mongosh "<LOCAL_DB_HOST>" --eval 'db.<collection>.findOne({ <query> })'
# Documents created in the last 5 minutes (timestamp-based)
mongosh "<LOCAL_DB_HOST>" --eval 'db.<collection>.find({ createdAt: { $gte: new Date(Date.now() - 5*60*1000) } }).toArray()'
```

## Reset between tests (local only)

```bash
mongosh "<LOCAL_DB_HOST>" --eval 'db.<collection>.deleteMany({})'
mongosh "<LOCAL_DB_HOST>" --eval 'db.<collection>.drop()'
```

## Seed fixtures (local only)

```bash
mongosh "<LOCAL_DB_HOST>" --eval 'db.<collection>.insertMany([ /* seed docs */ ])'
```

## Staging

No CLI access. Read-only via the **MongoDB Atlas** web UI — manual, human-performed inspection only. Databases are prefixed with the staging prefix.