export type ServiceStatus = "ACTIVE" | "ARCHIVED";
export type BillingUnit = "HORA" | "MES" | "UNIDADE" | "PROJETO" | "ANUAL";
export type BillingPeriod = "ONE_TIME" | "MONTHLY" | "YEARLY";

export interface ServiceCategory {
  id: string;
  name: string;
  description?: string | null;
  parentId?: string | null;
  parentName?: string | null;
  status: ServiceStatus;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
}

export interface ServiceItem {
  id: string;
  categoryId?: string | null;
  categoryName?: string | null;
  defaultSupplierId?: string | null;
  defaultSupplierName?: string | null;
  defaultCostPeriodicity?: "ONE_TIME" | "MONTHLY" | "YEARLY" | "UNCLASSIFIED";
  name: string;
  description?: string | null;
  defaultPrice: number; // Em reais com 2 decimais (ex: 1500.00)
  defaultCost: number; // Em reais com 2 decimais (ex: 450.00)
  billingUnit: BillingUnit;
  status: ServiceStatus;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
}

export interface ComboItem {
  id?: string;
  comboId?: string;
  serviceId: string;
  serviceName?: string;
  defaultPrice?: number;
  componentPrice: number; // Preço negociado/específico do componente no combo
}

export interface Combo {
  id: string;
  name: string;
  description?: string | null;
  totalPrice: number; // Soma exata dos componentPrice
  status: ServiceStatus;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
  items?: ComboItem[];
}

export interface CreateServiceDTO {
  categoryId?: string | null;
  defaultSupplierId?: string | null;
  defaultCostPeriodicity?: "ONE_TIME" | "MONTHLY" | "YEARLY" | "UNCLASSIFIED";
  name: string;
  description?: string | null;
  defaultPrice: number;
  defaultCost: number;
  billingUnit: BillingUnit;
}

export interface CreateComboDTO {
  name: string;
  description?: string | null;
  items: {
    serviceId: string;
    componentPrice: number;
  }[];
}
