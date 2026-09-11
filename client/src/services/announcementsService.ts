import api from "../lib/api";
import type { Announcement } from "@/features/admin/announcements/types";

export interface GetAllFilters {
  status?: string;
  type?: string;
}

export interface CreatePayload {
  title: string;
  body: string;
  type: string;
  status?: string;
  target_all?: boolean;
  scheduled_at?: string | null;
  expires_at?: string | null;
  barangay_ids?: string[];
  show_on_calendar?: boolean;
  calendar_date?: string | null;
}

export type UpdatePayload = Partial<CreatePayload>;

export interface AnnouncementAnalytics {
  recipients: number;
  read_count: number;
  unread_count: number;
  barangays: Array<{
    name: string;
    received: number;
    read: number;
  }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Unwraps backend { data: T } shape in one place — avoids repeating data.data everywhere
const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

// Builds query string from filters cleanly
const buildQuery = (filters: GetAllFilters): string => {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.type) params.set("type", filters.type);
  const query = params.toString();
  return query ? `?${query}` : "";
};

// ─── API Functions ────────────────────────────────────────────────────────────

export const fetchAnnouncements = (filters: GetAllFilters = {}) =>
  api.get(`/announcements${buildQuery(filters)}`).then(unwrap<Announcement[]>);

export const fetchAnnouncementById = (id: string) =>
  api.get(`/announcements/${id}`).then(unwrap<Announcement>);

export const createAnnouncement = (payload: CreatePayload) =>
  api.post("/announcements", payload).then(unwrap<Announcement>);

export const updateAnnouncement = (id: string, payload: UpdatePayload) =>
  api.put(`/announcements/${id}`, payload).then(unwrap<Announcement>);

export const deleteAnnouncement = (id: string) =>
  api.delete<{ message: string }>(`/announcements/${id}`).then((r) => r.data);

export const permanentlyDeleteArchivedAnnouncement = (id: string) =>
  api.delete<{ message: string }>(`/announcements/${id}/permanent`).then((r) => r.data);

export const resendAnnouncementToUnread = (id: string) =>
  api.post(`/announcements/${id}/resend`).then(unwrap<{ sent: number }>);

export const markAsRead = (id: string) =>
  api
    .post(`/announcements/${id}/read`)
    .then(unwrap<{ read: boolean; already_read?: boolean }>);

export const fetchReadReceipts = (id: string) =>
  api.get(`/announcements/${id}/receipts`).then(unwrap<AnnouncementAnalytics>);

export const fetchBarangayList = () =>
  api
    .get("/announcements/list/all")
    .then(unwrap<{ id: string; name: string }[]>);
