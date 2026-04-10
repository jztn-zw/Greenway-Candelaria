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

const stopSchema = z.object({
  barangay_id: z.string().min(1, "Barangay ID is required"),
  stop_order: z.number().int().positive(),
});

const createRouteSchema = z.object({
  truck_id: z.string().min(1, "Truck is required"),
  driver_id: z.string().optional(),
  day_of_week: z.enum(days, { errorMap: () => ({ message: "Invalid day" }) }),
  start_time: z.string().min(1, "Start time is required"),
  name: z.string().optional(),
  waste_type: z.enum(["Biodegradable", "Non-Biodegradable"]).optional(),
  stops: z.array(stopSchema).min(1, "At least one stop is required"),
});

const updateRouteSchema = z.object({
  truck_id: z.string().optional(),
  driver_id: z.string().nullable().optional(),
  day_of_week: z.enum(days).optional(),
  start_time: z.string().optional(),
  name: z.string().nullable().optional(),
  waste_type: z.enum(["Biodegradable", "Non-Biodegradable"]).nullable().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  stops: z.array(stopSchema).optional(),
});

const updateStopStatusSchema = z.object({
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "DONE", "MISSED"]),
});

module.exports = {
  createRouteSchema,
  updateRouteSchema,
  updateStopStatusSchema,
};
