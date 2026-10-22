const { z } = require("zod");
const { residentLocationSchema } = require("./residentLocation");

const updateProfileSchema = z.object({
  email: z.preprocess(value => typeof value === "string" ? value.trim().toLowerCase() || null : value,
    z.string().email("Enter a valid email address").max(100).nullable().optional()),
  full_name: z.string().trim().min(2).max(100).optional(),
  username: z
    .string()
    .min(3)
    .max(50)
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores",
    )
    .optional(),
  phone: z.string().trim().max(20).regex(/^[0-9+()\-\s]*$/, "Invalid phone number").optional(),
  barangay_id: z.string().uuid().optional(),
  street_id: z.string().uuid().nullable().optional(),
  resident_location: residentLocationSchema.unwrap().optional(),
  avatar_url: z.string().regex(/^\/profile-avatars\/avatar-(?:[1-9]|10)\.png$/, "Choose one of the available avatars").optional(),
}).strict().superRefine((data, ctx) => {
  if (data.resident_location === undefined) return;
  if (!data.barangay_id || !data.street_id) ctx.addIssue({ code: z.ZodIssueCode.custom,
    message: "Choose your barangay, street and location together.", path: ["resident_location"] });
  if (Object.keys(data).some(key => !["barangay_id", "street_id", "resident_location"].includes(key))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Save collection address changes separately from other profile changes.", path: ["resident_location"] });
  }
});

const changePasswordSchema = z.object({
  old_password: z.string().min(1, "Old password is required").max(128),
  new_password: z.string()
    .min(8, "New password must be at least 8 characters")
    .refine((value) => Buffer.byteLength(value, "utf8") <= 72, "New password must be at most 72 bytes"),
}).strict().refine((data) => data.old_password !== data.new_password, {
  message: "New password must be different from the current password",
  path: ["new_password"],
});

const updateSettingsSchema = z.object({
  notif_collection_reminders: z.boolean().optional(),
  notif_truck_near: z.boolean().optional(),
  notif_collection_done: z.boolean().optional(),
  notif_collection_skipped: z.boolean().optional(),
  notif_report_updates: z.boolean().optional(),
  notif_new_content: z.boolean().optional(),
  notif_announcements: z.boolean().optional(),
  primary_barangay_id: z.string().uuid().nullable().optional(),
  reminder_on: z.boolean().optional(),
  reminder_timing: z.literal("3h").optional(),
}).strict();

const updateAdminSettingsSchema = z.object({
  notif_admin_reports: z.boolean().optional(),
  notif_admin_route_issues: z.boolean().optional(),
  notif_admin_driver_messages: z.boolean().optional(),
}).strict().refine((settings) => Object.keys(settings).length > 0, {
  message: "At least one alert preference is required",
});

const updateStatusSchema = z.object({
  status: z.enum(["ACTIVE", "DEACTIVATED", "BANNED"]),
  ban_reason: z.string().trim().max(255, "Ban reason must be 255 characters or fewer").optional(),
}).refine((data) => data.status !== "BANNED" || Boolean(data.ban_reason), {
  message: "A ban reason is required",
  path: ["ban_reason"],
});

module.exports = {
  updateProfileSchema,
  changePasswordSchema,
  updateSettingsSchema,
  updateAdminSettingsSchema,
  updateStatusSchema,
};
