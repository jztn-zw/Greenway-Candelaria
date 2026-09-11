const { z } = require("zod");

const updateScheduleSchema = z.object({
  waste_type: z.enum(["BIODEGRADABLE", "NON_BIODEGRADABLE"], {
    errorMap: () => ({ message: "Invalid waste type" }),
  }),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Invalid start time (HH:MM)").optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Invalid end time (HH:MM)").optional().nullable(),
});

const createScheduleRuleSchema = z.object({
  day_of_week: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]),
  waste_type: z.enum(["BIODEGRADABLE", "NON_BIODEGRADABLE"]),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Invalid start time (HH:MM)"),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Invalid end time (HH:MM)").optional().nullable(),
});

const updateReminderSchema = z.object({
  timing: z
    .number()
    .int()
    .min(1)
    .max(72, "Timing must be between 1 and 72 hours"),
});

const createEventSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(255),
  description: z.string().trim().max(1000).optional().nullable(),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid end date format (YYYY-MM-DD)").optional().nullable(),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Invalid time format (HH:MM)").optional().nullable(),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Invalid time format (HH:MM)").optional().nullable(),
  event_type: z.enum(["PRIVATE_EVENT", "COMMUNITY_EVENT", "COLLECTION_SCHEDULE"], {
    errorMap: () => ({ message: "Invalid event category" }),
  }),
  visibility: z.enum(["PRIVATE", "PUBLIC"], {
    errorMap: () => ({ message: "Invalid visibility mode" }),
  }),
  location: z.string().trim().max(255).optional().nullable(),
  barangay_id: z.string().trim().max(36).optional().nullable(),
  status: z.enum(["UPCOMING", "ONGOING", "COMPLETED", "CANCELLED"]).default("UPCOMING"),
});

const updateEventSchema = createEventSchema.partial();

module.exports = {
  updateScheduleSchema,
  createScheduleRuleSchema,
  updateReminderSchema,
  createEventSchema,
  updateEventSchema,
};
