export type ContractStatus = "DRAFT" | "ACTIVE" | "ENDED" | "CANCELED";

export type ContractBillingPeriod = "ONE_TIME" | "MONTHLY" | "YEARLY";

export interface ContractItemInput {
  serviceId: string;
  serviceName?: string;
  comboId?: string | null;
  comboName?: string | null;
  supplierId?: string | null;
  supplierNameSnapshot?: string | null;
  costPeriodicity?: "ONE_TIME" | "MONTHLY" | "YEARLY" | "UNCLASSIFIED";
  quantity: number;
  unitPrice: number;
  unitCost: number;
}

export interface ContractItemRecord {
  id: string;
  contractVersionId: string;
  serviceId: string;
  serviceName: string;
  comboId: string | null;
  comboName: string | null;
  supplierId?: string | null;
  supplierNameSnapshot?: string | null;
  costPeriodicity: "ONE_TIME" | "MONTHLY" | "YEARLY" | "UNCLASSIFIED";
  isLegacyCost: boolean;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  totalPrice: number;
  createdAt: string;
}

export interface ContractVersionRecord {
  id: string;
  contractId: string;
  versionNumber: number;
  title: string;
  description?: string | null;
  billingPeriod: ContractBillingPeriod;
  dueDay: number;
  startDate: string; // YYYY-MM-DD
  endDate?: string | null; // YYYY-MM-DD
  isIndefinite: boolean;
  effectiveDate: string; // YYYY-MM-DD
  totalAmount: number;
  notes?: string | null;
  createdAt: string;
  items?: ContractItemRecord[];
}

export interface ContractRecord {
  id: string;
  clientId: string;
  clientName?: string;
  clientTradeName?: string | null;
  clientDocument?: string | null;
  contractNumber: string;
  status: ContractStatus;
  cancellationReason?: string | null;
  canceledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  currentVersion?: ContractVersionRecord;
  versions?: ContractVersionRecord[];
}

export interface CreateContractInput {
  clientId: string;
  title: string;
  description?: string;
  billingPeriod: ContractBillingPeriod;
  dueDay: number;
  startDate: string; // YYYY-MM-DD
  endDate?: string | null;
  isIndefinite?: boolean;
  notes?: string;
  status?: ContractStatus; // Default ACTIVE
  items: ContractItemInput[];
}

export interface CreateContractVersionInput {
  contractId: string;
  title?: string;
  description?: string;
  billingPeriod: ContractBillingPeriod;
  dueDay: number;
  startDate: string;
  endDate?: string | null;
  isIndefinite?: boolean;
  effectiveDate: string; // Data a partir da qual esta versão vigora
  notes?: string;
  items: ContractItemInput[];
}

export interface CancelContractInput {
  contractId: string;
  cancellationReason: string;
  canceledAt?: string; // Default now
}

export interface RecurrenceProjection {
  competency: string; // YYYY-MM ou YYYY
  effectiveDueDate: string; // YYYY-MM-DD
  idempotencyKey: string; // contractId_YYYY-MM
  amount: number;
  versionNumber: number;
  isPastOrCanceled: boolean;
}
