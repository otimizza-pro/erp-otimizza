import { z } from "zod";

export type PersonType = "PF" | "PJ";
export type SupplierStatus = "ACTIVE" | "ARCHIVED";
export type CostPeriodicity = "ONE_TIME" | "MONTHLY" | "YEARLY" | "UNCLASSIFIED";
export type AllocationStatus = "ACTIVE" | "CANCELED" | "REVERSED";
export type AccrualStatus = "ACCRUED" | "CANCELED" | "REVERSED";

// --- Fornecedores (Suppliers) ---
export interface SupplierRecord {
  id: string;
  supplierCode: string;
  personType: PersonType;
  name: string;
  tradeName?: string | null;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  category?: string | null;
  postalCode?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  notes?: string | null;
  status: SupplierStatus;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  // Métricas agregadas opcionais
  totalAllocatedExpenses?: number;
  openPayablesCount?: number;
}

export const CreateSupplierSchema = z.object({
  personType: z.enum(["PF", "PJ"]),
  name: z.string().min(2, "Nome ou razão social deve ter pelo menos 2 caracteres"),
  tradeName: z.string().optional().nullable(),
  document: z.string().optional().nullable(),
  email: z.string().email("E-mail inválido").optional().nullable().or(z.literal("")),
  phone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  street: z.string().optional().nullable(),
  number: z.string().optional().nullable(),
  complement: z.string().optional().nullable(),
  neighborhood: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().max(2).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type CreateSupplierInput = z.infer<typeof CreateSupplierSchema>;

export const UpdateSupplierSchema = CreateSupplierSchema.partial();
export type UpdateSupplierInput = z.infer<typeof UpdateSupplierSchema>;

// --- Rateio de Despesas (Payable Allocations) ---
export interface PayableAllocationRecord {
  id: string;
  payableId: string;
  contractId?: string | null;
  contractNumber?: string | null;
  clientName?: string | null;
  contractItemId?: string | null;
  serviceId?: string | null;
  serviceName?: string | null;
  allocatedAmount: number;
  coverageStartDate: string; // YYYY-MM-DD
  coverageEndDate: string; // YYYY-MM-DD
  costPeriodicity: CostPeriodicity;
  status: AllocationStatus;
  cancellationReason?: string | null;
  canceledAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  accruals?: CostAccrualRecord[];
}

export const CreateAllocationSchema = z.object({
  payableId: z.string().uuid("ID do título a pagar inválido"),
  contractId: z.string().uuid("ID do contrato inválido").optional().nullable(),
  contractItemId: z.string().uuid("ID do item contratado inválido").optional().nullable(),
  serviceId: z.string().uuid("ID do serviço inválido").optional().nullable(),
  allocatedAmount: z.number().positive("Valor alocado deve ser maior que zero"),
  coverageStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inicial no formato YYYY-MM-DD"),
  coverageEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data final no formato YYYY-MM-DD"),
  costPeriodicity: z.enum(["ONE_TIME", "MONTHLY", "YEARLY", "UNCLASSIFIED"]).default("MONTHLY"),
  notes: z.string().optional().nullable(),
}).refine((data) => data.coverageEndDate >= data.coverageStartDate, {
  message: "Data final de cobertura deve ser maior ou igual à data inicial",
  path: ["coverageEndDate"],
});

export type CreateAllocationInput = z.infer<typeof CreateAllocationSchema>;

// --- Apropriações Gerenciais (Cost Accruals) ---
export interface CostAccrualRecord {
  id: string;
  allocationId: string;
  payableId: string;
  contractId?: string | null;
  serviceId?: string | null;
  supplierId?: string | null;
  competencyMonth: string; // YYYY-MM
  accrualAmount: number;
  status: AccrualStatus;
  notes?: string | null;
  createdAt: string;
}

// --- Relatórios e Indicadores ---
export interface SupplierExpenseSummary {
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  category: string;
  totalOriginalPayables: number;
  totalPaid: number;
  totalOpenPayables: number;
  totalAllocatedToContracts: number;
  activeContractsCount: number;
}

export interface SupplierPayableItem {
  payableId: string;
  payableNumber: string;
  supplierId: string;
  supplierName: string;
  description: string;
  competency: string;
  dueDate: string;
  originalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  allocatedAmount: number;
  unallocatedAmount: number;
  status: string;
}

export interface SupplierContractedServiceItem {
  contractId: string;
  contractNumber: string;
  clientId: string;
  clientName: string;
  serviceId: string;
  serviceName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  costPeriodicity: CostPeriodicity;
  isLegacyCost: boolean;
  contractStatus: string;
}

export interface ManagerialProfitabilityItem {
  periodMonth: string; // YYYY-MM
  serviceId: string;
  serviceName: string;
  clientId?: string;
  clientName?: string;
  // Receitas segregadas
  contractedRevenue: number;
  invoicedRevenue: number;
  receivedRevenue: number;
  recognizedRevenue: number;
  // Custos segregados
  estimatedDirectCost: number;
  accruedRealCost: number;
  unclassifiedLegacyCost: number;
  // Margens
  estimatedGrossMargin: number;
  estimatedMarginPct: number;
  realizedGrossMargin: number;
  realizedMarginPct: number;
}
