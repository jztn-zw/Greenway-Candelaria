const { z } = require("zod");

const isPlainObject = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const updateSectionSchema = z.object({
  content: z.unknown().refine((value) => isPlainObject(value) && Object.keys(value).length > 0, {
    message: "Content must be a non-empty object",
  }),
});

const toggleVisibilitySchema = z.object({
  is_visible: z.boolean({
    required_error: "is_visible is required",
    invalid_type_error: "is_visible must be a boolean",
  }),
});

module.exports = {
  updateSectionSchema,
  toggleVisibilitySchema,
};
