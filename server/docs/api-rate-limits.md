# API spam protection

Limits use the installed `express-rate-limit` middleware. They run before the
affected business controller and, for uploads, before multipart processing.
Authenticated limits use the server-verified account ID, never a submitted ID.
Authentication, role checks, transactions, GPS sample validation, historical
records, notifications and existing duplicate/terminal-action guards stay intact.

| Action | Limit | Counter |
| --- | --- | --- |
| Login burst | 60 requests/minute, including successful requests | IP/subnet |
| Login failures | 10/15 minutes | IP/subnet + normalized attempted identifier |
| Login failures across identifiers | 100/15 minutes | IP/subnet |
| Registration | 20 attempts/hour, including successful requests | IP/subnet |
| Password recovery | 5 attempts/15 minutes; 20 across identifiers | IP/subnet + identifier; IP/subnet |
| Replace recovery code | 5 attempts/15 minutes | Account |
| Change password | 10 attempts/15 minutes | Account |
| Profile/setup writes | 30/minute | Account |
| Settings writes | 60/minute | Account |
| Uploads (avatar, report photos, post image) | 30/15 minutes combined | Account |
| Create waste report | 3/minute and 20/hour | Account |
| Messages (web conversation and legacy admin dispatch) | 20/minute combined | Account |
| Collector breakdown reports | 5/minute | Account, separate from messages |
| Collector status | 30/minute | Account, separate from messages |
| GPS | Existing 30/minute | Account, separate from other actions |
| Live tracking/history | Existing 120/minute combined | Account |
| Road routing/coverage lookup | Existing 60/minute combined | Account |

The numbers are initial operational limits, not a guarantee against all spam.
Review false positives and traffic before tightening them. Shared public Wi-Fi
still shares public signup/IP ceilings; signed-in residents have separate quotas.
Dashboard/search/realtime polling and route lifecycle endpoints have no new quota.
No automatic account bans, CAPTCHA or new infrastructure are introduced.

## Cooldown responses

Blocked requests return HTTP 429, `Retry-After`, the standard rate-limit headers,
and JSON containing `success: false`, `code: "RATE_LIMITED"`, `retryAfterSeconds`,
`message` and `requestId`. CORS exposes these headers to the web portal.
The web login/signup forms display separate inline live countdowns and disable
submission during their cooldowns, including Enter-key submissions. Cooldown
expiries survive dialog reopening and page refresh in the same tab; passwords
are never stored with them. Expiry re-enables submission without resending it.
There is no global rate-limit toast. All three shared API clients preserve the
session and expose the wait duration. Their default query
policies do not automatically retry a 429; existing ordinary-error retry budgets
and role-specific no-retry policies are retained. No mutation is auto-resubmitted.
Existing polling intervals and GPS sending/reconnect behavior remain unchanged.

## Audit behavior

Original failed-login events remain unchanged. Requests rejected by a limiter
never reach that login or other business controller. Blocked requests are counted
in memory and written as `RATE_LIMITED` summaries once per minute, containing
policy, actor if authenticated, IP, count and UTC first/last blocked timestamps.
No request body, attempted identifier, password, recovery code or token is logged.
The web audit table displays the blocked count; anonymous summaries show Visitor.

At most 200 policy/actor/IP groups plus one overflow aggregate are buffered per
batch. Writes are sequential and overlapping flushes are prevented. These extra
summaries are best-effort: a restart or audit database failure can lose a batch;
original persisted failed-login events remain available.

## Deployment

Counters are process-local, matching the current installation. A restart resets
them. Multiple API processes/replicas require a shared counter store before these
limits can be treated as deployment-wide. Redis and distributed limits are deferred
until the hosting topology is known.

Leave `TRUST_PROXY` unset for direct connections. Behind a reverse proxy, set it
only to that deployment's actual proxy IPs/CIDR ranges (comma-separated). Do not
trust arbitrary forwarded headers or use `true`/a guessed hop count. An incorrect
setting can either group all visitors under the proxy IP or permit IP spoofing.
IPv6 IP limits use the library's default /56 subnet grouping; attempted identities
are normalized and HMAC hashed with a process-local key for login/recovery counters.

Tests use fixture controllers/database writes and a temporary localhost server.
They cover successful signup limits, auth quota separation, rotating login targets,
account isolation on shared Wi-Fi, upload/report limits, collector action/GPS
separation, expiry, authorization, blocked-controller suppression, and audit batching.
Web tests cover cooldowns, session isolation, retry budgets and all three clients'
wait-duration parsing, including the actual mobile API interceptors. Proxy, IPv6,
audit overflow/overlap and authenticated security/profile quotas have fixture
regressions. No real database reset or browser/device traffic is needed.
