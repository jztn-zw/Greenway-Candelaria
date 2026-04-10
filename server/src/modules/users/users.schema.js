const { z } = require("zod");

const updateProfileSchema = z.object({
  full_name: z.string().min(2).optional(),
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores",
    )
    .optional(),
  phone: z.string().optional(),
  barangay_id: z.string().uuid().optional(),
});

const changePasswordSchema = z.object({
  old_password: z.string().min(1, "Old password is required"),
  new_password: z.string().min(8, "New password must be at least 8 characters"),
});

const updateStatusSchema = z.object({
  status: z.enum(["ACTIVE", "DEACTIVATED", "BANNED"]),
  ban_reason: z.string().optional(),
});

module.exports = {
  updateProfileSchema,
  changePasswordSchema,
  updateStatusSchema,
};
