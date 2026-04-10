export type ActionSeverity = "routine" | "change" | "critical";

export type AuditModule =
  | "Accounts"
  | "Posts"
  | "Announcements"
  | "Waste Reports"
  | "Route Manager"
  | "Resident Manager"
  | "Driver Manager"
  | "Landing Page"
  | "Collection Schedule"
  | "Barangay Manager"
  | "Analytics";

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  adminName: string;
  adminRole: string;
  actionType: string;
  module: AuditModule;
  affectedRecord: string;
  summary: string;
  severity: ActionSeverity;
  beforeValue?: string;
  afterValue?: string;
  ipAddress: string;
  metadata?: Record<string, string>;
}
