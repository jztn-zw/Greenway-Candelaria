# Website action feedback

Admin, resident, collector and public authentication screens use `src/lib/toast.ts`.
Success, information and warning messages are no longer suppressed based on wording.
Errors retain the affected action and a safe description, including domain rejection
reasons returned by the API. Identical error toasts reuse an ID to avoid stacking.

Use the existing semantic toast styles. For asynchronous actions, show success only
after the operation resolves. For failures, use an action-specific title and
`getActionErrorMessage(error)` as the description. Known validation/business reasons
stay visible; internal server failures and implementation details use safe fallback
copy. Network and timeout messages explain how to retry. Never put passwords,
recovery codes, session tokens or server diagnostics in a toast.

## Reviewed website actions

| Area | Feedback ownership |
| --- | --- |
| Admin announcements | Mutation hook confirms save/send/archive/restore/duplicate/delete/resend/cancel; editor reports failed saves. |
| Posts | Manager confirms publication/feature/archive/restore/duplicate/save/delete; editor reports failed saves and upload outcomes. |
| Event and route management | Parent/hook confirms saves and state changes; editors report failed saves. Collector collection actions retain their existing action/reason feedback. |
| Accounts and vehicles | Managers confirm mutations; editors report failed saves. Profile, password, avatar, resident setup and deletion actions provide feedback. |
| Barangays and streets | Saves, service availability, deletion and street coverage provide feedback. |
| Waste reports | Submission, withdrawal, status, notes, review flags and deletion provide feedback. Detail panel owns status feedback to prevent duplicate parent/child toasts. |
| Notifications/settings | Explicit bulk-read, history clear and preference changes provide feedback. Automatic read receipts do not produce success popups. |
| Messaging | Send confirms delivery or exposes failure; existing retry/draft behavior remains. |
| Clipboard/download/export | Existing export feedback is retained. Clipboard success follows the write, and blocked writes provide manual-copy instructions. |
| Authentication | Sign-in, registration, recovery and sign-out provide feedback. Delayed sign-out does not show feedback over a newer session. |

Navigation, filtering, pagination, map controls, theme previews, draft editing and
field validation retain their direct/inline feedback. Background polling, read
receipts and GPS sampling do not generate routine success toasts. Persistent GPS,
permission and loading states retain their existing inline retry/status UI.

The web API normalizer also sanitizes both `error.message` and
`error.response.data.message`, covering existing callers using either form.
It does not globally emit toasts for requests or retry background writes.
