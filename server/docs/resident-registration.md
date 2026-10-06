# Resident registration and recovery

Web signup asks for a unique email, password, matching confirmation and terms.
After login, new accounts complete name, unique username, required contact phone and
collection area. Street is required when service is available and streets are
listed; areas without listed streets can use barangay alone. Setup is saved
transactionally and resumes on later logins until completed. Existing accounts
are marked complete by the migration and skip setup. Setup accepts a Philippine
mobile number in +639XXXXXXXXX format and explains that staff may use it to follow
up on reports. Phone numbers are not verified by SMS. Household phone numbers may
be shared. Login accepts username or email, never phone/SMS OTP.
Selecting an area is not proof of residency.

Pending accounts can authenticate, manage recovery and look up areas; ordinary
authenticated collection endpoints and realtime subscriptions/deliveries reject
them until setup completes. Web/mobile layout gates prevent mounting the portal.
The older complete-profile native signup contract remains supported; its optional
email behavior is retained for existing mobile releases. The native resident app
also handles unfinished web accounts. Driver signup/login behavior is unchanged.

Web and mobile login use email/username and password. Password login uses
revocable sessions; email addresses remain valid for regular signup.
Remember me selects persistent browser storage; otherwise session storage is used.

## Recovery codes

New regular accounts receive a random 128-bit code. The receipt asks
residents to save it privately before continuing. Only its SHA-256 hash is stored
in the database. Plaintext stays in component memory, not auth storage, and clears
on dismissal. Clipboard failure offers manual copying. Closing signup clears
passwords and keeps non-secret drafts.

Existing residents can use Profile > Manage recovery code and confirm their
current password to replace their code. Old codes cannot be retrieved. Forgot
password accepts username/email, a saved code and matching new passwords. A
transaction locks the account, changes the password, rotates the code and revokes
all sessions. Reset returns a replacement code without signing in automatically.
Session issuance uses the same account lock, so an old-password login in flight
cannot issue a session after reset.
Invalid codes and unavailable accounts share an error. Endpoints are rate limited,
accept JSON and send Cache-Control: no-store.

Email/SMS recovery, contact verification and staff identity-verification resets
are not implemented. Name or phone alone cannot authorize a reset. A resident
without a code needs a valid password to sign in through the current web modal.

## Existing database upgrades

The complete structure is in `src/database/schema.sql`. Historical migration
files have been consolidated and removed. New registration inserts
`recovery_code_hash`, so an older schema cannot serve new signups with this code.
Import the baseline only into an empty database. For an existing environment,
review missing DDL against the baseline before deploying this server version.

1. Check nullable `users.email` and nullable `recovery_code_hash CHAR(64)` against
   the baseline. Preserve existing emails, passwords, roles, assignments and sessions.
2. Obtain database authorization, retain a restorable backup under your database
   backup policy and save a schema snapshot before applying. Keep backups ignored.
3. Run each ALTER separately. TiDB DDL is not one rollbackable transaction. After
   a partial failure, inspect the schema and run only the missing statement.
4. Verify nullable email, CHAR(64) recovery hash, unchanged unique email
   indexes and account counts matching the preflight baseline.
5. Check nullable names/usernames for pending accounts and `profile_completed`
   with default 1 for existing accounts. Preserve unique indexes, existing identity
   values, roles, sessions, assignments and account counts. Apply its statements
   separately after the recovery migration, inspecting schema after partial failure.
6. Restart/redeploy the API, then deploy the frontend/mobile updates. Recovery needs no new
   environment variable or dependency.

Applied both recovery and first-login migrations to the configured database on
2026-10-06 after the user authorized ending the earlier deferral. A fresh SQL
table backup, schema snapshot and checksum manifest are stored privately in the
ignored `server/backups/resident-registration-20261006-verified/` directory.
The backup covers 35 tables; its saved checksum was verified. A restore drill was
not performed. Before/after checks confirmed unchanged row counts and original
column values in every table, all 18 accounts preserved, and unchanged user
indexes. Email/name/username now permit NULL, recovery_code_hash is CHAR(64), and
profile_completed defaults to 1. Existing accounts remain completed with NULL
recovery hashes and can generate a code while signed in. No live signup/setup/
recovery account was created or changed during verification. Other databases
still require a reviewed schema comparison and any missing DDL; fresh databases
use the updated schema.sql.

## Validation limits

Fixture tests cover minimal web signup and legacy missing contacts, setup saving,
street ownership, pending HTTP/socket blocking, code rotation/reuse rejection, blocked
accounts, rollback, session revocation, confirmation,
Remember me, input clearing and secret handling. Tests create/reset no real
account. Stale-password login and session insertion rollback have focused
regression coverage. Tests preserve session token hashing through the executor.
Desktop and phone-width signup/setup layouts are inspected using local fixtures
without entering credentials or creating a real account. UI previews do not prove
the configured database schema changes.

Both native clients accept nullable account email. The native resident signup
keeps its current form and displays the returned recovery receipt before login.
Both mobile type checks passed; native device flows and database-backed concurrent recovery still need
authorized smoke testing.

Configured-database schema checks passed; a real end-to-end signup has not been
performed. Password login, registration, setup, recovery and session issuance
have focused fixture coverage.
