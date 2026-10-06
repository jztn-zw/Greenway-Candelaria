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
const accountRegisterSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(100),
  password: passwordSchema,
  confirm_password: z.string(),
  terms_accepted: z.literal(true, { error: "Please accept the Terms and Privacy Policy" }),
}).strict().refine(data => data.password === data.confirm_password, {
  message: "Passwords do not match", path: ["confirm_password"],
});
// Older native releases still submit a complete resident profile.
const registerSchema = z.union([accountRegisterSchema, legacyRegisterSchema]);
const residentSetupSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(100),
  username: z.string().trim().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, "Use 3–20 letters, numbers, or underscores"),
  phone: z.string({ error: "Enter your phone number" }).trim().min(1, "Enter your phone number").regex(/^\+639\d{9}$/, "Enter a valid Philippine mobile number"),
  barangay_id: z.string().uuid("Select your barangay"),
  street_id: z.string().uuid("Select your street").nullable().optional(),
}).strict();

const loginSchema = z.object({
  identifier: z.string().min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
});

const recoverySchema = z.object({
  identifier: z.string().trim().min(1).max(100),
  recovery_code: z.string().trim().min(1).max(100),
  new_password: z.string().min(8).refine(value => Buffer.byteLength(value, "utf8") <= 72, "New password must be at most 72 bytes"),
  confirm_password: z.string().min(8).max(255),
}).refine(data => data.new_password === data.confirm_password, { message: "Passwords do not match", path: ["confirm_password"] });
const recoveryCodeSchema = z.object({ password: z.string().min(1).max(255) });

module.exports = { registerSchema, residentSetupSchema, loginSchema, recoverySchema, recoveryCodeSchema };
