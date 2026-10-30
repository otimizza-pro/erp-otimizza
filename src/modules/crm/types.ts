export type PersonType = "PF" | "PJ";
export type LeadStatus = "NEW" | "CONTACTED" | "QUALIFIED" | "CONVERTED" | "UNQUALIFIED" | "ARCHIVED";
export type PipelineStatus = "ACTIVE" | "ARCHIVED";
export type StageType = "NORMAL" | "WON" | "LOST";
export type BillingPeriod = "ONE_TIME" | "MONTHLY" | "YEARLY";
export type OpportunityStatus = "OPEN" | "WON" | "LOST" | "CANCELED";
export type ActivityType = "CALL" | "WHATSAPP" | "EMAIL" | "MEETING" | "FOLLOW_UP" | "NOTE" | "OTHER";
export type ActivityStatus = "PENDING" | "COMPLETED" | "CANCELED";

// =========================================================================
// 1. LEADS
// =========================================================================
export interface LeadRecord {
  id: string;
  leadCode: string;
  personType: PersonType;
  name: string;
  tradeName?: string | null;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  primaryContact?: string | null;
  segment?: string | null;
  city?: string | null;
  state?: string | null;
  source: string;
  notes?: string | null;
  status: LeadStatus;
  convertedClientId?: string | null;
  convertedAt?: string | null;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  // Campos agregados
  opportunitiesCount?: number;
  openOpportunitiesAmount?: number;
}

export interface CreateLeadInput {
  personType: PersonType;
  name: string;
  tradeName?: string;
  document?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  primaryContact?: string;
  segment?: string;
  city?: string;
  state?: string;
  source?: string;
  notes?: string;
}

export interface UpdateLeadInput extends Partial<CreateLeadInput> {
  status?: LeadStatus;
}

export interface ConvertLeadInput {
  leadId: string;
  mode: "NEW_CLIENT" | "LINK_EXISTING";
  existingClientId?: string;
  clientDataOverride?: {
    name?: string;
    tradeName?: string;
    document?: string;
    email?: string;
    phone?: string;
  };
}

// =========================================================================
// 2. FUNIS E ETAPAS (PIPELINES & STAGES)
// =========================================================================
export interface PipelineStageRecord {
  id: string;
  pipelineId: string;
  name: string;
  color: string;
  displayOrder: number;
  winProbability: number;
  stageType: StageType;
  status: "ACTIVE" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
  // Agregados
  opportunitiesCount?: number;
  totalAmount?: number;
  weightedAmount?: number;
}

export interface PipelineRecord {
  id: string;
  name: string;
  description?: string | null;
  isDefault: boolean;
  status: PipelineStatus;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  stages?: PipelineStageRecord[];
  // Agregados
  openOpportunitiesCount?: number;
  totalPipelineAmount?: number;
  weightedPipelineAmount?: number;
}

export interface CreatePipelineInput {
  name: string;
  description?: string;
  isDefault?: boolean;
}

export interface UpdatePipelineInput {
  name?: string;
  description?: string;
  isDefault?: boolean;
  status?: PipelineStatus;
}

export interface CreateStageInput {
  pipelineId: string;
  name: string;
  color?: string;
  displayOrder?: number;
  winProbability: number;
  stageType?: StageType;
}

export interface UpdateStageInput {
  name?: string;
  color?: string;
  displayOrder?: number;
  winProbability?: number;
  stageType?: StageType;
  status?: "ACTIVE" | "ARCHIVED";
  relocateOpportunitiesToStageId?: string; // Obrigatório se arquivar etapa com deals
}

// =========================================================================
// 3. OPORTUNIDADES COMERCIAIS (OPPORTUNITIES / DEALS)
// =========================================================================
export interface OpportunityRecord {
  id: string;
  opportunityCode: string;
  title: string;
  leadId?: string | null;
  clientId?: string | null;
  pipelineId: string;
  stageId: string;
  amount: number;
  billingPeriod: BillingPeriod;
  probability: number;
  normalizedMonthlyValue: number;
  source?: string | null;
  expectedCloseDate?: string | null;
  closedAt?: string | null;
  status: OpportunityStatus;
  lostReason?: string | null;
  notes?: string | null;
  proposalId?: string | null;
  contractId?: string | null;
  createdAt: string;
  updatedAt: string;
  // Detalhes populados
  contactName?: string;
  contactType?: "LEAD" | "CLIENT";
  pipelineName?: string;
  stageName?: string;
  stageColor?: string;
  stageType?: StageType;
}

export interface CreateOpportunityInput {
  title: string;
  leadId?: string;
  clientId?: string;
  pipelineId: string;
  stageId?: string; // Se omitido, usa a primeira etapa do funil
  amount: number;
  billingPeriod?: BillingPeriod;
  probability?: number;
  source?: string;
  expectedCloseDate?: string;
  notes?: string;
}

export interface UpdateOpportunityInput {
  title?: string;
  amount?: number;
  billingPeriod?: BillingPeriod;
  probability?: number;
  source?: string;
  expectedCloseDate?: string;
  notes?: string;
}

export interface MoveOpportunityInput {
  opportunityId: string;
  toStageId: string;
  toPipelineId?: string;
  notes?: string;
}

export interface CloseOpportunityInput {
  opportunityId: string;
  status: "WON" | "LOST" | "CANCELED";
  lostReason?: string;
  notes?: string;
}

export interface OpportunityHistoryRecord {
  id: string;
  opportunityId: string;
  fromPipelineId?: string | null;
  toPipelineId?: string | null;
  fromStageId?: string | null;
  toStageId?: string | null;
  fromStatus?: string | null;
  toStatus?: string | null;
  fromAmount?: number | null;
  toAmount?: number | null;
  notes?: string | null;
  createdBy: string;
  createdAt: string;
  // Nomes para exibição
  fromStageName?: string;
  toStageName?: string;
  fromPipelineName?: string;
  toPipelineName?: string;
}

// =========================================================================
// 4. ATIVIDADES E FOLLOW-UPS
// =========================================================================
export interface ActivityRecord {
  id: string;
  activityType: ActivityType;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  status: ActivityStatus;
  leadId?: string | null;
  clientId?: string | null;
  opportunityId?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // Populações
  isOverdue?: boolean;
  targetName?: string;
  opportunityTitle?: string;
}

export interface CreateActivityInput {
  activityType: ActivityType;
  title: string;
  description?: string;
  dueDate?: string;
  leadId?: string;
  clientId?: string;
  opportunityId?: string;
}

export interface UpdateActivityInput {
  activityType?: ActivityType;
  title?: string;
  description?: string;
  dueDate?: string;
  status?: ActivityStatus;
}

// =========================================================================
// 5. INDICADORES DO CRM (KPIS)
// =========================================================================
export interface CrmKpiSummary {
  activeLeadsCount: number;
  leadsBySource: { source: string; count: number }[];
  openOpportunitiesCount: number;
  totalPipelineAmount: number;
  weightedPipelineAmount: number;
  potentialMrr: number;
  conversionRate: number; // % de ganhas / (ganhas + perdidas)
  wonCountPeriod: number;
  lostCountPeriod: number;
  canceledCountPeriod: number;
  avgDaysToClose: number;
  pendingActivitiesCount: number;
  overdueActivitiesCount: number;
  opportunitiesByStage: {
    stageId: string;
    stageName: string;
    stageColor: string;
    count: number;
    totalAmount: number;
  }[];
}
