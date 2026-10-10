import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import useAuthStore from "@/store/authStore";
import { fetchAnnouncementById } from "@/services/announcementsService";
import AdminAnnouncements from "./AdminAnnouncements";

const fixture = vi.hoisted(() => ({
  id: "notice", title: "Original notice", body: "Original instructions", type: "General Notice", status: "Active",
  targetAudience: "All Residents", targetBarangays: [], targetBarangayIds: [], targetPreset: null,
  sentDate: null, scheduledDate: null, expiryDate: null, readCount: 0, totalRecipients: 0,
  archived: false, edited: false, createdBy: "MENRO", lastEdited: "", barangayReadStats: [],
}));
vi.mock("./hooks/useAnnouncements", async importOriginal => ({
  ...await importOriginal<object>(),
  useAnnouncements: () => ({ announcements: [fixture], barangayOptions: [], hasLoadedPage: true,
    totalPages: 1, metrics: { active: 1, scheduled: 0, drafts: 0, totalRecipients: 0, totalReads: 0 } }),
}));
vi.mock("@/services/announcementsService", () => ({ fetchAnnouncementById: vi.fn() }));
vi.mock("@/features/resident/announcements/ResidentAnnouncementModal", () => ({
  default: ({ open, initialAnnouncement }: { open: boolean; initialAnnouncement: { title: string; body: string } }) =>
    open ? <div role="dialog">{initialAnnouncement.title} {initialAnnouncement.body}</div> : null,
}));
let client: QueryClient;
beforeEach(() => {
  client = new QueryClient();
  useAuthStore.setState({ user: { id: "admin", role: "ADMIN" } as never, token: "fixture" });
  vi.mocked(fetchAnnouncementById).mockResolvedValue({ id: "notice", title: "Original notice", body: "Original instructions", type: "GENERAL_NOTICE", status: "ACTIVE", target_all: true } as never);
});
afterEach(() => { cleanup(); client.clear(); vi.clearAllMocks(); });
it("refreshes an open preview independently of the current list and closes it if access is lost", async () => {
  render(<QueryClientProvider client={client}><MemoryRouter><AdminAnnouncements /></MemoryRouter></QueryClientProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Preview announcement: Original notice" }));
  await waitFor(() => expect(fetchAnnouncementById).toHaveBeenCalledWith("notice"));
  vi.mocked(fetchAnnouncementById).mockResolvedValue({ id: "notice", title: "Updated notice", body: "Updated instructions", type: "GENERAL_NOTICE", status: "ACTIVE", target_all: true } as never);
  await act(async () => { await client.invalidateQueries({ queryKey: ["admin", "admin", "announcements"] }); });
  await waitFor(() => expect(screen.getByRole("dialog")).toHaveTextContent("Updated notice Updated instructions"));
  expect(screen.getByRole("button", { name: "Preview announcement: Original notice" })).toBeInTheDocument();
  vi.mocked(fetchAnnouncementById).mockRejectedValue({ response: { status: 404 } });
  await act(async () => { await client.invalidateQueries({ queryKey: ["admin", "admin", "announcements"] }); });
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
});
