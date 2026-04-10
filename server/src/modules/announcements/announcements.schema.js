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
