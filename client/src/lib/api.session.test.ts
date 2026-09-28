import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AxiosError, type AxiosAdapter } from "axios";
import api from "./api";
const originalAdapter = api.defaults.adapter;
beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });
afterEach(() => { api.defaults.adapter = originalAdapter; localStorage.clear(); });
it("captures the originating session before a queued request can use another account's token", async () => {
  localStorage.setItem("token", "session-A"); let sentToken: unknown;
  api.defaults.adapter = (async (config) => {
    sentToken = config.headers.Authorization;
    return { config, data: {}, status: 200, statusText: "OK", headers: {} };
  }) satisfies AxiosAdapter;
  const pending = api.delete("/notifications/clear");
  localStorage.setItem("token", "session-B"); await pending;
  expect(sentToken).toBe("Bearer session-A");
});
it("a late unauthorized response does not clear a newer login", async () => {
  localStorage.setItem("token", "session-A");
  let reject!: () => void;
  api.defaults.adapter = (config) => new Promise((_, fail) => {
    reject = () => fail(new AxiosError("Expired", "ERR_BAD_REQUEST", config, {}, { config, data: {}, status: 401, statusText: "Unauthorized", headers: {} }));
  });
  const pending = api.get("/notifications");
  localStorage.setItem("token", "session-B"); localStorage.setItem("user", "user-B"); reject();
  await expect(pending).rejects.toThrow("Expired");
  expect(localStorage.getItem("token")).toBe("session-B"); expect(localStorage.getItem("user")).toBe("user-B");
});
