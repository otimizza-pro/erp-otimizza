import { z } from "zod";

export const productionTaskTypeSchema = z.enum([
  "FILMING",
  "REPORT_DELIVERY",
  "CONTENT_REVIEW",
  "CLIENT_MEETING",
  "SHOOTING_PREP",
  "DELIVERY",
  "OTHER",
]);

export const productionTaskStatusSchema = z.enum([
  "PENDING",
  "RESCHEDULED",
  "COMPLETED",
  "CANCELED",
]);

export const createProductionTaskSchema = z.object({
  clientId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  projectTaskId: z.string().uuid().nullable().optional(),
  checklistItemId: z.string().uuid().nullable().optional(),
  taskType: productionTaskTypeSchema.default("OTHER"),
  title: z.string().trim().min(2).max(255),
  description: z.string().trim().max(4000).nullable().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export const updateProductionTaskSchema = z.object({
  clientId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  taskType: productionTaskTypeSchema.optional(),
  title: z.string().trim().min(2).max(255).optional(),
  description: z.string().trim().max(4000).nullable().optional(),
  status: productionTaskStatusSchema.optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  archived: z.boolean().optional(),
});

export const rescheduleProductionTaskSchema = z.object({
  newDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().trim().min(2).max(1000),
});

export type CreateProductionTaskInput = z.infer<typeof createProductionTaskSchema>;
export type UpdateProductionTaskInput = z.infer<typeof updateProductionTaskSchema>;
export type RescheduleProductionTaskInput = z.infer<typeof rescheduleProductionTaskSchema>;
