# GreenWay terms and privacy drafts

Status: **saved for later; not enabled in the website**. The draft page component and content remain in `src/features/landing/legal/`. The `/terms` and `/privacy` routes and signup/footer links have been removed at the owner's request. The existing signup Terms and Privacy Policy text remains unchanged.

When approved for integration, register the public routes and use signup links that open in a new tab to preserve the form draft. Distinguish agreement to the terms from acknowledgment of the privacy notice; do not treat either as blanket consent to unrelated data processing.

The owner described GreenWay as a thesis project to be handed to MENRO after the defense. The pages therefore explicitly remain **review drafts**, with a preparation date rather than an effective date. Do not remove that status based only on a code release or thesis defense.

Before official public deployment, confirm and replace draft language with:

- The personal information controller and the project team's evaluation-stage responsibilities. Municipal handover must not be inferred from the landing-page branding.
- The designated privacy/DPO contact and a procedure for access, correction, objection, erasure/blocking, portability where applicable, and complaints.
- The lawful basis for each processing purpose, and separate consent where required. Optional contact details are not marketing consent.
- Approved retention/disposal periods for accounts, reports and images, messages, audit/security records, GPS history, and backups. Resident account deletion removes the current profile and access credentials; municipal reports, historical audit snapshots and backups are not automatically purged.
- Actual hosting/processors, routing configuration, data locations and cross-border safeguards. The reviewed implementation uses Cloudinary image links and OpenStreetMap tiles. Report photos are not protected simply because the report screen requires authentication; consider restricted image delivery before collecting sensitive images.
- Security and incident-response responsibilities, age/guardian rules if applicable, approved service terms, the effective date, and how material changes will be communicated.
- Appropriate acceptance/version evidence if an approved policy requires it. The existing signup request uses `terms_accepted`; this change does not add a policy-version or acceptance-time ledger.

Use fixtures for thesis evaluation while the responsible operator and deployment arrangements are unresolved. This document does not authorise collecting real resident data or applying any database change.

References checked on 15 October 2026:

- [National Privacy Commission: Data Privacy Act of 2012](https://privacy.gov.ph/data-privacy-act-/)
- [National Privacy Commission: Right to Be Informed](https://privacy.gov.ph/the-right-to-be-informed/)

Recheck the notice against actual operational practice whenever account, contact, reporting, location, provider, or retention behavior changes.
