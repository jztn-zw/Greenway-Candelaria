import api from "../lib/api";
import type { Announcement } from "../pages/admin/components/announcements/types";

export interface GetAllFilters {
  status?: string;
  type?: string;
  priority?: string;
  is_featured?: boolean;
}

export interface CreatePayload {
  title: string;
  body: string;
  type: string;
  priority?: string;
  status?: string;
  is_featured?: boolean;
  target_all?: boolean;
  scheduled_at?: string | null;
  expires_at?: string | null;
  barangay_ids?: string[];
}

export type UpdatePayload = Partial<CreatePayload>;

export interface ReadReceipt {
  id: string;
  read_at: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_avatar: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Unwraps backend { data: T } shape in one place — avoids repeating data.data everywhere
const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

// Builds query string from filters cleanly
const buildQuery = (filters: GetAllFilters): string => {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.type) params.set("type", filters.type);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.is_featured) params.set("is_featured", "true");
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

export const markAsRead = (id: string) =>
  api
    .post(`/announcements/${id}/read`)
    .then(unwrap<{ read: boolean; already_read?: boolean }>);

export const fetchReadReceipts = (id: string) =>
  api.get(`/announcements/${id}/receipts`).then(unwrap<ReadReceipt[]>);

export const fetchBarangayList = () =>
  api
    .get("/announcements/list/all")
    .then(unwrap<{ id: string; name: string }[]>);
