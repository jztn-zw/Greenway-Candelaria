import { Announcement, BarangayReadStat } from "./types";

const generateReadStats = (barangays: string[], total: number, readCount: number): BarangayReadStat[] => {
  if (barangays.length === 0) {
    const defaultBrgys = ["Poblacion", "Rizal", "San Miguel", "Bukal Norte", "Bukal Sur"];
    const perBrgy = Math.floor(total / defaultBrgys.length);
    const readRatio = total > 0 ? readCount / total : 0;
    return defaultBrgys.map((name, i) => ({
      name,
      received: perBrgy + (i === 0 ? total % defaultBrgys.length : 0),
      read: Math.floor((perBrgy + (i === 0 ? total % defaultBrgys.length : 0)) * (readRatio * (0.6 + Math.random() * 0.8))),
    }));
  }
  const perBrgy = Math.floor(total / barangays.length);
  const readRatio = total > 0 ? readCount / total : 0;
  return barangays.map((name, i) => ({
    name,
    received: perBrgy + (i === 0 ? total % barangays.length : 0),
    read: Math.min(perBrgy + (i === 0 ? total % barangays.length : 0), Math.floor((perBrgy) * (readRatio * (0.5 + Math.random() * 1.0)))),
  }));
};

export const initialAnnouncements: Announcement[] = [
  {
    id: "a1", title: "Holiday Collection Schedule – Holy Week 2026",
    body: "Due to the Holy Week holiday, waste collection in all barangays will be suspended from April 2–5, 2026. Regular schedule resumes April 6. Please store your waste securely and avoid leaving bins outside during this period.",
    type: "Holiday Reminder", priority: "Urgent", status: "Active",
    targetAudience: "All Residents", targetBarangays: [], targetPreset: null,
    pinned: true, featured: true, sentDate: "Mar 28, 2026", scheduledDate: null,
    expiryDate: "Apr 7, 2026", readCount: 1842, totalRecipients: 3200,
    archived: false, edited: false, createdBy: "Admin", lastEdited: "Mar 28, 2026",
    barangayReadStats: generateReadStats([], 3200, 1842),
  },
  {
    id: "a2", title: "Emergency: Flooding in Coastal Barangays – Skip Collection",
    body: "Due to heavy rainfall and flooding, waste collection in coastal barangays is temporarily suspended. Trucks will resume once roads are clear. Stay safe and keep waste indoors.",
    type: "Emergency Advisory", priority: "Emergency", status: "Active",
    targetAudience: "Barangay Group Preset", targetBarangays: ["Sapa", "Pahinga Norte", "Pahinga Sur", "Bucal", "Buenavista"], targetPreset: "Coastal Barangays",
    pinned: false, featured: false, sentDate: "Mar 27, 2026", scheduledDate: null,
    expiryDate: "Apr 2, 2026", readCount: 487, totalRecipients: 620,
    archived: false, edited: true, createdBy: "Admin", lastEdited: "Mar 27, 2026",
    barangayReadStats: generateReadStats(["Sapa", "Pahinga Norte", "Pahinga Sur", "Bucal", "Buenavista"], 620, 487),
  },
  {
    id: "a3", title: "New Biodegradable Collection Day for Zone A",
    body: "Starting April 1, biodegradable waste in Zone A barangays will be collected on Tuesdays and Fridays instead of the previous Monday-Thursday schedule. Please adjust accordingly.",
    type: "Schedule Change", priority: "Normal", status: "Active",
    targetAudience: "Barangay Group Preset", targetBarangays: ["Poblacion", "Rizal", "San Miguel", "Santa Cruz", "Mabini"], targetPreset: "Zone A",
    pinned: false, featured: false, sentDate: "Mar 25, 2026", scheduledDate: null,
    expiryDate: "May 1, 2026", readCount: 312, totalRecipients: 890,
    archived: false, edited: false, createdBy: "Admin", lastEdited: "Mar 25, 2026",
    barangayReadStats: generateReadStats(["Poblacion", "Rizal", "San Miguel", "Santa Cruz", "Mabini"], 890, 312),
  },
  {
    id: "a4", title: "System Maintenance – App Downtime Notice",
    body: "The GreenWay resident app will undergo scheduled maintenance on April 3, 2026, from 12:00 AM to 4:00 AM. During this time, truck tracking and report submission will be temporarily unavailable.",
    type: "System Maintenance", priority: "Normal", status: "Scheduled",
    targetAudience: "All Residents", targetBarangays: [], targetPreset: null,
    pinned: false, featured: false, sentDate: null, scheduledDate: "2026-04-02T18:00",
    expiryDate: "Apr 4, 2026", readCount: 0, totalRecipients: 3200,
    archived: false, edited: false, createdBy: "Admin", lastEdited: "Mar 26, 2026",
    barangayReadStats: [],
  },
  {
    id: "a5", title: "Monthly Reminder: Proper Waste Segregation",
    body: "A friendly reminder to all residents: please segregate your waste into biodegradable, non-biodegradable, and recyclable before placing them at your designated collection points.",
    type: "General Notice", priority: "Normal", status: "Draft",
    targetAudience: "All Residents", targetBarangays: [], targetPreset: null,
    pinned: false, featured: false, sentDate: null, scheduledDate: null,
    expiryDate: null, readCount: 0, totalRecipients: 3200,
    archived: false, edited: false, createdBy: "Admin", lastEdited: "Mar 24, 2026",
    barangayReadStats: [],
  },
  {
    id: "a6", title: "Barangay Clean-Up Drive – March 2026",
    body: "Join us for the monthly community clean-up drive across all barangays. Volunteers can register through the app or visit their barangay hall.",
    type: "General Notice", priority: "Normal", status: "Active",
    targetAudience: "All Residents", targetBarangays: [], targetPreset: null,
    pinned: false, featured: false, sentDate: "Mar 10, 2026", scheduledDate: null,
    expiryDate: "Mar 20, 2026", readCount: 2100, totalRecipients: 3200,
    archived: false, edited: false, createdBy: "Admin", lastEdited: "Mar 10, 2026",
    barangayReadStats: generateReadStats([], 3200, 2100),
  },
  {
    id: "a7", title: "Schedule Adjustment: Upland Barangays Route Change",
    body: "Due to road repairs in Mataas na Lupa and Masin, the collection truck will take an alternate route starting March 15. Please place bins along the main road.",
    type: "Schedule Change", priority: "Urgent", status: "Archived",
    targetAudience: "Barangay Group Preset", targetBarangays: ["Mataas na Lupa", "Masin", "Isabang", "Cigaras"], targetPreset: "Upland Barangays",
    pinned: false, featured: false, sentDate: "Mar 12, 2026", scheduledDate: null,
    expiryDate: "Mar 25, 2026", readCount: 198, totalRecipients: 350,
    archived: true, edited: false, createdBy: "Admin", lastEdited: "Mar 12, 2026",
    barangayReadStats: generateReadStats(["Mataas na Lupa", "Masin", "Isabang", "Cigaras"], 350, 198),
  },
  {
    id: "a8", title: "Welcome to GreenWay – Getting Started Guide",
    body: "Welcome, residents! This is your guide to using the GreenWay app for collection schedules, truck tracking, and reporting. Check the Contents section for tips.",
    type: "General Notice", priority: "Normal", status: "Active",
    targetAudience: "All Residents", targetBarangays: [], targetPreset: null,
    pinned: false, featured: false, sentDate: "Feb 28, 2026", scheduledDate: null,
    expiryDate: null, readCount: 2890, totalRecipients: 3200,
    archived: false, edited: true, createdBy: "Admin", lastEdited: "Mar 5, 2026",
    barangayReadStats: generateReadStats([], 3200, 2890),
  },
];
