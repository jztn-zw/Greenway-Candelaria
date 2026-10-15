# Username signup and optional resident contacts

Updated web and resident-app clients register with `username`, `password`, `confirm_password`, and `terms_accepted`. The API reserves the unique username immediately, creates an incomplete resident profile, and returns a recovery code once. Only its hash is stored. No database migration or record backfill is required.

Normal updated clients send `login_mode: "username"` with the existing `identifier`/`password` contract. The server looks up only the username. Full names and contact email are not accepted through this mode. Existing collector usernames containing punctuation remain valid login identifiers.

Sign-in accepts usernames only across web, native and API clients. The earlier email-only setup transition has been removed; after the database reset, residents create fresh username-based accounts.

Setup stores full name and collection area in a transaction. Completing setup requires a street belonging to the selected barangay, regardless of collection-service availability. Barangays without listed streets block completion until MENRO adds the resident's street; web and native clients explain this and the API enforces it. Email and Philippine contact phone are optional; supplied values are validated. An optional `avatar_url` must match one of the ten existing profile portraits and is saved in the same transaction. Older clients that omit it preserve the current avatar. The username reserved at signup cannot be overwritten during setup. Repeated completed setup requests do not overwrite existing profiles. Email uniqueness errors roll back the transaction.

Residents can later add, update or remove contacts through Profile. Email edits are restricted to resident accounts. These contacts support MENRO follow-up; this change does not implement email delivery or email verification. Recovery continues to require the saved recovery code, rotates it after a reset and revokes prior sessions. Bans remain authoritative regardless of profile completion.

Password reset now submits only `recovery_code`, `new_password`, and `confirm_password`. The API normalizes the random 128-bit recovery code, looks up its SHA-256 hash under a transaction lock, and rejects missing or ambiguous owners. Username and contact email are not recovery credentials. Recovery attempts share a per-IP quota regardless of extra identity fields. Rotation and session revocation commit together; restricted accounts remain restricted. The baseline includes a recovery-hash lookup index. Existing installations can review `migrations/2026-10-15-recovery-code-lookup.sql`; it is prepared only, not applied automatically.

Admin Resident Manager uses the username when a full name is not yet available and displays "Profile Incomplete" separately from account status. Report details link to their owner’s resident profile using the existing authorized endpoint.

Restart the API and deploy the updated web/native clients together. Automated verification uses mocks and isolated local HTTP servers. Browser and device smoke checks have not been run.
