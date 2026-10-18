import { afterEach, beforeEach, expect, it, vi } from "vitest";

let service: typeof import("./residentBrowserNotifications");
const notices: { options: NotificationOptions; close: ReturnType<typeof vi.fn>; onclick?: () => void }[] = [];
const requestPermission = vi.fn();
const row = (type = "REPORT_UPDATE", id = "notice") => ({ id, user_id: "resident-a", type, body: "Private report data" });

beforeEach(async () => {
  vi.resetModules();
  localStorage.clear(); notices.length = 0;
  requestPermission.mockReset().mockResolvedValue("granted");
  vi.stubGlobal("isSecureContext", true);
  vi.stubGlobal("navigator", {});
  vi.stubGlobal("Notification", class {
    static permission = "granted";
    static requestPermission = requestPermission;
    close = vi.fn();
    constructor(_title: string, public options: NotificationOptions) { notices.push(this); }
  });
  service = await import("./residentBrowserNotifications");
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("browser preferences are opt-in, account scoped, and category choices survive disabling the master", () => {
  expect(service.readBrowserNotificationSettings("resident-a").enabled).toBe(false);
  service.saveBrowserNotificationSettings("resident-a", { enabled: true, reports: false });
  service.saveBrowserNotificationSettings("resident-a", { enabled: false });
  expect(service.readBrowserNotificationSettings("resident-a")).toMatchObject({ enabled: false, reports: false });
  expect(service.readBrowserNotificationSettings("resident-b")).toMatchObject({ enabled: false, reports: true });
  expect([...Array(localStorage.length)].map((_, index) => localStorage.key(index))).toEqual(["greenway:resident:browser-notifications:v1:resident-a"]);
});

it("defaults safely when storage is malformed and reports failed writes", () => {
  localStorage.setItem("greenway:resident:browser-notifications:v1:resident-a", "not-json");
  expect(service.readBrowserNotificationSettings("resident-a").enabled).toBe(false);
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw Error("Storage blocked"); });
  expect(() => service.saveBrowserNotificationSettings("resident-a", { enabled: true })).toThrow("Storage blocked");
});

it("permission is requested only by explicit enable; denied or dismissed permission fails clearly", async () => {
  vi.stubGlobal("Notification", { permission: "default", requestPermission });
  for (const permission of ["denied", "default"]) {
    requestPermission.mockResolvedValueOnce(permission);
    await expect(service.enableBrowserNotifications()).rejects.toThrow(permission === "denied" ? /site settings/ : /Choose Allow/);
  }
  expect(service.readBrowserNotificationSettings("resident-a").enabled).toBe(false);
  vi.stubGlobal("isSecureContext", false);
  await expect(service.enableBrowserNotifications()).rejects.toThrow(/HTTPS/);
});

it("only current-owner live events produce generic previews; duplicates and disabled categories do not", async () => {
  service.saveBrowserNotificationSettings("resident-a", { enabled: true });
  let current = true;
  const delivery = service.createResidentBrowserDelivery("resident-a", () => current);
  await delivery.deliver({ ...row(), user_id: "resident-b" });
  await delivery.deliver(null);
  await delivery.deliver(row("unknown"));
  expect(notices).toHaveLength(0);
  await delivery.deliver(row()); await delivery.deliver(row());
  expect(notices).toHaveLength(1);
  expect(notices[0].options.body).not.toContain("Private");
  service.saveBrowserNotificationSettings("resident-a", { reports: false });
  await delivery.deliver(row("REPORT_UPDATE", "second"));
  current = false;
  await delivery.deliver(row("ANNOUNCEMENT", "third"));
  expect(notices).toHaveLength(1);
  expect(requestPermission).not.toHaveBeenCalled();
  delivery.dispose(); expect(notices[0].close).toHaveBeenCalled();
});

it("each browser category filters only its matching alert types", async () => {
  for (const [field, types] of Object.entries({ reminders: ["COLLECTION_REMINDER"],
    collection: ["TRUCK_IS_NEAR", "COLLECTION_DONE", "MISSED_COLLECTION"], reports: ["REPORT_UPDATE"],
    community: ["NEW_POST", "ANNOUNCEMENT"] })) {
    service.saveBrowserNotificationSettings("resident-a", { enabled: true, [field]: false });
    const delivery = service.createResidentBrowserDelivery("resident-a", () => true);
    for (const type of types) await delivery.deliver(row(type, `${field}:${type}`));
    expect(notices).toHaveLength(0);
    service.saveBrowserNotificationSettings("resident-a", { [field]: true });
    for (const type of types) await delivery.deliver(row(type, `${field}:${type}`));
    expect(notices).toHaveLength(types.length);
    notices.length = 0;
    delivery.dispose();
  }
});

it("permission revocation and disabled browser delivery never produce or prompt for an alert", async () => {
  const delivery = service.createResidentBrowserDelivery("resident-a", () => true);
  await delivery.deliver(row());
  service.saveBrowserNotificationSettings("resident-a", { enabled: true });
  vi.stubGlobal("Notification", { permission: "denied", requestPermission });
  await delivery.deliver(row());
  expect(notices).toHaveLength(0); expect(requestPermission).not.toHaveBeenCalled();
});

it("pending service-worker setup rechecks session and current preferences before display", async () => {
  let finish!: (value: unknown) => void;
  const showNotification = vi.fn();
  const register = vi.fn(() => new Promise(resolve => { finish = resolve; }));
  vi.stubGlobal("navigator", { serviceWorker: { register } });
  service.saveBrowserNotificationSettings("resident-a", { enabled: true });
  let current = true;
  const delivery = service.createResidentBrowserDelivery("resident-a", () => current);
  const pending = delivery.deliver(row());
  current = false;
  finish({ active: {}, showNotification, getNotifications: async () => [] });
  await pending;
  expect(showNotification).not.toHaveBeenCalled();
  current = true;
  service.saveBrowserNotificationSettings("resident-a", { enabled: false });
  await delivery.deliver(row("REPORT_UPDATE", "other"));
  expect(showNotification).not.toHaveBeenCalled();
});

it("a browser display failure resolves without interfering with the inbox event handler", async () => {
  vi.stubGlobal("navigator", { serviceWorker: { register: vi.fn().mockRejectedValue(Error("Worker unavailable")) } });
  service.saveBrowserNotificationSettings("resident-a", { enabled: true });
  await expect(service.createResidentBrowserDelivery("resident-a", () => true).deliver(row())).resolves.toBeUndefined();
});

it("service-worker previews use a stable tag and the account inbox, and close when the session ends", async () => {
  const close = vi.fn();
  const showNotification = vi.fn().mockResolvedValue(undefined);
  const registration = { active: {}, showNotification, getNotifications: vi.fn().mockResolvedValue([
    { data: { userId: "resident-a" }, close }, { data: { userId: "resident-b" }, close: vi.fn() },
  ]) };
  const register = vi.fn().mockResolvedValue(registration);
  vi.stubGlobal("navigator", { serviceWorker: { register } });
  service.saveBrowserNotificationSettings("resident-a", { enabled: true });
  const delivery = service.createResidentBrowserDelivery("resident-a", () => true);
  await delivery.deliver(row());
  expect(register).toHaveBeenCalledWith("/resident-notifications-sw.js", { scope: "/resident/" });
  expect(showNotification).toHaveBeenCalledWith("GreenWay update", expect.objectContaining({
    tag: "greenway-resident:resident-a:notice", data: { userId: "resident-a", url: "/resident/notifications" },
  }));
  delivery.dispose();
  await vi.waitFor(() => expect(close).toHaveBeenCalled());
});
