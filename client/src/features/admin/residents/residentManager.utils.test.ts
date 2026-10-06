import { expect, it } from "vitest";
import { mapResidentListRow, mapResidentDetails } from "./residentManager.utils";
import type { ResidentDetailsRow, ResidentListRow } from "@/services/residentManagerService";
it("keeps unfinished residents identifiable without inventing profile details", () => {
  const row = { id: "pending", full_name: null, username: null, email: "pending@example.test", status: "ACTIVE" } as ResidentListRow;
  const resident = mapResidentListRow(row);
  expect(resident.fullName).toBe("Profile not completed");
  expect(resident.username).toBe("");
  expect(resident.email).toBe("pending@example.test");
  expect(mapResidentDetails(row as ResidentDetailsRow, []).fullName).toBe("Profile not completed");
});
