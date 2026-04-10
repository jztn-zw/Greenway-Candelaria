const { z } = require("zod");

const createPostSchema = z.object({
  title: z.string().min(1, "Title is required"),
  body: z.string().min(1, "Body is required"),
  source: z.string().optional(),
  category: z.enum(["WASTE_TIP", "EVENT"]),
  status: z
    .enum(["DRAFT", "PUBLISHED", "SCHEDULED", "ARCHIVED"])
    .optional()
    .default("DRAFT"),
  is_featured: z.boolean().optional().default(false),
  scheduled_at: z.string().optional(),
  images: z.array(z.string().url()).optional(),
  tags: z.array(z.string()).optional(),
});

const updatePostSchema = z.object({
  title: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
  source: z.string().optional(),
  category: z.enum(["WASTE_TIP", "EVENT"]).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "SCHEDULED", "ARCHIVED"]).optional(),
  is_featured: z.boolean().optional(),
  scheduled_at: z.string().nullable().optional(),
  images: z.array(z.string().url()).optional(),
  tags: z.array(z.string()).optional(),
});

const addCommentSchema = z.object({
  body: z.string().min(1, "Comment cannot be empty"),
  parent_id: z.string().optional().nullable(),
});

module.exports = {
  createPostSchema,
  updatePostSchema,
  addCommentSchema,
};
