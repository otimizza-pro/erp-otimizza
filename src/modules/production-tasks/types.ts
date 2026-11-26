export type ProductionTaskType =
  | "FILMING"
  | "REPORT_DELIVERY"
  | "CONTENT_REVIEW"
  | "CLIENT_MEETING"
  | "SHOOTING_PREP"
  | "DELIVERY"
  | "OTHER";

export type ProductionTaskStatus = "PENDING" | "RESCHEDULED" | "COMPLETED" | "CANCELED";

export interface RescheduleHistoryEntry {
  from: string | null;
  to: string;
  reason: string;
  at: string;
}

export interface ProductionTaskRecord {
  id: string;
  clientId: string | null;
  clientName?: string | null;
  projectId: string | null;
  projectName?: string | null;
  projectTaskId: string | null;
  projectTaskTitle?: string | null;
  projectTaskNumber?: string | null;
  checklistItemId: string | null;
  checklistTitle?: string | null;
  taskType: ProductionTaskType;
  title: string;
  description: string | null;
  status: ProductionTaskStatus;
  dueDate: string | null;
  completedAt: string | null;
  rescheduleCount: number;
  rescheduleReason: string | null;
  rescheduleHistory: RescheduleHistoryEntry[];
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductionTaskMetrics {
  pending: number;
  overdue: number;
  today: number;
  rescheduled: number;
  completed: number;
  total: number;
}
