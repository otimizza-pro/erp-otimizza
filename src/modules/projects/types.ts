import { z } from "zod";

export type ProjectType = "STANDALONE" | "RECURRING" | "INTERNAL";

export type ProjectStatus = "PLANNED" | "IN_PROGRESS" | "PAUSED" | "COMPLETED" | "CANCELED";

export type ProjectPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "CANCELED";

export interface ProjectRecord {
  id: string;
  projectNumber: string;
  name: string;
  description: string | null;
  projectType: ProjectType;
  clientId: string | null;
  clientName?: string | null;
  contractId: string | null;
  contractNumber?: string | null;
  contractVersionId: string | null;
  templateId: string | null;
  templateName?: string | null;
  competency: string | null; // YYYY-MM
  status: ProjectStatus;
  priority: ProjectPriority;
  startDate: string; // YYYY-MM-DD
  dueDate: string;   // YYYY-MM-DD
  completedAt: string | null;
  estimatedBudget: number;
  estimatedHours: number;
  actualHours: number;
  estimatedCost: number;
  actualCost: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  stages?: ProjectStageRecord[];
  tasks?: ProjectTaskRecord[];
}

export interface ProjectStageRecord {
  id: string;
  projectId: string;
  name: string;
  orderIndex: number;
  status: "ACTIVE" | "COMPLETED";
  createdAt: string;
  tasks?: ProjectTaskRecord[];
}

export interface ProjectChecklistRecord {
  id: string;
  taskId: string;
  title: string;
  isCompleted: boolean;
  orderIndex: number;
  completedAt: string | null;
  createdAt: string;
}

export interface ProjectTaskRecord {
  id: string;
  projectId: string;
  stageId: string | null;
  stageName?: string | null;
  taskNumber: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: ProjectPriority;
  dueDate: string | null;
  completedAt: string | null;
  estimatedHours: number;
  actualHours: number;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
  checklists?: ProjectChecklistRecord[];
}

export interface ProjectTimeEntryRecord {
  id: string;
  projectId: string;
  taskId: string | null;
  taskTitle?: string | null;
  entryDate: string; // YYYY-MM-DD
  hours: number;
  description: string;
  hourlyRate: number;
  calculatedCost: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectTemplateRecord {
  id: string;
  code: string;
  name: string;
  description: string | null;
  estimatedDays: number;
  estimatedHours: number;
  status: "ACTIVE" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
  stages?: Array<{
    id: string;
    name: string;
    orderIndex: number;
    tasks?: Array<{
      id: string;
      title: string;
      description: string | null;
      relativeDueDays: number;
      estimatedHours: number;
      orderIndex: number;
    }>;
  }>;
}

export interface ContractRecurringSettingsRecord {
  id: string;
  contractId: string;
  isEnabled: boolean;
  templateId: string;
  templateName?: string;
  periodicity: "MONTHLY";
  startDay: number;
  durationDays: number;
  startDate: string; // YYYY-MM-DD
  endDate: string | null;
  isSuspended: boolean;
  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------------------------
// Zod Schemas
// ----------------------------------------------------------------------

export const CreateProjectSchema = z.object({
  useServiceOnboarding: z.boolean().default(false),
  name: z.string().min(3).max(200).trim(),
  description: z.string().max(2000).optional().nullable(),
  projectType: z.enum(["STANDALONE", "RECURRING", "INTERNAL"]).default("STANDALONE"),
  clientId: z.string().uuid().optional().nullable(),
  contractId: z.string().uuid().optional().nullable(),
  contractVersionId: z.string().uuid().optional().nullable(),
  templateId: z.string().uuid().optional().nullable(),
  competency: z.string().regex(/^\d{4}-\d{2}$/).optional().nullable(),
  status: z.enum(["PLANNED", "IN_PROGRESS", "PAUSED", "COMPLETED", "CANCELED"]).default("PLANNED"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  estimatedBudget: z.number().min(0).default(0),
  estimatedHours: z.number().min(0).default(0),
  notes: z.string().max(2000).optional().nullable(),
});

export const UpdateProjectSchema = CreateProjectSchema.partial();

export const CreateTaskSchema = z.object({
  projectId: z.string().uuid(),
  stageId: z.string().uuid().optional().nullable(),
  title: z.string().min(2).max(200).trim(),
  description: z.string().max(2000).optional().nullable(),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "CANCELED"]).default("TODO"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  estimatedHours: z.number().min(0).default(1),
  orderIndex: z.number().int().min(1).default(1),
});

export const UpdateTaskSchema = CreateTaskSchema.partial();

export const CreateChecklistSchema = z.object({
  taskId: z.string().uuid(),
  title: z.string().min(1).max(255).trim(),
  orderIndex: z.number().int().min(1).default(1),
});

export const CreateTimeEntrySchema = z.object({
  projectId: z.string().uuid(),
  taskId: z.string().uuid().optional().nullable(),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hours: z.number().positive(),
  description: z.string().min(2).max(255).trim(),
  hourlyRate: z.number().min(0).default(0),
});

export const ConfigureContractRecurrenceSchema = z.object({
  contractId: z.string().uuid(),
  isEnabled: z.boolean(),
  templateId: z.string().uuid(),
  periodicity: z.literal("MONTHLY").default("MONTHLY"),
  startDay: z.number().int().min(1).max(31).default(1),
  durationDays: z.number().int().min(1).default(30),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  isSuspended: z.boolean().default(false),
});

export type CreateProjectInput = z.input<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.input<typeof UpdateProjectSchema>;
export type CreateTaskInput = z.input<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.input<typeof UpdateTaskSchema>;
export type CreateChecklistInput = z.input<typeof CreateChecklistSchema>;
export type CreateTimeEntryInput = z.input<typeof CreateTimeEntrySchema>;
export type ConfigureContractRecurrenceInput = z.input<typeof ConfigureContractRecurrenceSchema>;
