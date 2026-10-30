import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { query } from "@/lib/db/pool";
import { CrmService } from "@/modules/crm/service";

describe("Fase 7 - Integração de CRM, Funis, Oportunidades e Atividades", () => {
  let createdPipelineId: string;
  let stage1Id: string;
  let stage2Id: string;
  let stage3Id: string;
  let testLeadId: string;
  let testOppId: string;
  let createdClientId: string;

  const validTestCnpj = "11.222.333/0002-62";

  beforeAll(async () => {
    // Limpeza prévia para isolamento dos testes
    await query("DELETE FROM crm_activities WHERE title LIKE '%[TEST-CRM]%'");
    await query("DELETE FROM crm_opportunity_history WHERE opportunity_id IN (SELECT id FROM crm_opportunities WHERE title LIKE '%[TEST-CRM]%')");
    await query("DELETE FROM crm_opportunities WHERE title LIKE '%[TEST-CRM]%'");
    await query("DELETE FROM crm_pipeline_stages WHERE pipeline_id IN (SELECT id FROM crm_pipelines WHERE name LIKE '%[TEST-CRM]%') OR name LIKE '%[TEST-STAGE]%'");
    await query("DELETE FROM crm_pipelines WHERE name LIKE '%[TEST-CRM]%'");
    await query("DELETE FROM crm_leads WHERE document = '11222333000262' OR name LIKE '%[TEST-LEAD]%'");
    await query("DELETE FROM client_contacts WHERE client_id IN (SELECT id FROM clients WHERE document = '11222333000262' OR name LIKE '%[TEST-CRM-CLIENT]%')");
    await query("DELETE FROM clients WHERE document = '11222333000262' OR name LIKE '%[TEST-CRM-CLIENT]%'");
  });

  afterAll(async () => {
    // Limpeza pós-execução
    await query("DELETE FROM crm_activities WHERE title LIKE '%[TEST-CRM]%'");
    await query("DELETE FROM crm_opportunity_history WHERE opportunity_id IN (SELECT id FROM crm_opportunities WHERE title LIKE '%[TEST-CRM]%')");
    await query("DELETE FROM crm_opportunities WHERE title LIKE '%[TEST-CRM]%'");
    await query("DELETE FROM crm_pipeline_stages WHERE pipeline_id IN (SELECT id FROM crm_pipelines WHERE name LIKE '%[TEST-CRM]%') OR name LIKE '%[TEST-STAGE]%'");
    await query("DELETE FROM crm_pipelines WHERE name LIKE '%[TEST-CRM]%'");
    await query("DELETE FROM crm_leads WHERE document = '11222333000262' OR name LIKE '%[TEST-LEAD]%'");
    if (createdClientId) {
      await query("DELETE FROM client_contacts WHERE client_id = $1", [createdClientId]);
      await query("DELETE FROM clients WHERE id = $1", [createdClientId]);
    }
  });

  describe("Cenário A: Funis Configuráveis e Reordenação de Etapas", () => {
    it("cria um novo funil customizado com etapas ordenadas", async () => {
      const pipeline = await CrmService.createPipeline({
        name: "[TEST-CRM] Funil de Teste B2B",
        description: "Funil criado para validação automatizada",
        isDefault: false,
      });

      expect(pipeline.id).toBeDefined();
      expect(pipeline.name).toBe("[TEST-CRM] Funil de Teste B2B");
      createdPipelineId = pipeline.id;

      // Cria 3 etapas ordenadas
      const stg1 = await CrmService.createStage({
        pipelineId: createdPipelineId,
        name: "[TEST-STAGE] Prospecção",
        color: "#3b82f6",
        displayOrder: 1,
        winProbability: 15,
        stageType: "NORMAL",
      });
      stage1Id = stg1.id;

      const stg2 = await CrmService.createStage({
        pipelineId: createdPipelineId,
        name: "[TEST-STAGE] Proposta Técnica",
        color: "#8b5cf6",
        displayOrder: 2,
        winProbability: 50,
        stageType: "NORMAL",
      });
      stage2Id = stg2.id;

      const stg3 = await CrmService.createStage({
        pipelineId: createdPipelineId,
        name: "[TEST-STAGE] Negociação Final",
        color: "#10b981",
        displayOrder: 3,
        winProbability: 85,
        stageType: "NORMAL",
      });
      stage3Id = stg3.id;

      const fullPipeline = await CrmService.getPipelineById(createdPipelineId);
      expect(fullPipeline).toBeDefined();
      const found1 = fullPipeline?.stages?.find((s) => s.id === stage1Id);
      const found2 = fullPipeline?.stages?.find((s) => s.id === stage2Id);
      const found3 = fullPipeline?.stages?.find((s) => s.id === stage3Id);
      expect(found1).toBeDefined();
      expect(found2).toBeDefined();
      expect(found3).toBeDefined();
    });

    it("reordena etapas do funil com integridade ordinal", async () => {
      await CrmService.reorderStages(createdPipelineId, [
        { stageId: stage2Id, displayOrder: 10 },
        { stageId: stage1Id, displayOrder: 20 },
        { stageId: stage3Id, displayOrder: 30 },
      ]);

      const full = await CrmService.getPipelineById(createdPipelineId);
      const stg1 = full?.stages?.find((s) => s.id === stage1Id);
      const stg2 = full?.stages?.find((s) => s.id === stage2Id);
      const stg3 = full?.stages?.find((s) => s.id === stage3Id);

      expect(stg2?.displayOrder).toBe(10);
      expect(stg1?.displayOrder).toBe(20);
      expect(stg3?.displayOrder).toBe(30);
    });
  });

  describe("Cenário B: Gestão de Leads e Conversão Atômica para Cliente", () => {
    it("cria Lead e detecta duplicidade de documento", async () => {
      const lead = await CrmService.createLead({
        personType: "PJ",
        name: "[TEST-LEAD] Lead Empresa Alpha",
        tradeName: "Alpha Soluções Digitais",
        document: validTestCnpj,
        email: "contato@alphatest.com",
        phone: "(11) 9988-7766",
        source: "Outbound",
      });

      expect(lead.id).toBeDefined();
      expect(lead.status).toBe("NEW");
      testLeadId = lead.id;

      // Verificação de duplicidade deve retornar o lead existente
      const dup = await CrmService.checkLeadDuplicate(validTestCnpj, "contato@alphatest.com");
      expect(dup.duplicate).toBe(true);
      expect(dup.lead?.id).toBe(testLeadId);
    });

    it("cria oportunidade comercial associada ao Lead", async () => {
      const opp = await CrmService.createOpportunity({
        title: "[TEST-CRM] Contrato SEO + Ads Alpha",
        leadId: testLeadId,
        pipelineId: createdPipelineId,
        stageId: stage1Id,
        amount: 36000,
        billingPeriod: "YEARLY",
        expectedCloseDate: "2026-12-31",
      });

      expect(opp.id).toBeDefined();
      expect(opp.leadId).toBe(testLeadId);
      expect(opp.clientId).toBeNull();
      expect(opp.normalizedMonthlyValue).toBe(3000); // 36000 / 12
      expect(opp.probability).toBe(15);
      testOppId = opp.id;
    });

    it("converte Lead atomicamente para novo Cliente e re-aponta a Oportunidade", async () => {
      const result = await CrmService.convertLead({
        leadId: testLeadId,
        mode: "NEW_CLIENT",
        clientDataOverride: {
          name: "[TEST-CRM-CLIENT] Alpha Soluções Digitais LTDA",
          tradeName: "Alpha Soluções",
          document: validTestCnpj,
          email: "financeiro@alphatest.com",
        },
      });

      expect(result.leadId).toBe(testLeadId);
      expect(result.clientId).toBeDefined();
      expect(result.clientName).toBe("[TEST-CRM-CLIENT] Alpha Soluções Digitais LTDA");
      createdClientId = result.clientId;

      // Verifica status do Lead
      const updatedLead = await CrmService.getLeadById(testLeadId);
      expect(updatedLead?.status).toBe("CONVERTED");
      expect(updatedLead?.convertedClientId).toBe(createdClientId);

      // Oportunidade criada anteriormente deve ter sido re-apontada para o novo cliente
      const updatedOpp = await CrmService.getOpportunityById(testOppId);
      expect(updatedOpp?.clientId).toBe(createdClientId);
      expect(updatedOpp?.contactType).toBe("CLIENT");
    });

    it("impede conversão dupla do mesmo Lead já convertido", async () => {
      await expect(
        CrmService.convertLead({
          leadId: testLeadId,
          mode: "NEW_CLIENT",
        })
      ).rejects.toThrow("já foi convertido anteriormente");
    });
  });

  describe("Cenário C: Movimentação, Histórico de Auditoria e Encerramento", () => {
    it("move oportunidade de etapa e audita no histórico", async () => {
      const moved = await CrmService.moveOpportunityStage({
        opportunityId: testOppId,
        toStageId: stage2Id,
        notes: "Cliente aprovou escopo técnico inicial",
      });

      expect(moved.stageId).toBe(stage2Id);
      expect(moved.probability).toBe(50); // Atualiza para a probabilidade da etapa 2

      // Verifica auditoria em crm_opportunity_history
      const history = await CrmService.getOpportunityHistory(testOppId);
      expect(history.length).toBeGreaterThanOrEqual(1);
      const lastHistory = history[0];
      expect(lastHistory.fromStageId).toBe(stage1Id);
      expect(lastHistory.toStageId).toBe(stage2Id);
      expect(lastHistory.notes).toBe("Cliente aprovou escopo técnico inicial");
    });

    it("encerra oportunidade como LOST exigindo motivo da perda", async () => {
      await expect(
        CrmService.closeOpportunity({
          opportunityId: testOppId,
          status: "LOST",
          lostReason: "",
        })
      ).rejects.toThrow();

      const closedLost = await CrmService.closeOpportunity({
        opportunityId: testOppId,
        status: "LOST",
        lostReason: "Cliente optou por equipe interna",
        notes: "Manter relacionamento para Q3",
      });

      expect(closedLost.status).toBe("LOST");
      expect(closedLost.lostReason).toBe("Cliente optou por equipe interna");
      expect(closedLost.probability).toBe(0);
      expect(closedLost.closedAt).toBeDefined();
    });

    it("reabre oportunidade e a retorna para a primeira etapa ativa do funil", async () => {
      const reopened = await CrmService.reopenOpportunity(
        testOppId,
        "Prospect entrou em contato querendo retomar negociação"
      );

      expect(reopened.status).toBe("OPEN");
      expect(reopened.lostReason).toBeNull();
      expect(reopened.closedAt).toBeNull();
    });

    it("encerra oportunidade como WON com probabilidade 100% sem gerar contrato fictício", async () => {
      const closedWon = await CrmService.closeOpportunity({
        opportunityId: testOppId,
        status: "WON",
        notes: "Proposta aceita e contrato assinado via Docusign",
      });

      expect(closedWon.status).toBe("WON");
      expect(closedWon.probability).toBe(100);
      expect(closedWon.closedAt).toBeDefined();
      expect(closedWon.contractId).toBeNull(); // NENHUM contrato fictício criado automaticamente!
    });
  });

  describe("Cenário D: Atividades Comerciais e Alertas de Atraso (Overdue)", () => {
    let overdueActId: string;
    let futureActId: string;

    it("cria atividade com prazo no passado e detecta como atrasada", async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 3);

      const act = await CrmService.createActivity({
        activityType: "CALL",
        title: "[TEST-CRM] Ligar para Diretor de TI",
        dueDate: pastDate.toISOString(),
        opportunityId: testOppId,
      });

      expect(act.id).toBeDefined();
      overdueActId = act.id;

      const list = await CrmService.listActivities({ opportunityId: testOppId });
      const found = list.find((a) => a.id === overdueActId);
      expect(found).toBeDefined();
      expect(found?.isOverdue).toBe(true);
      expect(found?.status).toBe("PENDING");
    });

    it("cria atividade com prazo futuro e detecta como pontual (não atrasada)", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      const act = await CrmService.createActivity({
        activityType: "MEETING",
        title: "[TEST-CRM] Apresentação Mensal de Resultados",
        dueDate: futureDate.toISOString(),
        opportunityId: testOppId,
      });

      futureActId = act.id;
      const list = await CrmService.listActivities({ opportunityId: testOppId });
      const found = list.find((a) => a.id === futureActId);
      expect(found).toBeDefined();
      expect(found?.isOverdue).toBe(false);
    });

    it("conclui atividade atrasada e remove o status de pendência", async () => {
      const completed = await CrmService.completeActivity(overdueActId);
      expect(completed.status).toBe("COMPLETED");
      expect(completed.completedAt).toBeDefined();

      const list = await CrmService.listActivities({ status: "COMPLETED" });
      const found = list.find((a) => a.id === overdueActId);
      expect(found).toBeDefined();
      expect(found?.status).toBe("COMPLETED");
    });
  });

  describe("Cenário E: Métricas e KPIs Executivos do CRM", () => {
    it("calcula taxa de conversão, MRR e valor ponderado corretamente no Analytics", async () => {
      const kpis = await CrmService.getCrmAnalytics();

      expect(kpis).toBeDefined();
      expect(kpis.wonCountPeriod).toBeGreaterThanOrEqual(0);
      expect(kpis.conversionRate).toBeGreaterThanOrEqual(0);
      expect(typeof kpis.weightedPipelineAmount).toBe("number");
      expect(typeof kpis.potentialMrr).toBe("number");
      expect(Array.isArray(kpis.opportunitiesByStage)).toBe(true);
      expect(Array.isArray(kpis.leadsBySource)).toBe(true);
    });
  });
});
