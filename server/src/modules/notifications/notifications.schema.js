const { z } = require("zod");

const sendNotificationSchema = z.object({
  user_ids: z.array(z.string()).min(1, "At least one user is required"),
  type: z.enum([
    "COLLECTION_REMINDER",
    "TRUCK_IS_NEAR",
    "COLLECTION_DONE",
    "REPORT_UPDATE",
    "NEW_POST",
    "ANNOUNCEMENT",
    "MISSED_COLLECTION",
    "SYSTEM",
  ]),
  title: z.string().min(1, "Title is required"),
  body: z.string().min(1, "Body is required"),
  ref_id: z.string().optional().nullable(),
  ref_module: z.string().optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
});

module.exports = { sendNotificationSchema };
