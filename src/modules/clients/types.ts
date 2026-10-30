export type ClientType = "PF" | "PJ";
export type ClientStatus = "ACTIVE" | "ARCHIVED";

export interface ClientContact {
  id?: string;
  clientId?: string;
  name: string;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  isPrimary: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Client {
  id: string;
  type: ClientType;
  name: string;
  tradeName?: string | null;
  document?: string | null; // Normalizado sem pontuação (11 dígitos para CPF, 14 para CNPJ)
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  postalCode?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  status: ClientStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
  contacts?: ClientContact[];
}

export interface CreateClientDTO {
  type: ClientType;
  name: string;
  tradeName?: string | null;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  postalCode?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  notes?: string | null;
  contacts?: Omit<ClientContact, "id" | "clientId">[];
}

export interface UpdateClientDTO extends Partial<CreateClientDTO> {
  status?: ClientStatus;
}
