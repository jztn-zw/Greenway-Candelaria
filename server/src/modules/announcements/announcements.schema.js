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
  ]),
  priority: z.enum(["NORMAL", "URGENT"]).optional().default("NORMAL"),
  status: z
    .enum(["DRAFT", "ACTIVE", "SCHEDULED", "ARCHIVED"])
    .optional()
    .default("DRAFT"),
  is_featured: z.boolean().optional().default(false),
  target_all: z.boolean().optional().default(true),
  scheduled_at: z.string().optional().nullable(),
  expires_at: z.string().optional().nullable(),
  barangay_ids: z.array(z.string()).optional().default([]),
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
  if (data.expires_at && Number.isNaN(new Date(data.expires_at).getTime())) {
    ctx.addIssue({ code: "custom", path: ["expires_at"], message: "Expiry time is invalid" });
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
    ])
    .optional(),
  priority: z.enum(["NORMAL", "URGENT"]).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "SCHEDULED", "ARCHIVED"]).optional(),
  is_featured: z.boolean().optional(),
  target_all: z.boolean().optional(),
  scheduled_at: z.string().nullable().optional(),
  expires_at: z.string().nullable().optional(),
  barangay_ids: z.array(z.string()).optional(),
});

module.exports = {
  createAnnouncementSchema,
  updateAnnouncementSchema,
};
