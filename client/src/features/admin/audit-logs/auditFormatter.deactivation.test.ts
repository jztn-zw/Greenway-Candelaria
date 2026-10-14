import { expect, it } from "vitest";
import type { AuditLogRow } from "@/services/auditService";
import { formatAuditEntry } from "./auditFormatter";

it("identifies resident self-reactivation separately from administrative unbanning", () => {
  const result = formatAuditEntry({ id: "event", user_id: "resident", user_name: "Test Resident", user_role: "RESIDENT",
    action: "REACTIVATE_USER", module: "users", record_id: "resident", created_at: "2026-10-14T00:00:00Z",
    old_value: { status: "DEACTIVATED" }, new_value: { status: "ACTIVE", user_name: "Test Resident" },
  } as AuditLogRow);
  expect(result.actionType).toBe("Reactivated Account");
  expect(result.severity).toBe("positive");
  expect(result.summary).toContain('Reactivated resident account for "Test Resident"');
  expect(result.beforeValue).toBe("Deactivated");
  expect(result.afterValue).toBe("Active");
});
