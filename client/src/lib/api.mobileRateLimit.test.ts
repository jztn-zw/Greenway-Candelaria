import { afterEach, expect, it, vi } from "vitest";
import { AxiosError } from "axios";
const storage = vi.hoisted(() => ({ getToken: vi.fn(async () => "fixture-token"), clearAll: vi.fn(async () => {}) }));
vi.mock("../../../driverapp/src/config/env", () => ({ API_BASE_URL: "https://fixture.invalid/api" }));
vi.mock("../../../residentapp/src/config/env", () => ({ API_BASE_URL: "https://fixture.invalid/api" }));
vi.mock("../../../driverapp/src/services/storage", () => ({ tokenStorage: storage }));
vi.mock("../../../residentapp/src/services/storage", () => ({ tokenStorage: storage }));
import driverApi from "../../../driverapp/src/services/api";
import residentApi from "../../../residentapp/src/services/api";
const adapters = [driverApi.defaults.adapter, residentApi.defaults.adapter];
afterEach(() => { driverApi.defaults.adapter = adapters[0]; residentApi.defaults.adapter = adapters[1]; vi.clearAllMocks(); });

for (const [name, api] of [["collector", driverApi], ["resident", residentApi]] as const) {
  it(`${name} preserves the session and wait metadata for HTTP 429`, async () => {
    api.defaults.adapter = async config => {
      throw Object.assign(new AxiosError("Request failed", "ERR_BAD_REQUEST"), {
        config, response: { config, status: 429, statusText: "Too Many Requests", headers: { "retry-after": "45" }, data: { success: false, message: "Too many requests." } },
      });
    };
    await expect(api.post("/reports", {})).rejects.toMatchObject({ status: 429, retryAfterSeconds: 45, message: expect.stringMatching(/45 seconds/) });
    expect(storage.clearAll).not.toHaveBeenCalled();
  });
  it(`${name} still revokes an unauthorized protected session`, async () => {
    api.defaults.adapter = async config => {
      throw Object.assign(new AxiosError("Request failed", "ERR_BAD_REQUEST"), {
        config, response: { config, status: 401, statusText: "Unauthorized", headers: {}, data: { message: "Session expired" } },
      });
    };
    await expect(api.get("/users/profile")).rejects.toThrow("Session expired");
    expect(storage.clearAll).toHaveBeenCalledOnce();
  });
}
