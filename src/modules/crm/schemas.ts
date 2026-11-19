import { z } from "zod";
import { normalizeDocument, validateDocument } from "@/shared/cpf-cnpj";
import { commercialDnaSchema, commercialDnaPatchSchema } from "./commercial-dna-schema";

// =========================================================================
// LEADS SCHEMAS
// =========================================================================
export const CreateLeadSchema = z.object({
  personType: z.enum(["PF", "PJ"], {
    message: "Tipo de pessoa deve ser 'PF' ou 'PJ'.",
  }),
  name: z.string().trim().min(2, "Nome ou razão social deve ter pelo menos 2 caracteres."),
  tradeName: z.string().trim().optional().nullable(),
  document: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine(
      (doc) => {
        if (!doc || doc.trim() === "") return true;
        const clean = normalizeDocument(doc);
        return clean.length === 0 || validateDocument(clean);
      },
      { message: "CPF ou CNPJ inválido." }
    ),
  email: z.string().trim().email("E-mail com formato inválido.").optional().nullable().or(z.literal("")),
  phone: z.string().trim().optional().nullable(),
  whatsapp: z.string().trim().optional().nullable(),
  primaryContact: z.string().trim().optional().nullable(),
  segment: z.string().trim().optional().nullable(),
  city: z.string().trim().optional().nullable(),
  state: z.string().trim().max(2, "UF deve ter 2 caracteres.").optional().nullable(),
  source: z.string().trim().default("OUTROS"),
  notes: z.string().trim().optional().nullable(),
  commercialDna: commercialDnaSchema.optional(),
  ownerClientId: z.string().uuid().optional().nullable(),
  acquisitionVerified: z.boolean().optional(),
  acquisitionType: z.enum(["INBOUND", "OUTBOUND", "NAO_INFORMADO"]).optional().default("NAO_INFORMADO"),
  leadSource: z.string().trim().optional().nullable(),
  firstContactChannel: z.string().trim().optional().nullable(),
  utmSource: z.string().trim().optional().nullable(),
  utmMedium: z.string().trim().optional().nullable(),
  utmCampaign: z.string().trim().optional().nullable(),
  utmTerm: z.string().trim().optional().nullable(),
  utmContent: z.string().trim().optional().nullable(),
  serviceOfInterest: z.string().trim().optional().nullable(),
  needSummary: z.string().trim().optional().nullable(),
  urgencyTimeline: z.string().trim().optional().nullable(),
  estimatedBudget: z.number().nonnegative().optional().default(0),
  nurtureReason: z.string().trim().optional().nullable(),
  nurtureNextActionDate: z.string().trim().optional().nullable(),
  disqualificationReason: z.string().trim().optional().nullable(),
  qualificationNotes: z.string().trim().optional().nullable(),
});

export const UpdateLeadSchema = CreateLeadSchema.partial().extend({
  commercialDna: commercialDnaPatchSchema.optional(),
  source: CreateLeadSchema.shape.source.removeDefault().optional(),
  acquisitionType: CreateLeadSchema.shape.acquisitionType.removeDefault().optional(),
  estimatedBudget: CreateLeadSchema.shape.estimatedBudget.removeDefault().optional(),
  status: z
    .enum([
      "NEW",
      "CONTACTED",
      "QUALIFIED",
      "CONVERTED",
      "UNQUALIFIED",
      "ARCHIVED",
      "NOVO",
      "QUALIFICANDO",
      "NUTRICAO",
      "QUALIFICADO",
      "OPORTUNIDADE",
      "DESQUALIFICADO",
      "STAND_BY",
    ])
    .optional(),
});

export const ConvertLeadSchema = z.object({
  leadId: z.string().uuid("ID de lead inválido."),
  mode: z.enum(["NEW_CLIENT", "LINK_EXISTING"]),
  existingClientId: z.string().uuid("ID de cliente inválido.").optional().nullable(),
  clientDataOverride: z
    .object({
      name: z.string().trim().optional(),
      tradeName: z.string().trim().optional(),
      document: z.string().trim().optional(),
      email: z.string().trim().optional(),
      phone: z.string().trim().optional(),
      whatsapp: z.string().trim().optional(),
      primaryContact: z.string().trim().optional(),
      city: z.string().trim().optional(),
      state: z.string().trim().optional(),
    })
    .optional(),
});

// =========================================================================
// PIPELINES & STAGES SCHEMAS
// =========================================================================
export const PipelineStageItemSchema = z.object({
  name: z.string().trim().min(1, "Nome da etapa deve ter pelo menos 1 caractere."),
  color: z.string().trim().default("#6366f1"),
  displayOrder: z.number().int().min(0).default(0),
  winProbability: z.number().int().min(0).max(100).default(50),
  stageType: z.enum(["NORMAL", "WON", "LOST"]).default("NORMAL"),
});

export const CreatePipelineSchema = z.object({
  name: z.string().trim().min(2, "Nome do funil deve ter pelo menos 2 caracteres."),
  description: z.string().trim().optional().nullable(),
  isDefault: z.boolean().optional().default(false),
  stages: z.array(PipelineStageItemSchema).optional(),
});

export const UpdatePipelineSchema = CreatePipelineSchema.partial().extend({
  isDefault: CreatePipelineSchema.shape.isDefault.removeDefault().optional(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});

export const CreateStageSchema = z.object({
  pipelineId: z.string().uuid("ID de funil inválido."),
  name: z.string().trim().min(2, "Nome da etapa deve ter pelo menos 2 caracteres."),
  color: z.string().trim().default("#6366f1"),
  displayOrder: z.number().int().min(0).default(0),
  winProbability: z
    .number()
    .int()
    .min(0, "Probabilidade mínima é 0%.")
    .max(100, "Probabilidade máxima é 100%."),
  stageType: z.enum(["NORMAL", "WON", "LOST"]).default("NORMAL"),
});

export const UpdateStageSchema = CreateStageSchema.partial().extend({
  color: CreateStageSchema.shape.color.removeDefault().optional(),
  displayOrder: CreateStageSchema.shape.displayOrder.removeDefault().optional(),
  stageType: CreateStageSchema.shape.stageType.removeDefault().optional(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
  relocateOpportunitiesToStageId: z.string().uuid().optional().nullable(),
});

export const ReorderStagesSchema = z.object({
  pipelineId: z.string().uuid("ID do funil inválido."),
  stageOrders: z.array(
    z.object({
      stageId: z.string().uuid("ID da etapa inválido."),
      displayOrder: z.number().int().min(0),
    })
  ).min(1, "Lista de etapas deve conter ao menos 1 item."),
});

// =========================================================================
// OPPORTUNITIES SCHEMAS
// =========================================================================
export const CreateOpportunitySchema = z
  .object({
    title: z.string().trim().min(2, "Título da oportunidade é obrigatório."),
    leadId: z.string().uuid().optional().nullable(),
    clientId: z.string().uuid().optional().nullable(),
    pipelineId: z.string().uuid("Funil é obrigatório."),
    stageId: z.string().uuid().optional().nullable(),
    amount: z.number().min(0, "Valor da oportunidade não pode ser negativo."),
    billingPeriod: z.enum(["ONE_TIME", "MONTHLY", "YEARLY"]).default("MONTHLY"),
    probability: z.number().int().min(0).max(100).optional(),
    source: z.string().trim().optional().nullable(),
    expectedCloseDate: z.string().optional().nullable(),
    notes: z.string().trim().optional().nullable(),
  })
  .refine((data) => data.leadId || data.clientId, {
    message: "A oportunidade deve estar vinculada a um Lead ou a um Cliente.",
    path: ["leadId"],
  });

export const UpdateOpportunitySchema = z.object({
  title: z.string().trim().min(2).optional(),
  amount: z.number().min(0).optional(),
  billingPeriod: z.enum(["ONE_TIME", "MONTHLY", "YEARLY"]).optional(),
  probability: z.number().int().min(0).max(100).optional(),
  source: z.string().trim().optional().nullable(),
  expectedCloseDate: z.string().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

export const MoveOpportunitySchema = z.object({
  opportunityId: z.string().uuid("ID da oportunidade inválido."),
  toStageId: z.string().uuid("ID da etapa de destino inválido."),
  toPipelineId: z.string().uuid().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

export const CloseOpportunitySchema = z
  .object({
    opportunityId: z.string().uuid("ID da oportunidade inválido."),
    status: z.enum(["WON", "LOST", "CANCELED"]),
    lostReason: z.string().trim().optional().nullable(),
    notes: z.string().trim().optional().nullable(),
  })
  .refine(
    (data) => {
      if ((data.status === "LOST" || data.status === "CANCELED") && (!data.lostReason || data.lostReason.trim() === "")) {
        return false;
      }
      return true;
    },
    {
      message: "Motivo de perda ou cancelamento é estritamente obrigatório.",
      path: ["lostReason"],
    }
  );

// =========================================================================
// ACTIVITIES SCHEMAS
// =========================================================================
export const CreateActivitySchema = z
  .object({
    recordKind: z.enum(["COMMERCIAL", "TASK"]).default("COMMERCIAL"),
    activityType: z.enum(["CALL", "WHATSAPP", "EMAIL", "MEETING", "FOLLOW_UP", "NOTE", "OTHER"]),
    title: z.string().trim().min(2, "Título da atividade é obrigatório."),
    description: z.string().trim().optional().nullable(),
    dueDate: z.string().optional().nullable(),
    leadId: z.string().uuid().optional().nullable(),
    clientId: z.string().uuid().optional().nullable(),
    opportunityId: z.string().uuid().optional().nullable(),
  })
  .refine((data) => data.recordKind === "TASK" ? !data.leadId && !data.clientId && !data.opportunityId : Boolean(data.leadId || data.clientId || data.opportunityId), {
    message: "Atividades comerciais exigem um vínculo; tarefas avulsas devem ser criadas sem vínculo.",
    path: ["leadId"],
  });

export const UpdateActivitySchema = z.object({
  activityType: z.enum(["CALL", "WHATSAPP", "EMAIL", "MEETING", "FOLLOW_UP", "NOTE", "OTHER"]).optional(),
  title: z.string().trim().min(2).optional(),
  description: z.string().trim().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  status: z.enum(["PENDING", "COMPLETED", "CANCELED", "NO_SHOW", "RESCHEDULED"]).optional(),
  outcomeReason: z.string().trim().optional().nullable(),
  newDueDate: z.string().optional().nullable(),
});
