import { configureBilling, getBillingPlan } from "@/modules/contracts/journey-service";
import { describe, it, expect } from "vitest";
import { query } from "@/lib/db/pool";
import { CrmService } from "@/modules/crm/service";
import { ProposalService } from "@/modules/proposals/service";
import { generateProposalPdf } from "@/modules/proposals/pdf";
import { DocumentService } from "@/modules/documents/service";
import {
  saveContractRecurrenceSettings,
  generateRecurringProjectForContract,
  getProjectById,
} from "@/modules/projects/service";
import {
  createFinancialAccount,
  getReceivableById,
  settleReceivable,
  createPayable,
} from "@/modules/financial/service";
import {
  getCostCenters,
  allocatePayableCostCenters,
  getPayableAllocations,
  getDREStatementForMonth,
} from "@/modules/financial/dre/service";

describe("Fase 12 - Jornada Integrada de Aceite E2E", () => {
  it("deve executar a jornada completa de ponta a ponta (Passos 1 ao 8) com integridade total", async () => {
    const suffix = Date.now().toString().slice(-6);

    // =========================================================================
    // PASSO 1: CRM - Criar Lead e Oportunidade
    // =========================================================================
    // Criar pipeline e estágio se necessário
    const pipeRes = await query<{ id: string }>(
      `SELECT id FROM crm_pipelines WHERE status = 'ACTIVE' ORDER BY created_at ASC LIMIT 1`
    );
    let pipelineId: string;
    if (pipeRes.rows.length === 0) {
      const newPipe = await query<{ id: string }>(
        `INSERT INTO crm_pipelines (name, description, status) VALUES ('Funil Padrão E2E', 'Teste E2E', 'ACTIVE') RETURNING id`
      );
      pipelineId = newPipe.rows[0].id;
    } else {
      pipelineId = pipeRes.rows[0].id;
    }

    const stageRes = await query<{ id: string }>(
      `SELECT id FROM crm_pipeline_stages WHERE pipeline_id = $1 ORDER BY display_order ASC LIMIT 1`,
      [pipelineId]
    );
    let stageId: string;
    if (stageRes.rows.length === 0) {
      const newStg = await query<{ id: string }>(
        `INSERT INTO crm_pipeline_stages (pipeline_id, name, stage_type, display_order) VALUES ($1, 'Qualificação E2E', 'NORMAL', 1) RETURNING id`,
        [pipelineId]
      );
      stageId = newStg.rows[0].id;
    } else {
      stageId = stageRes.rows[0].id;
    }

    // Criar Lead "Empresa Alfa"
    const leadRes = await query<{ id: string }>(
      `INSERT INTO crm_leads (
        lead_code, person_type, name, trade_name, email, phone, status, source, notes
      ) VALUES ($1, 'PJ', $2, $2, $3, $4, 'QUALIFIED', 'OUTBOUND', 'Lead sintético para aceite E2E')
      RETURNING id`,
      [
        `LEAD-E2E-${suffix}`,
        `Empresa Alfa ${suffix}`,
        `contato@alfa${suffix}.com`,
        "11988887777",
      ]
    );
    const leadId = leadRes.rows[0].id;

    // Criar Oportunidade "Gestão de Tráfego Pago" R$ 1.000,00
    const oppRes = await query<{ id: string }>(
      `INSERT INTO crm_opportunities (
        opportunity_code, title, lead_id, pipeline_id, stage_id, amount, billing_period, normalized_monthly_value, status, probability
      ) VALUES ($1, $2, $3, $4, $5, 1000.00, 'MONTHLY', 1000.00, 'OPEN', 80)
      RETURNING id`,
      [
        `OPP-E2E-${suffix}`,
        `Gestão de Tráfego Pago ${suffix}`,
        leadId,
        pipelineId,
        stageId,
      ]
    );
    const opportunityId = oppRes.rows[0].id;

    expect(leadId).toBeDefined();
    expect(opportunityId).toBeDefined();

    // =========================================================================
    // PASSO 2: PROPOSTA COMERCIAL - Criação, PDF, Envio e Aprovação
    // =========================================================================
    // Buscar ou criar serviços para a proposta (Meta Ads R$ 600, Google Ads R$ 400)
    let metaSvcId: string;
    let googleSvcId: string;

    const svcMetaRes = await query<{ id: string }>(
      `SELECT id FROM services WHERE name ILIKE '%Meta%' LIMIT 1`
    );
    if (svcMetaRes.rows.length > 0) {
      metaSvcId = svcMetaRes.rows[0].id;
    } else {
      const insMeta = await query<{ id: string }>(
        `INSERT INTO services (name, description, default_price, billing_unit, status)
         VALUES ('Gestão de Meta Ads', 'Campanhas Facebook e Instagram', 600.00, 'MES', 'ACTIVE') RETURNING id`
      );
      metaSvcId = insMeta.rows[0].id;
    }

    const svcGoogleRes = await query<{ id: string }>(
      `SELECT id FROM services WHERE name ILIKE '%Google%' LIMIT 1`
    );
    if (svcGoogleRes.rows.length > 0) {
      googleSvcId = svcGoogleRes.rows[0].id;
    } else {
      const insGoogle = await query<{ id: string }>(
        `INSERT INTO services (name, description, default_price, billing_unit, status)
         VALUES ('Gestão de Google Ads', 'Campanhas de Pesquisa e Display', 400.00, 'MES', 'ACTIVE') RETURNING id`
      );
      googleSvcId = insGoogle.rows[0].id;
    }

    const createdProposal = await ProposalService.createProposal({
      title: `Proposta Gestão de Tráfego - Empresa Alfa ${suffix}`,
      leadId,
      opportunityId,
      validUntil: "2027-12-31",
      paymentTerms: "Mensal com vencimento no dia 10",
      items: [
        {
          sourceType: "SERVICE",
          serviceId: metaSvcId,
          serviceName: "Gestão de Meta Ads",
          periodicity: "MONTHLY",
          quantity: 1,
          referenceUnitPrice: 600.0,
          negotiatedUnitPrice: 600.0,
          displayOrder: 1,
        },
        {
          sourceType: "SERVICE",
          serviceId: googleSvcId,
          serviceName: "Gestão de Google Ads",
          periodicity: "MONTHLY",
          quantity: 1,
          referenceUnitPrice: 400.0,
          negotiatedUnitPrice: 400.0,
          displayOrder: 2,
        },
      ],
      actorName: "Administrador E2E",
    });

    expect(createdProposal.id).toBeDefined();
    expect(createdProposal.status).toBe("DRAFT");
    expect(createdProposal.currentVersion?.totalMonthlyEffective).toBe(1000.0);

    // Gerar PDF da Proposta
    const pdfBuffer = await generateProposalPdf(createdProposal);
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(100);

    // Marcar Proposta como Enviada
    const sentProposal = await ProposalService.sendProposal(createdProposal.id, {
      name: "Administrador E2E",
    });
    expect(sentProposal.status).toBe("SENT");

    // Aprovar Versão 1 Manualmente
    const approvedProposal = await ProposalService.approveProposal(createdProposal.id, {
      approvedVersionNumber: 1,
      actorName: "Diretoria Alfa E2E",
      approvalNotes: "Aprovado sem ressalvas pelo comitê",
    });
    expect(approvedProposal.status).toBe("APPROVED");
    expect(approvedProposal.approvedVersionNumber).toBe(1);

    // =========================================================================
    // PASSO 3: CLIENTE E CONTRATO - Conversão com Garantia de Idempotência
    // =========================================================================
    // 1. Converter Lead em Cliente
    const convertedClient = await CrmService.convertLeadToClient({
      leadId,
      mode: "NEW_CLIENT",
      clientDataOverride: {
        document: `88${suffix}000199`.slice(0, 14),
      },
    });
    expect(convertedClient.clientId).toBeDefined();

    // 2. Converter Proposta Aprovada em Contrato
    const idempotencyKey = `CONV-E2E-${createdProposal.id}-v1`;
    const conversionResult = await ProposalService.convertToContract(createdProposal.id, {
      idempotencyKey,
      startDate: "2027-02-01",
      dueDay: 10,
    });

    expect(conversionResult.contracts.length).toBeGreaterThanOrEqual(1);
    const contract = conversionResult.contracts[0];
    expect(contract.id).toBeDefined();
    const paymentPlan = await getBillingPlan(contract.id);
    await configureBilling(contract.id, { groupSamePeriod: true, items: paymentPlan.map(i=>({itemId:i.id,firstDueDate:"2027-02-10",installments:1})) });

    // 3. Teste de Idempotência: Repetir a conversão com a mesma chave
    const repeatConversion = await ProposalService.convertToContract(createdProposal.id, {
      idempotencyKey,
      startDate: "2027-02-01",
      dueDay: 10,
    });
    expect(repeatConversion.contracts.length).toBe(conversionResult.contracts.length);
    expect(repeatConversion.contracts[0].id).toBe(contract.id);

    // =========================================================================
    // PASSO 4: DOCUMENTOS - Gestão Documental Integrada (Fase 9)
    // =========================================================================
    // Registrar o PDF da proposta no repositório documental (Fase 9.5)
    const docProp = await DocumentService.attachProposalPdf(
      createdProposal.id,
      1,
      createdProposal.proposalCode,
      pdfBuffer,
      { name: "Administrador E2E" }
    );
    expect(docProp.id).toBeDefined();

    // Vincular também ao Cliente e ao Contrato
    await DocumentService.linkDocument({
      documentId: docProp.id,
      entityType: "CLIENT",
      entityId: convertedClient.clientId,
      linkType: "ATTACHMENT",
    });

    await DocumentService.linkDocument({
      documentId: docProp.id,
      entityType: "CONTRACT",
      entityId: contract.id,
      linkType: "ORIGIN_PROPOSAL",
    });

    // Consultar vínculos
    const clientDocs = await DocumentService.getDocumentsForEntity("CLIENT", convertedClient.clientId);
    expect(clientDocs.length).toBeGreaterThanOrEqual(1);
    expect(clientDocs[0].id).toBe(docProp.id);

    const contractDocs = await DocumentService.getDocumentsForEntity("CONTRACT", contract.id);
    expect(contractDocs.length).toBeGreaterThanOrEqual(1);
    expect(contractDocs[0].id).toBe(docProp.id);

    // =========================================================================
    // PASSO 5: PROJETOS - Recorrência e Idempotência Operacional (Fase 11)
    // =========================================================================
    const templatesRes = await query<{ id: string }>(
      `SELECT id FROM project_templates WHERE code = 'TMPL-TRAFEGO' LIMIT 1`
    );
    expect(templatesRes.rows.length).toBe(1);
    const templateId = templatesRes.rows[0].id;

    // Configurar automação recorrente no Contrato
    const recurrenceConfig = await saveContractRecurrenceSettings({
      contractId: contract.id,
      isEnabled: true,
      templateId,
      periodicity: "MONTHLY",
      startDay: 1,
      durationDays: 30,
      startDate: "2027-02-01",
    });
    expect(recurrenceConfig.isEnabled).toBe(true);

    // Gerar Projeto da Competência 2027-02
    const genResult1 = await generateRecurringProjectForContract({
      contractId: contract.id,
      competency: "2027-02",
    });
    expect(genResult1.status).toBe("CREATED");
    expect(genResult1.project.id).toBeDefined();

    // Verificar se o projeto clonou as etapas do template
    const fullProject = await getProjectById(genResult1.project.id);
    expect(fullProject?.stages?.length).toBeGreaterThanOrEqual(3);
    expect(fullProject?.tasks?.length).toBeGreaterThanOrEqual(3);

    // Teste de Idempotência: re-executar para a mesma competência
    const genResult2 = await generateRecurringProjectForContract({
      contractId: contract.id,
      competency: "2027-02",
    });
    expect(genResult2.status).toBe("ALREADY_EXISTS");
    expect(genResult2.project.id).toBe(genResult1.project.id);

    // =========================================================================
    // PASSO 6: FINANCEIRO - Títulos, Liquidação e Centros de Custo (Fase 10)
    // =========================================================================
    // Criar conta bancária para o fluxo financeiro
    const bankAccount = await createFinancialAccount({
      name: `Banco Itaú E2E ${suffix}`,
      accountType: "CHECKING",
      initialBalance: 5000.0,
    });

    // 1. Gerar Título a Receber correspondente ao contrato (R$ 1.000,00)
    const receiptRow = await query<{id:string}>("SELECT id FROM receivables WHERE contract_id=$1 ORDER BY created_at LIMIT 1", [contract.id]);
    const receivable = (await getReceivableById(receiptRow.rows[0].id))!;
    expect(receivable.id).toBeDefined();
    expect(receivable.status).toBe("PENDING");

    // 2. Liquidar Título a Receber
    const settledReceivable = await settleReceivable({
      receivableId: receivable.id,
      financialAccountId: bankAccount.id,
      amount: 1000.0,
      settlementDate: "2027-02-10",
      notes: "Recebido integralmente via PIX",
    });
    expect(settledReceivable.status).toBe("PAID");
    expect(settledReceivable.balanceAmount).toBe(0);

    // 3. Criar Despesa de Fornecedor Operacional (R$ 300,00)
    const payable = await createPayable({
      supplierName: `Fornecedor Freelancer Ads ${suffix}`,
      description: "Serviço de Copywriting de Anúncios",
      competency: "2027-02",
      dueDate: "2027-02-15",
      originalAmount: 300.0,
      notes: "Custo operacional de tráfego",
    });
    expect(payable.id).toBeDefined();

    // 4. Rateio Controlado por Centros de Custo
    const costCenters = await getCostCenters();
    let opCenter = costCenters.find((c) => c.code === "CC-OPER");
    let admCenter = costCenters.find((c) => c.code === "CC-ADM");

    if (!opCenter || !admCenter) {
      opCenter = costCenters[0];
      admCenter = costCenters[1];
    }

    await allocatePayableCostCenters({
      payableId: payable.id,
      allocations: [
        { costCenterId: opCenter.id, percentage: 70, amount: 210.0 }, // R$ 210,00
        { costCenterId: admCenter.id, percentage: 30, amount: 90.0 }, // R$ 90,00
      ],
    });

    const allocations = await getPayableAllocations(payable.id);
    expect(allocations.length).toBe(2);
    expect(allocations.reduce((sum, a) => sum + a.amount, 0)).toBe(300.0);

    // =========================================================================
    // PASSO 7: DRE GERENCIAL - Verificação Caixa x Competência e Sem Duplicidade
    // =========================================================================
    // DRE em Regime de Competência para 2027-02
    const dreAccrual = await getDREStatementForMonth({
      competency: "2027-02",
      accountingMethod: "ACCRUAL",
    });

    expect(dreAccrual.grossRevenue).toBeGreaterThanOrEqual(1000.0);
    expect(dreAccrual.netRevenue).toBeGreaterThanOrEqual(1000.0);
    expect(dreAccrual.operationalResult).toBeDefined();

    // DRE em Regime de Caixa para 2027-02
    const dreCash = await getDREStatementForMonth({
      competency: "2027-02",
      accountingMethod: "CASH",
    });

    expect(dreCash.grossRevenue).toBeGreaterThanOrEqual(1000.0);

    // =========================================================================
    // PASSO 8: RECONCILIAÇÃO INTEGRAL DOS DADOS
    // =========================================================================
    // Confirmar que os totais financeiros batem rigorosamente
    const stmtRes = await query<{ inflow: string; outflow: string }>(
      `SELECT 
        COALESCE(SUM(CASE WHEN movement_type = 'INFLOW' THEN amount ELSE 0 END), 0) AS inflow,
        COALESCE(SUM(CASE WHEN movement_type = 'OUTFLOW' THEN amount ELSE 0 END), 0) AS outflow
       FROM financial_statements
       WHERE account_id = $1`,
      [bankAccount.id]
    );

    const totalInflow = Number(stmtRes.rows[0].inflow);
    expect(totalInflow).toBe(1000.0);
  }, 90000);
});
