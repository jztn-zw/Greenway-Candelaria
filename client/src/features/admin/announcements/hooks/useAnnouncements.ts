import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  fetchAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  permanentlyDeleteArchivedAnnouncement,
  resendAnnouncementToUnread,
  fetchBarangayList,
} from "@/services/announcementsService";
import { Announcement, AnnouncementStatus, EditorForm } from "../types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formToPayload = (form: EditorForm) => {
  const typeMap: Record<string, string> = {
    "Schedule Change": "SCHEDULE_CHANGE",
    "Holiday Reminder": "HOLIDAY_REMINDER",
    "Emergency Advisory": "EMERGENCY_ADVISORY",
    "General Notice": "GENERAL_NOTICE",
    "System Maintenance": "SYSTEM_MAINTENANCE",
  };

  const priorityMap: Record<string, string> = {
    Normal: "NORMAL",
    Urgent: "URGENT",
    Emergency: "URGENT",
  };

  const statusMap: Record<string, string> = {
    Draft: "DRAFT",
    Scheduled: "SCHEDULED",
    Active: "ACTIVE",
    Archived: "ARCHIVED",
  };

  return {
    title: form.title,
    body: form.body,
    type: typeMap[form.type] || "GENERAL_NOTICE",
    priority: priorityMap[form.priority] ?? "NORMAL",
    status: statusMap[form.status] ?? "DRAFT",
    target_all: form.targetAudience === "All Residents",
    scheduled_at:
      form.status === "Scheduled" && form.scheduledDate
        ? new Date(form.scheduledDate).toISOString()
        : null,
    expires_at: form.expiryDate
      ? new Date(form.expiryDate).toISOString()
      : null,
    barangay_ids:
      form.targetAudience !== "All Residents" ? form.targetBarangays : [],
  };
};

const mapFromApi = (raw: Record<string, unknown>): Announcement => {
  const typeMap: Record<string, string> = {
    SCHEDULE_CHANGE: "Schedule Change",
    HOLIDAY_REMINDER: "Holiday Reminder",
    EMERGENCY_ADVISORY: "Emergency Advisory",
    GENERAL_NOTICE: "General Notice",
    SYSTEM_MAINTENANCE: "System Maintenance",
  };

  const priorityMap: Record<string, string> = {
    NORMAL: "Normal",
    URGENT: "Urgent",
  };
  const statusMap: Record<string, string> = {
    DRAFT: "Draft",
    SCHEDULED: "Scheduled",
    ACTIVE: "Active",
    ARCHIVED: "Archived",
  };

  const formatDate = (iso: string | null): string | null => {
    if (!iso) return null;
    const normalized = /^\d{4}-\d{2}-\d{2}/.test(iso) && !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(iso)
      ? `${iso.replace(" ", "T")}Z`
      : iso;
    return new Date(normalized).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const barangays =
    (raw.barangays as { id: string; name: string }[] | undefined) ?? [];

  return {
    id: raw.id as string,
    title: raw.title as string,
    body: raw.body as string,
    type: (typeMap[raw.type as string] ?? raw.type) as Announcement["type"],
    priority: (priorityMap[raw.priority as string] ??
      raw.priority) as Announcement["priority"],
    status: (statusMap[raw.status as string] ??
      raw.status) as AnnouncementStatus,
    targetAudience: raw.target_all ? "All Residents" : "Specific Barangays",
    targetBarangays: barangays.map((b) => b.name),
    targetBarangayIds: barangays.map((b) => b.id),
    targetPreset: null,
    sentDate: formatDate(raw.sent_at as string | null),
    sentAt: (raw.sent_at as string | null) ?? null,
    createdAt: (raw.created_at as string | null) ?? null,
    archivedAt: (raw.archived_at as string | null) ?? null,
    scheduledDate: (raw.scheduled_at as string | null) ?? null,
    expiryDate: (raw.expires_at as string | null) ?? null,
    expiryLabel: formatDate(raw.expires_at as string | null),
    readCount: Number(raw.read_count ?? 0),
    totalRecipients: 0,
    archived: raw.status === "ARCHIVED",
    edited: raw.updated_at !== raw.created_at,
    createdBy: (raw.created_by_name as string) ?? "Admin",
    lastEdited: formatDate(raw.updated_at as string | null) ?? "",
    barangayReadStats: [],
  };
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export const useAnnouncements = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [barangayOptions, setBarangayOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInitialData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [annRaw, brgyRaw] = await Promise.all([
        fetchAnnouncements(),
        fetchBarangayList(),
      ]);
      setAnnouncements((annRaw as any[]).map(mapFromApi));
      setBarangayOptions(brgyRaw);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load data.";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const createNew = useCallback(async (form: EditorForm): Promise<boolean> => {
    try {
      setIsSaving(true);
      const payload = formToPayload(form);
      const raw = await createAnnouncement(payload);
      const mapped = mapFromApi(raw as unknown as Record<string, unknown>);
      setAnnouncements((prev) => [mapped, ...prev]);
      toast.success("Announcement saved successfully");
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const updateExisting = useCallback(
    async (id: string, form: EditorForm): Promise<boolean> => {
      try {
        setIsSaving(true);
        const payload = formToPayload(form);
        const raw = await updateAnnouncement(id, payload);
        const mapped = mapFromApi(raw as unknown as Record<string, unknown>);
        setAnnouncements((prev) => prev.map((a) => (a.id === id ? mapped : a)));
        toast.success("Announcement updated");
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update.");
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [],
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      const previous = announcements;
      setAnnouncements((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, status: "Archived" as AnnouncementStatus, archived: true, archivedAt: new Date().toISOString() }
            : a,
        ),
      );
      try {
        await deleteAnnouncement(id);
        toast.success("Announcement archived. It can be restored within 30 days.");
        return true;
      } catch (err) {
        setAnnouncements(previous);
        toast.error(err instanceof Error ? err.message : "Failed to archive.");
        return false;
      }
    },
    [announcements],
  );

  const toggleArchive = useCallback(
    async (ann: Announcement): Promise<boolean> => {
      const isArchived = ann.status === "Archived";
      const nextStatus = isArchived ? ("Active" as AnnouncementStatus) : ("Archived" as AnnouncementStatus);
      const previous = announcements;

      try {
        const raw = await updateAnnouncement(ann.id, {
          status: isArchived ? "ACTIVE" : "ARCHIVED",
        });
        const mapped = mapFromApi(raw as unknown as Record<string, unknown>);
        setAnnouncements((prev) => prev.map((a) => (a.id === ann.id ? mapped : a)));
        toast.success(isArchived ? "Announcement restored" : "Announcement archived");
        return true;
      } catch (err) {
        setAnnouncements(previous);
        toast.error(err instanceof Error ? err.message : "Action failed.");
        return false;
      }
    },
    [announcements],
  );

  const permanentlyDelete = useCallback(
    async (id: string): Promise<boolean> => {
      const previous = announcements;
      setAnnouncements((prev) => prev.filter((announcement) => announcement.id !== id));
      try {
        await permanentlyDeleteArchivedAnnouncement(id);
        toast.success("Archived announcement permanently deleted");
        return true;
      } catch (err) {
        setAnnouncements(previous);
        toast.error(err instanceof Error ? err.message : "Could not permanently delete the announcement.");
        return false;
      }
    },
    [announcements],
  );

  const duplicate = useCallback(async (ann: Announcement): Promise<boolean> => {
    try {
      setIsSaving(true);
      const payload = formToPayload({
        ...ann,
        title: `${ann.title} (Copy)`,
        status: "Draft",
        // Announcement cards keep names for display and IDs for requests.
        // The API requires IDs when this is a barangay-targeted announcement.
        targetBarangays: ann.targetBarangayIds,
        scheduledDate: "",
        expiryDate: "",
      });
      const raw = await createAnnouncement(payload);
      const mapped = mapFromApi(raw as unknown as Record<string, unknown>);
      setAnnouncements((prev) => [mapped, ...prev]);
      toast.success("Duplicated as draft");
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to duplicate.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  /* --- RESTORED MISSING FUNCTIONS BELOW --- */

  const sendNow = useCallback(async (ann: Announcement): Promise<boolean> => {
    try {
      const raw = await updateAnnouncement(ann.id, { status: "ACTIVE" });
      const mapped = mapFromApi(raw as unknown as Record<string, unknown>);
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === ann.id ? mapped : a)),
      );
      toast.success("Announcement sent!");
      return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to send announcement.");
        return false;
    }
  }, []);

  const cancelSchedule = useCallback(
    async (ann: Announcement): Promise<boolean> => {
      setAnnouncements((prev) =>
        prev.map((a) =>
          a.id === ann.id
            ? {
                ...a,
                status: "Draft" as AnnouncementStatus,
                scheduledDate: null,
              }
            : a,
        ),
      );
      try {
        await updateAnnouncement(ann.id, {
          status: "DRAFT",
          scheduled_at: null,
        });
        toast.success("Schedule cancelled");
        return true;
      } catch (err) {
        setAnnouncements((prev) =>
          prev.map((a) => (a.id === ann.id ? ann : a)),
        );
        toast.error("Failed to cancel schedule.");
        return false;
      }
    },
    [],
  );

  const resendToUnread = useCallback(async (ann: Announcement): Promise<boolean> => {
    try {
      setIsSaving(true);
      const result = await resendAnnouncementToUnread(ann.id);
      if (result.sent === 0) {
        toast.info("All delivered recipients have already read this announcement.");
      } else {
        toast.success(`Resent to ${result.sent} unread resident${result.sent === 1 ? "" : "s"}.`);
      }
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resend the announcement.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  return {
    announcements,
    barangayOptions,
    isLoading,
    isSaving,
    error,
    loadAnnouncements: loadInitialData,
    createNew,
    updateExisting,
    remove,
    permanentlyDelete,
    toggleArchive,
    duplicate,
    sendNow, // Added back
    cancelSchedule, // Added back
    resendToUnread,
  };
};
