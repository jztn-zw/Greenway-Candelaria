import { expect, it } from "vitest";
import type { AuditLogRow } from "@/services/auditService";
import { formatAuditEntry } from "./auditFormatter";

const row = (action: string): AuditLogRow => ({
  id: action,
  user_id: "admin-1",
  action,
  module: "reports",
  record_id: "RPT-1",
  old_value: null,
  new_value: null,
  ip_address: null,
  created_at: "2026-10-02T00:00:00Z",
  user_name: "Admin",
  user_email: "admin@example.com",
  user_role: "ADMIN",
  user_avatar: null,
});

it("shows known and unfamiliar audit actions in readable case while preserving severity", () => {
  const deleted = formatAuditEntry(row("REPORT_DELETED"));
  expect(deleted.actionType).toBe("Report Deleted");
  expect(deleted.severity).toBe("critical");
  expect(deleted.module).toBe("Waste Reports");

  expect(formatAuditEntry(row("CREATE_REPORT")).actionType).toBe("Report Submitted");
  expect(formatAuditEntry(row("custom_review_started")).actionType).toBe("Custom Review Started");
});
