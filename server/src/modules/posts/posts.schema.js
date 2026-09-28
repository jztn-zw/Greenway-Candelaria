const { z } = require("zod");

const createPostSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(255),
  body: z.string().trim().min(1, "Body is required"),
  source: z.string().trim().max(255).nullable().optional(),
  category: z.enum(["WASTE_TIP", "EVENT"]),
  status: z
    .enum(["DRAFT", "PUBLISHED", "SCHEDULED", "ARCHIVED"])
    .optional()
    .default("DRAFT"),
  is_featured: z.boolean().optional().default(false),
  scheduled_at: z.string().nullable().optional(),
  images: z.array(z.string().url()).max(5, "A post can contain up to 5 images").optional().default([]),
  tags: z.array(z.string().trim().min(1).max(50)).max(10, "A post can contain up to 10 tags").optional().default([]),
}).superRefine((data, ctx) => {
  if (data.status !== "SCHEDULED") return;

  if (!data.scheduled_at) {
    ctx.addIssue({ code: "custom", path: ["scheduled_at"], message: "A scheduled publish time is required" });
    return;
  }

  const scheduledAt = new Date(data.scheduled_at);
  if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
    ctx.addIssue({ code: "custom", path: ["scheduled_at"], message: "Scheduled publish time must be in the future" });
  }
});

const updatePostSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  body: z.string().trim().min(1).optional(),
  source: z.string().trim().max(255).nullable().optional(),
  category: z.enum(["WASTE_TIP", "EVENT"]).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "SCHEDULED", "ARCHIVED"]).optional(),
  is_featured: z.boolean().optional(),
  scheduled_at: z.string().nullable().optional(),
  images: z.array(z.string().url()).max(5, "A post can contain up to 5 images").optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(10, "A post can contain up to 10 tags").optional(),
}).superRefine((data, ctx) => {
  if (data.status === "SCHEDULED" && !data.scheduled_at) {
    ctx.addIssue({ code: "custom", path: ["scheduled_at"], message: "A scheduled publish time is required" });
    return;
  }

  if (data.status !== "SCHEDULED" || !data.scheduled_at) return;

  const scheduledAt = new Date(data.scheduled_at);
  if (Number.isNaN(scheduledAt.getTime())) {
    ctx.addIssue({ code: "custom", path: ["scheduled_at"], message: "Scheduled publish time is invalid" });
  } else if (scheduledAt <= new Date()) {
    ctx.addIssue({ code: "custom", path: ["scheduled_at"], message: "Scheduled publish time must be in the future" });
  }
});

module.exports = {
  createPostSchema,
  updatePostSchema,
};
