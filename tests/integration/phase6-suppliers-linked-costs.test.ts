import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { query } from "@/lib/db/pool";
import { SupplierService } from "@/modules/suppliers/service";
import { createClient } from "@/modules/clients/service";
import { createService } from "@/modules/catalog/service";
import { createContract } from "@/modules/contracts/service";
import { createPayable } from "@/modules/financial/service";

describe("Fase 6: Fornecedores, Custos Vinculados, Rateios e Apropriação por Competência", () => {
  let supplierId: string;
  let supplierName: string;
  let clientId: string;
  let serviceId: string;
  let contractId: string;
  let payableId: string;

  beforeAll(async () => {
    // 0. Limpeza prévia para garantir idempotência em caso de falha prévia
    const priorSuppliers = await query<{ id: string }>(
      "SELECT id FROM suppliers WHERE document IN ('45123789000111', '45.123.789/0001-11') OR name LIKE '%InfraCloud%'"
    );
    for (const s of priorSuppliers.rows) {
      await query("DELETE FROM cost_accruals WHERE supplier_id = $1", [s.id]);
      await query("DELETE FROM payable_allocations WHERE payable_id IN (SELECT id FROM payables WHERE supplier_id = $1)", [s.id]);
      await query("DELETE FROM payables WHERE supplier_id = $1", [s.id]);
      await query("UPDATE contract_items SET supplier_id = NULL WHERE supplier_id = $1", [s.id]);
      await query("UPDATE services SET default_supplier_id = NULL WHERE default_supplier_id = $1", [s.id]);
      await query("DELETE FROM suppliers WHERE id = $1", [s.id]);
    }

    const priorClients = await query<{ id: string }>(
      "SELECT id FROM clients WHERE document IN ('00000000000191', '00.000.000/0001-91', '11222333000144', '11.222.333/0001-44') OR name LIKE '%Beta Enterprise%'"
    );
    for (const c of priorClients.rows) {
      const vers = await query<{ id: string }>(
        "SELECT id FROM contract_versions WHERE contract_id IN (SELECT id FROM contracts WHERE client_id = $1)",
        [c.id]
      );
      if (vers.rows.length > 0) {
        const vIds = vers.rows.map((v) => v.id);
        await query("DELETE FROM contract_items WHERE contract_version_id = ANY($1::uuid[])", [vIds]);
        await query("DELETE FROM contract_versions WHERE id = ANY($1::uuid[])", [vIds]);
      }
      await query("DELETE FROM contracts WHERE client_id = $1", [c.id]);
      await query("DELETE FROM client_contacts WHERE client_id = $1", [c.id]);
      await query("DELETE FROM clients WHERE id = $1", [c.id]);
    }

    await query("DELETE FROM services WHERE name = 'Hospedagem Dedicada Cloud'");

    // 1. Criar fornecedor para testes
    const supplier = await SupplierService.createSupplier({
      personType: "PJ",
      name: "InfraCloud Soluções Web LTDA",
      tradeName: "InfraCloud",
      document: "45.123.789/0001-11",
      email: "contato@infracloud.com.br",
      phone: "(11) 3333-4444",
      category: "Infraestrutura & Cloud",
      city: "São Paulo",
      state: "SP",
    });
    supplierId = supplier.id;
    supplierName = supplier.name;

    // 2. Criar cliente
    const client = await createClient({
      type: "PJ",
      name: "Beta Enterprise Corp LTDA",
      document: "00.000.000/0001-91",
      email: "financeiro@betaenterprise.com",
    });
    clientId = client.id;

    // 3. Criar serviço com fornecedor padrão e custo de referência
    const service = await createService({
      name: "Hospedagem Dedicada Cloud",
      defaultPrice: 1500.0,
      defaultCost: 400.0,
      billingUnit: "MES",
      defaultSupplierId: supplierId,
      defaultCostPeriodicity: "MONTHLY",
    });
    serviceId = service.id;
  });

  afterAll(async () => {
    // Limpeza em ordem reversa
    if (payableId) {
      await query("DELETE FROM cost_accruals WHERE payable_id = $1", [payableId]);
      await query("DELETE FROM payable_allocations WHERE payable_id = $1", [payableId]);
      await query("DELETE FROM payables WHERE id = $1", [payableId]);
    }
    if (contractId) {
      const versRes = await query<{ id: string }>("SELECT id FROM contract_versions WHERE contract_id = $1", [contractId]);
      const vIds = versRes.rows.map((r) => r.id);
      if (vIds.length > 0) {
        await query("DELETE FROM contract_items WHERE contract_version_id = ANY($1::uuid[])", [vIds]);
        await query("DELETE FROM contract_versions WHERE id = ANY($1::uuid[])", [vIds]);
      }
      await query("DELETE FROM contracts WHERE id = $1", [contractId]);
    }
    if (serviceId) {
      await query("DELETE FROM services WHERE id = $1", [serviceId]);
    }
    if (clientId) {
      await query("DELETE FROM client_contacts WHERE client_id = $1", [clientId]);
      await query("DELETE FROM clients WHERE id = $1", [clientId]);
    }
    if (supplierId) {
      await query("DELETE FROM suppliers WHERE id = $1", [supplierId]);
    }
  });

  it("1. Cadastra fornecedor PF e PJ com validações e busca textual", async () => {
    const pf = await SupplierService.createSupplier({
      personType: "PF",
      name: "Engenheiro Marcelo Dantas",
      category: "Consultoria & Assessoria",
      phone: "(11) 9988-7766",
    });

    expect(pf.id).toBeDefined();
    expect(pf.supplierCode).toMatch(/^FORN-\d{5}$/);
    expect(pf.personType).toBe("PF");
    expect(pf.status).toBe("ACTIVE");

    const searchRes = await SupplierService.listSuppliers({ search: "Marcelo Dantas" });
    expect(searchRes.suppliers.some((s) => s.id === pf.id)).toBe(true);

    // Limpeza do PF
    await query("DELETE FROM suppliers WHERE id = $1", [pf.id]);
  });

  it("2. Preserva snapshot do fornecedor em contrato mesmo após alteração posterior do cadastro", async () => {
    // Criar contrato usando o serviço vinculado ao fornecedor
    const contract = await createContract({
      clientId,
      title: "Contrato Cloud Anual",
      billingPeriod: "MONTHLY",
      dueDay: 10,
      startDate: "2026-01-01",
      isIndefinite: true,
      items: [
        {
          serviceId,
          quantity: 1,
          unitPrice: 1500.0,
          unitCost: 400.0,
          supplierId,
          supplierNameSnapshot: supplierName,
          costPeriodicity: "MONTHLY",
        },
      ],
    });
    contractId = contract.id;

    // Verificar item do contrato
    const itemRes = await query<{
      supplier_id: string;
      supplier_name_snapshot: string;
      cost_periodicity: string;
    }>(
      `SELECT ci.supplier_id, ci.supplier_name_snapshot, ci.cost_periodicity
       FROM contract_items ci
       JOIN contract_versions cv ON cv.id = ci.contract_version_id
       WHERE cv.contract_id = $1`,
      [contractId]
    );

    expect(itemRes.rows.length).toBe(1);
    expect(itemRes.rows[0].supplier_id).toBe(supplierId);
    expect(itemRes.rows[0].supplier_name_snapshot).toBe("InfraCloud Soluções Web LTDA");
    expect(itemRes.rows[0].cost_periodicity).toBe("MONTHLY");

    // Alterar o nome do fornecedor no cadastro mestre
    await SupplierService.updateSupplier(supplierId, {
      name: "InfraCloud Global International S.A.",
    });

    // O snapshot no contrato anterior DEVE permanecer "InfraCloud Soluções Web LTDA"
    const snapshotCheck = await query<{ supplier_name_snapshot: string }>(
      `SELECT ci.supplier_name_snapshot
       FROM contract_items ci
       JOIN contract_versions cv ON cv.id = ci.contract_version_id
       WHERE cv.contract_id = $1`,
      [contractId]
    );
    expect(snapshotCheck.rows[0].supplier_name_snapshot).toBe("InfraCloud Soluções Web LTDA");

    // Restaurar nome para os próximos testes
    await SupplierService.updateSupplier(supplierId, { name: supplierName });
  });

  it("3. Cria título no Contas a Pagar vinculado ao fornecedor e com saldos de rateio corretos", async () => {
    const payable = await createPayable({
      supplierId,
      supplierName,
      description: "Servidores Cloud AWS - Semestre 1",
      competency: "2026-01",
      dueDate: "2026-01-20",
      originalAmount: 1200.0,
    });
    payableId = payable.id;

    expect(payable.supplierId).toBe(supplierId);
    expect(payable.originalAmount).toBe(1200.0);
    expect(payable.allocatedAmount).toBe(0.0);
    expect(payable.unallocatedAmount).toBe(1200.0);
  });

  it("4. Executa rateio parcial garantindo reserva de parcela não alocada", async () => {
    // Alocar R$ 400,00 para o contrato em 4 meses (Jan a Abr/2026 = R$ 100/mês)
    const alloc = await SupplierService.allocatePayable({
      payableId,
      contractId,
      serviceId,
      allocatedAmount: 400.0,
      coverageStartDate: "2026-01-01",
      coverageEndDate: "2026-04-30",
      costPeriodicity: "MONTHLY",
      notes: "Alocação 1/3 do cluster",
    });

    expect(alloc.id).toBeDefined();
    expect(alloc.allocatedAmount).toBe(400.0);
    expect(alloc.status).toBe("ACTIVE");
    expect(alloc.accruals?.length).toBe(4);

    // Verificar se cada mês recebeu R$ 100,00 exatos
    const sumAccruals = alloc.accruals?.reduce((acc, a) => acc + a.accrualAmount, 0);
    expect(sumAccruals).toBe(400.0);

    // Verificar no banco se o título a pagar atualizou unallocated_amount
    const payRes = await query<{ allocated_amount: string; unallocated_amount: string }>(
      "SELECT allocated_amount, unallocated_amount FROM payables WHERE id = $1",
      [payableId]
    );
    expect(Number(payRes.rows[0].allocated_amount)).toBe(400.0);
    expect(Number(payRes.rows[0].unallocated_amount)).toBe(800.0); // 1200 - 400
  });

  it("5. Impede transacionalmente rateio que exceda o valor disponível do título", async () => {
    // Saldo disponível é R$ 800,00. Tentar alocar R$ 900,00 deve falhar e dar ROLLBACK
    await expect(
      SupplierService.allocatePayable({
        payableId,
        contractId,
        serviceId,
        allocatedAmount: 900.0,
        coverageStartDate: "2026-05-01",
        coverageEndDate: "2026-05-31",
        costPeriodicity: "MONTHLY",
      })
    ).rejects.toThrow(/ultrapassa o saldo disponível do título/i);

    // Confirmar que o título não foi alterado
    const payRes = await query<{ allocated_amount: string; unallocated_amount: string }>(
      "SELECT allocated_amount, unallocated_amount FROM payables WHERE id = $1",
      [payableId]
    );
    expect(Number(payRes.rows[0].allocated_amount)).toBe(400.0);
    expect(Number(payRes.rows[0].unallocated_amount)).toBe(800.0);
  });

  it("6. Distribui arredondamento de centavos rigorosamente sem perda residual", async () => {
    // Alocar R$ 100,00 em 3 meses (Jan a Mar/2026): 33.33, 33.33, 33.34
    const alloc = await SupplierService.allocatePayable({
      payableId,
      contractId,
      serviceId,
      allocatedAmount: 100.0,
      coverageStartDate: "2026-05-01",
      coverageEndDate: "2026-07-31",
      costPeriodicity: "MONTHLY",
    });

    expect(alloc.accruals?.length).toBe(3);
    const amounts = alloc.accruals?.map((a) => a.accrualAmount);
    expect(amounts).toEqual([33.33, 33.33, 33.34]);

    const sum = amounts?.reduce((acc, a) => acc + a, 0);
    expect(sum).toBe(100.0);

    // Limpar esta alocação de centavos
    await SupplierService.cancelAllocation(alloc.id, "Teste de centavos concluído");
  });

  it("7. Cancela rateio de forma auditada e restaura o saldo não alocado do título", async () => {
    // Buscar o primeiro rateio de R$ 400
    const allocRes = await query<{ id: string }>(
      "SELECT id FROM payable_allocations WHERE payable_id = $1 AND status = 'ACTIVE' LIMIT 1",
      [payableId]
    );
    const allocId = allocRes.rows[0].id;

    const canceled = await SupplierService.cancelAllocation(allocId, "Reversão para readequação contratual");
    expect(canceled.status).toBe("CANCELED");
    expect(canceled.cancellationReason).toBe("Reversão para readequação contratual");

    // Verificar se as apropriações foram canceladas
    const accrualsCheck = await query<{ status: string }>(
      "SELECT status FROM cost_accruals WHERE allocation_id = $1",
      [allocId]
    );
    expect(accrualsCheck.rows.every((r) => r.status === "CANCELED")).toBe(true);

    // Verificar se o saldo do título voltou para R$ 1.200,00 original
    const payRes = await query<{ allocated_amount: string; unallocated_amount: string }>(
      "SELECT allocated_amount, unallocated_amount FROM payables WHERE id = $1",
      [payableId]
    );
    expect(Number(payRes.rows[0].allocated_amount)).toBe(0.0);
    expect(Number(payRes.rows[0].unallocated_amount)).toBe(1200.0);
  });

  it("8. Protege integridade histórica de fornecedor arquivado e bloqueia exclusão física", async () => {
    // Arquivar fornecedor
    const archived = await SupplierService.archiveSupplier(supplierId);
    expect(archived.status).toBe("ARCHIVED");

    // Tentar deletar fisicamente deve falhar pela Foreign Key de integridade referencial
    await expect(query("DELETE FROM suppliers WHERE id = $1", [supplierId])).rejects.toThrow();

    // Reativar fornecedor
    const reactivated = await SupplierService.reactivateSupplier(supplierId);
    expect(reactivated.status).toBe("ACTIVE");
  });

  it("9. Relatórios gerenciais calculam indicadores segregando receitas e custos por competência", async () => {
    // Re-alocar R$ 600 em 6 meses (2026-01 a 2026-06)
    await SupplierService.allocatePayable({
      payableId,
      contractId,
      serviceId,
      allocatedAmount: 600.0,
      coverageStartDate: "2026-01-01",
      coverageEndDate: "2026-06-30",
      costPeriodicity: "MONTHLY",
    });

    // 1. Relatório de despesas por fornecedor
    const expensesReport = await SupplierService.getSupplierExpenseReport();
    const supExp = expensesReport.find((s) => s.supplierId === supplierId);
    expect(supExp).toBeDefined();
    expect(supExp?.totalOriginalPayables).toBeGreaterThanOrEqual(1200.0);
    expect(supExp?.totalAllocatedToContracts).toBeGreaterThanOrEqual(600.0);

    // 2. Relatório de serviços contratados
    const servicesReport = await SupplierService.getSupplierContractedServicesReport(supplierId);
    expect(servicesReport.length).toBeGreaterThanOrEqual(1);
    expect(servicesReport[0].serviceName).toBe("Hospedagem Dedicada Cloud");

    // 3. Relatório de rentabilidade gerencial por competência
    const profReport = await SupplierService.getManagerialProfitabilityReport("2026-01");
    expect(profReport.length).toBeGreaterThanOrEqual(1);

    const cloudItem = profReport.find((p) => p.serviceId === serviceId);
    expect(cloudItem).toBeDefined();
    expect(cloudItem?.recognizedRevenue).toBe(1500.0);
    expect(cloudItem?.accruedRealCost).toBe(100.0); // 600 / 6 = 100/mês
    expect(cloudItem?.realizedGrossMargin).toBe(1400.0); // 1500 - 100
  });
});
