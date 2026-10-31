import { z } from "zod";

export type AccountingMethod = "CASH" | "ACCRUAL";

export type ManagerialGroup =
  | "GROSS_REVENUE"
  | "DEDUCTION"
  | "DIRECT_COST"
  | "OPERATIONAL_EXPENSE"
  | "NON_OPERATIONAL"
  | "UNCLASSIFIED";

export interface CostCenterRecord {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: "ACTIVE" | "ARCHIVED";
  isSystemDefault: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ManagerialAccountRecord {
  id: string;
  code: string;
  name: string;
  classificationGroup: ManagerialGroup;
  subgroup: string;
  displayOrder: number;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
}

export interface CostCenterAllocationRecord {
  id: string;
  payableId: string;
  costCenterId: string;
  costCenterCode?: string;
  costCenterName?: string;
  percentage: number;
  amount: number;
  status: "ACTIVE" | "CANCELED";
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RevenueAccrualRecord {
  id: string;
  contractId: string | null;
  receivableId: string | null;
  clientId: string;
  clientName?: string;
  competencyMonth: string; // YYYY-MM
  grossAmount: number;
  deductionsAmount: number;
  netAmount: number;
  status: "RECOGNIZED" | "CANCELED";
  recognitionRule: string;
  notes: string | null;
  createdAt: string;
}

export interface DRELineItem {
  id: string;
  code: string;
  name: string;
  amount: number;
  percentageOfRevenue: number;
  originCount?: number;
  originEntries?: Array<{
    id: string;
    description: string;
    entityName: string;
    date: string;
    amount: number;
    costCenter?: string;
  }>;
}

export interface DREGroupSummary {
  group: ManagerialGroup;
  title: string;
  total: number;
  percentageOfRevenue: number;
  lines: DRELineItem[];
}

export interface DREPeriodStatement {
  periodKey: string; // YYYY-MM ou YYYY
  accountingMethod: AccountingMethod;
  costCenterId?: string | null;
  costCenterName?: string | null;

  // 1. Receita Bruta
  grossRevenue: number;
  grossRevenueItems: DRELineItem[];

  // 2. (-) Deduções
  deductions: number;
  deductionItems: DRELineItem[];

  // 3. (=) Receita Líquida
  netRevenue: number;

  // 4. (-) Custos Diretos
  directCosts: number;
  directCostItems: DRELineItem[];

  // 5. (=) Margem de Contribuição
  contributionMargin: number;
  contributionMarginPercentage: number;

  // 6. (-) Despesas Operacionais
  operationalExpenses: number;
  operationalExpenseItems: {
    administrative: number;
    commercial: number;
    technology: number;
    other: number;
    lines: DRELineItem[];
  };

  // 7. (=) Resultado Operacional Gerencial
  operationalResult: number;
  operationalResultPercentage: number;

  // 8. (+/-) Não Operacionais / Financeiras
  nonOperationalResult: number;
  nonOperationalItems: DRELineItem[];

  // 9. (=) Resultado Líquido Gerencial
  netManagerialResult: number;
  netManagerialResultPercentage: number;

  // Lançamentos Não Classificados (Aviso e Auditoria)
  unclassified: {
    total: number;
    count: number;
    items: Array<{
      id: string;
      description: string;
      amount: number;
      date: string;
      source: "PAYABLE" | "SETTLEMENT";
    }>;
  };

  // Indicadores de Comparação e Conciliação
  reconciliationKpis: {
    projectedRevenue: number; // Oportunidades Ganhas / Propostas
    contractedRevenue: number; // Contratos ativos
    invoicedRevenue: number;   // Recebíveis emitidos
    receivedCash: number;      // Caixa efetivamente recebido
    recognizedRevenue: number; // Competência reconhecida
    projectedExpenses: number; // Despesas previstas
    incurredExpenses: number;  // Despesas lançadas
    paidCash: number;          // Caixa efetivamente pago
    appropriatedCost: number;  // Custos apropriados
  };
}

export interface DREMultiPeriodResult {
  accountingMethod: AccountingMethod;
  year?: number;
  periods: DREPeriodStatement[];
  consolidated: DREPeriodStatement;
  costCenterBreakdown?: Array<{
    costCenterId: string;
    costCenterCode: string;
    costCenterName: string;
    operationalExpenses: number;
    directCosts: number;
    totalShare: number;
  }>;
}

export const CostCenterInputSchema = z.object({
  code: z.string().min(2).max(20).transform((v) => v.toUpperCase().trim()),
  name: z.string().min(2).max(150).trim(),
  description: z.string().max(500).optional().nullable(),
});

export const AllocationItemSchema = z.object({
  costCenterId: z.string().uuid(),
  percentage: z.number().positive().max(100),
  amount: z.number().positive(),
  notes: z.string().max(255).optional().nullable(),
});

export const PayableAllocationsInputSchema = z.object({
  payableId: z.string().uuid(),
  allocations: z.array(AllocationItemSchema).min(1),
});
