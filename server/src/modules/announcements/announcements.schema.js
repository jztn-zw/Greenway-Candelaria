const { z } = require("zod");

const createAnnouncementSchema = z.object({
  title: z.string().min(1, "Title is required"),
  body: z.string().min(1, "Body is required"),
  type: z.enum([
    "GENERAL_NOTICE",
    "SCHEDULE_CHANGE",
    "HOLIDAY_REMINDER",
    "EMERGENCY_ADVISORY",
    "SYSTEM_MAINTENANCE",
    "COMMUNITY_EVENT",
  ]),
  status: z
    .enum(["DRAFT", "ACTIVE", "SCHEDULED", "ARCHIVED"])
    .optional()
    .default("DRAFT"),
  target_all: z.boolean().optional().default(true),
  scheduled_at: z.string().optional().nullable(),
  expires_at: z.string().optional().nullable(),
  barangay_ids: z.array(z.string()).optional().default([]),
  show_on_calendar: z.boolean().optional().default(false),
  calendar_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Calendar date must use YYYY-MM-DD").optional().nullable(),
}).superRefine((data, ctx) => {
  if (!data.target_all && data.barangay_ids.length === 0) {
    ctx.addIssue({ code: "custom", path: ["barangay_ids"], message: "Select at least one barangay" });
  }
  if (data.status === "SCHEDULED" && !data.scheduled_at) {
    ctx.addIssue({ code: "custom", path: ["scheduled_at"], message: "A broadcast time is required" });
  }
  if (data.scheduled_at) {
    const scheduledAt = new Date(data.scheduled_at);
    if (Number.isNaN(scheduledAt.getTime()) || (data.status === "SCHEDULED" && scheduledAt <= new Date())) {
      ctx.addIssue({ code: "custom", path: ["scheduled_at"], message: "Broadcast time must be in the future" });
    }
  }
  if (data.expires_at) {
    const expiresAt = new Date(data.expires_at);
    if (Number.isNaN(expiresAt.getTime())) {
      ctx.addIssue({ code: "custom", path: ["expires_at"], message: "Expiry time is invalid" });
    } else if (data.status !== "DRAFT" && expiresAt <= new Date()) {
      ctx.addIssue({ code: "custom", path: ["expires_at"], message: "Expiry time must be in the future" });
    } else if (data.scheduled_at && expiresAt <= new Date(data.scheduled_at)) {
      ctx.addIssue({ code: "custom", path: ["expires_at"], message: "Expiry must be after the broadcast time" });
    }
  }
  if (data.show_on_calendar && !data.calendar_date) {
    ctx.addIssue({ code: "custom", path: ["calendar_date"], message: "Select the resident calendar date" });
  }
  if (data.show_on_calendar && !["SCHEDULE_CHANGE", "HOLIDAY_REMINDER", "COMMUNITY_EVENT"].includes(data.type)) {
    ctx.addIssue({ code: "custom", path: ["show_on_calendar"], message: "Only event and schedule-related announcements can appear on the resident calendar" });
  }
});

const updateAnnouncementSchema = z.object({
  title: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
  type: z
    .enum([
      "GENERAL_NOTICE",
      "SCHEDULE_CHANGE",
      "HOLIDAY_REMINDER",
      "EMERGENCY_ADVISORY",
      "SYSTEM_MAINTENANCE",
      "COMMUNITY_EVENT",
    ])
    .optional(),
  status: z.enum(["DRAFT", "ACTIVE", "SCHEDULED", "ARCHIVED"]).optional(),
  target_all: z.boolean().optional(),
  scheduled_at: z.string().nullable().optional(),
  expires_at: z.string().nullable().optional(),
  barangay_ids: z.array(z.string()).optional(),
  show_on_calendar: z.boolean().optional(),
  calendar_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

module.exports = {
  createAnnouncementSchema,
  updateAnnouncementSchema,
};
