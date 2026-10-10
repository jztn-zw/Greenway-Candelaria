import { expect, it, vi } from "vitest";
import { getRetryAfterSeconds, shouldRetryQuery } from "./rateLimit";
import * as driver from "../../../driverapp/src/services/rateLimit";
import * as resident from "../../../residentapp/src/services/rateLimit";

for (const [name, normalize] of [["web", getRetryAfterSeconds], ["collector", driver.getRetryAfterSeconds], ["resident", resident.getRetryAfterSeconds]] as const) {
  it(`${name} cooldown handles headers, missing values and dates safely`, () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-09T00:00:00Z"));
    expect(normalize(12, "99")).toBe(12);
    expect(normalize(undefined, "45")).toBe(45);
    expect(normalize(undefined, "Fri, 09 Oct 2026 00:01:00 GMT")).toBe(60);
    expect(normalize(undefined, undefined)).toBe(60);
    expect(normalize(-5, "bad")).toBe(60);
    vi.restoreAllMocks();
  });
}
it("rate limits stop automatic retries while ordinary errors retain existing budgets", () => {
  expect(shouldRetryQuery(0, { response: { status: 429 } })).toBe(false);
  expect(shouldRetryQuery(2, new Error("offline"))).toBe(true);
  expect(shouldRetryQuery(3, new Error("offline"))).toBe(false);
  for (const retry of [driver.shouldRetryQuery, resident.shouldRetryQuery]) {
    expect(retry(0, { status: 429 })).toBe(false);
    expect(retry(0, new Error("offline"))).toBe(true);
    expect(retry(1, new Error("offline"))).toBe(false);
  }
});
