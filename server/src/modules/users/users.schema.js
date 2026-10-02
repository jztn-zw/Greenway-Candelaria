const { z } = require("zod");

const updateProfileSchema = z.object({
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
  avatar_url: z.string().regex(/^\/profile-avatars\/avatar-(?:[1-9]|10)\.png$/, "Choose one of the available avatars").optional(),
}).strict();

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
  ban_reason: z.string().optional(),
});

module.exports = {
  updateProfileSchema,
  changePasswordSchema,
  updateSettingsSchema,
  updateAdminSettingsSchema,
  updateStatusSchema,
};
