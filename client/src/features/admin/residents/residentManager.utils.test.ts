import { expect, it } from "vitest";
import { mapResidentListRow, mapResidentDetails } from "./residentManager.utils";
import type { ResidentDetailsRow, ResidentListRow } from "@/services/residentManagerService";
it("keeps unfinished residents identifiable without inventing profile details", () => {
  const row = { id: "pending", full_name: null, username: null, email: "pending@example.test", status: "ACTIVE" } as ResidentListRow;
  const resident = mapResidentListRow(row);
  expect(resident.fullName).toBe("Resident Account");
  expect(resident.profileCompleted).toBe(false);
  expect(resident.username).toBe("");
  expect(resident.email).toBe("pending@example.test");
  expect(mapResidentDetails(row as ResidentDetailsRow, []).fullName).toBe("Resident Account");
});
it("uses the signup username and keeps completion separate from a ban", () => {
  const resident = mapResidentListRow({ id: "pending", full_name: null, username: "resident_2026", status: "BANNED", profile_completed: 0 } as ResidentListRow);
  expect(resident.fullName).toBe("resident_2026");
  expect(resident.profileCompleted).toBe(false);
  expect(resident.status).toBe("Banned");
});
