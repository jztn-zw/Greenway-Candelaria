export type LegalDocumentId = "terms" | "privacy";

export interface LegalSection {
  id: string;
  title: string;
  paragraphs: string[];
  points?: string[];
}

export interface LegalDocument {
  title: string;
  description: string;
  summary: string;
  sections: LegalSection[];
}

// These are review drafts, not an assertion of municipal approval or an
// effective privacy policy. See client/docs/legal-notices.md before release.
export const LEGAL_REVIEW_NOTE = "Prepared for GreenWay’s thesis evaluation and proposed handover to MENRO Candelaria. These documents require review and approval before official public deployment.";
export const LEGAL_PREPARED_DATE = "15 October 2026";

export const LEGAL_DOCUMENTS: Record<LegalDocumentId, LegalDocument> = {
  terms: {
    title: "Terms of Use",
    description: "Clear guidelines for using GreenWay responsibly and staying connected with local waste collection services.",
    summary: "Use your own account, submit accurate reports, and protect your sign-in details. Tracking helps you follow collection progress; it does not guarantee an arrival time.",
    sections: [
      {
        id: "about-greenway", title: "About GreenWay",
        paragraphs: ["GreenWay is a thesis-developed waste-management website and companion app intended for handover to the Municipal Environment and Natural Resources Office (MENRO) of Candelaria, Quezon. It supports collection schedules, truck tracking, waste reports, and community information.", "These terms are a proposed framework for that service. They do not represent an approved municipal ordinance or policy. The responsible operator and final service terms must be confirmed as part of the handover."],
      },
      {
        id: "your-account", title: "Your Account and Security",
        paragraphs: ["Create an account using a username and password. To access resident features, provide your name and select your actual barangay and a listed street. Email and phone contact details are optional and can be updated in your profile."],
        points: ["Keep your password and recovery code private. Use your own account and do not impersonate another resident, collector, or MENRO officer.", "Provide accurate profile information and correct it when your collection address changes.", "Log out on shared devices. Use Remember Me only on a device you trust.", "If you need help understanding these terms or using the service, ask a trusted adult or contact MENRO for assistance."],
      },
      {
        id: "collection-information", title: "Schedules and Truck Tracking",
        paragraphs: ["The weekly guide explains the regular waste-type schedule. Your collection area and the assigned route determine the collection information shown in your resident account. Follow MENRO’s official collection instructions.", "Truck positions and progress depend on collector activity, GPS availability, and network connectivity. A scheduled route has not necessarily started. A displayed location may be the last received position, and estimates may differ from the actual arrival time.", "Submitting a report does not change the regular collection schedule or guarantee a collection visit at a particular time."],
      },
      {
        id: "reports", title: "Reports and Uploaded Photos",
        paragraphs: ["Use GreenWay to report genuine waste concerns, such as missed collection, illegal dumping, overflowing bins, or improper segregation. Give a clear description and an accurate location or landmark so MENRO can assess the concern."],
        points: ["Upload photos you have permission to use and that are relevant to the report.", "Avoid including identity documents, private contact details, recognisable bystanders, or other unrelated personal information in your photos and descriptions.", "Do not submit deliberately false, abusive, threatening, discriminatory, or repeatedly duplicated reports.", "A submitted report is a request for assessment. Its status reflects the recorded review or handling progress; it is not a finding of legal liability against any person."],
      },
      {
        id: "acceptable-use", title: "Responsible Use",
        paragraphs: ["Use GreenWay for its intended waste-management and community-service purposes."],
        points: ["Do not attempt to access another person’s account, private reports, restricted records, or staff functions.", "Do not interfere with the service, bypass security controls, distribute malicious files, or manipulate route and GPS information.", "Do not copy or republish personal information obtained through the service. Respect the rights of people appearing in reports and photos."],
      },
      {
        id: "account-access", title: "Account Access and Deletion",
        paragraphs: ["Authorised administrators may restrict an account when it is banned or otherwise unavailable under the system’s account controls. Contact MENRO to ask about an account restriction or request a review.", "Residents can permanently delete their account through Profile after confirming their current password. Deletion removes profile and contact details, ends all sessions, and prevents login or recovery from restoring the account. Submitted reports and historical audit records remain for municipal records. See the Privacy Notice for other data requests."],
      },
      {
        id: "availability", title: "Availability and Other Services",
        paragraphs: ["Maintenance, device limitations, and connectivity problems can affect access. GreenWay cannot promise uninterrupted access, continuous live GPS, or a fixed response time for reports.", "Maps, uploaded images, and external links may use third-party services. Their availability and handling of requests are also subject to those providers’ terms and privacy notices.", "GreenWay reports are not an emergency response channel. For an immediate threat to health or safety, contact the appropriate local emergency service."],
      },
      {
        id: "updates-and-questions", title: "Updates and Questions",
        paragraphs: ["The approved operator should publish the effective version and communicate material changes before they take effect where required. This document currently carries a preparation date because it remains a review draft.", "These draft terms are prepared for use in the Philippines and must be reviewed against applicable law and municipal policies. They do not remove any rights provided by law. For questions about municipal waste services, use the MENRO contact details below."],
      },
    ],
  },
  privacy: {
    title: "Privacy Notice",
    description: "Understand what GreenWay handles, why it is needed, and how you can ask questions about your information.",
    summary: "Your collection address supports area-specific services. Contact details are optional. Deleting your account removes your profile but preserves submitted reports and historical audit records.",
    sections: [
      {
        id: "responsibility", title: "Who Is Responsible for Your Information",
        paragraphs: ["GreenWay is currently a thesis-developed system intended for handover to MENRO Candelaria, Quezon. Its final personal information controller, project-team responsibilities during evaluation, and designated privacy contact have not yet been confirmed for public deployment.", "This is a draft notice for review. MENRO’s municipal service contact details appear below; listing them does not mean that MENRO has already approved this notice or assumed responsibility for the project’s current data processing."],
      },
      {
        id: "information", title: "Information GreenWay Handles",
        paragraphs: ["The information handled depends on the features you use and your assigned role."],
        points: ["Account and profile: username, name, password hash, recovery-code hash, selected avatar, account status, barangay, and street. Email and phone number are optional contact details.", "Waste reports: concern type, description, barangay, street or landmark, photos, an optional map pin, report reference, status, and responses. Reports are linked to the submitting resident’s account.", "Service activity: notifications, preferences, account sessions, and records of actions needed to operate and protect the service. Security and audit records can include IP address, browser or device information, and timestamps.", "Collector operations: assigned truck and route, stop progress and outcomes, GPS positions, and associated timestamps when tracking is used. Collector GPS is operational vehicle tracking; the resident website does not continuously track a resident’s live location."],
      },
      {
        id: "purposes", title: "How the Information Is Used",
        paragraphs: ["GreenWay uses account and service information to provide sign-in, match residents to their collection area, display authorised schedule and tracking information, handle reports, deliver in-system updates, manage accounts, and investigate misuse or technical issues.", "MENRO may use the email or phone number you choose to save to request more details or follow up on a waste report. You can leave both blank or update them later. Providing a contact email does not enable email sign-in or automatically enrol you in email notifications.", "GreenWay is intended for municipal waste services. Accepting the Terms is not blanket consent for unrelated use of personal information. The responsible operator must confirm and document the lawful basis for each processing activity, including any public-service authority and any optional processing that requires consent, before public deployment."],
      },
      {
        id: "access-and-providers", title: "Access and Service Providers",
        paragraphs: ["GreenWay restricts account and operational features by role and assigned scope. Authorised MENRO administrators can review resident profiles and reports for service handling. The final operator must confirm who else is authorised to access records and the conditions for any lawful disclosure.", "Uploaded report photos use Cloudinary. Maps use OpenStreetMap tiles, and a configured routing provider may receive route coordinates. External providers can receive request information such as IP address when their services are loaded. Hosting providers, processing locations, contractual safeguards, and any cross-border processing must be confirmed before deployment.", "Report photos use image links that may be accessible to anyone who has the direct link. Do not upload identity documents, sensitive personal records, or unrelated people’s information. Restricted access to a report screen should not be treated as a guarantee that every uploaded photo is private."],
      },
      {
        id: "browser-storage", title: "Browser Storage and Device Choices",
        paragraphs: ["The website uses browser storage to maintain sign-in and interface preferences. Remember Me keeps sign-in information in persistent local storage; an unremembered session uses session storage. Signing out clears the local authentication data and requests session revocation.", "Theme and other interface preferences may remain on the device. Clearing browser data can reset preferences and sign you out. You can control device permissions and notification preferences where those options are available. Refusing collector GPS permission can prevent live tracking from functioning."],
      },
      {
        id: "retention", title: "Retention and Account Deactivation",
        paragraphs: ["The project does not yet have a confirmed, approved retention period for each category of account, report, message, audit, or GPS record. The responsible operator must set the retention schedule, legal recordkeeping requirements, backup handling, and secure disposal process before public deployment.", "Account deletion removes current profile and contact details, login and recovery credentials, sessions, inbox notifications, and preferences. Reports remain linked to a Deleted Resident record. Report contents, photos, and historical audit snapshots are retained; deleting an account does not erase every historical mention or backup. Other erasure requests must be assessed against the applicable recordkeeping requirements."],
      },
      {
        id: "security", title: "Protecting Your Information",
        paragraphs: ["The system uses hashed passwords and recovery codes, authenticated sessions, role-based access controls, and security records. These measures reduce risk but do not guarantee that every incident can be prevented.", "Protect your device, password, and recovery code. Report suspected unauthorised access through the confirmed operator’s support channel. The final operator must establish incident-response responsibilities and any required breach-notification process before deployment."],
      },
      {
        id: "your-rights", title: "Your Rights and Privacy Requests",
        paragraphs: ["Under the Philippine Data Privacy Act of 2012, you may have rights to be informed, access and correct personal information, object to certain processing, request erasure or blocking, obtain data portability where applicable, and seek redress. These rights are subject to applicable legal conditions and exceptions.", "You can edit your available profile details in GreenWay. For other requests, the designated operator should verify your identity, explain the outcome, and handle the request through its confirmed privacy channel. Do not send your password or recovery code as proof of identity.", "The project team must provide its evaluation-stage privacy contact, and the Municipality/MENRO must confirm the appropriate controller and Data Protection Officer contact for handover. You may also raise a privacy concern with the National Privacy Commission."],
      },
      {
        id: "notice-updates", title: "Changes to This Notice",
        paragraphs: ["A final notice should identify the responsible operator, actual processing arrangements, retention periods, and privacy contact, and carry an effective date. Material changes should be communicated as required before any new processing begins. The preparation date shown here identifies this review draft."],
      },
    ],
  },
};
