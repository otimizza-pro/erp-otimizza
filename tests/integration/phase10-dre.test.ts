import { describe, it, expect } from "vitest";
import { query } from "@/lib/db/pool";
import {
  getCostCenters,
  createCostCenter,
  updateCostCenter,
  archiveCostCenter,
  allocatePayableCostCenters,
  getPayableAllocations,
  getDREStatementForMonth,
} from "../../src/modules/financial/dre/service";

describe("Fase 10 - DRE Gerencial e Centros de Custo (Testes de Integração)", () => {
  it("deve carregar os centros de custo padrão semeados na migração 011", async () => {
    const costCenters = await getCostCenters(false);

    expect(costCenters.length).toBeGreaterThanOrEqual(4);
    const codes = costCenters.map((c) => c.code);
    expect(codes).toContain("ADM");
    expect(codes).toContain("COM");
    expect(codes).toContain("OPS");
    expect(codes).toContain("TEC");
  });

  it("deve criar, atualizar e arquivar centro de custo customizado e impedir arquivar padrão", async () => {
    const uniqueCode = `MKT${Date.now().toString().slice(-4)}`;
    const created = await createCostCenter({
      code: uniqueCode,
      name: "Marketing Performance",
      description: "Testes de tráfego pago",
    });

    expect(created.id).toBeDefined();
    expect(created.code).toBe(uniqueCode);

    const updated = await updateCostCenter(created.id, {
      name: "Marketing & Growth Acelerado",
    });
    expect(updated.name).toBe("Marketing & Growth Acelerado");

    await archiveCostCenter(created.id);
    const all = await getCostCenters(false);
    expect(all.some((c) => c.id === created.id)).toBe(false);

    // Impedir arquivamento de centro de custo padrão
    const adm = (await getCostCenters(false)).find((c) => c.code === "ADM");
    expect(adm).toBeDefined();
    if (adm) {
      await expect(archiveCostCenter(adm.id)).rejects.toThrow(
        "Centros de custo padrão do sistema não podem ser arquivados."
      );
    }
  });

  it("deve calcular DRE em Regime de Competência e Regime de Caixa diferenciando faturamento de recebimento", async () => {
    const uniqueSuffix = Date.now().toString().slice(-6);
    const monthNum = String((parseInt(uniqueSuffix.slice(-2), 10) % 12) + 1).padStart(2, "0");
    const uniqueYear = 2040 + (parseInt(uniqueSuffix.slice(0, 2), 10) % 50);
    const competency = `${uniqueYear}-${monthNum}`;

    // 1. Criar cliente de teste
    const clientRes = await query<{ id: string }>(
      `INSERT INTO clients (name, type, document, status) 
       VALUES ($1, 'PJ', $2, 'ACTIVE') RETURNING id`,
      [`Cliente DRE Teste ${uniqueSuffix}`, `99${uniqueSuffix}000100`.slice(0, 14)]
    );
    const clientId = clientRes.rows[0].id;

    // 2. Criar título a receber de R$ 2.500,00 na competência
    const recNumber = `REC-DRE-${uniqueSuffix}`;
    const recRes = await query<{ id: string }>(
      `INSERT INTO receivables 
        (client_id, receivable_number, description, competency, due_date, original_amount, paid_amount, balance_amount, status)
       VALUES ($1, $2, 'Consultoria Mensal', $3, '2027-01-15', 2500.00, 0.00, 2500.00, 'PENDING')
       RETURNING id`,
      [clientId, recNumber, competency]
    );
    const receivableId = recRes.rows[0].id;

    // 3. Consultar DRE antes de qualquer recebimento
    const accrualBefore = await getDREStatementForMonth({
      competency,
      accountingMethod: "ACCRUAL",
    });
    const cashBefore = await getDREStatementForMonth({
      competency,
      accountingMethod: "CASH",
    });

    // Em competência, a receita já deve estar reconhecida
    expect(accrualBefore.grossRevenue).toBeGreaterThanOrEqual(2500.0);
    // Em caixa, sem liquidação, a receita deste título é R$ 0,00
    expect(cashBefore.grossRevenue).toBe(0.0);

    // 4. Criar conta financeira para receber liquidação
    const accRes = await query<{ id: string }>(
      `INSERT INTO financial_accounts (name, account_type, initial_balance, current_balance, status)
       VALUES ('Conta Corrente DRE Teste', 'CHECKING', 10000.00, 10000.00, 'ACTIVE')
       RETURNING id`
    );
    const accountId = accRes.rows[0].id;

    // 5. Baixa parcial de R$ 1.000,00 no caixa
    await query(
      `INSERT INTO financial_settlements 
        (receivable_id, financial_account_id, settlement_type, amount, settlement_date, notes)
       VALUES ($1, $2, 'RECEIPT', 1000.00, $3, 'Recebimento Parcial')`,
      [receivableId, accountId, `${competency}-05`]
    );

    // 6. Consultar DRE após o recebimento parcial
    const cashAfter = await getDREStatementForMonth({
      competency,
      accountingMethod: "CASH",
    });
    expect(cashAfter.grossRevenue).toBe(1000.0);
    expect(cashAfter.netRevenue).toBe(1000.0);

    // Na competência continua R$ 2.500,00
    const accrualAfter = await getDREStatementForMonth({
      competency,
      accountingMethod: "ACCRUAL",
    });
    expect(accrualAfter.grossRevenue).toBeGreaterThanOrEqual(2500.0);
  });

  it("deve realizar rateio exato em centavos de título a pagar e rejeitar soma divergente", async () => {
    const uniqueSuffix = Date.now().toString().slice(-6);

    // 1. Criar título a pagar de R$ 1.000,00
    const payRes = await query<{ id: string }>(
      `INSERT INTO payables 
        (supplier_name, payable_number, description, competency, due_date, original_amount, balance_amount, status)
       VALUES ('Fornecedor Rateio Teste', $1, 'Servidor Dedicado', '2026-10', '2026-10-20', 1000.00, 1000.00, 'PENDING')
       RETURNING id`,
      [`PAG-RAT-${uniqueSuffix}`]
    );
    const payableId = payRes.rows[0].id;

    const costCenters = await getCostCenters(false);
    const adm = costCenters.find((c) => c.code === "ADM")!;
    const tec = costCenters.find((c) => c.code === "TEC")!;

    // 2. Tentar rateio divergente (soma R$ 900 != R$ 1000) -> deve lançar erro
    await expect(
      allocatePayableCostCenters({
        payableId,
        allocations: [
          { costCenterId: adm.id, percentage: 30, amount: 300.0 },
          { costCenterId: tec.id, percentage: 60, amount: 600.0 },
        ],
      })
    ).rejects.toThrow("deve ser exatamente igual ao valor do título");

    // 3. Executar rateio exato: R$ 300 (ADM) + R$ 700 (TEC) = R$ 1.000,00
    await allocatePayableCostCenters({
      payableId,
      allocations: [
        { costCenterId: adm.id, percentage: 30, amount: 300.0 },
        { costCenterId: tec.id, percentage: 70, amount: 700.0 },
      ],
    });

    const savedAllocs = await getPayableAllocations(payableId);
    expect(savedAllocs).toHaveLength(2);
    const totalAllocated = savedAllocs.reduce((acc, curr) => acc + curr.amount, 0);
    expect(totalAllocated).toBe(1000.0);
  });
});
