const { z } = require("zod");

const createTruckSchema = z.object({
  name: z.string().min(1, "Truck name is required"),
  plate_number: z.string().min(1, "Plate number is required"),
  truck_model: z.string().min(1, "Truck model is required"),
  availability_status: z.enum(["ACTIVE", "UNDER_MAINTENANCE"]).optional(),
});

const updateTruckSchema = z.object({
  name: z.string().min(1).optional(),
  plate_number: z.string().min(1).optional(),
  truck_model: z.string().min(1).optional(),
  status: z.enum(["OFFLINE", "SCHEDULED", "ON_THE_WAY", "DONE"]).optional(),
  availability_status: z.enum(["ACTIVE", "UNDER_MAINTENANCE"]).optional(),
});

module.exports = { createTruckSchema, updateTruckSchema };
