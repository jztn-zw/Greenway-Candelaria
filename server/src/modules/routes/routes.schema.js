const { z } = require("zod");

const days = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

const timeSchema = z.string().regex(
  /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/,
  "Invalid start time (HH:MM)",
);

const stopSchema = z
  .object({
    // A legacy barangay-only stop remains valid for future service areas.
    barangay_id: z.string().min(1).optional(),
    street_id: z.string().min(1).optional(),
    stop_order: z.number().int().positive(),
  })
  .refine(
    (stop) => Boolean(stop.barangay_id || stop.street_id),
    { message: "A barangay or collection street is required" },
  );

const routeStopsSchema = z.array(stopSchema).min(1, "At least one stop is required").superRefine((stops, ctx) => {
  const orders = new Set();
  stops.forEach((stop, index) => {
    if (orders.has(stop.stop_order)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [index, "stop_order"],
        message: "Stop order must be unique",
      });
    }
    orders.add(stop.stop_order);
  });
});

const createRouteSchema = z.object({
  truck_id: z.string().min(1, "Truck is required"),
  driver_id: z.string().optional(),
  day_of_week: z.enum(days, { errorMap: () => ({ message: "Invalid day" }) }),
  start_time: timeSchema,
  name: z.string().trim().max(100).optional(),
  waste_type: z.enum(["Biodegradable", "Non-Biodegradable"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  stops: routeStopsSchema,
});

const updateRouteSchema = z.object({
  truck_id: z.string().optional(),
  driver_id: z.string().nullable().optional(),
  day_of_week: z.enum(days).optional(),
  start_time: timeSchema.optional(),
  name: z.string().trim().max(100).nullable().optional(),
  waste_type: z.enum(["Biodegradable", "Non-Biodegradable"]).nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  stops: routeStopsSchema.optional(),
});

const updateStopStatusSchema = z.object({
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "DONE", "MISSED"]),
  skipped_reason: z.string().trim().max(255).nullable().optional(),
}).superRefine((data, ctx) => {
  if (data.status === "MISSED" && !data.skipped_reason?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["skipped_reason"], message: "A reason is required for a missed stop" });
  }
});

module.exports = {
  createRouteSchema,
  updateRouteSchema,
  updateStopStatusSchema,
};
