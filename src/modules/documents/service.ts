import { query, withTransaction } from "@/lib/db/pool";
import {
  DocumentRecord,
  DocumentVersionRecord,
  DocumentLinkRecord,
  DocumentCategoryRecord,
  CreateDocumentInput,
  AddDocumentVersionInput,
  LinkDocumentInput,
  DocumentFilterOptions,
  DocumentEntityType,
} from "./types";
import { DocumentStorage } from "./storage";

interface DbDocumentRow {
  id: string;
  document_code: string;
  title: string;
  description: string | null;
  category_id: string;
  category_name?: string;
  current_version_number: number;
  status: "ACTIVE" | "ARCHIVED";
  tags: string[];
  issue_date: string | Date | null;
  expiration_date: string | Date | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
  archived_at: Date | null;
}

interface DbVersionRow {
  id: string;
  document_id: string;
  version_number: number;
  original_filename: string;
  storage_provider: "SUPABASE_STORAGE" | "DB_STORAGE" | "LOCAL_STORAGE";
  storage_path: string;
  file_size_bytes: string | number;
  mime_type: string;
  sha256_hash: string;
  reason_for_change: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: Date;
}

interface DbLinkRow {
  id: string;
  document_id: string;
  entity_type: DocumentEntityType;
  entity_id: string;
  link_type: string;
  created_at: Date;
}

function formatDate(val: string | Date | null): string | null {
  if (!val) return null;
  if (typeof val === "string") return val.slice(0, 10);
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  return null;
}

function mapDocumentRow(row: DbDocumentRow): DocumentRecord {
  return {
    id: row.id,
    documentCode: row.document_code,
    title: row.title,
    description: row.description,
    categoryId: row.category_id,
    categoryName: row.category_name,
    currentVersionNumber: row.current_version_number,
    status: row.status,
    tags: row.tags || [],
    issueDate: formatDate(row.issue_date),
    expirationDate: formatDate(row.expiration_date),
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    archivedAt: row.archived_at ? row.archived_at.toISOString() : null,
  };
}

function mapVersionRow(row: DbVersionRow): DocumentVersionRecord {
  return {
    id: row.id,
    documentId: row.document_id,
    versionNumber: row.version_number,
    originalFilename: row.original_filename,
    storageProvider: row.storage_provider,
    storagePath: row.storage_path,
    fileSizeBytes: Number(row.file_size_bytes),
    mimeType: row.mime_type,
    sha256Hash: row.sha256_hash,
    reasonForChange: row.reason_for_change,
    metadata: row.metadata || {},
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
  };
}

function mapLinkRow(row: DbLinkRow): DocumentLinkRecord {
  return {
    id: row.id,
    documentId: row.document_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    linkType: row.link_type,
    createdAt: row.created_at.toISOString(),
  };
}

export class DocumentService {
  /**
   * Listar todas as categorias documentais disponíveis
   */
  static async getCategories(): Promise<DocumentCategoryRecord[]> {
    const res = await query<{
      id: string;
      name: string;
      description: string | null;
      is_active: boolean;
      created_at: Date;
    }>("SELECT * FROM document_categories WHERE is_active = TRUE ORDER BY name ASC");

    return res.rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isActive: r.is_active,
      createdAt: r.created_at.toISOString(),
    }));
  }

  /**
   * Buscar documento por ID (com versões, links e timeline de eventos)
   */
  static async getDocumentById(id: string, client?: { query: typeof query }): Promise<DocumentRecord | null> {
    const db = client || { query };

    const docSql = `
      SELECT d.*, c.name AS category_name
      FROM documents d
      JOIN document_categories c ON c.id = d.category_id
      WHERE d.id = $1
    `;
    const docRes = await db.query<DbDocumentRow>(docSql, [id]);
    if (!docRes.rows[0]) return null;

    const doc = mapDocumentRow(docRes.rows[0]);

    // Buscar versões
    const verSql = `
      SELECT * FROM document_versions
      WHERE document_id = $1
      ORDER BY version_number DESC
    `;
    const verRes = await db.query<DbVersionRow>(verSql, [id]);
    const versions = verRes.rows.map(mapVersionRow);
    doc.versions = versions;
    doc.currentVersion = versions.find((v) => v.versionNumber === doc.currentVersionNumber) || versions[0];

    // Buscar links
    const linkSql = `
      SELECT * FROM document_links
      WHERE document_id = $1
      ORDER BY created_at ASC
    `;
    const linkRes = await db.query<DbLinkRow>(linkSql, [id]);
    doc.links = linkRes.rows.map(mapLinkRow);

    // Buscar eventos de auditoria
    const evSql = `
      SELECT * FROM document_events
      WHERE document_id = $1
      ORDER BY created_at DESC
    `;
    const evRes = await db.query<{
      id: string;
      document_id: string;
      version_id: string | null;
      event_type: string;
      details: Record<string, unknown>;
      actor_id: string | null;
      actor_name: string | null;
      created_at: Date;
    }>(evSql, [id]);

    doc.events = evRes.rows.map((e) => ({
      id: e.id,
      documentId: e.document_id,
      versionId: e.version_id,
      eventType: e.event_type,
      details: e.details || {},
      actorId: e.actor_id,
      actorName: e.actor_name,
      createdAt: e.created_at.toISOString(),
    }));

    return doc;
  }

  /**
   * Criar novo documento com versão 1 inicial
   */
  static async createDocument(input: CreateDocumentInput, fileBuffer: Buffer): Promise<DocumentRecord> {
    return withTransaction(async (client) => {
      // 1. Gerar código sequencial DOC-00001
      const seqRes = await client.query<{ next_val: string }>(
        "SELECT nextval('document_number_seq') AS next_val"
      );
      const seqNum = seqRes.rows[0].next_val;
      const documentCode = `DOC-${String(seqNum).padStart(5, "0")}`;

      // 2. Inserir cabeçalho do documento
      const docInsertSql = `
        INSERT INTO documents (
          document_code, title, description, category_id,
          tags, issue_date, expiration_date, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      const docRes = await client.query<DbDocumentRow>(docInsertSql, [
        documentCode,
        input.title.trim(),
        input.description?.trim() || null,
        input.categoryId,
        input.tags || [],
        input.issueDate || null,
        input.expirationDate || null,
        input.actorName || "Administrador",
      ]);
      const documentDb = docRes.rows[0];

      // 3. Processar upload físico/resiliente do arquivo
      const storageInfo = await DocumentStorage.uploadFile(
        fileBuffer,
        documentDb.id,
        1,
        input.originalFilename,
        input.mimeType
      );

      // 4. Inserir versão 1 imutável
      const verInsertSql = `
        INSERT INTO document_versions (
          document_id, version_number, original_filename, storage_provider,
          storage_path, file_size_bytes, mime_type, sha256_hash, reason_for_change, created_by
        ) VALUES ($1, 1, $2, $3, $4, $5, $6, $7, 'Versão inicial', $8)
        RETURNING *
      `;
      const verRes = await client.query<DbVersionRow>(verInsertSql, [
        documentDb.id,
        input.originalFilename,
        storageInfo.storageProvider,
        storageInfo.storagePath,
        storageInfo.fileSizeBytes,
        input.mimeType,
        storageInfo.sha256Hash,
        input.actorName || "Administrador",
      ]);
      const versionDb = verRes.rows[0];

      // 5. Gravar payload binário resiliente
      await client.query(
        "INSERT INTO document_file_payloads (version_id, payload) VALUES ($1, $2)",
        [versionDb.id, fileBuffer]
      );

      // 6. Inserir vínculos iniciais
      if (input.links && input.links.length > 0) {
        for (const link of input.links) {
          await client.query(
            `INSERT INTO document_links (document_id, entity_type, entity_id, link_type)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (document_id, entity_type, entity_id) DO NOTHING`,
            [documentDb.id, link.entityType, link.entityId, link.linkType || "ATTACHMENT"]
          );
        }
      }

      // 7. Evento de auditoria
      await client.query(
        `INSERT INTO document_events (
           document_id, version_id, event_type, details, actor_id, actor_name
         ) VALUES ($1, $2, 'CREATED', $3, $4, $5)`,
        [
          documentDb.id,
          versionDb.id,
          JSON.stringify({
            originalFilename: input.originalFilename,
            fileSizeBytes: storageInfo.fileSizeBytes,
            sha256Hash: storageInfo.sha256Hash,
            linksCount: input.links?.length || 0,
          }),
          input.actorId || null,
          input.actorName || "Administrador",
        ]
      );

      return (await this.getDocumentById(documentDb.id, client))!;
    });
  }

  /**
   * Adicionar nova versão imutável a um documento existente
   */
  static async addDocumentVersion(
    input: AddDocumentVersionInput,
    fileBuffer: Buffer
  ): Promise<DocumentRecord> {
    return withTransaction(async (client) => {
      const docRes = await client.query<DbDocumentRow>(
        "SELECT * FROM documents WHERE id = $1 FOR UPDATE",
        [input.documentId]
      );
      if (!docRes.rows[0]) throw new Error("Documento não encontrado.");
      const doc = docRes.rows[0];

      if (doc.status === "ARCHIVED") {
        throw new Error("Não é permitido adicionar nova versão a um documento arquivado.");
      }

      const nextVersionNumber = doc.current_version_number + 1;

      // 1. Upload do novo arquivo
      const storageInfo = await DocumentStorage.uploadFile(
        fileBuffer,
        doc.id,
        nextVersionNumber,
        input.originalFilename,
        input.mimeType
      );

      // 2. Inserir nova versão imutável
      const verInsertSql = `
        INSERT INTO document_versions (
          document_id, version_number, original_filename, storage_provider,
          storage_path, file_size_bytes, mime_type, sha256_hash, reason_for_change, metadata, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      const verRes = await client.query<DbVersionRow>(verInsertSql, [
        doc.id,
        nextVersionNumber,
        input.originalFilename,
        storageInfo.storageProvider,
        storageInfo.storagePath,
        storageInfo.fileSizeBytes,
        input.mimeType,
        storageInfo.sha256Hash,
        input.reasonForChange.trim(),
        JSON.stringify(input.metadata || {}),
        input.actorName || "Administrador",
      ]);
      const versionDb = verRes.rows[0];

      // 3. Gravar payload binário resiliente
      await client.query(
        "INSERT INTO document_file_payloads (version_id, payload) VALUES ($1, $2)",
        [versionDb.id, fileBuffer]
      );

      // 4. Atualizar número da versão atual no cabeçalho
      await client.query(
        "UPDATE documents SET current_version_number = $1, updated_at = NOW() WHERE id = $2",
        [nextVersionNumber, doc.id]
      );

      // 5. Evento de auditoria
      await client.query(
        `INSERT INTO document_events (
           document_id, version_id, event_type, details, actor_id, actor_name
         ) VALUES ($1, $2, 'VERSION_ADDED', $3, $4, $5)`,
        [
          doc.id,
          versionDb.id,
          JSON.stringify({
            versionNumber: nextVersionNumber,
            originalFilename: input.originalFilename,
            reason: input.reasonForChange.trim(),
            sha256Hash: storageInfo.sha256Hash,
          }),
          input.actorId || null,
          input.actorName || "Administrador",
        ]
      );

      return (await this.getDocumentById(doc.id, client))!;
    });
  }

  /**
   * Vincular documento a uma entidade de negócio
   */
  static async linkDocument(input: LinkDocumentInput): Promise<DocumentLinkRecord> {
    return withTransaction(async (client) => {
      const docCheck = await client.query("SELECT id FROM documents WHERE id = $1", [input.documentId]);
      if (!docCheck.rows[0]) throw new Error("Documento não encontrado.");

      const insertSql = `
        INSERT INTO document_links (document_id, entity_type, entity_id, link_type)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (document_id, entity_type, entity_id) 
        DO UPDATE SET link_type = EXCLUDED.link_type
        RETURNING *
      `;
      const res = await client.query<DbLinkRow>(insertSql, [
        input.documentId,
        input.entityType,
        input.entityId,
        input.linkType || "ATTACHMENT",
      ]);

      await client.query(
        `INSERT INTO document_events (
           document_id, event_type, details, actor_id, actor_name
         ) VALUES ($1, 'LINK_ADDED', $2, $3, $4)`,
        [
          input.documentId,
          JSON.stringify({ entityType: input.entityType, entityId: input.entityId }),
          input.actorId || null,
          input.actorName || "Administrador",
        ]
      );

      return mapLinkRow(res.rows[0]);
    });
  }

  /**
   * Desvincular documento de uma entidade sem excluir o documento físico
   */
  static async unlinkDocument(
    documentId: string,
    linkId: string,
    actor?: { id?: string; name?: string }
  ): Promise<void> {
    await withTransaction(async (client) => {
      const linkRes = await client.query<DbLinkRow>(
        "SELECT * FROM document_links WHERE id = $1 AND document_id = $2",
        [linkId, documentId]
      );
      if (!linkRes.rows[0]) throw new Error("Vínculo não encontrado.");
      const link = linkRes.rows[0];

      await client.query("DELETE FROM document_links WHERE id = $1", [linkId]);

      await client.query(
        `INSERT INTO document_events (
           document_id, event_type, details, actor_id, actor_name
         ) VALUES ($1, 'LINK_REMOVED', $2, $3, $4)`,
        [
          documentId,
          JSON.stringify({ entityType: link.entity_type, entityId: link.entity_id }),
          actor?.id || null,
          actor?.name || "Administrador",
        ]
      );
    });
  }

  /**
   * Arquivamento Lógico do Documento (Preservação de Histórico)
   */
  static async archiveDocument(
    id: string,
    reason?: string,
    actor?: { id?: string; name?: string }
  ): Promise<DocumentRecord> {
    return withTransaction(async (client) => {
      const docRes = await client.query<DbDocumentRow>("SELECT * FROM documents WHERE id = $1", [id]);
      if (!docRes.rows[0]) throw new Error("Documento não encontrado.");

      await client.query(
        "UPDATE documents SET status = 'ARCHIVED', archived_at = NOW(), updated_at = NOW() WHERE id = $1",
        [id]
      );

      await client.query(
        `INSERT INTO document_events (
           document_id, event_type, details, actor_id, actor_name
         ) VALUES ($1, 'ARCHIVED', $2, $3, $4)`,
        [
          id,
          JSON.stringify({ reason: reason?.trim() || "Arquivado pelo usuário" }),
          actor?.id || null,
          actor?.name || "Administrador",
        ]
      );

      return (await this.getDocumentById(id, client))!;
    });
  }

  /**
   * Recuperar arquivo binário para download autenticado
   */
  static async getDocumentFile(
    documentId: string,
    versionNumber?: number,
    actor?: { id?: string; name?: string }
  ): Promise<{ buffer: Buffer; filename: string; mimeType: string; versionNumber: number }> {
    const doc = await this.getDocumentById(documentId);
    if (!doc) throw new Error("Documento não encontrado.");

    const targetVerNum = versionNumber || doc.currentVersionNumber;
    const version = doc.versions?.find((v) => v.versionNumber === targetVerNum);
    if (!version) throw new Error(`Versão ${targetVerNum} não encontrada.`);

    // 1. Tentar obter do armazenamento binário resiliente do banco
    const payloadRes = await query<{ payload: Buffer }>(
      "SELECT payload FROM document_file_payloads WHERE version_id = $1",
      [version.id]
    );

    const fileBuffer: Buffer | null = payloadRes.rows[0]?.payload || null;

    if (!fileBuffer) {
      throw new Error("Arquivo não encontrado no repositório de armazenamento.");
    }

    // Registrar evento de download
    await query(
      `INSERT INTO document_events (
         document_id, version_id, event_type, details, actor_id, actor_name
       ) VALUES ($1, $2, 'DOWNLOADED', $3, $4, $5)`,
      [
        doc.id,
        version.id,
        JSON.stringify({ versionNumber: version.versionNumber }),
        actor?.id || null,
        actor?.name || "Administrador",
      ]
    );

    return {
      buffer: fileBuffer,
      filename: version.originalFilename,
      mimeType: version.mimeType,
      versionNumber: version.versionNumber,
    };
  }

  /**
   * Listar documentos com filtros, paginação e contagem
   */
  static async listDocuments(
    filters: DocumentFilterOptions = {}
  ): Promise<{ documents: DocumentRecord[]; total: number }> {
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let pIdx = 1;

    if (filters.status && filters.status !== "ALL") {
      conditions.push(`d.status = $${pIdx++}`);
      params.push(filters.status);
    } else {
      conditions.push("d.status = 'ACTIVE'");
    }

    if (filters.categoryId) {
      conditions.push(`d.category_id = $${pIdx++}`);
      params.push(filters.categoryId);
    }

    if (filters.search && filters.search.trim()) {
      conditions.push(`(
        d.title ILIKE $${pIdx} OR 
        d.document_code ILIKE $${pIdx} OR 
        d.description ILIKE $${pIdx}
      )`);
      params.push(`%${filters.search.trim()}%`);
      pIdx++;
    }

    if (filters.entityType && filters.entityId) {
      conditions.push(`EXISTS (
        SELECT 1 FROM document_links l
        WHERE l.document_id = d.id AND l.entity_type = $${pIdx++} AND l.entity_id = $${pIdx++}
      )`);
      params.push(filters.entityType, filters.entityId);
    }

    if (filters.tag) {
      conditions.push(`$${pIdx++} = ANY(d.tags)`);
      params.push(filters.tag);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const countSql = `SELECT COUNT(*)::int AS count FROM documents d ${whereClause}`;
    const countRes = await query<{ count: number }>(countSql, params);
    const total = countRes.rows[0]?.count || 0;

    const limit = filters.limit ? Math.min(filters.limit, 100) : 50;
    const offset = filters.offset || 0;

    const listSql = `
      SELECT d.*, c.name AS category_name
      FROM documents d
      JOIN document_categories c ON c.id = d.category_id
      ${whereClause}
      ORDER BY d.created_at DESC
      LIMIT $${pIdx++} OFFSET $${pIdx++}
    `;
    params.push(limit, offset);

    const listRes = await query<DbDocumentRow>(listSql, params);
    return {
      documents: listRes.rows.map(mapDocumentRow),
      total,
    };
  }

  /**
   * Buscar documentos vinculados a uma entidade específica
   */
  static async getDocumentsForEntity(
    entityType: DocumentEntityType,
    entityId: string
  ): Promise<DocumentRecord[]> {
    const sql = `
      SELECT d.*, c.name AS category_name
      FROM documents d
      JOIN document_categories c ON c.id = d.category_id
      JOIN document_links l ON l.document_id = d.id
      WHERE l.entity_type = $1 AND l.entity_id = $2 AND d.status = 'ACTIVE'
      ORDER BY d.created_at DESC
    `;
    const res = await query<DbDocumentRow>(sql, [entityType, entityId]);
    return res.rows.map(mapDocumentRow);
  }

  /**
   * Integração com Propostas: Anexar PDF oficial da proposta ao Repositório Documental
   */
  static async attachProposalPdf(
    proposalId: string,
    versionNumber: number,
    proposalCode: string,
    pdfBuffer: Buffer,
    actor?: { id?: string; name?: string }
  ): Promise<DocumentRecord> {
    const code = proposalCode || "PROP";
    const filename = `${code}_v${versionNumber}.pdf`;
    const title = `Proposta Comercial ${code} (Versão ${versionNumber})`;

    return await this.createDocument(
      {
        title,
        description: `Documento PDF gerado para a Proposta Comercial ${code} - Versão ${versionNumber}.`,
        categoryId: "PROPOSAL",
        tags: ["proposta", "comercial", code.toLowerCase()],
        originalFilename: filename,
        mimeType: "application/pdf",
        links: [
          {
            entityType: "PROPOSAL",
            entityId: proposalId,
            linkType: "OFFICIAL_PROPOSAL_PDF",
          },
        ],
        actorId: actor?.id,
        actorName: actor?.name || "Administrador ERP",
      },
      pdfBuffer
    );
  }
}
