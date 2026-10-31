import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { query } from "@/lib/db/pool";
import { DocumentService } from "@/modules/documents/service";
import { createClient } from "@/modules/clients/service";
import { CrmService } from "@/modules/crm/service";

describe("Fase 9 - Testes de Integração de Gestão Documental", () => {
  let testClientId: string;
  let testLeadId: string;
  let testDocId: string;
  let testDocCode: string;

  const testFileContentV1 = Buffer.from("Conteudo original versao 1 do contrato Otimizza");
  const testFileContentV2 = Buffer.from("Conteudo revisado versao 2 do contrato Otimizza com aditivo");

  beforeAll(async () => {
    // Limpeza prévia
    await query("DELETE FROM document_events WHERE document_id IN (SELECT id FROM documents WHERE title LIKE '%[TEST-DOC]%')");
    await query("DELETE FROM document_links WHERE document_id IN (SELECT id FROM documents WHERE title LIKE '%[TEST-DOC]%')");
    await query("DELETE FROM document_file_payloads WHERE version_id IN (SELECT id FROM document_versions WHERE document_id IN (SELECT id FROM documents WHERE title LIKE '%[TEST-DOC]%'))");
    await query("DELETE FROM document_versions WHERE document_id IN (SELECT id FROM documents WHERE title LIKE '%[TEST-DOC]%')");
    await query("DELETE FROM documents WHERE title LIKE '%[TEST-DOC]%'");

    await query("DELETE FROM client_contacts WHERE client_id IN (SELECT id FROM clients WHERE name LIKE '%[TEST-DOC]%')");
    await query("DELETE FROM clients WHERE name LIKE '%[TEST-DOC]%'");
    await query("DELETE FROM crm_leads WHERE name LIKE '%[TEST-DOC]%'");

    // Criar Cliente e Lead de teste
    const cl = await createClient({
      type: "PJ",
      name: "[TEST-DOC] Cliente Corporativo Beta",
      tradeName: "Beta Corp",
      document: "11.222.333/0005-05",
      email: "financeiro@beta.com.br",
    });
    testClientId = cl.id;

    const ld = await CrmService.createLead({
      personType: "PJ",
      name: "[TEST-DOC] Lead Gama Inbound",
      document: "11.222.333/0006-96",
      email: "contato@gama.com.br",
      source: "Website",
    });
    testLeadId = ld.id;
  });

  afterAll(async () => {
    await query("DELETE FROM document_events WHERE document_id IN (SELECT id FROM documents WHERE title LIKE '%[TEST-DOC]%')");
    await query("DELETE FROM document_links WHERE document_id IN (SELECT id FROM documents WHERE title LIKE '%[TEST-DOC]%')");
    await query("DELETE FROM document_file_payloads WHERE version_id IN (SELECT id FROM document_versions WHERE document_id IN (SELECT id FROM documents WHERE title LIKE '%[TEST-DOC]%'))");
    await query("DELETE FROM document_versions WHERE document_id IN (SELECT id FROM documents WHERE title LIKE '%[TEST-DOC]%')");
    await query("DELETE FROM documents WHERE title LIKE '%[TEST-DOC]%'");

    await query("DELETE FROM client_contacts WHERE client_id IN (SELECT id FROM clients WHERE name LIKE '%[TEST-DOC]%')");
    await query("DELETE FROM clients WHERE name LIKE '%[TEST-DOC]%'");
    await query("DELETE FROM crm_leads WHERE name LIKE '%[TEST-DOC]%'");
  });

  it("1. Cria documento com upload de arquivo, gera código sequencial DOC-xxxxx e vincula ao Cliente", async () => {
    const doc = await DocumentService.createDocument(
      {
        title: "[TEST-DOC] Contrato de Prestação de Serviços",
        description: "Contrato formal de prestação de serviços digitais",
        categoryId: "CONTRACT",
        tags: ["contrato", "teste", "fase9"],
        issueDate: "2026-10-31",
        originalFilename: "contrato_beta_v1.pdf",
        mimeType: "application/pdf",
        links: [
          {
            entityType: "CLIENT",
            entityId: testClientId,
            linkType: "MAIN_CONTRACT",
          },
        ],
        actorName: "Administrador de Testes",
      },
      testFileContentV1
    );

    expect(doc).toBeDefined();
    expect(doc.id).toBeDefined();
    expect(doc.documentCode).toMatch(/^DOC-\d{5}$/);
    expect(doc.currentVersionNumber).toBe(1);
    expect(doc.status).toBe("ACTIVE");
    expect(doc.versions).toHaveLength(1);
    expect(doc.links).toHaveLength(1);
    expect(doc.links?.[0].entityId).toBe(testClientId);

    testDocId = doc.id;
    testDocCode = doc.documentCode;
  });

  it("2. Realiza download autenticado do arquivo e valida bytes e integridade", async () => {
    const fileData = await DocumentService.getDocumentFile(testDocId, 1);

    expect(fileData).toBeDefined();
    expect(fileData.filename).toBe("contrato_beta_v1.pdf");
    expect(fileData.mimeType).toBe("application/pdf");
    expect(fileData.versionNumber).toBe(1);
    expect(fileData.buffer.toString()).toBe(testFileContentV1.toString());
  });

  it("3. Adiciona nova versão imutável (v2) preservando a integridade da v1", async () => {
    const updatedDoc = await DocumentService.addDocumentVersion(
      {
        documentId: testDocId,
        originalFilename: "contrato_beta_v2_aditivo.pdf",
        mimeType: "application/pdf",
        reasonForChange: "Adicionado aditivo com ampliação de escopo",
        actorName: "Administrador de Testes",
      },
      testFileContentV2
    );

    expect(updatedDoc.currentVersionNumber).toBe(2);
    expect(updatedDoc.versions).toHaveLength(2);

    const v1 = updatedDoc.versions?.find((v) => v.versionNumber === 1);
    const v2 = updatedDoc.versions?.find((v) => v.versionNumber === 2);

    expect(v1).toBeDefined();
    expect(v2).toBeDefined();
    expect(v1?.originalFilename).toBe("contrato_beta_v1.pdf");
    expect(v2?.originalFilename).toBe("contrato_beta_v2_aditivo.pdf");
    expect(v1?.sha256Hash).not.toBe(v2?.sha256Hash);

    // Baixa especificamente a versão 1 antiga e confirma integridade dos bytes históricos
    const fileV1 = await DocumentService.getDocumentFile(testDocId, 1);
    expect(fileV1.buffer.toString()).toBe(testFileContentV1.toString());

    // Baixa a versão 2 atual e confirma bytes atualizados
    const fileV2 = await DocumentService.getDocumentFile(testDocId, 2);
    expect(fileV2.buffer.toString()).toBe(testFileContentV2.toString());
  });

  it("4. Cria vínculo polimórfico com Lead e desvincula sem excluir arquivo físico", async () => {
    // Vincula ao Lead
    const link = await DocumentService.linkDocument({
      documentId: testDocId,
      entityType: "LEAD",
      entityId: testLeadId,
      linkType: "BRIEFING_REFERENCE",
    });

    expect(link).toBeDefined();
    expect(link.entityType).toBe("LEAD");
    expect(link.entityId).toBe(testLeadId);

    // Consulta documentos vinculados ao Lead
    const leadDocs = await DocumentService.getDocumentsForEntity("LEAD", testLeadId);
    expect(leadDocs).toHaveLength(1);
    expect(leadDocs[0].id).toBe(testDocId);

    // Desvincula
    await DocumentService.unlinkDocument(testDocId, link.id);

    const leadDocsAfter = await DocumentService.getDocumentsForEntity("LEAD", testLeadId);
    expect(leadDocsAfter).toHaveLength(0);

    // Confirma que o documento ainda existe fisicamente
    const docStillExists = await DocumentService.getDocumentById(testDocId);
    expect(docStillExists).toBeDefined();
    expect(docStillExists?.status).toBe("ACTIVE");
  });

  it("5. Anexa PDF oficial de Proposta Comercial diretamente na Gestão Documental", async () => {
    const dummyProposalId = "55555555-5555-5555-5555-555555555555";
    const proposalPdfContent = Buffer.from("Buffer de PDF da Proposta PROP-00099");

    const propDoc = await DocumentService.attachProposalPdf(
      dummyProposalId,
      1,
      "PROP-00099",
      proposalPdfContent
    );

    expect(propDoc).toBeDefined();
    expect(propDoc.categoryId).toBe("PROPOSAL");
    expect(propDoc.title).toContain("PROP-00099");
    expect(propDoc.links).toHaveLength(1);
    expect(propDoc.links?.[0].entityType).toBe("PROPOSAL");
    expect(propDoc.links?.[0].entityId).toBe(dummyProposalId);

    // Limpeza do documento de proposta gerado
    await query("DELETE FROM document_events WHERE document_id = $1", [propDoc.id]);
    await query("DELETE FROM document_links WHERE document_id = $1", [propDoc.id]);
    await query("DELETE FROM document_file_payloads WHERE version_id IN (SELECT id FROM document_versions WHERE document_id = $1)", [propDoc.id]);
    await query("DELETE FROM document_versions WHERE document_id = $1", [propDoc.id]);
    await query("DELETE FROM documents WHERE id = $1", [propDoc.id]);
  });

  it("6. Arquiva documento logicamente preservando histórico de eventos", async () => {
    const archived = await DocumentService.archiveDocument(
      testDocId,
      "Arquivo expirado ou substituído"
    );

    expect(archived.status).toBe("ARCHIVED");
    expect(archived.archivedAt).toBeDefined();

    // Eventos de auditoria gravados
    const full = await DocumentService.getDocumentById(testDocId);
    const eventTypes = full?.events?.map((e) => e.eventType);
    expect(eventTypes).toContain("CREATED");
    expect(eventTypes).toContain("VERSION_ADDED");
    expect(eventTypes).toContain("DOWNLOADED");
    expect(eventTypes).toContain("ARCHIVED");
  });

  it("7. Confirma que as tabelas de Gestão Documental possuem Row Level Security (RLS) habilitado", async () => {
    const res = await query<{ tablename: string; rowsecurity: boolean }>(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
        AND tablename IN ('documents', 'document_versions', 'document_file_payloads', 'document_links', 'document_events', 'document_categories')
    `);

    expect(res.rows.length).toBe(6);
    for (const row of res.rows) {
      expect(row.rowsecurity).toBe(true);
    }
  });
});
