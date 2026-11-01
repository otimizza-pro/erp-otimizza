import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { query } from "@/lib/db/pool";
import { ProposalService } from "@/modules/proposals/service";
import { CrmService } from "@/modules/crm/service";
import { createClient } from "@/modules/clients/service";
import { createService, createCombo } from "@/modules/catalog/service";
import { generateProposalPdf } from "@/modules/proposals/pdf";

describe("Fase 8 - Testes de Integração do Módulo de Propostas Comerciais", () => {
  let testClientId: string;
  let testLeadId: string;
  let testOppId: string;
  let testService1Id: string;
  let testService2Id: string;
  let testService3Id: string;
  let testComboId: string;
  let testPipelineId: string;
  let testStageId: string;

  const testCnpj = "11.222.333/0003-43";
  const testLeadCnpj = "11.222.333/0004-24";

  beforeAll(async () => {
    // Limpeza prévia
    await query("DELETE FROM proposal_contract_conversions WHERE proposal_id IN (SELECT id FROM proposals WHERE title LIKE '%[TEST-PROP]%')");
    await query("DELETE FROM proposal_events WHERE proposal_id IN (SELECT id FROM proposals WHERE title LIKE '%[TEST-PROP]%')");
    await query("DELETE FROM proposal_items WHERE proposal_version_id IN (SELECT id FROM proposal_versions WHERE proposal_id IN (SELECT id FROM proposals WHERE title LIKE '%[TEST-PROP]%'))");
    await query("DELETE FROM proposal_versions WHERE proposal_id IN (SELECT id FROM proposals WHERE title LIKE '%[TEST-PROP]%')");
    await query("DELETE FROM proposals WHERE title LIKE '%[TEST-PROP]%'");

    await query("DELETE FROM contract_items WHERE contract_version_id IN (SELECT id FROM contract_versions WHERE contract_id IN (SELECT id FROM contracts WHERE client_id IN (SELECT id FROM clients WHERE name LIKE '%[TEST-PROP]%')))");
    await query("DELETE FROM contract_versions WHERE contract_id IN (SELECT id FROM contracts WHERE client_id IN (SELECT id FROM clients WHERE name LIKE '%[TEST-PROP]%'))");
    await query("DELETE FROM contracts WHERE client_id IN (SELECT id FROM clients WHERE name LIKE '%[TEST-PROP]%')");

    await query("DELETE FROM crm_opportunity_history WHERE opportunity_id IN (SELECT id FROM crm_opportunities WHERE title LIKE '%[TEST-PROP]%')");
    await query("DELETE FROM crm_opportunities WHERE title LIKE '%[TEST-PROP]%'");
    await query("DELETE FROM crm_pipeline_stages WHERE pipeline_id IN (SELECT id FROM crm_pipelines WHERE name LIKE '%[TEST-PROP]%')");
    await query("DELETE FROM crm_pipelines WHERE name LIKE '%[TEST-PROP]%'");
    await query("DELETE FROM crm_leads WHERE document = '11222333000424' OR name LIKE '%[TEST-PROP]%'");
    await query("DELETE FROM client_contacts WHERE client_id IN (SELECT id FROM clients WHERE document = '11222333000343' OR name LIKE '%[TEST-PROP]%')");
    await query("DELETE FROM clients WHERE document = '11222333000343' OR name LIKE '%[TEST-PROP]%'");

    await query("DELETE FROM contract_items WHERE service_id IN (SELECT id FROM services WHERE name LIKE '%[TEST-PROP]%')");
    await query("DELETE FROM combo_items WHERE combo_id IN (SELECT id FROM combos WHERE name LIKE '%[TEST-PROP]%')");
    await query("DELETE FROM combos WHERE name LIKE '%[TEST-PROP]%'");
    await query("DELETE FROM services WHERE name LIKE '%[TEST-PROP]%'");

    // Criar Cliente de Teste
    const cl = await createClient({
      type: "PJ",
      name: "[TEST-PROP] Cliente Alfa Corporativo",
      tradeName: "Alfa Corp",
      document: testCnpj,
      email: "financeiro@alfa.com.br",
    });
    testClientId = cl.id;

    // Criar Lead de Teste
    const ld = await CrmService.createLead({
      personType: "PJ",
      name: "[TEST-PROP] Lead Beta Inbound",
      tradeName: "Beta Solutions",
      document: testLeadCnpj,
      email: "contato@betasolutions.com",
      phone: "(11) 98888-7777",
      source: "Google Ads",
    });
    testLeadId = ld.id;

    // Criar Pipeline e Etapa
    const pl = await CrmService.createPipeline({
      name: "[TEST-PROP] Funil Comercial",
      isDefault: false,
    });
    testPipelineId = pl.id;

    const stg = await CrmService.createStage({
      pipelineId: testPipelineId,
      name: "[TEST-PROP] Proposta Enviada",
      color: "#6366f1",
      displayOrder: 1,
      winProbability: 50,
    });
    testStageId = stg.id;

    // Criar Oportunidade vinculada ao Lead
    const opp = await CrmService.createOpportunity({
      pipelineId: testPipelineId,
      stageId: testStageId,
      title: "[TEST-PROP] Oportunidade Expansão Digital",
      leadId: testLeadId,
      amount: 1500,
      billingPeriod: "MONTHLY",
    });
    testOppId = opp.id;

    // Criar Serviços no catálogo
    const s1 = await createService({
      name: "[TEST-PROP] Meta Ads Performance",
      description: "Gestão completa de campanhas Meta",
      defaultPrice: 800.0,
      defaultCost: 200.0,
      billingUnit: "MES",
    });
    testService1Id = s1.id;

    const s2 = await createService({
      name: "[TEST-PROP] Google Ads Search",
      description: "Gestão completa Google Ads",
      defaultPrice: 700.0,
      defaultCost: 150.0,
      billingUnit: "MES",
    });
    testService2Id = s2.id;

    const s3 = await createService({
      name: "[TEST-PROP] Taxa de Setup & Pixel",
      description: "Configuração técnica inicial",
      defaultPrice: 1000.0,
      defaultCost: 300.0,
      billingUnit: "PROJETO",
    });
    testService3Id = s3.id;

    // Criar Combo Comercial
    const cb = await createCombo({
      name: "[TEST-PROP] Combo Tráfego 360",
      description: "Meta + Google integrados",
      items: [
        { serviceId: testService1Id, componentPrice: 750.0 },
        { serviceId: testService2Id, componentPrice: 650.0 },
      ],
    });
    testComboId = cb.id;
  }, 60000);

  afterAll(async () => {
    // Limpeza final
    await query("DELETE FROM proposal_contract_conversions WHERE proposal_id IN (SELECT id FROM proposals WHERE title LIKE '%[TEST-PROP]%')");
    await query("DELETE FROM proposal_events WHERE proposal_id IN (SELECT id FROM proposals WHERE title LIKE '%[TEST-PROP]%')");
    await query("DELETE FROM proposal_items WHERE proposal_version_id IN (SELECT id FROM proposal_versions WHERE proposal_id IN (SELECT id FROM proposals WHERE title LIKE '%[TEST-PROP]%'))");
    await query("DELETE FROM proposal_versions WHERE proposal_id IN (SELECT id FROM proposals WHERE title LIKE '%[TEST-PROP]%')");
    await query("DELETE FROM proposals WHERE title LIKE '%[TEST-PROP]%'");

    await query("DELETE FROM contract_items WHERE contract_version_id IN (SELECT id FROM contract_versions WHERE contract_id IN (SELECT id FROM contracts WHERE client_id IN (SELECT id FROM clients WHERE name LIKE '%[TEST-PROP]%')))");
    await query("DELETE FROM contract_versions WHERE contract_id IN (SELECT id FROM contracts WHERE client_id IN (SELECT id FROM clients WHERE name LIKE '%[TEST-PROP]%'))");
    await query("DELETE FROM contracts WHERE client_id IN (SELECT id FROM clients WHERE name LIKE '%[TEST-PROP]%')");

    await query("DELETE FROM crm_opportunity_history WHERE opportunity_id IN (SELECT id FROM crm_opportunities WHERE title LIKE '%[TEST-PROP]%')");
    await query("DELETE FROM crm_opportunities WHERE title LIKE '%[TEST-PROP]%'");
    await query("DELETE FROM crm_pipeline_stages WHERE pipeline_id IN (SELECT id FROM crm_pipelines WHERE name LIKE '%[TEST-PROP]%') OR id = $1", [testStageId]);
    await query("DELETE FROM crm_pipelines WHERE name LIKE '%[TEST-PROP]%' OR id = $1", [testPipelineId]);
    await query("DELETE FROM crm_leads WHERE document = '11222333000424' OR name LIKE '%[TEST-PROP]%'");
    await query("DELETE FROM client_contacts WHERE client_id IN (SELECT id FROM clients WHERE document = '11222333000343' OR name LIKE '%[TEST-PROP]%')");
    await query("DELETE FROM clients WHERE document = '11222333000343' OR name LIKE '%[TEST-PROP]%'");

    await query("DELETE FROM contract_items WHERE service_id IN (SELECT id FROM services WHERE name LIKE '%[TEST-PROP]%')");
    await query("DELETE FROM combo_items WHERE combo_id IN (SELECT id FROM combos WHERE name LIKE '%[TEST-PROP]%')");
    await query("DELETE FROM combos WHERE name LIKE '%[TEST-PROP]%'");
    await query("DELETE FROM services WHERE name LIKE '%[TEST-PROP]%'");
  }, 60000);

  describe("Cenário A: Criação de Propostas com Código Sequencial", () => {
    it("cria proposta vinculada a Lead e gera código sequencial PROP-xxxxx", async () => {
      const prop = await ProposalService.createProposal({
        title: "[TEST-PROP] Proposta para Lead Beta",
        leadId: testLeadId,
        opportunityId: testOppId,
        validUntil: "2026-11-30",
        paymentTerms: "Faturamento mensal via PIX",
        startLeadTimeDays: 5,
        scopeDescription: "Escopo de testes automatizados",
        items: [
          {
            sourceType: "SERVICE",
            serviceId: testService1Id,
            descriptionSnapshot: "Meta Ads Performance",
            periodicity: "MONTHLY",
            quantity: 1,
            referenceUnitPrice: 800.0,
            negotiatedUnitPrice: 800.0,
            discountAmount: 0,
          },
        ],
      });

      expect(prop.id).toBeDefined();
      expect(prop.proposalCode).toMatch(/^PROP-\d{5}$/);
      expect(prop.status).toBe("DRAFT");
      expect(prop.currentVersionNumber).toBe(1);
      expect(prop.leadId).toBe(testLeadId);
      expect(prop.opportunityId).toBe(testOppId);

      // Verifica snapshot da versão 1
      expect(prop.currentVersion).toBeDefined();
      expect(prop.currentVersion?.totalMonthlyEffective).toBe(800.0);
      expect(prop.currentVersion?.items).toHaveLength(1);
    });

    it("cria proposta vinculada a Cliente cadastrado", async () => {
      const prop = await ProposalService.createProposal({
        title: "[TEST-PROP] Proposta para Cliente Alfa",
        clientId: testClientId,
        validUntil: "2026-12-15",
        items: [
          {
            sourceType: "SERVICE",
            serviceId: testService2Id,
            descriptionSnapshot: "Google Ads Search",
            periodicity: "MONTHLY",
            quantity: 1,
            referenceUnitPrice: 700.0,
            negotiatedUnitPrice: 650.0,
            discountAmount: 0,
          },
        ],
      });

      expect(prop.id).toBeDefined();
      expect(prop.clientId).toBe(testClientId);
      expect(prop.currentVersion?.totalMonthlyEffective).toBe(650.0);
    });
  });

  describe("Cenário B & C: Precificação Negociada, Descontos e Versionamento Imutável", () => {
    let proposalId: string;

    it("cria proposta com Meta Ads (R$ 800) + Google Ads (R$ 700) e desconto global rateado para R$ 1.200", async () => {
      const prop = await ProposalService.createProposal({
        title: "[TEST-PROP] Proposta de Tráfego Integrado",
        clientId: testClientId,
        validUntil: "2026-11-20",
        globalDiscount: 300.0, // 800 + 700 = 1500 - 300 = 1200
        items: [
          {
            sourceType: "SERVICE",
            serviceId: testService1Id,
            descriptionSnapshot: "Meta Ads Performance",
            periodicity: "MONTHLY",
            quantity: 1,
            referenceUnitPrice: 800.0,
            negotiatedUnitPrice: 800.0,
            discountAmount: 0,
          },
          {
            sourceType: "SERVICE",
            serviceId: testService2Id,
            descriptionSnapshot: "Google Ads Search",
            periodicity: "MONTHLY",
            quantity: 1,
            referenceUnitPrice: 700.0,
            negotiatedUnitPrice: 700.0,
            discountAmount: 0,
          },
          {
            sourceType: "SERVICE",
            serviceId: testService3Id,
            descriptionSnapshot: "Taxa de Setup Inicial",
            periodicity: "ONE_TIME",
            quantity: 1,
            referenceUnitPrice: 1000.0,
            negotiatedUnitPrice: 800.0,
            discountAmount: 0,
          },
        ],
      });

      proposalId = prop.id;
      expect(prop.currentVersionNumber).toBe(1);

      const v1 = prop.currentVersion!;
      // Total mensal rateado
      expect(v1.totalMonthlyEffective).toBeLessThan(1500.0);
      expect(v1.totalOneTimeEffective).toBeLessThan(1000.0);

      // Soma exata
      const sumItems = v1.items.reduce((acc, it) => acc + it.totalAmount, 0);
      const expectedTotal = 1500.0 + 800.0 - 300.0; // 2000.0
      expect(Number(sumItems.toFixed(2))).toBe(expectedTotal);
    });

    it("envia proposta alterando status para SENT", async () => {
      const sentProp = await ProposalService.sendProposal(proposalId, { name: "Diretor Comercial" });
      expect(sentProp.status).toBe("SENT");
    });

    it("cria nova versão (v2) para renegociação preservando a v1 íntegra", async () => {
      // Cliente solicita ajuste no setup e acréscimo de desconto
      const v2 = await ProposalService.createProposalVersion({
        proposalId,
        title: "[TEST-PROP] Proposta de Tráfego Integrado - Rev.2",
        globalDiscount: 400.0,
        items: [
          {
            sourceType: "SERVICE",
            serviceId: testService1Id,
            descriptionSnapshot: "Meta Ads Performance",
            periodicity: "MONTHLY",
            quantity: 1,
            referenceUnitPrice: 800.0,
            negotiatedUnitPrice: 750.0,
            discountAmount: 0,
          },
          {
            sourceType: "SERVICE",
            serviceId: testService2Id,
            descriptionSnapshot: "Google Ads Search",
            periodicity: "MONTHLY",
            quantity: 1,
            referenceUnitPrice: 700.0,
            negotiatedUnitPrice: 650.0,
            discountAmount: 0,
          },
          {
            sourceType: "SERVICE",
            serviceId: testService3Id,
            descriptionSnapshot: "Taxa de Setup Inicial (Bonificada)",
            periodicity: "ONE_TIME",
            quantity: 1,
            referenceUnitPrice: 1000.0,
            negotiatedUnitPrice: 500.0,
            discountAmount: 0,
          },
        ],
      });

      expect(v2.versionNumber).toBe(2);

      // Carrega a proposta completa e verifica integridade de ambas as versões
      const refreshed = await ProposalService.getProposalById(proposalId);
      expect(refreshed?.currentVersionNumber).toBe(2);
      expect(refreshed?.versions).toHaveLength(2);

      const v1Stored = refreshed?.versions?.find((v) => v.versionNumber === 1);
      const v2Stored = refreshed?.versions?.find((v) => v.versionNumber === 2);

      expect(v1Stored).toBeDefined();
      expect(v2Stored).toBeDefined();
      expect(v1Stored?.id).not.toBe(v2Stored?.id);
    });

    it("aprova manualmente a versão 2 congelando o snapshot", async () => {
      const approved = await ProposalService.approveProposal(proposalId, {
        approvedVersionNumber: 2,
        approvalNotes: "Aprovado via alinhamento em call pelo diretor.",
        actorName: "Administrador Único",
      });

      expect(approved.status).toBe("APPROVED");
      expect(approved.approvedVersionNumber).toBe(2);
      expect(approved.approvedAt).toBeDefined();
      expect(approved.approvalNotes).toContain("Aprovado via alinhamento");

      // A aprovação manual NÃO deve gerar contrato automaticamente
      expect(approved.contractId).toBeNull();
    });

    it("impede alteração ou aprovação de versão já cancelada ou rejeitada", async () => {
      // Cria uma proposta para teste de cancelamento
      const dummy = await ProposalService.createProposal({
        title: "[TEST-PROP] Proposta para Cancelamento",
        clientId: testClientId,
        validUntil: "2026-11-15",
        items: [
          {
            sourceType: "SERVICE",
            serviceId: testService1Id,
            descriptionSnapshot: "Serviço",
            periodicity: "MONTHLY",
            quantity: 1,
            referenceUnitPrice: 500,
            negotiatedUnitPrice: 500,
            discountAmount: 0,
          },
        ],
      });

      await ProposalService.cancelProposal(dummy.id, { reason: "Desistência do cliente" });

      // Tentar aprovar proposta cancelada deve falhar
      await expect(
        ProposalService.approveProposal(dummy.id, { approvedVersionNumber: 1 })
      ).rejects.toThrow();
    });
  });

  describe("Cenário E: Conversão em Contrato com Idempotência e Conversão de Lead", () => {
    let leadProposalId: string;

    it("cria e aprova proposta para o Lead de teste com itens avulsos e mensais", async () => {
      const prop = await ProposalService.createProposal({
        title: "[TEST-PROP] Proposta Mista para Lead Beta",
        leadId: testLeadId,
        opportunityId: testOppId,
        validUntil: "2026-12-31",
        items: [
          {
            sourceType: "SERVICE",
            serviceId: testService1Id,
            descriptionSnapshot: "Meta Ads Recorrente",
            periodicity: "MONTHLY",
            quantity: 1,
            referenceUnitPrice: 800.0,
            negotiatedUnitPrice: 800.0,
            discountAmount: 0,
          },
          {
            sourceType: "SERVICE",
            serviceId: testService3Id,
            descriptionSnapshot: "Setup Avulso de Entrada",
            periodicity: "ONE_TIME",
            quantity: 1,
            referenceUnitPrice: 1000.0,
            negotiatedUnitPrice: 900.0,
            discountAmount: 0,
          },
        ],
      });

      leadProposalId = prop.id;

      // Aprova
      await ProposalService.approveProposal(leadProposalId, {
        approvedVersionNumber: 1,
        approvalNotes: "Aceite formalizado",
      });
    });

    it("converte proposta mista em contratos segregados por periodicidade e converte Lead em Cliente", async () => {
      const idempotencyKey = `conv_test_${leadProposalId}_v1`;

      const result = await ProposalService.convertToContract(leadProposalId, {
        idempotencyKey,
        dueDay: 10,
        startDate: "2026-11-01",
        actorName: "Administrador ERP",
      });

      expect(result.convertedClientId).toBeDefined();
      expect(result.contracts).toHaveLength(2); // 1 ONE_TIME + 1 MONTHLY

      // Verifica contratos criados
      const monthlyContract = result.contracts.find((c) => c.currentVersion?.billingPeriod === "MONTHLY");
      const oneTimeContract = result.contracts.find((c) => c.currentVersion?.billingPeriod === "ONE_TIME");

      expect(monthlyContract).toBeDefined();
      expect(oneTimeContract).toBeDefined();
      expect(monthlyContract?.currentVersion?.totalAmount).toBe(800.0);
      expect(oneTimeContract?.currentVersion?.totalAmount).toBe(900.0);

      // Verifica se o Lead foi convertido para status CONVERTED no CRM
      const leadCheck = await query<{ status: string; converted_client_id: string }>(
        "SELECT status, converted_client_id FROM crm_leads WHERE id = $1",
        [testLeadId]
      );
      expect(leadCheck.rows[0].status).toBe("CONVERTED");
      expect(leadCheck.rows[0].converted_client_id).toBe(result.convertedClientId);

      // Verifica se a Oportunidade vinculada foi marcada como WON
      const oppCheck = await query<{ status: string; contract_id: string }>(
        "SELECT status, contract_id FROM crm_opportunities WHERE id = $1",
        [testOppId]
      );
      expect(oppCheck.rows[0].status).toBe("WON");
    });

    it("reexecuta a conversão com a mesma chave de idempotência e retorna os mesmos contratos sem duplicação", async () => {
      const idempotencyKey = `conv_test_${leadProposalId}_v1`;

      const resultSecondCall = await ProposalService.convertToContract(leadProposalId, {
        idempotencyKey,
        dueDay: 10,
        startDate: "2026-11-01",
      });

      // Deve retornar os mesmos 2 contratos sem criar novos registros
      expect(resultSecondCall.contracts).toHaveLength(2);

      // Verifica se a tabela contracts não sofreu duplicação para esta proposta
      const contractsCount = await query<{ count: string }>(
        "SELECT count(*) as count FROM contracts WHERE proposal_id = $1",
        [leadProposalId]
      );
      expect(parseInt(contractsCount.rows[0].count, 10)).toBe(2);
    });
  });

  describe("Cenário F & G: Documento PDF Oficial e Proteção RLS", () => {
    it("gera buffer do PDF da proposta com integridade", async () => {
      const prop = await ProposalService.getProposalById(testLeadId ? (await query<{ id: string }>("SELECT id FROM proposals WHERE title LIKE '%[TEST-PROP]%' LIMIT 1")).rows[0].id : "");
      expect(prop).toBeDefined();

      if (prop && prop.currentVersion) {
        const pdf = await generateProposalPdf(prop, prop.currentVersion);
        expect(pdf).toBeDefined();
        expect(pdf.length).toBeGreaterThan(1000);
      }
    });

    it("confirma que as tabelas de propostas possuem RLS habilitado", async () => {
      const rlsCheck = await query<{ tablename: string; rowsecurity: boolean }>(
        `SELECT tablename, rowsecurity FROM pg_tables 
         WHERE schemaname = 'public' 
         AND tablename IN ('proposals', 'proposal_versions', 'proposal_items', 'proposal_events', 'proposal_contract_conversions')`
      );

      expect(rlsCheck.rows.length).toBe(5);
      rlsCheck.rows.forEach((row) => {
        expect(row.rowsecurity).toBe(true);
      });
    });
  });

  describe("Cenário H: Métricas e KPIs Comerciais para Dashboard", () => {
    it("retorna métricas executivas sem erros e com indicadores consolidados", async () => {
      const metrics = await ProposalService.getProposalMetrics();

      expect(metrics.totalProposals).toBeGreaterThanOrEqual(1);
      expect(metrics.totalApproved).toBeGreaterThanOrEqual(1);
      expect(metrics.approvalRate).toBeGreaterThanOrEqual(0);
      expect(metrics.totalApprovedMonthly).toBeGreaterThanOrEqual(0);
      expect(metrics.totalApprovedOneTime).toBeGreaterThanOrEqual(0);
    });
  });
});
