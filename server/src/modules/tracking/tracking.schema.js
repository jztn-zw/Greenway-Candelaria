const { z } = require("zod");

const pingSchema = z.object({
  route_run_id: z.string().uuid().optional(),
  sample_id: z.string().uuid().optional(),
  captured_at: z.string().datetime().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  truck_id: z.string().min(1, "Truck ID is required"),
});

const roadRouteQuerySchema = z.object({
  fromLng: z.coerce.number().min(-180).max(180),
  fromLat: z.coerce.number().min(-90).max(90),
  toLng: z.coerce.number().min(-180).max(180),
  toLat: z.coerce.number().min(-90).max(90),
});

module.exports = { pingSchema, roadRouteQuerySchema };
