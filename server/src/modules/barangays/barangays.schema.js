const { z } = require("zod");

const updateBarangaySchema = z.object({
  zone: z.string().min(1).optional(),
  is_priority: z.boolean().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  notes: z.string().max(5000).optional(),
});

module.exports = { updateBarangaySchema };
