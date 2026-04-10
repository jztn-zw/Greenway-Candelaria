const { z } = require("zod");

const createReportSchema = z.object({
  barangay_id: z.string().min(1, "Barangay is required"),
  violation_type: z.enum([
    "ILLEGAL_DUMPING",
    "MISSED_COLLECTION",
    "OVERFLOWING_BIN",
    "OPEN_BURNING",
    "LITTERING",
    "IMPROPER_SEGREGATION",
    "OTHER",
  ]),
  landmark: z.string().optional(),
  description: z.string().min(5, "Description is required"),
  is_anonymous: z.boolean().optional().default(false),
  pin_lat: z.number().optional(),
  pin_lng: z.number().optional(),
  photos: z.array(z.string().url()).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(["SUBMITTED", "UNDER_REVIEW", "DISPATCHED", "RESOLVED"]),
  admin_response: z.string().optional(),
});

const addNoteSchema = z.object({
  note: z.string().min(1, "Note is required"),
});

const flagReportSchema = z.object({
  is_false: z.boolean().optional(),
  is_duplicate: z.boolean().optional(),
  duplicate_of_id: z.string().optional(),
});

const updatePrioritySchema = z.object({
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
});

module.exports = {
  createReportSchema,
  updateStatusSchema,
  addNoteSchema,
  flagReportSchema,
  updatePrioritySchema,
};
