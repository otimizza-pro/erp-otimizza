export type DocumentStatus = "RASCUNHO" | "EM_REVISAO" | "APROVADO" | "ARQUIVADO";
export type InformationClassification = "DECLARADO" | "DECIDIDO" | "HIPOTESE" | "RECOMENDACAO" | "PENDENTE";
export type DataNature = "MANUAL" | "AUTOMATICO" | "SIMULACAO" | "HISTORICO";

export type BlockType =
  | "TITLE"
  | "TEXT"
  | "CALLOUT"
  | "LIST"
  | "CHECKLIST"
  | "NUMBER"
  | "CURRENCY"
  | "PERCENT"
  | "DATE_RANGE"
  | "SELECT"
  | "TABLE"
  | "LINK"
  | "INDICATOR_CONNECTED"
  | "CHART"
  | "TOOL_FRAMEWORK"
  | "REFERENCE";

export type GoalType = "MINIMUM" | "MAXIMUM" | "TARGET_RANGE" | "PLANNED_INVESTMENT" | "DEADLINE";
export type GoalPeriod = "MONTHLY" | "QUARTERLY" | "YEARLY" | "HORIZON_90_DAYS" | "ONE_TIME";
export type GoalEvaluationRule = "INVESTMENT_EXECUTION" | "COST_CEILING" | "REVENUE_MINIMUM" | "THRESHOLD_REACHED";

export interface StrategyBlockRecord {
  id: string;
  sectionId: string;
  blockType: BlockType;
  title: string;
  instructions?: string | null;
  content: Record<string, unknown>;
  classification: InformationClassification;
  dataNature: DataNature;
  unit?: string | null;
  isRequired: boolean;
  isVisiblePdf: boolean;
  responsibleId?: string | null;
  sourceInfo?: string | null;
  sortOrder: number;
  gridWidth: number; // 1-12
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface StrategySectionRecord {
  id: string;
  documentId: string;
  title: string;
  description?: string | null;
  sortOrder: number;
  isCollapsed: boolean;
  metadata: Record<string, unknown>;
  blocks: StrategyBlockRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface StrategyDocumentRecord {
  id: string;
  code: string;
  title: string;
  category: "DIAGNOSTICO" | "MARKETING" | "EMPRESARIAL" | "FERRAMENTAS" | "GERAL";
  topicNumber?: number | null;
  description?: string | null;
  status: DocumentStatus;
  currentVersion: number;
  responsibleId?: string | null;
  metadata: Record<string, unknown>;
  sections?: StrategySectionRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface StrategyGoalRecord {
  id: string;
  name: string;
  category: "MARKETING" | "FINANCEIRO" | "COMERCIAL" | "OPERACIONAL" | "EMPRESARIAL";
  goalType: GoalType;
  targetValue?: number | null;
  targetRangeMin?: number | null;
  targetRangeMax?: number | null;
  unit: string;
  periodType: GoalPeriod;
  startDate: string;
  endDate?: string | null;
  sourceType: "FINANCIAL_EXPENSE" | "FINANCIAL_REVENUE" | "CRM_OPPORTUNITIES" | "CRM_LEADS" | "PROJECTS_HOURS" | "MANUAL";
  sourceFilters: Record<string, unknown>;
  evaluationRule: GoalEvaluationRule;
  tolerancePercent: number;
  status: "ATIVA" | "PAUSADA" | "CONCLUIDA" | "CANCELADA";
  responsibleId?: string | null;
  notes?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface GoalComparisonResult {
  goalId: string;
  name: string;
  goalType: GoalType;
  evaluationRule: GoalEvaluationRule;
  targetValue: number | null;
  targetRangeMin: number | null;
  targetRangeMax: number | null;
  unit: string;
  plannedAmount: number | null;
  actualAmount: number;
  executionPercent: number | null;
  unexecutedBalance: number | null;
  deviationAmount: number | null;
  excessAmount: number | null;
  statusEvaluation: "ABAIXO_DO_ESPERADO" | "DENTRO_DO_PLANEJADO" | "ACIMA_DO_PLANEJADO" | "EXCESSO_DE_TETO" | "PENDENTE_DE_DADOS";
  explanation: string;
  contributingRecords: Array<{
    id: string;
    description: string;
    amount: number;
    date: string;
    type: string;
  }>;
}

export interface StrategyInitiativeRecord {
  id: string;
  title: string;
  description?: string | null;
  goalId?: string | null;
  projectId?: string | null;
  status: "PLANEJADA" | "EM_ANDAMENTO" | "CONCLUIDA" | "CANCELADA";
  priority: "ALTA" | "MEDIA" | "BAIXA";
  plannedStart?: string | null;
  plannedEnd?: string | null;
  actualStart?: string | null;
  actualEnd?: string | null;
  frameworkOrigin?: string | null;
  frameworkRefId?: string | null;
  responsibleId?: string | null;
  estimatedCost: number;
  details5w2h: {
    what?: string;
    why?: string;
    where?: string;
    when?: string;
    who?: string;
    how?: string;
    howMuch?: number;
  };
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface StrategyFrameworkRecord {
  id: string;
  frameworkType:
    | "SWOT"
    | "SWOT_CROSS"
    | "CANVAS"
    | "PRIORITIZATION_MATRIX"
    | "5W2H"
    | "PDCA"
    | "RISK_MATRIX"
    | "RACI_MATRIX"
    | "CAPACITY_ALLOCATION"
    | "FINANCIAL_SCENARIOS";
  title: string;
  content: Record<string, unknown>;
  version: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface StrategyAuditLogRecord {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  previousState?: Record<string, unknown> | null;
  newState?: Record<string, unknown> | null;
  authorId?: string | null;
  authorName?: string | null;
  reason?: string | null;
  createdAt: string;
}

