export type AnnouncementType = "Schedule Change" | "Holiday Reminder" | "Community Event" | "Emergency Advisory" | "General Notice" | "System Maintenance";
export type AnnouncementStatus = "Draft" | "Scheduled" | "Active" | "Archived";
export type TargetAudience = "All Residents" | "Specific Barangays";

export interface BarangayReadStat {
  name: string;
  received: number;
  read: number;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  type: AnnouncementType;
  status: AnnouncementStatus;
  targetAudience: TargetAudience;
  targetBarangays: string[];
  targetBarangayIds: string[];
  targetPreset: string | null;
  sentDate: string | null;
  sentAt?: string | null;
  createdAt?: string | null;
  archivedAt?: string | null;
  scheduledDate: string | null;
  expiryDate: string | null;
  expiryLabel?: string | null;
  calendarEventId?: string | null;
  calendarDate?: string | null;
  calendarStartTime?: string | null;
  calendarEndTime?: string | null;
  calendarLocation?: string | null;
  readCount: number;
  totalRecipients: number;
  archived: boolean;
  edited: boolean;
  createdBy: string;
  lastEdited: string;
  barangayReadStats: BarangayReadStat[];
}

export interface EditorForm {
  title: string;
  body: string;
  type: AnnouncementType;
  status: AnnouncementStatus;
  targetAudience: TargetAudience;
  targetBarangays: string[];
  targetPreset: string | null;
  scheduledDate: string;
  expiryDate: string;
  showOnResidentCalendar: boolean;
  calendarDate: string;
}

/**
 * Database timestamps are stored as UTC.  Treat timestamp strings without a
 * timezone as UTC too, so the archive action is consistent in every browser.
 */
export const isAnnouncementExpired = (expiryDate?: string | null): boolean => {
  if (!expiryDate) return false;

  const normalized = /^\d{4}-\d{2}-\d{2}/.test(expiryDate) && !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(expiryDate)
    ? `${expiryDate.replace(" ", "T")}Z`
    : expiryDate;
  const expiryTime = new Date(normalized).getTime();

  return !Number.isNaN(expiryTime) && expiryTime <= Date.now();
};

export const BARANGAYS = [
  "Bukal Norte", "Bukal Sur", "Kinatihan I", "Kinatihan II", "Malabanban Norte",
  "Malabanban Sur", "Mangilag Norte", "Mangilag Sur", "Masalukot I", "Masalukot II",
  "Masalukot III", "Masalukot IV", "Masalukot V", "Mayabobo", "Pahinga Norte",
  "Pahinga Sur", "San Andres", "San Isidro", "Santa Catalina Norte", "Santa Catalina Sur",
  "Sapa", "Taguan", "Poblacion", "Bucal", "Buenavista",
  "Cigaras", "Ibabang Dupay", "Ilayang Dupay", "Isabang", "Masin",
  "Mataas na Lupa", "Pansol", "Rizal", "San Miguel", "Santa Cruz",
  "Santo Angel Central", "Santo Angel Norte", "Santo Angel Sur", "San Jose",
  "San Juan", "San Pablo Norte", "San Pablo Sur", "San Roque",
  "Bagong Silang", "Batis", "Camflora", "Candelaria", "Conception",
  "Consolacion", "Del Remedio", "Langgam", "Liputan", "Mabini",
  "Magsaysay", "Malabag", "Maligaya", "Manggahan", "Pag-asa",
  "San Antonio", "San Bartolome", "San Carlos", "San Francisco",
  "San Nicolas", "Santiago", "Villa Esperanza",
];

export const BODY_CHAR_LIMIT = 500;
export const ITEMS_PER_PAGE = 6;

export const announcementTypeStyles: Record<AnnouncementType, string> = {
  "Schedule Change":
    "bg-background/95 dark:bg-zinc-900/90 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 dark:border-emerald-400/40 backdrop-blur-md shadow-2xs",
  "Holiday Reminder":
    "bg-background/95 dark:bg-zinc-900/90 text-amber-700 dark:text-amber-300 border-amber-500/40 dark:border-amber-400/40 backdrop-blur-md shadow-2xs",
  "Community Event":
    "bg-background/95 dark:bg-zinc-900/90 text-violet-700 dark:text-violet-300 border-violet-500/40 dark:border-violet-400/40 backdrop-blur-md shadow-2xs",
  "Emergency Advisory":
    "bg-background/95 dark:bg-zinc-900/90 text-rose-700 dark:text-rose-300 border-rose-500/40 dark:border-rose-400/40 backdrop-blur-md shadow-2xs",
  "General Notice":
    "bg-background/95 dark:bg-zinc-900/90 text-primary dark:text-emerald-400 border-primary/40 dark:border-primary/40 backdrop-blur-md shadow-2xs",
  "System Maintenance":
    "bg-background/95 dark:bg-zinc-900/90 text-sky-700 dark:text-sky-300 border-sky-500/40 dark:border-sky-400/40 backdrop-blur-md shadow-2xs",
};
