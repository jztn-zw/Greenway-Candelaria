export type ViolationType =
  | "Illegal Dumping"
  | "Missed Collection"
  | "Overflowing Bin"
  | "Improper Segregation"
  | "Clogged Drain"
  | "Open Burning";

export type ReportStatus = "Submitted" | "Under Review" | "Dispatched" | "Resolved";

export type ReportPriority = "High" | "Medium" | "Low";

export interface PhotoAnnotation {
  id: string;
  type: "circle" | "arrow";
  x: number;
  y: number;
  radius?: number;
  endX?: number;
  endY?: number;
}

export interface ReportPhoto {
  id: string;
  url: string;
  annotations: PhotoAnnotation[];
}

export interface StatusHistoryEntry {
  id: string;
  status: ReportStatus;
  timestamp: string;
  adminName: string;
}

export interface InternalNote {
  id: string;
  text: string;
  timestamp: string;
  adminName: string;
}

export interface WasteReport {
  id: string;
  referenceNumber: string;
  violationType: ViolationType;
  barangay: string;
  street?: string;
  description: string;
  submittedAt: string;
  submitterName: string;
  isAnonymous: boolean;
  photos: ReportPhoto[];
  priority: ReportPriority;
  status: ReportStatus;
  statusHistory: StatusHistoryEntry[];
  officialResponse?: string;
  internalNotes: InternalNote[];
  isDuplicate: boolean;
  duplicateOfId?: string;
  isFalseReport: boolean;
}
