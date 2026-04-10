const { z } = require("zod");

const updateScheduleSchema = z.object({
  waste_type: z.enum(["BIODEGRADABLE", "NON_BIODEGRADABLE"], {
    errorMap: () => ({ message: "Invalid waste type" }),
  }),
});

const updateReminderSchema = z.object({
  timing: z
    .number()
    .int()
    .min(1)
    .max(72, "Timing must be between 1 and 72 hours"),
});

module.exports = {
  updateScheduleSchema,
  updateReminderSchema,
};
