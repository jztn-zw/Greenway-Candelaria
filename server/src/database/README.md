# GreenWay database

## Multiple admin accounts without contacts (November 3, 2026)

User-authorized provisioning retained the existing `admin` ID and added `admin1`
and `admin2`. All three accounts are active and their password hashes were verified
against the supplied maintenance password. No plaintext password is stored in this
repository. Admin email/phone values were cleared; the shared contact columns remain
available to residents and collectors. Existing admin sessions were revoked.

`migrations/2026-11-03-multiple-admin-accounts.sql` removes the obsolete single-admin
generated column/index. The repeatable private maintenance runner is
`scripts/provision-admin-accounts.cjs`; preview is read-only, while apply requires
`--apply --maintenance-confirmed` and `GREENWAY_ADMIN_PASSWORD` supplied privately.
Stop API workers before apply. No public admin registration endpoint was introduced.

Applied to the configured database after stopping its local API. Verified backup:
`backups/admin-accounts-2026-11-03T10-26-17-450Z/restore.sql`, SHA-256
`9a942a4e3b196900b207c43fc33554699e917e11b40033523ffcc88d297cc04c`.
All non-admin account fields and collection run/stop history hashes matched before
and after provisioning. Other database environments still require their own approved
upgrade. Restoring the singleton constraint requires resolving multiple admins first;
never restore the old backup over newer user or collection data.

## Street deletion while preserving collection history (November 3, 2026)

`migrations/2026-11-03-street-history-preserving-deletion.sql` adds nullable
`barangay_streets.deleted_at` and a generated `live_identity` unique-key member.
Deletion archives the street identity without rewriting any route run, stop name,
coverage snapshot, outcome, timestamp, GPS sample or notification. Archived streets
are excluded from current street lists, service counts, registration, profile setup,
address changes, public schedules and new route validation. Current accounts, route
plans and nonterminal runs still prevent deletion. Terminal history does not.
Names remain unique among current streets; a replacement gets its own ID.

Preview from `server/`: `node scripts/migrate-street-deletion.cjs`.
After explicit database approval, stop all APIs/workers and run
`node scripts/migrate-street-deletion.cjs --apply --maintenance-confirmed`.
The runner verifies a private schema/data backup and compares all original street,
run and stop data before/after migration. Restart only with the compatible API.
Deploy migration before this API: pre-migration schemas lack the required columns.
Applied to the configured database on November 3, 2026 (Philippine time), after
explicit user approval and stopping the local API watcher/worker. TiDB required
separate column/index statements and a standalone barangay foreign-key index.
The runner supports resuming those intermediate schema states. The final verified
backup is `backups/street-deletion-2026-11-03T08-33-24-987Z/restore.sql`, SHA-256
`e78e5ae8584b729295f6fb318e5bb60a48d8651401216c2ea7bba8b9492cd322`.
A separate comparison against the first pre-change backup confirmed all original
data unchanged: 26 streets, 24 route runs and 275 run stops. No street was archived
during migration; Cemetery retains its four PARTIAL and five CANCELLED historical
stops. Other configured environments still need the authorized upgrade.

Rollback must preserve
archive markers and reconcile duplicate archived names before restoring the old key;
never restore an old full backup over newer records. Historical street IDs must not
be nulled: null represents barangay-wide coverage in existing access checks.

## Resident report history removal (October 30, 2026)

`migrations/2026-10-30-resident-report-history.sql` adds
nullable `reports.resident_hidden_at`. Review INFORMATION_SCHEMA, back up and
checksum the reports definition/data, then apply once with database authorization
to enable resolved-history removal. Do not re-import the baseline into an existing
database. Existing reports retain NULL; no municipal records are rewritten.

Only the resident owner can remove reports. An untouched SUBMITTED report is
permanently deleted, with its attached photo rows and initial history removed by
the existing cascade constraints. Unreferenced owned Cloudinary evidence is
cleaned up after commit; external cleanup failure is logged without turning a
committed deletion into a failed API response. A report with admin notes, review
history, a response, flags or linked duplicates cannot be permanently deleted.
UNDER_REVIEW and DISPATCHED reports cannot be deleted. Removing a RESOLVED report
sets only the personal-history marker (UTC), preserving its original update time,
status, evidence, history, admin lists/details and municipal counts. Resident
list/detail/stat reads exclude the marker; private owner hints refresh both
clients. The same locked-row endpoint enforces ownership and status. Repeated
resolved-history removal is a no-op. Admin deletion is prohibited for every status
by both route authorization and the service. Admin review/status/flag/note actions
remain available. No retrospective deletion or restoration of old records runs.

Deploy the updated API before updated clients. Device/navigation/realtime smoke
checks require a migrated test environment. Other database environments still
need the authorized upgrade.

Applied to the configured database on October 30, 2026 (Philippine time), with
explicit user approval. The repeat-safe runner is
`node scripts/migrate-resident-report-history.cjs --apply`; omit `--apply` to
preview. It reuses only the private backup export helper from `reset-database.js`,
never its reset workflow. The verified reports schema/data backup is
`backups/resident-report-history-2026-10-29T16-57-04-370Z/restore.sql`, SHA-256
`50cdd7abcdac1a09c68abc7ee63aaf6df3d61db74843166934713051f7cd85b0`.
The backup directory remains Git-ignored. Existing report column definitions,
constraints and all original field hashes matched after the additive DDL; all
11 reports remain, with zero history markers initially set. No report was deleted
or hidden during verification. Report reads and the history-removal UPDATE's
execution plan passed against the database; 14 fixture tests and runner syntax
checks passed. Authenticated deletion from a device/browser remains a user smoke
check; verification did not perform that mutation on a real report.

The API also supports pre-migration installations: resident history, detail and
count reads retry without the optional marker only when MySQL reports that exact
column is missing. Submitted withdrawal and active-report protection still work.
Resolved-history removal returns a clear 503 upgrade-required error and leaves all
records untouched until the migration exists. Other database errors remain errors;
there is no fallback that deletes municipal records. The column check is retried
on subsequent reads, so applying the migration enables filtering without a cached
schema flag or API restart solely to discover the column.

## Eight legacy template/profile columns (October 28, 2026)

The compatible server source no longer reads/writes stored `users.two_factor`,
`routes.collection_started_at`, or the recurring template's `route_stops.status`,
`completed_at`, `notified_at`, `collection_done_notified_at`,
`collection_skipped_notified_at`, `skipped_reason`. The empty-database baseline
omits them. Existing profile/template responses retain the same zero, NULL and
NOT_STARTED compatibility values. All actual dated run/stop statuses, reasons,
notifications, capture times and GPS behavior remain on their existing tables.

Preview from `server/`:

```powershell
node scripts/remove-legacy-template-columns.cjs
```

The user's removal request authorizes these eight columns. Applying the prepared
`migrations/2026-10-28-remove-legacy-template-columns.sql` still requires an
operational maintenance window: stop **every** local/deployed API and worker,
and restart only with the compatible source. Do not drop while an older API is
running; it still contains queries against the retired columns. Do not run the
SQL file directly. After confirming the actual database and stopped writers:

```powershell
node scripts/remove-legacy-template-columns.cjs --apply --database <confirmed-database-name> --maintenance-confirmed
```

The runner rejects non-default legacy values (including NULL flags/status),
unexpected column types, generated/index/FK dependencies and database programs
requiring review. It uses the existing private full schema/data backup writer
under ignored `server/backups/legacy-storage-*/`, verifies the restore-file
checksum, and checks that retained data did not change during backup. It then
compares retained table content hashes and row counts after each table's drop,
and all unaffected table definitions/content at the end. Names, passwords,
GPS coordinates and report content are never printed. Keep backups private.

MySQL/TiDB DDL cannot be rolled back as an application transaction. The compatible
source works before, during and after the three-table drop, and the runner can
resume from remaining columns after a partial failure. Keep writers stopped
after any error and review the saved backup before retrying. For rollback, add
only missing retired columns with their original definitions from the verified
backup; all removed values were required to be their defaults. Never restore
an entire old database over newer production data. The full backup preserves
original definitions and values for controlled recovery.

No deployment or schema application is implied by editing the baseline. Existing
installations remain unchanged until the runner is explicitly applied.

Applied to the configured database with the user's explicit removal authorization
on 2026-10-28, after the user confirmed that all APIs/workers were stopped and
would restart with updated code. The private full schema/data backup is
`backups/legacy-storage-2026-10-28T13-08-41-999Z/restore.sql`, SHA-256
`edd25aea03fd64921981080ac81cca3b501b6ced762a8956cdcd3146a33f2466`.
Its checksum and all retained-data hashes were verified; all 34 tables, retained
column definitions, indexes and foreign-key rules matched after removal. The
configured database now has 306 columns. All 12 accounts, 14 route templates,
156 template stops, 16 dated runs, 180 dated stops, 184 inbox records, 7,977 GPS
logs and 4 push registrations were preserved, together with the other tables.
No account, schedule, GPS, collection outcome or notification row was rewritten.
The migration left every API/worker stopped; deploy/restart the compatible server
source before resuming traffic. It did not build/install mobile apps.

Verification: five modified JavaScript files passed syntax checks; web, Resident
and Collector type checks passed; 12 fixture migration checks covered preview,
non-default/NULL rejection, dependency protection, backup/application, protected
data and repeat application. Twelve actual source SELECT execution plans passed
against the reduced database, including admin/collector/resident route scopes.
Execution plans do not exercise authenticated end-to-end UI, GPS or push delivery;
those flows still need a smoke check after services restart.

## Resident approaching alerts upgrade

The approaching check now uses each resident's saved pin within 500 metres,
only while their registered barangay/street is the current pending target.
Missing, malformed or address-mismatched pins use the existing stop coverage
or barangay coordinate fallback at the same 500-metre threshold.

Before starting the updated API, apply
`migrations/2026-10-21-resident-proximity-receipts.sql` through
`node scripts/migrate-resident-proximity.cjs --apply` with explicit database
approval. Without `--apply`, the runner only previews. It checksum-verifies a
backup of the related table definitions, creates the new receipt table, seeds
previously broadcast approaching alerts, and verifies its primary key. No
existing account, route, stop, GPS or notification records are rewritten.
Run the upgrade before deploying the updated API. If seeding or verification
fails, keep the updated API stopped and resolve the seed before deployment;
an existing table alone does not prove a previous failed upgrade completed.

Receipts are unique per run/resident, written in the same transaction as the
accepted GPS and inbox rows. Clearing an inbox cannot trigger another alert.
Retain these receipts with route history. Do not drop the table while this API
version is running. Applied with explicit user approval on 2026-10-21 after the user confirmed
API instances/workers were stopped. The checksum-verified definitions backup is
`backups/resident-proximity-2026-10-21T15-56-42.196Z/tracking-schemas.sql`, SHA-256
`fc23da8a8993e42a4cb6b303a036f02e46b755b64f93bd7ad4d0125c3bc5dc94`.
The receipt primary key, both foreign keys and zero missing legacy receipts were
verified. Three legacy receipts were seeded. Verification counted 7 accounts,
2 runs, 24 stops, 571 GPS records and 44 inbox records; the migration issued no
writes to those existing tables. The API was not restarted by the migration.

## Resident Complete Profile location upgrade

The website Complete Profile flow now requires a confirmed location. Its request
sets `location_required: true`; schema and setup validation reject missing/null
locations for this contract. Older mobile setup requests remain compatible until
their own rollout. GPS fixes above 50m reported accuracy or with no nearby saved
street are rejected without displaying a candidate pin; the website directs the
resident to manual pinning or a saved street point. The street dropdown is hidden
in GPS mode, where a clear nearby match is selected automatically and ambiguous
sections remain explicit choices. This uses street proximity, not a boundary check.

The website Profile address editor reuses the same location picker. It restores
an address-matching saved pin and requires confirmation before submitting the
barangay, street and pin together. The existing owner profile endpoint validates
coverage and saved control points again on the server, locks the account and
street, and commits all three address fields plus the primary-barangay setting
in one transaction. Other profile fields are saved separately. Existing mobile
profile payloads remain compatible. This editor requires no additional migration.

`migrations/2026-10-21-resident-location.sql` adds nullable `users.resident_location`
JSON for the optional website setup pin. Existing accounts retain NULL. Saved
coordinates are self-reported GPS/manual positions or an approximate saved street
point; they do not establish verified barangay boundaries. Collection eligibility
continues to use the existing barangay/street IDs. Only the owner profile response
includes this field; authentication, public lists and realtime delivery omit it.
Changing an address clears incompatible coordinates; account deletion clears them.

Before deploying, run `node scripts/migrate-resident-location.cjs` for a read-only
preview. After explicit approval, `--apply` checksum-verifies a users schema backup
in ignored `backups/`, adds only the missing compatible field, and verifies its
type, nullability and account counts. It executes no account, route or GPS DML.
Do not re-import the baseline. Rollback requires disabling location writes first
and backing up new location values before dropping the column. Mobile setup
and existing clients may continue submitting profiles without this optional field.

Applied to the configured database with explicit user approval on 2026-10-21.
The users table definition was backed up at
`backups/resident-location-2026-10-21T15-02-37.325Z/users-schema.sql`, SHA-256
`68ed27a33311dbf2b2bb87c8fc10d86497f333eaceac39c35f8b0fb4a7481645`.
The backup checksum and INFORMATION_SCHEMA type, nullability and default were
verified. All 7 accounts retained exactly the same original fields, verified by
before/after content hashes; the new field was NULL for all accounts. No account
records, street geometry, routes or tracking history were rewritten.

## Push registration recovery upgrade

`migrations/2026-10-20-push-registration-recovery.sql` adds three nullable fields to
`mobile_push_devices`: `registration_version` distinguishes renewals even within
the same second; `last_error` retains a provider-rejected token so updated
apps can renew native FCM/APNs registration; `native_token_hash` distinguishes
native enrollment changes from routine checks without storing raw native tokens.
It changes no inbox, account, route
or GPS data. Apply before deploying the matching push service.

`node scripts/migrate-push-recovery.cjs` previews missing fields and row count.
After explicit approval, `--apply` saves and checksum-verifies the existing table
definition under ignored `backups/`, adds only missing compatible fields, and
verifies fields and row counts. Never import the baseline over an existing database.
The configured database was upgraded with explicit user approval on 2026-10-20.
The table definition was backed up and checksum-verified under
`backups/push-recovery-2026-10-20T13-52-21.833Z/` before the additive change.
All three nullable fields were verified, and all 16 existing registrations were
preserved. Other database environments still require an authorized, backed-up
upgrade before deploying the matching API.

`schema.sql` is the complete baseline for an empty TiDB/MySQL-compatible database.
It contains 34 active tables, their indexes, defaults and relationships. Tables
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

Street coverage editing stores `{ mode, points }` separately in the nullable
`barangay_streets.coverage_edit` JSON column. Tracking and route run snapshots
continue to use the full `coverage_path` array. Existing geometry is not converted
or rerouted; legacy paths show estimated editing controls until saved again.
The configured database was migrated with user approval on 2026-10-20 after a
checksummed schema-only backup at
`backups/street-coverage-edit-schema-2026-10-20T13-33-17-507Z.sql`. The nullable JSON
column was verified; checksums of all original fields on the 25 street records
matched before and after. Existing metadata remains NULL, with no path backfill.
Other environments must review `migrations/2026-10-20-street-coverage-edit.sql`,
back up the street table definition and verify INFORMATION_SCHEMA before an
authorized upgrade. The editor accepts only road-snapped coverage. Coverage uses
mapped street geometry in both directions, ignoring one-way and turn restrictions
because it describes street location, not a vehicle itinerary. Truck driving
directions keep their existing OSRM rules. Previously saved geometry is preserved;
future edits always match mapped roads. There is no manual drawing option.

Calendar audiences use PRIVATE (MENRO, including collectors), PUBLIC (residents),
and SHARED (MENRO and residents). Admins manage every audience. The configured
database was migrated on 2026-10-19 with user authorization after a checksummed
schema-only backup of `schedules` at
`backups/calendar-shared-audience-schedules-2026-10-19T13-03-18-009Z.sql`.
The `visibility` enum was verified with all three values; all 21 existing rows
(12 PRIVATE, 9 PUBLIC) were preserved. Existing rows retain their visibility;
no notification backfill runs. Other database environments still need the
reviewed migration and an authorized, backed-up upgrade.

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
As of 2026-10-19, a completed active resident's next inbox/unread-count request
initializes this marker without replaying historical announcements. Earlier rows
tagged `metadata.catch_up = true` are excluded from resident inbox pages and counts,
while stored records and read receipts remain intact. Future broadcasts retain
their existing targeting and delivery. No additional migration or record cleanup
is required for this behavior change; it is shared by the website and Resident app.

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

On 2026-10-21, an authorized data-only reset preserved all 25 barangays, all 25
streets (including their coverage geometry and editing pins), and the existing
active `admin` account and credentials. The user confirmed that all API instances
and workers were stopped. A full backup of all 33 current tables at
`backups/database-reset-preserve-areas-2026-10-21T02-16-23-596Z/` passed checksum,
restore, per-table row-count and content checks in a temporary database; the
temporary database was removed. Other records were deleted in foreign-key order
inside one transaction, with constraints enabled and no schema rebuild. Retained
records matched their original content hashes before commit and after commit.
Final verification found one admin, one default admin settings row, 25 barangays,
25 streets, and zero records in every other table. All sessions were cleared.

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
