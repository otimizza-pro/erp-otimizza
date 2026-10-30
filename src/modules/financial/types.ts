export type FinancialStatus = "PENDING" | "OVERDUE" | "PARTIALLY_PAID" | "PAID" | "CANCELED";

export type SettlementType = "PAYMENT" | "RECEIPT" | "REVERSAL";

export type StatementMovementType = "INFLOW" | "OUTFLOW" | "TRANSFER_IN" | "TRANSFER_OUT";

export type AccountType = "CHECKING" | "SAVINGS" | "CASH" | "INVESTMENT";

export interface FinancialAccountRecord {
  id: string;
  name: string;
  bankName: string | null;
  accountType: AccountType;
  initialBalance: number;
  currentBalance: number;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
}

export interface FinancialCategoryRecord {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  parentId: string | null;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
}

export interface SettlementRecord {
  id: string;
  receivableId: string | null;
  payableId: string | null;
  financialAccountId: string;
  financialAccountName?: string;
  settlementType: SettlementType;
  amount: number;
  settlementDate: string; // YYYY-MM-DD
  notes: string | null;
  reversedSettlementId: string | null;
  isReversed: boolean;
  createdAt: string;
}

export interface ReceivableRecord {
  id: string;
  clientId: string;
  clientName?: string;
  clientDocument?: string | null;
  contractId: string | null;
  contractNumber?: string | null;
  contractVersionId: string | null;
  receivableNumber: string;
  description: string;
  competency: string; // YYYY-MM
  dueDate: string; // YYYY-MM-DD
  originalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: FinancialStatus;
  idempotencyKey: string | null;
  cancellationReason: string | null;
  canceledAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  settlements?: SettlementRecord[];
}

export interface PayableTemplateRecord {
  id: string;
  supplierName: string;
  categoryId: string | null;
  categoryName?: string;
  description: string;
  billingPeriod: "MONTHLY" | "YEARLY";
  dueDay: number;
  amount: number;
  startDate: string; // YYYY-MM-DD
  endDate: string | null;
  isIndefinite: boolean;
  status: "ACTIVE" | "CANCELED";
  createdAt: string;
  updatedAt: string;
}

export interface PayableRecord {
  id: string;
  payableTemplateId: string | null;
  supplierName: string;
  categoryId: string | null;
  categoryName?: string;
  contractId: string | null;
  serviceId: string | null;
  serviceName?: string;
  payableNumber: string;
  description: string;
  competency: string; // YYYY-MM
  dueDate: string; // YYYY-MM-DD
  originalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: FinancialStatus;
  idempotencyKey: string | null;
  cancellationReason: string | null;
  canceledAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  settlements?: SettlementRecord[];
}

export interface FinancialStatementRecord {
  id: string;
  accountId: string;
  accountName?: string;
  statementNumber: string;
  movementType: StatementMovementType;
  amount: number;
  balanceAfter: number;
  movementDate: string; // YYYY-MM-DD
  description: string;
  settlementId: string | null;
  transferPairId: string | null;
  createdAt: string;
}

export interface CashflowReportItem {
  period: string; // Data (YYYY-MM-DD) ou Competência (YYYY-MM)
  realizedInflow: number;
  realizedOutflow: number;
  realizedNet: number;
  projectedInflow: number;
  projectedOutflow: number;
  projectedNet: number;
  accumulatedBalance: number;
}

export interface ProfitabilityReportItem {
  serviceId: string;
  serviceName: string;
  categoryName: string;
  assignedRevenue: number;
  allocatedDirectCost: number;
  grossMargin: number;
  marginPercentage: number;
}
