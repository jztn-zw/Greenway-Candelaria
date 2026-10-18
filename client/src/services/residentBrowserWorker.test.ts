import fs from "node:fs";
import vm from "node:vm";
import { expect, it, vi } from "vitest";

it("a notification click focuses the resident inbox without navigating an admin window", async () => {
  const listeners = new Map();
  const admin = { url: "https://greenway.test/admin", navigate: vi.fn(), focus: vi.fn() };
  const resident = { url: "https://greenway.test/resident/calendar", navigate: vi.fn(), focus: vi.fn() };
  const openWindow = vi.fn();
  vm.runInNewContext(fs.readFileSync("public/resident-notifications-sw.js", "utf8"), {
    URL, self: { addEventListener: (name: string, handler: unknown) => listeners.set(name, handler),
      location: { origin: "https://greenway.test" }, clients: { matchAll: async () => [admin, resident], openWindow } },
  });
  const close = vi.fn();
  let pending!: Promise<void>;
  listeners.get("notificationclick")({ notification: { close, data: { url: "https://untrusted.test" } },
    waitUntil: (operation: Promise<void>) => { pending = operation; } });
  await pending;
  expect(close).toHaveBeenCalled();
  expect(resident.navigate).toHaveBeenCalledWith("https://greenway.test/resident/notifications");
  expect(resident.focus).toHaveBeenCalled();
  expect(admin.navigate).not.toHaveBeenCalled(); expect(openWindow).not.toHaveBeenCalled();
});
