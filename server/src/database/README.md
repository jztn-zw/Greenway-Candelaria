# GreenWay database scripts

- `schema.sql` contains the TiDB table structure required by GreenWay.
- `seed.sql` is reserved for safe development-only `INSERT` statements. It is intentionally empty until a sanitized data export is available.
- `migrations/` contains ordered SQL changes for databases that already exist. Run each new migration once, in filename order, before deploying the matching server code.

## Import order

1. Create or select an empty TiDB/MySQL-compatible database.
2. Run `schema.sql` to create the tables, indexes, and relationships.
3. Run `seed.sql` only when you need approved development data.

Do not commit real passwords, session records, tokens, private resident information, or production tracking history to `seed.sql`.

## Route deletion and historical records

The API requires `route_runs.route_id` to be nullable with `fk_route_runs_template`
using `ON DELETE SET NULL`. An older database with `ON DELETE CASCADE` will return
503 when deleting routes because it could erase completed collection history.

From the `server` directory, check or apply the history protection migration:

```powershell
node scripts/apply-route-history-protection.js --check
node scripts/apply-route-history-protection.js
```

The script uses the configured database, preserves historical rows, verifies row
counts and the resulting foreign key, and can be rerun safely. Keep the API guard
in place; do not bypass it to allow deletions on an outdated schema.
