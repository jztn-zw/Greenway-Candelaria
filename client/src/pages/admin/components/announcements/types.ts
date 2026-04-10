export type AnnouncementType = "Schedule Change" | "Holiday Reminder" | "Emergency Advisory" | "General Notice" | "System Maintenance";
export type AnnouncementPriority = "Normal" | "Urgent" | "Emergency";
export type AnnouncementStatus = "Draft" | "Scheduled" | "Active" | "Archived";
export type TargetAudience = "All Residents" | "Specific Barangays" | "Barangay Group Preset";

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
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  targetAudience: TargetAudience;
  targetBarangays: string[];
  targetPreset: string | null;
  pinned: boolean;
  featured: boolean;
  sentDate: string | null;
  scheduledDate: string | null;
  expiryDate: string | null;
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
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  targetAudience: TargetAudience;
  targetBarangays: string[];
  targetPreset: string | null;
  featured: boolean;
  scheduledDate: string;
  expiryDate: string;
}

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

export const BARANGAY_PRESETS: Record<string, string[]> = {
  "Coastal Barangays": ["Sapa", "Pahinga Norte", "Pahinga Sur", "Bucal", "Buenavista"],
  "Zone A": ["Poblacion", "Rizal", "San Miguel", "Santa Cruz", "Mabini"],
  "Zone B": ["Bukal Norte", "Bukal Sur", "Kinatihan I", "Kinatihan II", "Masalukot I"],
  "Upland Barangays": ["Mataas na Lupa", "Masin", "Isabang", "Cigaras"],
};

export const BODY_CHAR_LIMIT = 500;
export const ITEMS_PER_PAGE = 6;
