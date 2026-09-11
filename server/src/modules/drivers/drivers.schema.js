const { z } = require("zod");

const phoneSchema = z
  .string()
  .regex(/^\d{0,11}$/, "Phone number must contain numbers only and no more than 11 digits")
  .optional();

const createDriverSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email"),
  phone: phoneSchema,
  password: z.string().min(6, "Password must be at least 6 characters"),
  truck_id: z.string().optional(),
});

const updateDriverSchema = z.object({
  full_name: z.string().min(1).optional(),
  phone: phoneSchema,
  truck_id: z.string().nullable().optional(),
  status_msg: z.string().max(255).optional(),
});

const assignTruckSchema = z.object({
  truck_id: z.string().nullable(),
});

const driverStatusSchema = z.object({
  status_msg: z.string().max(255, "Status message too long"),
  route_id: z.string().min(1).optional(),
});

const adminDriverMessageSchema = z.object({
  driver_user_id: z.string().min(1, "Driver user ID is required"),
  route_id: z.string().min(1, "Route ID is required"),
  message: z.string().trim().min(1, "Message is required").max(255),
});

module.exports = {
  createDriverSchema,
  updateDriverSchema,
  assignTruckSchema,
  driverStatusSchema,
  adminDriverMessageSchema,
};
