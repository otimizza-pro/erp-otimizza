import { z } from "zod";

export type DocumentStatus = "ACTIVE" | "ARCHIVED";

export type DocumentEntityType =
  | "LEAD"
  | "OPPORTUNITY"
  | "CLIENT"
  | "PROPOSAL"
  | "PROPOSAL_VERSION"
  | "CONTRACT"
  | "CONTRACT_VERSION"
  | "SUPPLIER"
  | "PAYABLE"
  | "RECEIVABLE"
  | "SETTLEMENT"
  | "PROJECT"
  | "TASK";

export type DocumentStorageProvider = "SUPABASE_STORAGE" | "DB_STORAGE" | "LOCAL_STORAGE";

export interface DocumentCategoryRecord {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface DocumentVersionRecord {
  id: string;
  documentId: string;
  versionNumber: number;
  originalFilename: string;
  storageProvider: DocumentStorageProvider;
  storagePath: string;
  fileSizeBytes: number;
  mimeType: string;
  sha256Hash: string;
  reasonForChange: string | null;
  metadata: Record<string, unknown>;
  createdBy: string | null;
  createdAt: string;
}

export interface DocumentLinkRecord {
  id: string;
  documentId: string;
  entityType: DocumentEntityType;
  entityId: string;
  linkType: string;
  createdAt: string;
  entityDisplayLabel?: string;
}

export interface DocumentEventRecord {
  id: string;
  documentId: string;
  versionId: string | null;
  eventType: string;
  details: Record<string, unknown>;
  actorId: string | null;
  actorName: string | null;
  createdAt: string;
}

export interface DocumentRecord {
  id: string;
  documentCode: string;
  title: string;
  description: string | null;
  categoryId: string;
  categoryName?: string;
  currentVersionNumber: number;
  status: DocumentStatus;
  tags: string[];
  issueDate: string | null;
  expirationDate: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  currentVersion?: DocumentVersionRecord;
  versions?: DocumentVersionRecord[];
  links?: DocumentLinkRecord[];
  events?: DocumentEventRecord[];
}

// Schemas Zod
export const CreateDocumentInputSchema = z.object({
  title: z.string().min(2, "Título deve ter no mínimo 2 caracteres").max(255),
  description: z.string().optional().nullable(),
  categoryId: z.string().min(1, "Categoria é obrigatória"),
  tags: z.array(z.string()).default([]),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD").optional().nullable(),
  expirationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD").optional().nullable(),
  originalFilename: z.string().min(1, "Nome do arquivo é obrigatório").max(255),
  mimeType: z.string().min(1).max(100),
  links: z
    .array(
      z.object({
        entityType: z.enum([
          "LEAD",
          "OPPORTUNITY",
          "CLIENT",
          "PROPOSAL",
          "PROPOSAL_VERSION",
          "CONTRACT",
          "CONTRACT_VERSION",
          "SUPPLIER",
          "PAYABLE",
          "RECEIVABLE",
          "SETTLEMENT",
          "PROJECT",
          "TASK",
        ]),
        entityId: z.string().uuid("ID da entidade inválido"),
        linkType: z.string().default("ATTACHMENT"),
      })
    )
    .default([]),
  actorId: z.string().uuid().optional().nullable(),
  actorName: z.string().max(150).optional().nullable(),
});

export type CreateDocumentInput = z.input<typeof CreateDocumentInputSchema>;

export const AddDocumentVersionInputSchema = z.object({
  documentId: z.string().uuid("ID do documento inválido"),
  originalFilename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  reasonForChange: z.string().min(3, "Informe a justificativa da nova versão").max(500),
  metadata: z.record(z.unknown()).default({}),
  actorId: z.string().uuid().optional().nullable(),
  actorName: z.string().max(150).optional().nullable(),
});

export type AddDocumentVersionInput = z.input<typeof AddDocumentVersionInputSchema>;

export const LinkDocumentInputSchema = z.object({
  documentId: z.string().uuid("ID do documento inválido"),
  entityType: z.enum([
    "LEAD",
    "OPPORTUNITY",
    "CLIENT",
    "PROPOSAL",
    "PROPOSAL_VERSION",
    "CONTRACT",
    "CONTRACT_VERSION",
    "SUPPLIER",
    "PAYABLE",
    "RECEIVABLE",
    "SETTLEMENT",
    "PROJECT",
    "TASK",
  ]),
  entityId: z.string().uuid("ID da entidade inválido"),
  linkType: z.string().default("ATTACHMENT"),
  actorId: z.string().uuid().optional().nullable(),
  actorName: z.string().max(150).optional().nullable(),
});

export type LinkDocumentInput = z.input<typeof LinkDocumentInputSchema>;

export interface DocumentFilterOptions {
  search?: string;
  categoryId?: string;
  status?: DocumentStatus | "ALL";
  entityType?: DocumentEntityType;
  entityId?: string;
  tag?: string;
  limit?: number;
  offset?: number;
}
