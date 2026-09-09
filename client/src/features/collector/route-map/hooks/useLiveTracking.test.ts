import { describe, expect, it } from "vitest";
import { isRetryablePingFailure } from "./useLiveTracking";

describe("isRetryablePingFailure", () => {
  it("retries a network failure because delivery may still succeed later", () => {
    expect(isRetryablePingFailure(new Error("Network Error"))).toBe(true);
  });

  it("retries server failures", () => {
    expect(isRetryablePingFailure({ response: { status: 500 } })).toBe(true);
  });

  it("does not retry a paused-route response", () => {
    expect(isRetryablePingFailure({ response: { status: 409 } })).toBe(false);
  });

  it("does not retry validation or authorization errors", () => {
    expect(isRetryablePingFailure({ response: { status: 400 } })).toBe(false);
    expect(isRetryablePingFailure({ response: { status: 403 } })).toBe(false);
  });
});
