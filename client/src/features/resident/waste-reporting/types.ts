import type { LucideIcon } from "lucide-react";

export type ViolationType =
  | "illegal-dumping"
  | "missed-collection"
  | "overflowing-bin"
  | "open-burning"
  | "littering"
  | "improper-segregation"
  | "other";

// Maps frontend kebab-case values to backend UPPER_SNAKE_CASE enum
export const VIOLATION_TYPE_MAP: Record<ViolationType, string> = {
  "illegal-dumping": "ILLEGAL_DUMPING",
  "missed-collection": "MISSED_COLLECTION",
  "overflowing-bin": "OVERFLOWING_BIN",
  "open-burning": "OPEN_BURNING",
  littering: "LITTERING",
  "improper-segregation": "IMPROPER_SEGREGATION",
  other: "OTHER",
};

// Maps backend UPPER_SNAKE_CASE to frontend kebab-case
export const VIOLATION_TYPE_REVERSE_MAP: Record<string, ViolationType> = {
  ILLEGAL_DUMPING: "illegal-dumping",
  MISSED_COLLECTION: "missed-collection",
  OVERFLOWING_BIN: "overflowing-bin",
  OPEN_BURNING: "open-burning",
  LITTERING: "littering",
  IMPROPER_SEGREGATION: "improper-segregation",
  OTHER: "other",
};

// Maps backend status to frontend status
export const STATUS_REVERSE_MAP: Record<string, ReportStatus> = {
  SUBMITTED: "submitted",
  UNDER_REVIEW: "under-review",
  DISPATCHED: "dispatched",
  RESOLVED: "resolved",
};

export interface ViolationOption {
  value: ViolationType;
  label: string;
  icon: LucideIcon;
  description: string;
}

export type ReportStatus =
  | "submitted"
  | "under-review"
  | "dispatched"
  | "resolved";

export interface ReportFormData {
  violationType: ViolationType | null;
  /** UUID from the barangays table */
  barangayId: string;
  /** Display name shown in UI */
  barangayName: string;
  streetOrLandmark: string;
  pinLocation: [number, number] | null;
  description: string;
  photos: ReportPhoto[];
}

export interface ReportPhoto {
  id: string;
  file: File;
  preview: string;
  annotations: PhotoAnnotation[];
}

export interface PhotoAnnotation {
  type: "circle" | "arrow";
  x: number;
  y: number;
  radius?: number;
  endX?: number;
  endY?: number;
}

export interface SubmittedReport {
  id: string;
  referenceNumber: string;
  violationType: ViolationType;
  barangayName: string;
  streetOrLandmark: string;
  description: string;
  photoCount: number;
  photos?: string[];
  status: ReportStatus;
  submittedAt: Date;
  updatedAt: Date;
  adminResponse?: string;
  statusHistory?: StatusHistoryEntry[];
}

export interface StatusHistoryEntry {
  status: ReportStatus;
  timestamp: Date;
  label: string;
}

import {
  Trash2,
  Truck,
  Archive,
  Flame,
  CigaretteOff,
  Recycle,
  ClipboardList,
} from "lucide-react";

export const VIOLATION_OPTIONS: ViolationOption[] = [
  {
    value: "illegal-dumping",
    label: "Illegal Dumping",
    icon: Trash2,
    description: "Unauthorized disposal of waste",
  },
  {
    value: "missed-collection",
    label: "Missed Collection",
    icon: Truck,
    description: "Scheduled pickup was missed",
  },
  {
    value: "overflowing-bin",
    label: "Overflowing Bin",
    icon: Archive,
    description: "Bin is full and overflowing",
  },
  {
    value: "open-burning",
    label: "Open Burning",
    icon: Flame,
    description: "Illegal burning of waste",
  },
  {
    value: "littering",
    label: "Littering",
    icon: CigaretteOff,
    description: "Improper disposal in public areas",
  },
  {
    value: "improper-segregation",
    label: "Improper Segregation",
    icon: Recycle,
    description: "Waste not properly sorted",
  },
  {
    value: "other",
    label: "Other",
    icon: ClipboardList,
    description: "Other waste-related issue",
  },
];

export const QUICK_CHIPS = [
  "When did this happen?",
  "How long has it been there?",
  "How severe is it?",
];
