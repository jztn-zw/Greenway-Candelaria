import { useAdminMutation, useAdminQuery } from "@/lib/adminQuery";
import { toast } from "@/lib/toast";
import {
createAnnouncement as apicreateAnnouncement,
deleteAnnouncement as apideleteAnnouncement,
permanentlyDeleteArchivedAnnouncement as apipermanentlyDeleteArchivedAnnouncement,
resendAnnouncementToUnread as apiresendAnnouncementToUnread,
updateAnnouncement as apiupdateAnnouncement,
fetchAdminAnnouncementsPage,
fetchBarangayList,
} from "@/services/announcementsService";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { Announcement, AnnouncementStatus, EditorForm } from "../types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formToPayload = (form: EditorForm) => {
  const typeMap: Record<string, string> = {
    "Schedule Change": "SCHEDULE_CHANGE",
    "Holiday Reminder": "HOLIDAY_REMINDER",
    "Community Event": "COMMUNITY_EVENT",
    "Emergency Advisory": "EMERGENCY_ADVISORY",
    "General Notice": "GENERAL_NOTICE",
    "System Maintenance": "SYSTEM_MAINTENANCE",
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
    show_on_calendar: form.showOnResidentCalendar,
    calendar_date: form.showOnResidentCalendar ? form.calendarDate || null : null,
  };
};

const mapFromApi = (raw: Record<string, unknown>): Announcement => {
  const typeMap: Record<string, string> = {
    SCHEDULE_CHANGE: "Schedule Change",
    HOLIDAY_REMINDER: "Holiday Reminder",
    COMMUNITY_EVENT: "Community Event",
    EMERGENCY_ADVISORY: "Emergency Advisory",
    GENERAL_NOTICE: "General Notice",
    SYSTEM_MAINTENANCE: "System Maintenance",
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
    calendarEventId: (raw.calendar_event_id as string | null) ?? null,
    calendarDate: (raw.calendar_date as string | null) ?? null,
    calendarStartTime: (raw.calendar_start_time as string | null) ?? null,
    calendarEndTime: (raw.calendar_end_time as string | null) ?? null,
    calendarLocation: (raw.calendar_location as string | null) ?? null,
    readCount: Number(raw.read_count ?? 0),
    totalRecipients: Number(raw.recipient_count ?? 0),
    archived: raw.status === "ARCHIVED",
    edited: raw.updated_at !== raw.created_at,
    createdBy: (raw.created_by_name as string) ?? "Admin",
    lastEdited: formatDate(raw.updated_at as string | null) ?? "",
    barangayReadStats: [],
  };
};

// ─── Hook ────────────────────────────────────────────────────────────────────

interface AnnouncementQuery {
  page: number;
  limit: number;
  search: string;
  status: string;
  type: string;
  sort: string;
}

const statusToApi: Record<string, string> = {
  Active: "ACTIVE",
  Scheduled: "SCHEDULED",
  Draft: "DRAFT",
  Archived: "ARCHIVED",
};

const typeToApi: Record<string, string> = {
  "Schedule Change": "SCHEDULE_CHANGE",
  "Holiday Reminder": "HOLIDAY_REMINDER",
  "Community Event": "COMMUNITY_EVENT",
  "Emergency Advisory": "EMERGENCY_ADVISORY",
  "General Notice": "GENERAL_NOTICE",
  "System Maintenance": "SYSTEM_MAINTENANCE",
};

export const useAnnouncements = (query: AnnouncementQuery) => {
  const createAnnouncement = useAdminMutation(apicreateAnnouncement, "announcements", "schedule", "notifications");
  const updateAnnouncement = useAdminMutation(apiupdateAnnouncement, "announcements", "schedule", "notifications");
  const deleteAnnouncement = useAdminMutation(apideleteAnnouncement, "announcements", "schedule", "notifications");
  const permanentlyDeleteArchivedAnnouncement = useAdminMutation(apipermanentlyDeleteArchivedAnnouncement, "announcements", "schedule", "notifications");
  const resendAnnouncementToUnread = useAdminMutation(apiresendAnnouncementToUnread, "announcements", "schedule", "notifications");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [barangayOptions, setBarangayOptions] = useState<
    { id: string; name: string }[]
  >([]);

  const [isSaving, setIsSaving] = useState(false);
  const [hasLoadedPage, setHasLoadedPage] = useState(false);

  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [metrics, setMetrics] = useState({
    active: 0,
    scheduled: 0,
    drafts: 0,
    totalRecipients: 0,
    totalReads: 0,
  });

  const pageQuery = useAdminQuery("announcements", ["list", query], () => fetchAdminAnnouncementsPage({
    page: query.page, limit: query.limit, search: query.search.trim() || undefined,
    status: statusToApi[query.status], type: typeToApi[query.type], sort: query.sort,
  }));
  const barangaysQuery = useAdminQuery("barangays", ["announcement-options"], fetchBarangayList);
  const isLoading = pageQuery.isLoading || barangaysQuery.isLoading;
  const error = pageQuery.error?.message ?? barangaysQuery.error?.message ?? null;
  const loadInitialData = () => Promise.all([pageQuery.refetch(), barangaysQuery.refetch()]);
  useLayoutEffect(() => {
    if (!pageQuery.data) return;
    const pageData = pageQuery.data;
    setAnnouncements((pageData.items as unknown as Record<string, unknown>[]).map(mapFromApi));
    setTotalItems(pageData.total); setTotalPages(pageData.totalPages);
    setStatusCounts(pageData.statusCounts); setMetrics(pageData.metrics);
    setHasLoadedPage(true);
  }, [pageQuery.data]);
  useEffect(() => { if (barangaysQuery.data) setBarangayOptions(barangaysQuery.data); }, [barangaysQuery.data]);
  useEffect(() => { if (error) toast.error(error); }, [error]);

  const createNew = useCallback(async (form: EditorForm): Promise<void> => {
    try {
      setIsSaving(true);
      const payload = formToPayload(form);
      await createAnnouncement(payload);
      toast.success("Announcement saved successfully");
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Failed to create the announcement.");
    } finally {
      setIsSaving(false);
    }
  }, [createAnnouncement]);

  const updateExisting = useCallback(
    async (id: string, form: EditorForm): Promise<void> => {
      try {
        setIsSaving(true);
        const payload = formToPayload(form);
        await updateAnnouncement(id, payload);
          toast.success("Announcement updated");
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : "Failed to update the announcement.");
      } finally {
        setIsSaving(false);
      }
    },
    [updateAnnouncement],
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
    [announcements, deleteAnnouncement],
  );

  const toggleArchive = useCallback(
    async (ann: Announcement): Promise<boolean> => {
      const isArchived = ann.status === "Archived";
      const previous = announcements;

      try {
        await updateAnnouncement(ann.id, {
          status: isArchived ? "ACTIVE" : "ARCHIVED",
        });
          toast.success(isArchived ? "Announcement restored" : "Announcement archived");
        return true;
      } catch (err) {
        setAnnouncements(previous);
        toast.error(err instanceof Error ? err.message : "Action failed.");
        return false;
      }
    },
    [announcements, updateAnnouncement],
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
    [announcements, permanentlyDeleteArchivedAnnouncement],
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
        showOnResidentCalendar: false,
        calendarDate: "",
      });
      await createAnnouncement(payload);
      toast.success("Duplicated as draft");
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to duplicate.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [createAnnouncement]);

  /* --- RESTORED MISSING FUNCTIONS BELOW --- */

  const sendNow = useCallback(async (ann: Announcement): Promise<boolean> => {
    try {
      await updateAnnouncement(ann.id, { status: "ACTIVE" });
      toast.success("Announcement sent!");
      return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to send announcement.");
        return false;
    }
  }, [updateAnnouncement]);

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
    [updateAnnouncement],
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
  }, [resendAnnouncementToUnread]);

  return {
    announcements,
    barangayOptions,
    isInitialLoading: isLoading && !hasLoadedPage,
    isResultsLoading: pageQuery.isLoading && hasLoadedPage,
    pageError: pageQuery.data ? null : pageQuery.error?.message ?? null,
    retryPage: pageQuery.refetch,
    isSaving,
    error,
    totalItems,
    totalPages,
    statusCounts,
    metrics,
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
