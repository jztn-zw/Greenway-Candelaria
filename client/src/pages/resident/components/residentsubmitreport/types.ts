import type { LucideIcon } from "lucide-react";

export type ViolationType =
  | "illegal-dumping"
  | "missed-collection"
  | "overflowing-bin"
  | "open-burning"
  | "littering"
  | "improper-segregation"
  | "other";

export interface ViolationOption {
  value: ViolationType;
  label: string;
  icon: LucideIcon;
  description: string;
}

export type ReportStatus = "submitted" | "under-review" | "dispatched" | "resolved" | "draft";

export interface ReportFormData {
  violationType: ViolationType | null;
  barangay: string;
  streetOrLandmark: string;
  pinLocation: [number, number] | null;
  description: string;
  photos: ReportPhoto[];
  isAnonymous: boolean;
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
  barangay: string;
  streetOrLandmark: string;
  description: string;
  photoCount: number;
  photos?: string[];
  isAnonymous: boolean;
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

import { Trash2, Truck, Archive, Flame, CigaretteOff, Recycle, ClipboardList } from "lucide-react";

export const VIOLATION_OPTIONS: ViolationOption[] = [
  { value: "illegal-dumping", label: "Illegal Dumping", icon: Trash2, description: "Unauthorized disposal of waste" },
  { value: "missed-collection", label: "Missed Collection", icon: Truck, description: "Scheduled pickup was missed" },
  { value: "overflowing-bin", label: "Overflowing Bin", icon: Archive, description: "Bin is full and overflowing" },
  { value: "open-burning", label: "Open Burning", icon: Flame, description: "Illegal burning of waste" },
  { value: "littering", label: "Littering", icon: CigaretteOff, description: "Improper disposal in public areas" },
  { value: "improper-segregation", label: "Improper Segregation", icon: Recycle, description: "Waste not properly sorted" },
  { value: "other", label: "Other", icon: ClipboardList, description: "Other waste-related issue" },
];

export const BARANGAYS = [
  "Bukal Norte", "Bukal Sur", "Candelaria Proper", "Catanauan",
  "Kinatihan I", "Kinatihan II", "Malabanban Norte", "Malabanban Sur",
  "Mangilag Norte", "Mangilag Sur", "Masalukot I", "Masalukot II",
  "Masalukot III", "Masalukot IV", "Masalukot V", "Mayabobo",
  "Pahinga Norte", "Pahinga Sur", "San Andres", "San Isidro",
  "Santa Catalina Norte", "Santa Catalina Sur",
];

export const QUICK_CHIPS = [
  "When did this happen?",
  "How long has it been there?",
  "How severe is it?",
];
