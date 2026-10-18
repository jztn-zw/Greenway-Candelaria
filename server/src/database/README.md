# GreenWay database

`schema.sql` is the complete baseline for an empty TiDB/MySQL-compatible database.
It contains 33 active tables, their indexes, defaults and relationships. Tables
are ordered by dependency, so foreign-key checks remain enabled during import.
Historical SQL migrations have been consolidated into this baseline and removed.
The baseline contains no accounts, sample content, credentials or tracking data.

For existing installations, `migrations/2026-10-10-mobile-push-devices.sql` adds
session-bound collector and resident phone notification registrations. It was applied to the
configured database with user authorization on 2026-10-10, after reviewing parent
keys and verifying a checksum-protected backup of all 32 existing table schemas.
The new columns, indexes and cascading foreign keys were verified; existing
table schemas were unchanged. No existing records were modified. Other database
environments still need a backed-up, authorized upgrade.
Do not re-import the baseline into an existing database.

Resident Profile now uses password-confirmed account deletion through
`POST /api/auth/delete-account`. No schema change is needed: the transaction sets
`users.deleted_at`, removes profile/contact/area details, replaces the password with
an unknowable random hash, clears the recovery code, and removes sessions, inbox
notifications and settings. The user ID remains as an anonymized “Deleted Resident”
for reports, report photos/status history and audit references. Existing municipal
records (including report contents and historical audit snapshots) are retained;
this is account deletion, not a purge of every historical mention of the person.
Deleted accounts cannot log in, recover, or be reactivated. A new signup creates a
different identity and does not inherit the old account's reports.

The former `/api/auth/deactivate` endpoint is retired. The optional
`users.self_deactivated_at` marker and its unapplied 2026-10-14 migration are retained
only for legacy installations; normal login still supports previously self-deactivated
residents, while bans and administrative deactivations remain blocked. Do not apply
that migration for account deletion. No database records were changed by this work.

## Fresh installation

Resident announcement catch-up uses the nullable `users.announcement_inbox_initialized_at`
marker. Review `migrations/2026-10-18-resident-announcement-inbox.sql`, back up the
users definition, and check INFORMATION_SCHEMA before applying the additive column
to an existing database. The configured database was migrated with user approval
on 2026-10-18 after a schema-only backup; the nullable `DATETIME(3)` column was verified.
Before the column exists, ordinary notification reads continue without catch-up.
Afterward, a completed active resident's next inbox/unread-count request atomically
adds eligible, unexpired announcements broadcast before their signup. Targeting,
announcement preferences, existing notifications and read receipts are respected.
The marker prevents later refreshes from restoring cleared catch-up notifications;
missing alerts broadcast after signup are deliberately left alone. Catch-up sends
an owner-only refresh hint, without replaying historical phone push alerts.

1. Create or select an empty database and import `schema.sql`.
2. Provision one admin privately with a bcrypt password hash, role `ADMIN`, status
   `ACTIVE` and `profile_completed = 1`. Do not store its password in SQL source.
3. Create barangays, streets, trucks and collectors through the admin portal.

Importing the baseline into an existing database is not an upgrade procedure.
Compare its structure with the baseline, back up the database and obtain explicit
authorization before changing existing records or applying destructive DDL.

## Recovery-code lookup

Code-only password recovery uses the non-unique `users.idx_users_recovery_code_hash`
index in the baseline. Existing databases can review
`migrations/2026-10-15-recovery-code-lookup.sql`. Back up the users definition and
check `INFORMATION_SCHEMA.STATISTICS` before an authorised, one-time application.
The migration adds only an index, with no record changes. Recovery rejects
ambiguous hashes rather than choosing an arbitrary owner. This migration has not
been applied by the code change.

## Authorized reset

From `server/`, a read-only preview is the default:

```powershell
node scripts/reset-database.js --database greenway_db --admin admin
```

To reset, stop every local/deployed API instance and other database writers first:

```powershell
node scripts/reset-database.js --apply --database greenway_db --admin admin --maintenance-confirmed
```

This command requires exactly one active admin and a matching target database.
It exports all current tables and records to an ignored private SQL backup,
verifies its checksum, performs a restore drill including per-table content
checks, and imports the new baseline in a temporary verification database.
Only after these checks does it rebuild the target. Temporary verification
databases are removed; the private backup and checksum manifest remain under
`server/backups/database-reset-*/`.

The reset preserves the admin's identity and login credentials, clears its area
links, and creates its default settings. Every other record is cleared, including
residents, collectors, barangays, streets, vehicles, reports, messages, calendars,
posts, sessions and GPS history. All users must sign in again. Do not run the
command while the API is accepting requests. DDL is not transactional: if the
target rebuild fails, keep writers stopped and restore the verified `restore.sql`
into an empty database through an authorized database recovery procedure.

The database user needs permission to create/drop the temporary verification
database. If that check or any backup verification fails, target tables are not
dropped. Keep private backups out of logs, source control and public artifacts.

The configured `greenway_db` was reset with user authorization on 2026-10-07.
Verification found one active `admin`, one default settings row and zero records
in the other 30 tables. Its password hash and login identity were preserved.
The full pre-reset backup passed checksum, restore, row-count and content checks.
The temporary verification database was removed. Fifteen read-only backend
feature checks passed against the empty baseline.

## Removed storage

- `collection_schedule`, `collection_schedule_reminder_log`, `reminder_settings`:
  retired weekly schedule/reminder storage. Calendar events use `schedules`;
  collection reminders use routes and `route_collection_reminder_log`.
- `user_settings.profile_visible`, `user_settings.language`: no supported API
  updates or consumer uses them.
- `reports.priority`: retired report priority, already absent from the baseline.

Generated uniqueness columns, delivery logs, run snapshots, stored pause duration,
GPS sample identity, account recovery and all active settings are
retained. Empty tables that support active features remain in the baseline.

## Existing database repair checks

These idempotent maintenance tools remain for older environments:

```powershell
node scripts/apply-post-source-removal.js --check
node scripts/apply-route-history-protection.js --check
node scripts/check-route-history.js
```

Route deletion still requires nullable `route_runs.route_id` and the
`fk_route_runs_template` foreign key with `ON DELETE SET NULL`. Historical runs
and GPS records still block truck deletion with `ON DELETE RESTRICT`. Keep the
API history-protection guard in place. Post attribution removal backs up retired
text before dropping `posts.source` and preserves `created_by`.
