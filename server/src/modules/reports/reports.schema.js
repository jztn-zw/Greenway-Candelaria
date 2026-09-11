const { z } = require("zod");

const createReportSchema = z.object({
  barangay_id: z.string().trim().min(1, "Barangay is required"),
  violation_type: z.enum([
    "ILLEGAL_DUMPING",
    "MISSED_COLLECTION",
    "OVERFLOWING_BIN",
    "OPEN_BURNING",
    "LITTERING",
    "IMPROPER_SEGREGATION",
    "OTHER",
  ]),
  landmark: z.string().trim().max(300, "Landmark must be 300 characters or less").optional(),
  description: z.string().trim().min(10, "Description must be at least 10 characters").max(2000, "Description must be 2000 characters or less"),
  pin_lat: z.number().finite().min(-90, "Invalid latitude").max(90, "Invalid latitude").optional(),
  pin_lng: z.number().finite().min(-180, "Invalid longitude").max(180, "Invalid longitude").optional(),
  photos: z.array(z.string().url()).min(1, "At least one photo is required").max(5, "A report can contain up to 5 photos"),
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
  duplicate_of_reference: z.string().trim().min(1).optional(),
  duplicate_reason: z.string().trim().min(1).max(2000).optional(),
  false_reason: z.string().trim().min(1).max(2000).optional(),
  resolve: z.boolean().optional(),
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
