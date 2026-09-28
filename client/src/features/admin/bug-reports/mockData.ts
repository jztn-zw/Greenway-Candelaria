export const BUG_STATUSES = ["New", "Under review", "Resolved"] as const;
export type BugStatus = (typeof BUG_STATUSES)[number];
export const BUG_APPS = ["Resident app", "Collector app", "Website"] as const;
export type BugApp = (typeof BUG_APPS)[number];

export interface BugReport {
  id: string;
  title: string;
  category: string;
  reporter: string;
  email: string;
  role: "Resident" | "Collector";
  app: BugApp;
  device: string;
  version: string;
  submittedAt: string;
  status: BugStatus;
  description: string;
  steps: string[];
  response: string;
  history: { status: BugStatus; at: string; by: string }[];
}

const samples: Omit<BugReport, "history">[] = [
  {
    id: "BUG-2026-012", title: "Collection reminder does not appear", category: "Notifications",
    reporter: "Mariel Santos", email: "mariel.santos@example.com", role: "Resident", app: "Resident app",
    device: "Samsung Galaxy A15 · Android 14", version: "2.0.0", submittedAt: "2026-09-28T08:42:00+08:00", status: "New",
    description: "Notifications are enabled, but I did not receive a reminder for today's collection in Poblacion. The schedule still appears correctly in the app.",
    steps: ["Enable collection reminders in settings.", "Check the upcoming collection schedule.", "Wait for the reminder before collection."], response: "",
  },
  {
    id: "BUG-2026-011", title: "Route map stays blank after opening", category: "Map & tracking",
    reporter: "Rogelio Mendoza", email: "rogelio.mendoza@example.com", role: "Collector", app: "Collector app",
    device: "OPPO A78 · Android 13", version: "2.0.0", submittedAt: "2026-09-27T15:18:00+08:00", status: "New",
    description: "The assigned route loads, but the map area remains blank even with mobile data and location enabled. Restarting the app does not help.",
    steps: ["Sign in and open today's route.", "Allow location access.", "Open the route map."], response: "",
  },
  {
    id: "BUG-2026-010", title: "Photo upload stops before submission", category: "Waste reporting",
    reporter: "Ana Villanueva", email: "ana.villanueva@example.com", role: "Resident", app: "Resident app",
    device: "Redmi Note 12 · Android 14", version: "2.0.0", submittedAt: "2026-09-26T10:05:00+08:00", status: "Under review",
    description: "Adding three photos to a waste report leaves the upload indicator running. I can submit successfully with only one photo.",
    steps: ["Create a waste report.", "Attach three photos from the gallery.", "Tap Submit report."], response: "We are checking photo uploads. Please try one photo at a time while we investigate.",
  },
  {
    id: "BUG-2026-009", title: "Schedule shows the previous barangay", category: "Collection schedule",
    reporter: "Paolo Reyes", email: "paolo.reyes@example.com", role: "Resident", app: "Website",
    device: "Chrome 140 · Windows 11", version: "2.0.0", submittedAt: "2026-09-25T13:37:00+08:00", status: "Under review",
    description: "After changing my barangay in my profile, the collection schedule still shows my old barangay until I refresh the page.",
    steps: ["Change the barangay in Profile.", "Save the changes.", "Open Collection schedule without refreshing."], response: "We have reproduced the issue and shared it with the development team.",
  },
  {
    id: "BUG-2026-008", title: "Saved profile photo appears sideways", category: "Profile & account",
    reporter: "Liza Bautista", email: "liza.bautista@example.com", role: "Resident", app: "Resident app",
    device: "iPhone 13 · iOS 18", version: "2.0.0", submittedAt: "2026-09-24T09:26:00+08:00", status: "New",
    description: "A portrait photo looks correct when selected, but it is rotated after saving it as my profile photo.",
    steps: ["Open Edit profile.", "Select a portrait photo from the gallery.", "Save and return to the profile."], response: "",
  },
  {
    id: "BUG-2026-007", title: "Completed stop count does not refresh", category: "Route & collection",
    reporter: "Ernesto Ramos", email: "ernesto.ramos@example.com", role: "Collector", app: "Collector app",
    device: "Samsung Galaxy A24 · Android 14", version: "2.0.0", submittedAt: "2026-09-23T11:52:00+08:00", status: "Under review",
    description: "The checkpoint is marked complete, but the dashboard stop count still shows the previous number until I reopen the dashboard.",
    steps: ["Start the assigned route.", "Mark a checkpoint complete.", "Return to the dashboard and check completed stops."], response: "The team is reviewing how completed stops refresh on the dashboard.",
  },
  {
    id: "BUG-2026-006", title: "Announcement text is cut off on mobile", category: "Display & navigation",
    reporter: "Camille Garcia", email: "camille.garcia@example.com", role: "Resident", app: "Website",
    device: "Safari · iPhone SE", version: "2.0.0", submittedAt: "2026-09-22T16:14:00+08:00", status: "Resolved",
    description: "Long announcement titles are cut off on my phone, and I cannot read the full title after opening the announcement.",
    steps: ["Open announcements on a small screen.", "Select an announcement with a long title."], response: "Announcement titles now wrap correctly on smaller screens.",
  },
  {
    id: "BUG-2026-005", title: "Password visibility button does not respond", category: "Profile & account",
    reporter: "Noel Flores", email: "noel.flores@example.com", role: "Collector", app: "Collector app",
    device: "vivo Y36 · Android 13", version: "2.0.0", submittedAt: "2026-09-21T07:33:00+08:00", status: "Resolved",
    description: "Tapping the eye icon on the sign-in form does not reveal the password, so it is difficult to check typing mistakes.",
    steps: ["Open the sign-in screen.", "Enter a password.", "Tap the password visibility button."], response: "The password visibility button now responds correctly.",
  },
];

// Deliberately isolated from API services. Edits last only while this page is mounted.
export const mockBugReports: BugReport[] = samples.map((report) => ({
  ...report,
  history: [
    { status: "New", at: report.submittedAt, by: report.reporter },
    ...(report.status !== "New" ? [{ status: "Under review" as const, at: new Date(new Date(report.submittedAt).getTime() + 3_600_000).toISOString(), by: "MENRO Admin" }] : []),
    ...(report.status === "Resolved" ? [{ status: "Resolved" as const, at: new Date(new Date(report.submittedAt).getTime() + 86_400_000).toISOString(), by: "MENRO Admin" }] : []),
  ],
}));

export const statusStyles: Record<BugStatus, string> = {
  New: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  "Under review": "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  Resolved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
};

export const formatBugDate = (value: string) => new Intl.DateTimeFormat("en-PH", {
  month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila",
}).format(new Date(value));
