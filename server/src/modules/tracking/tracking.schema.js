const { z } = require("zod");

const pingSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  truck_id: z.string().min(1, "Truck ID is required"),
});

module.exports = { pingSchema };
