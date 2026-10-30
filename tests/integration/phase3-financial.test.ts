import { describe, it, expect, afterAll } from "vitest";
import { query } from "@/lib/db/pool";
import { createClient } from "@/modules/clients/service";
import { createContract } from "@/modules/contracts/service";
import { createService } from "@/modules/catalog/service";
import {
  createFinancialAccount,
  createReceivable,
  createPayable,
  createPayableTemplate,
  settleReceivable,
  settlePayable,
  reverseSettlement,
  transferBetweenAccounts,
  processContractRecurrence,
  processPayableRecurrence,
  getReceivableById,
  getPayableById,
} from "@/modules/financial/service";

describe("Fase 3: Motor Financeiro, Contas a Pagar/Receber, Baixas e Fluxo de Caixa", () => {
  let clientId: string;
  let serviceId: string;
  let contractId: string;
  let account1Id: string;
  let account2Id: string;
  let receivableId: string;
  let payableId: string;

  afterAll(async () => {
    // Limpeza estrita para NUNCA deixar dados de teste persistidos
    try {
      await query("DELETE FROM financial_statements WHERE description LIKE '%Teste%' OR description LIKE '%Mensalidade Contrato%'");
      await query("DELETE FROM financial_settlements WHERE notes LIKE '%Teste%' OR notes LIKE '%Estorno%'");
      await query("DELETE FROM receivables WHERE description LIKE '%Teste%' OR description LIKE '%Mensalidade Contrato%'");
      await query("DELETE FROM payables WHERE description LIKE '%Teste%'");
      await query("DELETE FROM payable_templates WHERE description LIKE '%Teste%'");
      if (account1Id || account2Id) {
        await query("DELETE FROM financial_accounts WHERE id IN ($1, $2)", [account1Id, account2Id].filter(Boolean));
      }
      if (contractId) {
        await query("DELETE FROM contract_items WHERE contract_version_id IN (SELECT id FROM contract_versions WHERE contract_id = $1)", [contractId]);
        await query("DELETE FROM contract_versions WHERE contract_id = $1", [contractId]);
        await query("DELETE FROM contracts WHERE id = $1", [contractId]);
      }
      if (serviceId) {
        await query("DELETE FROM services WHERE id = $1", [serviceId]);
      }
      if (clientId) {
        const cRes = await query<{ id: string }>("SELECT id FROM contracts WHERE client_id = $1", [clientId]);
        if (cRes.rowCount && cRes.rowCount > 0) {
          const cIds = cRes.rows.map((r) => r.id);
          await query("DELETE FROM contract_items WHERE contract_version_id IN (SELECT id FROM contract_versions WHERE contract_id = ANY($1::uuid[]))", [cIds]);
          await query("DELETE FROM contract_versions WHERE contract_id = ANY($1::uuid[])", [cIds]);
          await query("DELETE FROM contracts WHERE id = ANY($1::uuid[])", [cIds]);
        }
        await query("DELETE FROM client_contacts WHERE client_id = $1", [clientId]);
        await query("DELETE FROM clients WHERE id = $1", [clientId]);
      }
    } catch (err) {
      console.warn("Aviso na limpeza da Fase 3:", err);
    }
  });

  it("cria contas financeiras para movimentações e transferências", async () => {
    const acc1 = await createFinancialAccount({
      name: "Banco Santander Teste Fase 3",
      bankName: "Santander",
      accountType: "CHECKING",
      initialBalance: 5000.0,
    });
    expect(acc1.id).toBeDefined();
    expect(acc1.currentBalance).toBe(5000.0);
    account1Id = acc1.id;

    const acc2 = await createFinancialAccount({
      name: "Caixa Pequeno Teste Fase 3",
      accountType: "CASH",
      initialBalance: 500.0,
    });
    expect(acc2.id).toBeDefined();
    account2Id = acc2.id;
  });

  it("configura cliente e contratação recorrente de R$ 1.000 da Fase 2", async () => {
    const doc = "60701190000104";
    const existingClient = await query("SELECT id FROM clients WHERE document = $1 AND status = 'ACTIVE'", [doc]);
    if (existingClient.rowCount && existingClient.rowCount > 0) {
      clientId = existingClient.rows[0].id;
    } else {
      const client = await createClient({
        type: "PJ",
        name: "Empresa Financeira Teste LTDA",
        document: "60.701.190/0001-04",
        email: "financeiro@teste.com",
      });
      clientId = client.id;
    }

    const svc = await createService({
      name: "Consultoria Financeira Teste",
      defaultPrice: 1000.0,
      defaultCost: 300.0,
      billingUnit: "MES",
    });
    serviceId = svc.id;

    const contract = await createContract({
      clientId,
      title: "Contrato Recorrente Teste Fase 3",
      billingPeriod: "MONTHLY",
      dueDay: 10,
      startDate: "2026-03-01",
      isIndefinite: true,
      items: [{ serviceId, quantity: 1, unitPrice: 1000.0, unitCost: 300.0 }],
    });
    expect(contract.id).toBeDefined();
    contractId = contract.id;
  });

  it("motor de recorrência gera uma única cobrança por competência de forma idempotente", async () => {
    // Executar para competência 2026-03 para o contrato criado
    const run1 = await processContractRecurrence("2026-03", contractId);
    expect(run1.createdCount).toBe(1);

    // Reexecutar a geração para a mesma competência não duplica cobrança
    const run2 = await processContractRecurrence("2026-03", contractId);
    expect(run2.createdCount).toBe(0);
    expect(run2.skippedCount).toBe(1);

    // Verificar no banco que existe exatamente 1 cobrança
    const checkSql = "SELECT * FROM receivables WHERE contract_id = $1 AND competency = '2026-03'";
    const res = await query(checkSql, [contractId]);
    expect(res.rowCount).toBe(1);
    expect(Number(res.rows[0].original_amount)).toBe(1000.0);
    receivableId = res.rows[0].id;
    // Como a data de vencimento (2026-03-10) é anterior à data corrente (2026-10-30), o status inicial é OVERDUE
    expect(res.rows[0].status).toBe("OVERDUE");
  });

  it("baixa parcial de R$ 600 em título de R$ 1.000 mantém R$ 400 em aberto", async () => {
    const updated = await settleReceivable({
      receivableId,
      financialAccountId: account1Id,
      amount: 600.0,
      settlementDate: "2026-03-05",
      notes: "Baixa parcial de R$ 600 Teste",
    });

    expect(updated.paidAmount).toBe(600.0);
    expect(updated.balanceAmount).toBe(400.0);
    // Vencido com pagamento parcial deve ser classificado como OVERDUE (atrasado com saldo em aberto)
    expect(updated.status).toBe("OVERDUE");

    // Verificar que a conta Santander recebeu R$ 600 (5000 + 600 = 5600)
    const accRes = await query("SELECT current_balance FROM financial_accounts WHERE id = $1", [account1Id]);
    expect(Number(accRes.rows[0].current_balance)).toBe(5600.0);
  });

  it("segunda baixa de R$ 400 liquida integralmente o título (PAID)", async () => {
    const updated = await settleReceivable({
      receivableId,
      financialAccountId: account1Id,
      amount: 400.0,
      settlementDate: "2026-03-09",
      notes: "Quitação final de R$ 400 Teste",
    });

    expect(updated.paidAmount).toBe(1000.0);
    expect(updated.balanceAmount).toBe(0.0);
    expect(updated.status).toBe("PAID");

    // Impedir baixa adicional superior ao saldo devido
    await expect(
      settleReceivable({
        receivableId,
        financialAccountId: account1Id,
        amount: 50.0,
        settlementDate: "2026-03-10",
      })
    ).rejects.toThrow("Este título já se encontra totalmente liquidado.");
  });

  it("estorno auditado reabre o saldo correspondente sem apagar registros", async () => {
    const fullRec = await getReceivableById(receivableId);
    expect(fullRec?.settlements?.length).toBe(2);
    const lastSettlement = fullRec?.settlements?.[1]; // Baixa de 400

    await reverseSettlement(lastSettlement!.id, "Estorno por duplicidade de TED Teste");

    const reloaded = await getReceivableById(receivableId);
    expect(reloaded?.status).toBe("OVERDUE");
    expect(reloaded?.paidAmount).toBe(600.0);
    expect(reloaded?.balanceAmount).toBe(400.0);

    // Conta foi decrementada pelo estorno (6000 - 400 = 5600)
    const accRes = await query("SELECT current_balance FROM financial_accounts WHERE id = $1", [account1Id]);
    expect(Number(accRes.rows[0].current_balance)).toBe(5600.0);
  });

  it("contas a pagar: despesa recorrente gera títulos e suporta liquidação", async () => {
    // 1. Criar template de despesa recorrente de servidor
    const tpl = await createPayableTemplate({
      supplierName: "AWS Cloud Services Teste",
      description: "Servidores Cloud Hospedagem Teste",
      billingPeriod: "MONTHLY",
      dueDay: 15,
      amount: 250.0,
      startDate: "2026-03-01",
      isIndefinite: true,
    });
    expect(tpl.id).toBeDefined();

    // 2. Executar motor de recorrência a pagar
    const res = await processPayableRecurrence("2026-03", tpl.id);
    expect(res.createdCount).toBe(1);

    // Obter payable gerado
    const pagRes = await query("SELECT * FROM payables WHERE payable_template_id = $1 AND competency = '2026-03'", [tpl.id]);
    expect(pagRes.rowCount).toBe(1);
    payableId = pagRes.rows[0].id;
    expect(Number(pagRes.rows[0].original_amount)).toBe(250.0);

    // 3. Pagar a despesa via Santander
    const settledPay = await settlePayable({
      payableId,
      financialAccountId: account1Id,
      amount: 250.0,
      settlementDate: "2026-03-14",
      notes: "Pagamento AWS Teste",
    });
    expect(settledPay.status).toBe("PAID");
    expect(settledPay.paidAmount).toBe(250.0);
    expect(settledPay.balanceAmount).toBe(0.0);

    // Saldo Santander: 5600 - 250 = 5350
    const accRes = await query("SELECT current_balance FROM financial_accounts WHERE id = $1", [account1Id]);
    expect(Number(accRes.rows[0].current_balance)).toBe(5350.0);
  });

  it("transferência interna entre contas não altera o resultado líquido global", async () => {
    // Transferir R$ 350 do Santander (5350) para Caixa (500)
    const transfer = await transferBetweenAccounts({
      fromAccountId: account1Id,
      toAccountId: account2Id,
      amount: 350.0,
      date: "2026-03-20",
      description: "Suprimento de Caixa Pequeno Teste",
    });
    expect(transfer.fromStatementId).toBeDefined();
    expect(transfer.toStatementId).toBeDefined();

    const acc1 = await query("SELECT current_balance FROM financial_accounts WHERE id = $1", [account1Id]);
    const acc2 = await query("SELECT current_balance FROM financial_accounts WHERE id = $1", [account2Id]);

    // Santander: 5350 - 350 = 5000
    expect(Number(acc1.rows[0].current_balance)).toBe(5000.0);
    // Caixa: 500 + 350 = 850
    expect(Number(acc2.rows[0].current_balance)).toBe(850.0);
    // Total consolidado (5000 + 850 = 5850) preservado integralmente
  });
});
