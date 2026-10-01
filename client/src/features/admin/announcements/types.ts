import { getCategoryBadgeColors } from "@/components/ui/badgeStyles";
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

export const announcementTypeStyles: Record<AnnouncementType, string> = {
  "Schedule Change":
    getCategoryBadgeColors("Schedule Change").className,
  "Holiday Reminder":
    getCategoryBadgeColors("Holiday Reminder").className,
  "Community Event":
    getCategoryBadgeColors("Community Event").className,
  "Emergency Advisory":
    getCategoryBadgeColors("Emergency Advisory").className,
  "General Notice":
    getCategoryBadgeColors("General Notice").className,
  "System Maintenance":
    getCategoryBadgeColors("System Maintenance").className,
};
