# GreenWay database scripts

- `schema.sql` contains the TiDB table structure required by GreenWay.
- `seed.sql` is reserved for safe development-only `INSERT` statements. It is intentionally empty until a sanitized data export is available.

## Import order

1. Create or select an empty TiDB/MySQL-compatible database.
2. Run `schema.sql` to create the tables, indexes, and relationships.
3. Run `seed.sql` only when you need approved development data.

Do not commit real passwords, session records, tokens, private resident information, or production tracking history to `seed.sql`.
