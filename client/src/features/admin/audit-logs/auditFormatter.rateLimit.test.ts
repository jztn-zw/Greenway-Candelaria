import { expect, it } from "vitest";
import type { AuditLogRow } from "@/services/auditService";
import { formatAuditEntry } from "./auditFormatter";

const row: AuditLogRow = {
  id: "fixture-audit", user_id: null, action: "RATE_LIMITED", module: "auth", record_id: null,
  old_value: null, new_value: { policy: "login", blocked_count: 150, first_blocked_at: "2026-10-09T00:00:00Z", last_blocked_at: "2026-10-09T00:00:59Z" },
  ip_address: "192.0.2.1", created_at: "2026-10-09T00:01:00Z", user_name: "System / Unknown",
  user_email: "system@greenway.local", user_role: "ADMIN", user_avatar: null,
};
it("shows summarized blocked attempts without claiming the anonymous actor is an admin", () => {
  const result = formatAuditEntry(row);
  expect(result.summary).toContain("150");
  expect(result.summary).toContain("login");
  expect(result.adminRole).toBe("Visitor");
  expect(result.adminName).toBe("Unknown visitor");
});
it("retains authenticated actor details for a rate-limit summary", () => {
  const result = formatAuditEntry({ ...row, user_id: "collector", user_role: "DRIVER", user_name: "Fixture Collector" });
  expect(result.adminRole).toBe("COLLECTOR");
  expect(result.adminName).toBe("Fixture Collector");
});
