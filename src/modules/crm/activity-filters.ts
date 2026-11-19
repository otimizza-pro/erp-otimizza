import { z } from "zod";
import type { ActivityStatus } from "./types";

export const activityFiltersSchema = z.object({
  recordKind: z.enum(["ALL", "TASK", "COMMERCIAL"]).default("ALL"),
  targetType: z.enum(["ALL", "LEAD", "CLIENT", "OPPORTUNITY"]).default("ALL"),
  activityType: z.enum(["ALL", "CALL", "WHATSAPP", "EMAIL", "MEETING", "FOLLOW_UP", "NOTE", "OTHER"]).default("ALL"),
  search: z.string().trim().default(""),
  dueFrom: z.string().date().optional(),
  dueTo: z.string().date().optional(),
}).refine(value => !value.dueFrom || !value.dueTo || value.dueFrom <= value.dueTo, { message: "O prazo inicial deve ser anterior ao final." });

export type ActivityFilters = Partial<z.infer<typeof activityFiltersSchema>> & {
  leadId?: string; clientId?: string; opportunityId?: string;
  status?: ActivityStatus; overdueOnly?: boolean; archived?: boolean; limit?: number; offset?: number;
};

export function buildActivityWhere(params: ActivityFilters = {}) {
  const conditions = [params.archived ? "a.archived_at IS NOT NULL" : "a.archived_at IS NULL"];
  const values: unknown[] = [];
  const bind = (value: unknown) => { values.push(value); return `$${values.length}`; };
  if (params.leadId) conditions.push(`a.lead_id = ${bind(params.leadId)}`);
  if (params.clientId) {
    const p = bind(params.clientId);
    conditions.push(`(a.client_id = ${p} OR a.lead_id IN (SELECT id FROM crm_leads WHERE converted_client_id = ${p}))`);
  }
  if (params.opportunityId) conditions.push(`a.opportunity_id = ${bind(params.opportunityId)}`);
  if (params.recordKind && params.recordKind !== "ALL") conditions.push(`a.record_kind = ${bind(params.recordKind)}`);
  // Linked records can have several relationships after conversion. Match each
  // actual relationship instead of forcing a single, misleading category.
  if (params.targetType === "LEAD") conditions.push("a.lead_id IS NOT NULL");
  if (params.targetType === "CLIENT") conditions.push("a.client_id IS NOT NULL");
  if (params.targetType === "OPPORTUNITY") conditions.push("a.opportunity_id IS NOT NULL");
  if (params.activityType && params.activityType !== "ALL") conditions.push(`a.activity_type = ${bind(params.activityType)}`);
  if (params.search) {
    const p = bind(`%${params.search}%`);
    conditions.push(`(a.title ILIKE ${p} OR a.description ILIKE ${p} OR l.name ILIKE ${p} OR c.name ILIKE ${p} OR o.title ILIKE ${p})`);
  }
  if (params.dueFrom) conditions.push(`a.due_date >= (${bind(params.dueFrom)}::date::timestamp AT TIME ZONE 'America/Sao_Paulo')`);
  if (params.dueTo) conditions.push(`a.due_date < ((${bind(params.dueTo)}::date + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo')`);
  if (params.status) conditions.push(`a.status = ${bind(params.status)}`);
  if (params.overdueOnly) conditions.push("a.due_date < NOW() AND a.status IN ('PENDING', 'RESCHEDULED')");
  return { where: `WHERE ${conditions.join(" AND ")}`, values };
}
