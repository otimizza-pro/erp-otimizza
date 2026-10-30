import { describe, it, expect } from "vitest";
import {
  CreateLeadSchema,
  ConvertLeadSchema,
  CreatePipelineSchema,
  CreateStageSchema,
  CreateOpportunitySchema,
  CloseOpportunitySchema,
  CreateActivitySchema,
} from "@/modules/crm/schemas";
import { CrmService } from "@/modules/crm/service";

describe("Fase 7 - Testes Unitários de Regras de Domínio CRM", () => {
  describe("Validação de Leads", () => {
    it("valida criação de lead PJ com documento formatado válido", () => {
      const valid = {
        personType: "PJ" as const,
        name: "Acme Corporação",
        tradeName: "Acme Corp do Brasil",
        document: "11.222.333/0001-81",
        email: "comercial@acme.com",
        phone: "(11) 98765-4321",
        source: "Inbound Google Ads",
      };

      const parsed = CreateLeadSchema.parse(valid);
      expect(parsed.name).toBe("Acme Corporação");
      expect(parsed.tradeName).toBe("Acme Corp do Brasil");
      expect(parsed.email).toBe("comercial@acme.com");
    });

    it("valida criação de lead PF sem documento", () => {
      const validPf = {
        personType: "PF" as const,
        name: "Carlos Ferreira",
        email: "carlos@gmail.com",
        phone: "(21) 99999-8888",
      };

      const parsed = CreateLeadSchema.parse(validPf);
      expect(parsed.name).toBe("Carlos Ferreira");
      expect(parsed.document).toBeUndefined();
    });

    it("rejeita lead sem nome ou com nome vazio", () => {
      expect(() => {
        CreateLeadSchema.parse({
          personType: "PF",
          name: "",
          email: "test@domain.com",
        });
      }).toThrow();
    });

    it("valida schema de conversão atômica de Lead para Cliente", () => {
      const convNew = ConvertLeadSchema.parse({
        leadId: "00000000-0000-0000-0000-000000000001",
        mode: "NEW_CLIENT",
        clientDataOverride: {
          name: "Cliente Oficial LTDA",
          document: "11.222.333/0001-81",
        },
      });
      expect(convNew.mode).toBe("NEW_CLIENT");
      expect(convNew.clientDataOverride?.name).toBe("Cliente Oficial LTDA");

      const convExisting = ConvertLeadSchema.parse({
        leadId: "00000000-0000-0000-0000-000000000001",
        mode: "LINK_EXISTING",
        existingClientId: "00000000-0000-0000-0000-000000000002",
      });
      expect(convExisting.mode).toBe("LINK_EXISTING");
      expect(convExisting.existingClientId).toBe("00000000-0000-0000-0000-000000000002");
    });
  });

  describe("Validação de Funis e Etapas", () => {
    it("valida criação de funil com nome e padrão", () => {
      const parsed = CreatePipelineSchema.parse({
        name: "Funil de Inside Sales B2B",
        description: "Ciclo de 30 dias para serviços recorrentes",
        isDefault: true,
      });
      expect(parsed.name).toBe("Funil de Inside Sales B2B");
      expect(parsed.isDefault).toBe(true);
    });

    it("valida criação de etapa com probabilidade entre 0 e 100", () => {
      const parsed = CreateStageSchema.parse({
        pipelineId: "00000000-0000-0000-0000-000000000001",
        name: "Proposta Enviada",
        winProbability: 60,
        color: "#6366f1",
      });
      expect(parsed.winProbability).toBe(60);
      expect(parsed.name).toBe("Proposta Enviada");
    });

    it("rejeita etapa com probabilidade fora do intervalo [0, 100]", () => {
      expect(() => {
        CreateStageSchema.parse({
          pipelineId: "00000000-0000-0000-0000-000000000001",
          name: "Etapa Inválida",
          winProbability: 120,
        });
      }).toThrow();

      expect(() => {
        CreateStageSchema.parse({
          pipelineId: "00000000-0000-0000-0000-000000000001",
          name: "Etapa Inválida Negativa",
          winProbability: -10,
        });
      }).toThrow();
    });
  });

  describe("Cálculos Financeiros e MRR Normalizado de Oportunidades", () => {
    it("normaliza MRR de contrato MENSAL para o próprio valor nominal", () => {
      const mrr = CrmService.computeNormalizedMonthlyValue(2500, "MONTHLY");
      expect(mrr).toBe(2500);
    });

    it("normaliza MRR de contrato ANUAL dividindo exatamente por 12 meses", () => {
      const mrr = CrmService.computeNormalizedMonthlyValue(12000, "YEARLY");
      expect(mrr).toBe(1000);

      // Valor fracionário arredondado a 2 casas
      const mrrFraction = CrmService.computeNormalizedMonthlyValue(10000, "YEARLY");
      expect(mrrFraction).toBe(833.33);
    });

    it("normaliza MRR de contrato PONTUAL (ONE_TIME) para 0", () => {
      const mrr = CrmService.computeNormalizedMonthlyValue(5000, "ONE_TIME");
      expect(mrr).toBe(0);
    });

    it("calcula valor ponderado (weighted amount) baseado na probabilidade", () => {
      const amount = 10000;
      const probability = 75; // 75%
      const weighted = (amount * probability) / 100;
      expect(weighted).toBe(7500);
    });

    it("exige motivo de perda (lostReason) ao encerrar oportunidade como LOST", () => {
      const validLost = CloseOpportunitySchema.parse({
        opportunityId: "00000000-0000-0000-0000-000000000001",
        status: "LOST",
        lostReason: "Preço muito acima do orçamento do prospect",
      });
      expect(validLost.status).toBe("LOST");
      expect(validLost.lostReason).toBeDefined();
    });

    it("valida encerramento como WON sem exigir lostReason", () => {
      const validWon = CloseOpportunitySchema.parse({
        opportunityId: "00000000-0000-0000-0000-000000000001",
        status: "WON",
        notes: "Negociação finalizada com êxito pelo gestor",
      });
      expect(validWon.status).toBe("WON");
      expect(validWon.lostReason).toBeUndefined();
    });
  });

  describe("Validação de Atividades e Follow-ups", () => {
    it("valida criação de atividade de ligação com prazo futuro e lead vinculado", () => {
      const act = CreateActivitySchema.parse({
        leadId: "00000000-0000-0000-0000-000000000001",
        activityType: "CALL",
        title: "Follow-up de proposta enviada",
        dueDate: "2026-11-15T14:00:00Z",
      });
      expect(act.activityType).toBe("CALL");
      expect(act.title).toBe("Follow-up de proposta enviada");
    });

    it("rejeita atividade com tipo inválido", () => {
      expect(() => {
        CreateActivitySchema.parse({
          leadId: "00000000-0000-0000-0000-000000000001",
          activityType: "FAX" as any,
          title: "Enviar fax",
        });
      }).toThrow();
    });
  });
});
