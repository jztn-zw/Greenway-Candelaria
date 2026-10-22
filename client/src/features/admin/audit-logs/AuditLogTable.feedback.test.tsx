import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { toast } from "@/lib/toast";
import AuditLogTable from "./AuditLogTable";
import type { AuditLogEntry } from "./types";

vi.mock("@/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const log: AuditLogEntry = { id: "audit-fixture", timestamp: "2026-10-21T00:00:00Z", adminName: "Test Admin", adminRole: "ADMIN", actionType: "UPDATE", module: "Posts", affectedRecord: "post-fixture", summary: "Post updated", severity: "change", ipAddress: "127.0.0.1" };
beforeEach(() => vi.clearAllMocks());
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("waits for clipboard confirmation before claiming the reference was copied", async () => {
  let finish!: () => void;
  const writeText = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
  vi.stubGlobal("navigator", { clipboard: { writeText } });
  render(<AuditLogTable logs={[log]} />);
  fireEvent.click(screen.getByTitle("Copy record"));
  expect(writeText).toHaveBeenCalledWith("post-fixture");
  expect(toast.success).not.toHaveBeenCalled();
  await act(async () => finish());
  expect(toast.success).toHaveBeenCalledWith("Record ID copied to clipboard");
});
it("reports a blocked clipboard without a false success", async () => {
  vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("Permission denied")) } });
  render(<AuditLogTable logs={[log]} />);
  await act(async () => fireEvent.click(screen.getByTitle("Copy record")));
  expect(toast.success).not.toHaveBeenCalled();
  expect(toast.error).toHaveBeenCalledWith("Could not copy this value. Select it and copy it manually.");
});
