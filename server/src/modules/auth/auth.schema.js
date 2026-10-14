const { z } = require("zod");

const legacyRegisterSchema = z.object({
  full_name: z.string().trim().min(2, "Full name must be at least 2 characters").max(100),
  username: z
    .string().trim()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores",
    ),
  email: z.preprocess(value => typeof value === "string" ? value.trim().toLowerCase() || null : value ?? null,
    z.string().email("Invalid email address").max(100).nullable()),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().optional(),
  barangay_id: z.string().uuid("Invalid barangay"),
  street_id: z.string().uuid("Invalid street").optional(),
});

const passwordSchema = z.string().min(8, "Password must be at least 8 characters")
  .refine(value => Buffer.byteLength(value, "utf8") <= 72, "Password must be at most 72 bytes");
const usernameSchema = z.string().trim().min(3, "Use at least 3 characters").max(20, "Use at most 20 characters")
  .regex(/^[a-zA-Z0-9_]+$/, "Use letters, numbers, or underscores");
const contactEmailSchema = z.preprocess(value => typeof value === "string" ? value.trim().toLowerCase() || null : value,
  z.string().email("Enter a valid email address").max(100).nullable().optional());
const accountRegisterSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(100),
  password: passwordSchema,
  confirm_password: z.string(),
  terms_accepted: z.literal(true, { error: "Please accept the Terms and Privacy Policy" }),
}).strict().refine(data => data.password === data.confirm_password, {
  message: "Passwords do not match", path: ["confirm_password"],
});
// Older native releases still submit a complete resident profile.
const usernameRegisterSchema = z.object({
  username: usernameSchema, password: passwordSchema, confirm_password: z.string(),
  terms_accepted: z.literal(true, { error: "Please accept the Terms and Privacy Policy" }),
}).strict().refine(data => data.password === data.confirm_password, { message: "Passwords do not match", path: ["confirm_password"] });
const registerSchema = z.union([usernameRegisterSchema, accountRegisterSchema, legacyRegisterSchema]);
const residentSetupSchema = z.object({
  avatar_url: z.string().regex(/^\/profile-avatars\/avatar-(?:[1-9]|10)\.png$/, "Choose one of the available avatars").optional(),
  full_name: z.string().trim().min(2, "Enter your full name").max(100),
  username: usernameSchema.optional(),
  email: contactEmailSchema,
  phone: z.preprocess(value => typeof value === "string" ? value.trim() || null : value,
    z.string().regex(/^\+639\d{9}$/, "Enter a valid Philippine mobile number").nullable().optional()),
  barangay_id: z.string().uuid("Select your barangay"),
  street_id: z.string().uuid("Select your street").nullable().optional(),
}).strict();

const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Username is required").max(100),
  password: z.string().min(1, "Password is required"),
  login_mode: z.enum(["username", "legacy-setup"]).optional(),
}).superRefine((data, context) => {
  if (data.login_mode === "username" && !/^[^\s@]{1,50}$/.test(data.identifier))
    context.addIssue({ code: "custom", path: ["identifier"], message: "Enter your username" });
  if (data.login_mode === "legacy-setup" && !z.string().email().safeParse(data.identifier).success)
    context.addIssue({ code: "custom", path: ["identifier"], message: "Enter the email used for your earlier signup" });
});

const recoverySchema = z.object({
  identifier: z.string().trim().min(1).max(100),
  recovery_code: z.string().trim().min(1).max(100),
  new_password: z.string().min(8).refine(value => Buffer.byteLength(value, "utf8") <= 72, "New password must be at most 72 bytes"),
  confirm_password: z.string().min(8).max(255),
}).refine(data => data.new_password === data.confirm_password, { message: "Passwords do not match", path: ["confirm_password"] });
const recoveryCodeSchema = z.object({ password: z.string().min(1).max(255) });
const deactivationSchema = z.object({ password: z.string().min(1, "Enter your current password").max(255) }).strict();

module.exports = { registerSchema, residentSetupSchema, loginSchema, recoverySchema, recoveryCodeSchema, deactivationSchema };
