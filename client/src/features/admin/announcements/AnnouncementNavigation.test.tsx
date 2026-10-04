import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import AnnouncementEditor from "./AnnouncementEditor";
import AnnouncementCard from "./AnnouncementCard";
import type { Announcement, EditorForm } from "./types";

afterEach(cleanup);
const form: EditorForm = {
  title: "", body: "", type: "General Notice", status: "Draft", targetAudience: "All Residents",
  targetBarangays: [], targetPreset: null, scheduledDate: "", expiryDate: "", showOnResidentCalendar: false, calendarDate: "",
};

it("closes an untouched modal with Cancel without showing a Back button", () => {
  const onOpenChange = vi.fn();
  render(<AnnouncementEditor open onOpenChange={onOpenChange} editingAnnouncement={null} form={form}
    setForm={vi.fn()} onSave={vi.fn()} isSaving={false} barangayOptions={[]} />);
  expect(screen.queryByRole("button", { name: "Back to announcements" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(onOpenChange).toHaveBeenCalledWith(false);
});

it("requires discarding unsaved content before closing with Cancel", () => {
  const onOpenChange = vi.fn();
  render(<AnnouncementEditor open onOpenChange={onOpenChange} editingAnnouncement={null} form={{ ...form, title: "Unsaved notice" }}
    setForm={vi.fn()} onSave={vi.fn()} isSaving={false} barangayOptions={[]} />);
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(onOpenChange).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Delete Draft" }));
  expect(onOpenChange).toHaveBeenCalledWith(false);
});

it("keeps Cancel disabled during saving", () => {
  render(<AnnouncementEditor open onOpenChange={vi.fn()} editingAnnouncement={null} form={form}
    setForm={vi.fn()} onSave={vi.fn()} isSaving barangayOptions={[]} />);
  expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
});

it("opens a compact announcement preview once and keeps read analytics separate", () => {
  const ann: Announcement = {
    id: "notice-42", title: "Collection schedule", body: "Prepare your bins.", type: "General Notice", status: "Active",
    targetAudience: "All Residents", targetBarangays: [], targetBarangayIds: [], targetPreset: null,
    sentDate: "Oct 3, 2026", scheduledDate: null, expiryDate: null, readCount: 5, totalRecipients: 10,
    archived: false, edited: false, createdBy: "MENRO", lastEdited: "Oct 3, 2026", barangayReadStats: [],
  };
  const onPreview = vi.fn();
  const onReadReceipt = vi.fn();
  render(<AnnouncementCard compact ann={ann} onPreview={onPreview} onReadReceipt={onReadReceipt}
    onEdit={vi.fn()} onDuplicate={vi.fn()} onResend={vi.fn()} onSendNow={vi.fn()} onArchive={vi.fn()}
    onDelete={vi.fn()} onCancelSchedule={vi.fn()} />);
  const preview = screen.getByRole("button", { name: `Preview announcement: ${ann.title}` });
  preview.focus();
  expect(document.activeElement).toBe(preview);
  fireEvent.click(preview);
  expect(onPreview).toHaveBeenCalledExactlyOnceWith(ann);
  fireEvent.click(screen.getByRole("button", { name: `View read analytics for ${ann.title}` }));
  expect(onReadReceipt).toHaveBeenCalledWith(ann);
  expect(onPreview).toHaveBeenCalledOnce();
});
