const { z } = require("zod");

const updateReminderSchema = z.object({
  timing: z.literal(3),
});

const calendarDateSchema = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number(value.slice(0, 4)) < 1000) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Enter a valid calendar date (YYYY-MM-DD)");

const eventFiltersSchema = z.object({
  view: z.literal("collector").optional(),
  month: z.string().regex(/^[1-9]\d{3}-(0[1-9]|1[0-2])$/, "Invalid month (YYYY-MM)").optional(),
  year: z.coerce.string().regex(/^[1-9]\d{3}$/, "Invalid year").optional(),
  event_type: z.enum(["PRIVATE_EVENT", "COMMUNITY_EVENT", "COLLECTION_SCHEDULE"]).optional(),
  visibility: z.enum(["PRIVATE", "PUBLIC"]).optional(),
  status: z.enum(["UPCOMING", "ONGOING", "COMPLETED", "CANCELLED"]).optional(),
  barangay_id: z.string().max(36).optional(),
});

const createEventSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(255),
  description: z.string().trim().max(1000).optional().nullable(),
  event_date: calendarDateSchema,
  end_date: calendarDateSchema.optional().nullable(),
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
  updateReminderSchema,
  createEventSchema,
  updateEventSchema,
  eventFiltersSchema,
};
