import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AxiosError, type AxiosAdapter } from "axios";
import api from "./api";
const originalAdapter = api.defaults.adapter;
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); vi.restoreAllMocks(); });
afterEach(() => { api.defaults.adapter = originalAdapter; localStorage.clear(); sessionStorage.clear(); vi.unstubAllGlobals(); });
it.each(["remembered", "temporary"])("captures the originating %s session before a queued request can use another account's token", async (kind) => {
  const storage = kind === "remembered" ? localStorage : sessionStorage;
  storage.setItem("token", "session-A"); let sentToken: unknown;
  api.defaults.adapter = (async (config) => {
    sentToken = config.headers.Authorization;
    return { config, data: {}, status: 200, statusText: "OK", headers: {} };
  }) satisfies AxiosAdapter;
  const pending = api.delete("/notifications/clear");
  storage.setItem("token", "session-B"); await pending;
  expect(sentToken).toBe("Bearer session-A");
});
it.each(["remembered", "temporary"])("a late unauthorized response does not clear a newer %s login", async (kind) => {
  localStorage.setItem("token", "session-A");
  let reject!: () => void;
  api.defaults.adapter = (config) => new Promise((_, fail) => {
    reject = () => fail(new AxiosError("Expired", "ERR_BAD_REQUEST", config, {}, { config, data: {}, status: 401, statusText: "Unauthorized", headers: {} }));
  });
  const pending = api.get("/notifications");
  const storage = kind === "remembered" ? localStorage : sessionStorage;
  localStorage.clear();
  storage.setItem("token", "session-B"); storage.setItem("user", "user-B"); reject();
  await expect(pending).rejects.toThrow("Expired");
  expect(storage.getItem("token")).toBe("session-B"); expect(storage.getItem("user")).toBe("user-B");
});

it.each(["remembered", "temporary"])("clears a revoked %s session including its persisted state", async (kind) => {
  const storage = kind === "remembered" ? localStorage : sessionStorage;
  storage.setItem("token", "session-A"); storage.setItem("user", "user-A"); storage.setItem("auth-storage", "state-A");
  vi.stubGlobal("window", { location: { href: "/resident" } });
  api.defaults.adapter = async (config) => {
    throw new AxiosError("Expired", "ERR_BAD_REQUEST", config, {}, { config, data: {}, status: 401, statusText: "Unauthorized", headers: {} });
  };
  await expect(api.get("/notifications")).rejects.toThrow("Expired");
  for (const item of [localStorage, sessionStorage]) {
    expect(item.getItem("token")).toBeNull();
    expect(item.getItem("user")).toBeNull();
    expect(item.getItem("auth-storage")).toBeNull();
  }
});
