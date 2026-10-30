import { describe, it, expect } from "vitest";
import {
  createClient,
  getClientById,
  updateClient,
  archiveClient,
  reactivateClient,
  listClients,
} from "@/modules/clients/service";
import {
  createService,
  listServices,
  createCombo,
  listCombos,
  archiveCombo,
  archiveService,
} from "@/modules/catalog/service";

describe("Fase 1: Integração com Banco PostgreSQL (CRUD Real)", () => {
  let createdClientId: string;
  let createdService1Id: string;
  let createdService2Id: string;
  let createdComboId: string;

  it("cria um cliente PJ com validação e contatos múltiplos", async () => {
    const testDoc = "11222333000181"; // CNPJ válido

    // Limpar cliente prévio com mesmo doc se existir
    const existing = await listClients({ search: testDoc });
    for (const c of existing.clients) {
      await archiveClient(c.id);
    }

    const client = await createClient({
      type: "PJ",
      name: "Empresa Teste Integração LTDA",
      tradeName: "Teste Tech",
      document: "11.222.333/0001-81",
      email: "financeiro@testetech.com.br",
      phone: "(11) 3211-9999",
      city: "São Paulo",
      state: "SP",
      contacts: [
        { name: "Contato Principal", role: "Diretor", email: "dir@testetech.com.br", isPrimary: true },
        { name: "Contato Secundário", role: "Financeiro", email: "fin@testetech.com.br", isPrimary: false },
      ],
    });

    expect(client).toBeDefined();
    expect(client.id).toBeDefined();
    expect(client.type).toBe("PJ");
    expect(client.document).toBe(testDoc);
    createdClientId = client.id;

    // Buscar com contatos
    const fullClient = await getClientById(client.id);
    expect(fullClient).not.toBeNull();
    expect(fullClient?.contacts?.length).toBe(2);
    expect(fullClient?.contacts?.[0].name).toBe("Contato Principal");
  });

  it("impede duplicação indevida de documento para clientes ativos", async () => {
    await expect(
      createClient({
        type: "PJ",
        name: "Outra Empresa com Mesmo CNPJ",
        document: "11.222.333/0001-81",
      })
    ).rejects.toThrow("Já existe um cliente ativo cadastrado com este CPF/CNPJ.");
  });

  it("permite arquivar e reativar cliente sem apagar histórico", async () => {
    const archived = await archiveClient(createdClientId);
    expect(archived.status).toBe("ARCHIVED");
    expect(archived.archivedAt).not.toBeNull();

    const reactivated = await reactivateClient(createdClientId);
    expect(reactivated.status).toBe("ACTIVE");
    expect(reactivated.archivedAt).toBeNull();
  });

  it("cria serviços vinculados no catálogo", async () => {
    const svc1 = await createService({
      name: "Consultoria em Gestão ERP Teste",
      description: "Implementação e suporte",
      defaultPrice: 2500.0,
      defaultCost: 750.0,
      billingUnit: "MES",
    });
    expect(svc1.id).toBeDefined();
    expect(svc1.defaultPrice).toBe(2500.0);
    createdService1Id = svc1.id;

    const svc2 = await createService({
      name: "Treinamento Operacional Teste",
      description: "Treinamento para equipe",
      defaultPrice: 800.0,
      defaultCost: 200.0,
      billingUnit: "HORA",
    });
    expect(svc2.id).toBeDefined();
    createdService2Id = svc2.id;
  });

  it("cria um combo com preço total correspondente à soma dos componentes", async () => {
    const combo = await createCombo({
      name: "Combo Aceleração Teste",
      description: "Consultoria + Treinamento com desconto negociado",
      items: [
        { serviceId: createdService1Id, componentPrice: 2200.0 }, // Desconto de 300
        { serviceId: createdService2Id, componentPrice: 600.0 }, // Desconto de 200
      ],
    });

    expect(combo.id).toBeDefined();
    expect(combo.items?.length).toBe(2);
    // Preço total deve ser exatamente a soma: 2200 + 600 = 2800
    expect(combo.totalPrice).toBe(2800.0);
    createdComboId = combo.id;
  });

  it("rejeita criação de combo com menos de 2 serviços", async () => {
    await expect(
      createCombo({
        name: "Combo Inválido",
        items: [{ serviceId: createdService1Id, componentPrice: 500.0 }],
      })
    ).rejects.toThrow("Um combo comercial deve conter pelo menos 2 serviços associados.");
  });

  it("permite arquivar combo e serviço mantendo histórico", async () => {
    await archiveCombo(createdComboId);
    await archiveService(createdService1Id);
    await archiveService(createdService2Id);

    const combos = await listCombos({ status: "ARCHIVED" });
    expect(combos.some((c) => c.id === createdComboId)).toBe(true);
  });
});
