import { describe, it, expect, afterAll } from "vitest";
import { createClient } from "@/modules/clients/service";
import { createService, createCombo } from "@/modules/catalog/service";
import {
  createContract,
  createContractVersion,
  cancelContract,
  getContractById,
  listContracts,
  getContractProjections,
} from "@/modules/contracts/service";
import { query } from "@/lib/db/pool";

describe("Fase 2: Integração com Banco PostgreSQL (Contratos, Versões e Histórico)", () => {
  let clientId: string;
  let serviceMetaAdsId: string;
  let serviceGoogleAdsId: string;
  let catalogComboId: string;
  let contract1Id: string;
  let contract2Id: string;

  afterAll(async () => {
    // Limpeza estrita para NUNCA poluir o ambiente de produção
    try {
      if (contract1Id || contract2Id) {
        const ids = [contract1Id, contract2Id].filter(Boolean);
        // Itens são cascateados pelas versões, deletar versões e contratos
        await query("DELETE FROM contract_items WHERE contract_version_id IN (SELECT id FROM contract_versions WHERE contract_id = ANY($1::uuid[]))", [ids]);
        await query("DELETE FROM contract_versions WHERE contract_id = ANY($1::uuid[])", [ids]);
        await query("DELETE FROM contracts WHERE id = ANY($1::uuid[])", [ids]);
      }
      if (catalogComboId) {
        await query("DELETE FROM combo_items WHERE combo_id = $1", [catalogComboId]);
        await query("DELETE FROM combos WHERE id = $1", [catalogComboId]);
      }
      if (serviceMetaAdsId || serviceGoogleAdsId) {
        await query("DELETE FROM services WHERE id = ANY($1::uuid[])", [[serviceMetaAdsId, serviceGoogleAdsId].filter(Boolean)]);
      }
      if (clientId) {
        // Excluir qualquer contrato residual do cliente de teste
        const cRes = await query("SELECT id FROM contracts WHERE client_id = $1", [clientId]);
        if (cRes.rowCount && cRes.rowCount > 0) {
          const cIds = cRes.rows.map((r: { id: string }) => r.id);
          await query("DELETE FROM contract_items WHERE contract_version_id IN (SELECT id FROM contract_versions WHERE contract_id = ANY($1::uuid[]))", [cIds]);
          await query("DELETE FROM contract_versions WHERE contract_id = ANY($1::uuid[])", [cIds]);
          await query("DELETE FROM contracts WHERE id = ANY($1::uuid[])", [cIds]);
        }
        await query("DELETE FROM client_contacts WHERE client_id = $1", [clientId]);
        await query("DELETE FROM clients WHERE id = $1", [clientId]);
      }
    } catch (err) {
      console.warn("Aviso ao limpar massa de testes:", err);
    }
  });

  it("configura cliente e catálogo da Fase 1 necessários para a contratação", async () => {
    const doc = "19131243000197";
    const existing = await query("SELECT id FROM clients WHERE document = $1 AND status = 'ACTIVE'", [doc]);
    if (existing.rowCount && existing.rowCount > 0) {
      clientId = existing.rows[0].id;
    } else {
      const client = await createClient({
        type: "PJ",
        name: "Empresa Cliente Contratação LTDA",
        document: "19.131.243/0001-97",
        email: "financeiro@contratacao.com.br",
      });
      clientId = client.id;
    }
    expect(clientId).toBeDefined();

    // Criar serviços do catálogo
    const sMeta = await createService({
      name: "Gestão de Meta Ads Teste",
      defaultPrice: 800.0,
      defaultCost: 200.0,
      billingUnit: "MES",
    });
    serviceMetaAdsId = sMeta.id;

    const sGoogle = await createService({
      name: "Gestão de Google Ads Teste",
      defaultPrice: 600.0,
      defaultCost: 150.0,
      billingUnit: "MES",
    });
    serviceGoogleAdsId = sGoogle.id;

    // Criar combo no catálogo: R$ 600 (Meta) + R$ 400 (Google) = Total R$ 1.000
    const combo = await createCombo({
      name: "Combo Tráfego Pago Teste",
      description: "Meta Ads + Google Ads integrados",
      items: [
        { serviceId: serviceMetaAdsId, componentPrice: 600.0 },
        { serviceId: serviceGoogleAdsId, componentPrice: 400.0 },
      ],
    });
    expect(combo.totalPrice).toBe(1000.0);
    catalogComboId = combo.id;
  });

  it("cria a primeira contratação independente com combo e custos unitários personalizados", async () => {
    // Combo Meta Ads R$ 600 + Google Ads R$ 400, total R$ 1.000 com custos customizados
    const contract = await createContract({
      clientId,
      title: "Contrato de Gestão de Tráfego",
      billingPeriod: "MONTHLY",
      dueDay: 10,
      startDate: "2026-02-01",
      isIndefinite: true,
      items: [
        {
          serviceId: serviceMetaAdsId,
          comboId: catalogComboId,
          comboName: "Combo Tráfego Pago Teste",
          quantity: 1,
          unitPrice: 600.0,
          unitCost: 180.0, // Custo sobrescrito especificamente para este contrato
        },
        {
          serviceId: serviceGoogleAdsId,
          comboId: catalogComboId,
          comboName: "Combo Tráfego Pago Teste",
          quantity: 1,
          unitPrice: 400.0,
          unitCost: 120.0, // Custo sobrescrito
        },
      ],
    });

    expect(contract.id).toBeDefined();
    expect(contract.contractNumber).toMatch(/^CTR-\d{5}$/);
    expect(contract.status).toBe("ACTIVE");
    expect(contract.currentVersion?.totalAmount).toBe(1000.0);
    expect(contract.currentVersion?.items?.length).toBe(2);
    contract1Id = contract.id;
  });

  it("permite ao mesmo cliente possuir uma segunda contratação independente (ex: avulsa de consultoria)", async () => {
    const contract2 = await createContract({
      clientId,
      title: "Consultoria Avulsa de Estratégia",
      billingPeriod: "ONE_TIME",
      dueDay: 15,
      startDate: "2026-02-15",
      isIndefinite: false,
      endDate: "2026-02-28",
      items: [
        {
          serviceId: serviceGoogleAdsId,
          quantity: 1,
          unitPrice: 1500.0,
          unitCost: 300.0,
        },
      ],
    });

    expect(contract2.id).toBeDefined();
    expect(contract2.contractNumber).not.toBe(contract1Id);
    expect(contract2.currentVersion?.totalAmount).toBe(1500.0);
    contract2Id = contract2.id;

    // Verificar que a busca por clientId retorna ambas as contratações criadas
    const clientContracts = await listContracts({ clientId });
    expect(clientContracts.total).toBeGreaterThanOrEqual(2);
    expect(clientContracts.contracts.some((c) => c.id === contract1Id)).toBe(true);
    expect(clientContracts.contracts.some((c) => c.id === contract2Id)).toBe(true);
  });

  it("garante que alterações posteriores no catálogo NÃO modificam contratos anteriores", async () => {
    // Atualizar preço e custo no catálogo
    await query("UPDATE services SET default_price = 9999.00 WHERE id = $1", [serviceMetaAdsId]);
    await query("UPDATE combos SET total_price = 8888.00 WHERE id = $1", [catalogComboId]);

    // Recarregar o contrato 1 do banco de dados
    const reloaded = await getContractById(contract1Id);
    expect(reloaded).not.toBeNull();
    // Valor total deve permanecer inalterado em R$ 1.000,00
    expect(reloaded?.currentVersion?.totalAmount).toBe(1000.0);
    const metaItem = reloaded?.currentVersion?.items?.find((i) => i.serviceId === serviceMetaAdsId);
    expect(metaItem?.unitPrice).toBe(600.0);
    expect(metaItem?.unitCost).toBe(180.0);
  });

  it("cria nova versão na contratação preservando a versão anterior para auditoria", async () => {
    // Nova versão negociada a partir de 2026-04-01
    const newVersion = await createContractVersion({
      contractId: contract1Id,
      title: "Revisão com Aumento de Escopo",
      billingPeriod: "MONTHLY",
      dueDay: 10,
      startDate: "2026-02-01",
      effectiveDate: "2026-04-01",
      isIndefinite: true,
      items: [
        {
          serviceId: serviceMetaAdsId,
          quantity: 1,
          unitPrice: 800.0,
          unitCost: 200.0,
        },
        {
          serviceId: serviceGoogleAdsId,
          quantity: 1,
          unitPrice: 500.0,
          unitCost: 150.0,
        },
      ],
    });

    expect(newVersion.versionNumber).toBe(2);
    expect(newVersion.totalAmount).toBe(1300.0);

    // Buscar contrato com todas as versões
    const updatedContract = await getContractById(contract1Id);
    expect(updatedContract?.versions?.length).toBe(2);
    // Versão 1 intacta com R$ 1000
    const v1 = updatedContract?.versions?.find((v) => v.versionNumber === 1);
    expect(v1?.totalAmount).toBe(1000.0);
    // Versão 2 vigente com R$ 1300
    const v2 = updatedContract?.versions?.find((v) => v.versionNumber === 2);
    expect(v2?.totalAmount).toBe(1300.0);
  });

  it("cancela contrato preservando histórico e dados anteriores", async () => {
    const canceled = await cancelContract({
      contractId: contract1Id,
      cancellationReason: "Solicitação do cliente para redução de despesas",
      canceledAt: "2026-05-01T00:00:00.000Z",
    });

    expect(canceled.status).toBe("CANCELED");
    expect(canceled.cancellationReason).toBe("Solicitação do cliente para redução de despesas");
    expect(canceled.canceledAt).toBeDefined();

    // Versões e itens continuam acessíveis
    const verifyContract = await getContractById(contract1Id);
    expect(verifyContract?.versions?.length).toBe(2);

    // Não deve permitir criar nova versão em contrato cancelado
    await expect(
      createContractVersion({
        contractId: contract1Id,
        billingPeriod: "MONTHLY",
        dueDay: 10,
        startDate: "2026-02-01",
        effectiveDate: "2026-06-01",
        items: [{ serviceId: serviceMetaAdsId, quantity: 1, unitPrice: 500, unitCost: 100 }],
      })
    ).rejects.toThrow("Não é possível versionar um contrato cancelado.");
  });
});
