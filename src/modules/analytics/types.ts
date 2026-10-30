export interface AnalyticsFilterParams {
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  periodType?: "MONTH" | "QUARTER" | "YEAR" | "CUSTOM";
  comparisonType?: "PREVIOUS_PERIOD" | "SAME_PERIOD_LAST_YEAR" | "NONE";
  clientId?: string;
  categoryId?: string;
  serviceId?: string;
  contractId?: string;
  financialAccountId?: string;
  status?: string;
}

export interface MetricComparison {
  current: number;
  previous: number;
  delta: number;
  percentageChange: number | null;
}

export interface ExecutiveKpiSummary {
  receivedRevenue: MetricComparison;
  projectedRevenueDue: number;        // Por data de vencimento
  projectedRevenueCompetency: number; // Por competência
  paidExpenses: MetricComparison;
  projectedExpenses: number;
  realizedResult: MetricComparison;   // Recebimentos - Pagamentos (sem transferências)
  projectedResult: number;            // Receita Prevista - Despesas Previstas
  
  // Inadimplência
  defaultRate: {
    overdueAmount: number;
    openOverdueBalance: number;
    overdueTitlesCount: number;
  };

  // MRR e Contratos
  mrr: {
    currentMrr: number;
    monthlyContractsCount: number;
    yearlyContractsNormalizedCount: number;
  };

  activeClientsCount: number;
  activeContractsCount: number;
}

export interface MonthlyEvolutionItem {
  month: string; // YYYY-MM
  receivedRevenue: number;
  projectedRevenue: number;
  paidExpenses: number;
  projectedExpenses: number;
  realizedResult: number;
  mrr: number;
}

export interface ServiceProfitabilityReportItem {
  serviceId: string;
  serviceName: string;
  categoryName?: string;
  contractedRevenue: number;
  estimatedCost: number;
  realizedExpenseAllocated: number;
  estimatedGrossMargin: number;
  estimatedGrossMarginPercent: number;
  realizedGrossMargin: number;
  realizedGrossMarginPercent: number;
  activeContractsCount: number;
}

export interface ComboProfitabilityReportItem {
  comboId: string;
  comboName: string;
  contractedRevenue: number;
  estimatedCost: number;
  estimatedGrossMargin: number;
  estimatedGrossMarginPercent: number;
  activeContractsCount: number;
}

export interface ClientProfitabilityReportItem {
  clientId: string;
  clientName: string;
  clientDocument?: string | null;
  totalContractedAmount: number;
  totalReceivedAmount: number;
  openBalanceAmount: number;
  overdueAmount: number;
  activeContractsCount: number;
}

export interface ReceivablesDefaultReportItem {
  id: string;
  receivableNumber: string;
  clientName: string;
  contractNumber?: string | null;
  competency: string;
  dueDate: string;
  originalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: string;
  daysOverdue: number;
}

export interface DashboardLayoutPreferences {
  visibleWidgets: string[];
  widgetOrder: string[];
  collapsedWidgets: string[];
}
