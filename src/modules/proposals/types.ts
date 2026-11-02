import type { ServicePresentation } from "@/modules/catalog/presentation";
import { z } from "zod";

export type ProposalStatus =
  | "DRAFT"
  | "SENT"
  | "NEGOTIATING"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELED";

export type ProposalVersionStatus =
  | "DRAFT"
  | "SENT"
  | "APPROVED"
  | "SUPERSEDED"
  | "REJECTED";

export type ProposalPeriodicity = "ONE_TIME" | "MONTHLY" | "YEARLY";

export interface RecipientSnapshot {
  id: string;
  isLead: boolean;
  name: string;
  tradeName?: string | null;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  segment?: string | null;
  city?: string | null;
  state?: string | null;
}

export interface CommercialTermsSnapshot {
  servicePresentations?: Record<string, ServicePresentation>;
  validUntil: string;
  paymentTerms?: string | null;
  startLeadTimeDays?: number | null;
  scopeDescription?: string | null;
  clientNotes?: string | null;
  internalNotes?: string | null;
}

export interface ProposalItemRecord {
  id: string;
  proposalVersionId: string;
  sourceType: "SERVICE" | "COMBO";
  serviceId: string;
  serviceName: string;
  comboId: string | null;
  comboName: string | null;
  descriptionSnapshot: string | null;
  periodicity: ProposalPeriodicity;
  quantity: number;
  referenceUnitPrice: number;
  negotiatedUnitPrice: number;
  discountAmount: number;
  totalAmount: number;
  unitCost: number;
  totalCost: number;
  supplierId: string | null;
  supplierNameSnapshot: string | null;
  costPeriodicity: string;
  displayOrder: number;
  createdAt: string;
}

export interface ProposalVersionRecord {
  id: string;
  proposalId: string;
  versionNumber: number;
  versionStatus: ProposalVersionStatus;
  recipientSnapshot: RecipientSnapshot;
  commercialTermsSnapshot: CommercialTermsSnapshot;
  subtotalOneTime: number;
  subtotalMonthly: number;
  subtotalYearly: number;
  discountTotal: number;
  totalOneTimeEffective: number;
  totalMonthlyEffective: number;
  totalYearlyEffective: number;
  estimatedOneTimeCost: number;
  estimatedMonthlyCost: number;
  estimatedYearlyCost: number;
  items: ProposalItemRecord[];
  createdAt: string;
  approvedAt?: string | null;
}

export interface ProposalEventRecord {
  id: string;
  proposalId: string;
  proposalVersionId: string | null;
  eventType: string;
  previousState: string | null;
  newState: string | null;
  details: Record<string, unknown>;
  actorId: string | null;
  actorName: string | null;
  createdAt: string;
}

export interface ProposalConversionRecord {
  id: string;
  proposalId: string;
  proposalVersionId: string;
  contractId: string;
  convertedClientId: string;
  periodicity: ProposalPeriodicity;
  idempotencyKey: string;
  createdAt: string;
  contractNumber?: string;
}

export interface ProposalRecord {
  id: string;
  proposalCode: string;
  title: string;
  leadId: string | null;
  clientId: string | null;
  opportunityId: string | null;
  status: ProposalStatus;
  currentVersionNumber: number;
  versionNumber?: number;
  approvedVersionNumber: number | null;
  approvedAt: string | null;
  approvalNotes: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  canceledAt: string | null;
  cancellationReason: string | null;
  validUntil: string;
  contractId: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  recipientName?: string;
  recipientDocument?: string | null;
  isLead?: boolean;
  opportunityTitle?: string | null;
  totalMonthlyEffective?: number;
  totalOneTimeEffective?: number;
  currentVersion?: ProposalVersionRecord;
  versions?: ProposalVersionRecord[];
  events?: ProposalEventRecord[];
  conversions?: ProposalConversionRecord[];
}

// Zod Schemas para Validação de Entrada
export const ProposalItemInputSchema = z.object({
  sourceType: z.enum(["SERVICE", "COMBO"]).default("SERVICE"),
  serviceId: z.string().uuid("ID de serviço inválido"),
  serviceName: z.string().optional(),
  comboId: z.string().uuid().optional().nullable(),
  comboName: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  descriptionSnapshot: z.string().optional().nullable(),
  periodicity: z.enum(["ONE_TIME", "MONTHLY", "YEARLY"]).default("MONTHLY"),
  quantity: z.coerce.number().positive("Quantidade deve ser maior que zero").default(1),
  referenceUnitPrice: z.coerce.number().min(0, "Preço de referência não pode ser negativo"),
  negotiatedUnitPrice: z.coerce.number().min(0, "Preço negociado não pode ser negativo"),
  discountAmount: z.coerce.number().min(0).default(0),
  unitCost: z.coerce.number().min(0).default(0),
  supplierId: z.string().uuid().optional().nullable(),
  supplierNameSnapshot: z.string().optional().nullable(),
  costPeriodicity: z.string().optional().default("MONTHLY"),
  displayOrder: z.coerce.number().default(0),
});

export type ProposalItemInput = z.input<typeof ProposalItemInputSchema>;

export const CreateProposalInputSchema = z
  .object({
    title: z.string().min(3, "Título deve ter no mínimo 3 caracteres").max(200),
    leadId: z.string().uuid().optional().nullable(),
    clientId: z.string().uuid().optional().nullable(),
    opportunityId: z.string().uuid().optional().nullable(),
    validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
    paymentTerms: z.string().max(255).optional().nullable(),
    startLeadTimeDays: z.coerce.number().int().min(0).default(5),
    scopeDescription: z.string().optional().nullable(),
    clientNotes: z.string().optional().nullable(),
    internalNotes: z.string().optional().nullable(),
    items: z.array(ProposalItemInputSchema).min(1, "A proposta deve conter ao menos um item"),
    globalDiscount: z.coerce.number().min(0).default(0),
    actorId: z.string().uuid().optional().nullable(),
    actorName: z.string().max(150).optional().nullable(),
  })
  .refine((data) => Boolean(data.leadId || data.clientId), {
    message: "A proposta deve ser vinculada a um Lead ou Cliente cadastrado.",
    path: ["leadId"],
  });

export type CreateProposalInput = z.input<typeof CreateProposalInputSchema>;

export const CreateProposalVersionInputSchema = z.object({
  proposalId: z.string().uuid("ID da proposta inválido"),
  title: z.string().min(3).max(200).optional(),
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  paymentTerms: z.string().max(255).optional().nullable(),
  startLeadTimeDays: z.coerce.number().int().min(0).optional(),
  scopeDescription: z.string().optional().nullable(),
  clientNotes: z.string().optional().nullable(),
  internalNotes: z.string().optional().nullable(),
  items: z.array(ProposalItemInputSchema).min(1, "A versão deve conter ao menos um item"),
  globalDiscount: z.coerce.number().min(0).default(0),
  actorId: z.string().uuid().optional().nullable(),
  actorName: z.string().max(150).optional().nullable(),
});

export type CreateProposalVersionInput = z.input<typeof CreateProposalVersionInputSchema>;

export const ApproveProposalInputSchema = z.object({
  approvedVersionNumber: z.coerce.number().int().positive().optional(),
  approvalNotes: z.string().max(500).optional().nullable(),
  actorId: z.string().uuid().optional().nullable(),
  actorName: z.string().max(150).optional().nullable(),
});

export type ApproveProposalInput = z.infer<typeof ApproveProposalInputSchema>;

export const RejectProposalInputSchema = z.object({
  reason: z.string().min(3, "O motivo da rejeição é obrigatório").max(500),
  actorId: z.string().uuid().optional().nullable(),
  actorName: z.string().max(150).optional().nullable(),
});

export type RejectProposalInput = z.infer<typeof RejectProposalInputSchema>;

export const CancelProposalInputSchema = z.object({
  reason: z.string().min(3, "O motivo do cancelamento é obrigatório").max(500),
  actorId: z.string().uuid().optional().nullable(),
  actorName: z.string().max(150).optional().nullable(),
});

export type CancelProposalInput = z.infer<typeof CancelProposalInputSchema>;

export const ConvertProposalToContractInputSchema = z.object({
  idempotencyKey: z.string().min(8, "Chave de idempotência necessária").max(120),
  dueDay: z.coerce.number().int().min(1).max(31).default(10),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  actorId: z.string().uuid().optional().nullable(),
  actorName: z.string().max(150).optional().nullable(),
});

export type ConvertProposalToContractInput = z.infer<typeof ConvertProposalToContractInputSchema>;

export interface ProposalMetrics {
  totalProposals: number;
  totalDraft: number;
  totalSent: number;
  totalNegotiating: number;
  totalApproved: number;
  totalRejected: number;
  totalExpired: number;
  totalCanceled: number;
  approvalRate: number;
  totalApprovedMonthly: number;
  totalApprovedOneTime: number;
  totalApprovedYearly: number;
  avgConversionDays: number;
}
