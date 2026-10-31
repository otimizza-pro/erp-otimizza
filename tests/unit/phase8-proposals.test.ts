import { describe, it, expect } from "vitest";
import {
  CreateProposalInputSchema,
  CreateProposalVersionInputSchema,
  ApproveProposalInputSchema,
  RejectProposalInputSchema,
  CancelProposalInputSchema,
  ConvertProposalToContractInputSchema,
  ProposalRecord,
  ProposalVersionRecord,
} from "@/modules/proposals/types";
import { ProposalService } from "@/modules/proposals/service";
import { generateProposalPdf } from "@/modules/proposals/pdf";

describe("Fase 8 - Testes Unitários de Propostas Comerciais", () => {
  describe("Cenário A: Validação de Schemas e Destinatários", () => {
    it("valida criação de proposta para Lead com dados completos", () => {
      const valid = {
        title: "Campanha Black Friday 2026",
        leadId: "11111111-1111-1111-1111-111111111111",
        validUntil: "2026-11-30",
        paymentTerms: "Faturamento mensal via boleto",
        startLeadTimeDays: 5,
        scopeDescription: "Configuração de anúncios e funis",
        items: [
          {
            sourceType: "SERVICE" as const,
            serviceId: "22222222-2222-2222-2222-222222222222",
            descriptionSnapshot: "Gestão de Tráfego Pago",
            periodicity: "MONTHLY" as const,
            quantity: 1,
            referenceUnitPrice: 1500,
            negotiatedUnitPrice: 1200,
            discountAmount: 0,
          },
        ],
      };

      const parsed = CreateProposalInputSchema.parse(valid);
      expect(parsed.title).toBe("Campanha Black Friday 2026");
      expect(parsed.leadId).toBe("11111111-1111-1111-1111-111111111111");
      expect(parsed.items).toHaveLength(1);
    });

    it("valida criação de proposta para Cliente cadastrado", () => {
      const validClient = {
        title: "Consultoria Trimestral",
        clientId: "33333333-3333-3333-3333-333333333333",
        validUntil: "2026-12-15",
        items: [
          {
            sourceType: "SERVICE" as const,
            serviceId: "44444444-4444-4444-4444-444444444444",
            descriptionSnapshot: "SEO & Conteúdo",
            periodicity: "MONTHLY" as const,
            quantity: 1,
            referenceUnitPrice: 2000,
            negotiatedUnitPrice: 1800,
            discountAmount: 0,
          },
        ],
      };

      const parsed = CreateProposalInputSchema.parse(validClient);
      expect(parsed.clientId).toBe("33333333-3333-3333-3333-333333333333");
    });

    it("rejeita proposta sem destinatário (sem leadId e sem clientId)", () => {
      expect(() => {
        CreateProposalInputSchema.parse({
          title: "Proposta Órfã",
          validUntil: "2026-11-30",
          items: [
            {
              sourceType: "SERVICE",
              serviceId: "44444444-4444-4444-4444-444444444444",
              descriptionSnapshot: "Serviço",
              periodicity: "MONTHLY",
              quantity: 1,
              referenceUnitPrice: 100,
              negotiatedUnitPrice: 100,
              discountAmount: 0,
            },
          ],
        });
      }).toThrow(/destinatário|Lead ou Cliente/);
    });

    it("rejeita proposta sem itens", () => {
      expect(() => {
        CreateProposalInputSchema.parse({
          title: "Proposta Vazia",
          leadId: "11111111-1111-1111-1111-111111111111",
          validUntil: "2026-11-30",
          items: [],
        });
      }).toThrow(/ao menos um item/);
    });
  });

  describe("Cenário B: Regras de Precificação, Centavos e Segregação de Periodicidades", () => {
    it("atribui corretamente negociação de Meta Ads (R$ 800) + Google Ads (R$ 700) negociados a R$ 1.200", () => {
      // Exemplo da especificação:
      // Meta Ads: R$ 800/mês
      // Google Ads: R$ 700/mês
      // Soma referência: R$ 1.500/mês
      // Negociado: R$ 1.200/mês (desconto global de R$ 300)
      const inputItems = [
        {
          sourceType: "SERVICE" as const,
          serviceId: "00000000-0000-0000-0000-000000000001",
          descriptionSnapshot: "Meta Ads",
          periodicity: "MONTHLY" as const,
          quantity: 1,
          referenceUnitPrice: 800.0,
          negotiatedUnitPrice: 800.0,
          discountAmount: 0,
          unitCost: 200.0,
          supplierId: null,
          supplierNameSnapshot: "Agência Parceira",
          costPeriodicity: "MONTHLY",
        },
        {
          sourceType: "SERVICE" as const,
          serviceId: "00000000-0000-0000-0000-000000000002",
          descriptionSnapshot: "Google Ads",
          periodicity: "MONTHLY" as const,
          quantity: 1,
          referenceUnitPrice: 700.0,
          negotiatedUnitPrice: 700.0,
          discountAmount: 0,
          unitCost: 150.0,
          supplierId: null,
          supplierNameSnapshot: "Fornecedor Google",
          costPeriodicity: "MONTHLY",
        },
      ];

      // Aplicando desconto global de 300 para fechar exatamente 1.200
      const res = ProposalService.calculatePricing(inputItems, 300.0);

      expect(res.subtotalMonthly).toBe(1500.0);
      expect(res.discountTotal).toBe(300.0);
      expect(res.totalMonthlyEffective).toBe(1200.0);
      expect(res.totalOneTimeEffective).toBe(0.0);
      expect(res.totalYearlyEffective).toBe(0.0);

      // Soma exata dos totais de cada item
      const sumItems = res.computedItems.reduce((acc, it) => acc + it.totalAmount, 0);
      expect(Number(sumItems.toFixed(2))).toBe(1200.0);

      // Custos estimados
      expect(res.estimatedMonthlyCost).toBe(350.0);
    });

    it("mantém estritamente segregadas periodicidades avulsas, mensais e anuais sem somar no mesmo total", () => {
      const mixedItems = [
        {
          sourceType: "SERVICE" as const,
          serviceId: "00000000-0000-0000-0000-000000000001",
          descriptionSnapshot: "Taxa de Setup Inicial",
          periodicity: "ONE_TIME" as const,
          quantity: 1,
          referenceUnitPrice: 2500.0,
          negotiatedUnitPrice: 2000.0,
          discountAmount: 0,
          unitCost: 500.0,
        },
        {
          sourceType: "SERVICE" as const,
          serviceId: "00000000-0000-0000-0000-000000000002",
          descriptionSnapshot: "Assinatura Mensal de Tráfego",
          periodicity: "MONTHLY" as const,
          quantity: 1,
          referenceUnitPrice: 1800.0,
          negotiatedUnitPrice: 1500.0,
          discountAmount: 100.0, // R$ 1400 líquido
          unitCost: 300.0,
        },
        {
          sourceType: "SERVICE" as const,
          serviceId: "00000000-0000-0000-0000-000000000003",
          descriptionSnapshot: "Hospedagem & Manutenção Anual",
          periodicity: "YEARLY" as const,
          quantity: 1,
          referenceUnitPrice: 1200.0,
          negotiatedUnitPrice: 1000.0,
          discountAmount: 0,
          unitCost: 200.0,
        },
      ];

      const res = ProposalService.calculatePricing(mixedItems, 0);

      // Totais por periodicidade não devem se misturar
      expect(res.subtotalOneTime).toBe(2000.0);
      expect(res.totalOneTimeEffective).toBe(2000.0);

      expect(res.subtotalMonthly).toBe(1400.0);
      expect(res.totalMonthlyEffective).toBe(1400.0);

      expect(res.subtotalYearly).toBe(1000.0);
      expect(res.totalYearlyEffective).toBe(1000.0);

      // Custos segregados
      expect(res.estimatedOneTimeCost).toBe(500.0);
      expect(res.estimatedMonthlyCost).toBe(300.0);
      expect(res.estimatedYearlyCost).toBe(200.0);
    });

    it("distribui desconto global rateado de forma determinística sem resíduo de centavos", () => {
      // 3 itens de 333,33 com desconto global de 100,00
      const oddItems = [
        {
          sourceType: "SERVICE" as const,
          descriptionSnapshot: "Item 1",
          periodicity: "MONTHLY" as const,
          quantity: 1,
          referenceUnitPrice: 100.0,
          negotiatedUnitPrice: 100.0,
          discountAmount: 0,
        },
        {
          sourceType: "SERVICE" as const,
          descriptionSnapshot: "Item 2",
          periodicity: "MONTHLY" as const,
          quantity: 1,
          referenceUnitPrice: 100.0,
          negotiatedUnitPrice: 100.0,
          discountAmount: 0,
        },
        {
          sourceType: "SERVICE" as const,
          descriptionSnapshot: "Item 3",
          periodicity: "MONTHLY" as const,
          quantity: 1,
          referenceUnitPrice: 100.0,
          negotiatedUnitPrice: 100.0,
          discountAmount: 0,
        },
      ];

      // R$ 300,00 total - R$ 50,00 de desconto global = R$ 250,00
      const res = ProposalService.calculatePricing(oddItems, 50.0);

      expect(res.totalMonthlyEffective).toBe(250.0);
      const sum = res.computedItems.reduce((acc, it) => acc + it.totalAmount, 0);
      expect(Number(sum.toFixed(2))).toBe(250.0);
    });
  });

  describe("Cenário F: Integridade do Documento PDF e Confidencialidade", () => {
    it("gera PDF válido e não expõe custos ou fornecedores internos no documento", async () => {
      const mockProposal = {
        id: "mock-prop-id-1",
        proposalCode: "PROP-00042",
        title: "Proposta Executiva de Marketing",
        status: "APPROVED",
        recipientName: "Tech Solutions LTDA",
        recipientDocument: "12.345.678/0001-99",
        validUntil: "2026-12-31",
        createdAt: "2026-10-31T14:00:00Z",
      } as unknown as ProposalRecord;

      const mockVersion = {
        id: "mock-ver-id-1",
        versionNumber: 2,
        versionStatus: "APPROVED",
        commercialTermsSnapshot: {
          validUntil: "2026-12-31",
          paymentTerms: "Faturamento mensal via PIX ou Boleto",
          startLeadTimeDays: 5,
          scopeDescription: "Desenvolvimento e gestão de tráfego de alta performance.",
          clientNotes: "Garantia de atendimento prioritário via canal corporativo.",
          internalNotes: "FORNECEDOR_SECRETO_AGENCIA_X e MARGEM_DE_LUCRO_80_PORCENTO",
        },
        subtotalOneTime: 1000.0,
        totalOneTimeEffective: 1000.0,
        subtotalMonthly: 2500.0,
        totalMonthlyEffective: 2500.0,
        subtotalYearly: 0.0,
        totalYearlyEffective: 0.0,
        estimatedMonthlyCost: 400.0, // Custo interno!
        estimatedOneTimeCost: 150.0, // Custo interno!
        items: [
          {
            id: "it-1",
            descriptionSnapshot: "Gestão Avançada de Tráfego",
            periodicity: "MONTHLY",
            quantity: 1,
            referenceUnitPrice: 3000.0,
            negotiatedUnitPrice: 2500.0,
            discountAmount: 0.0,
            totalAmount: 2500.0,
            unitCost: 400.0, // Custo interno!
            supplierNameSnapshot: "FORNECEDOR_CONFIDENCIAL_SUPPLIER_99", // Fornecedor interno!
          },
          {
            id: "it-2",
            descriptionSnapshot: "Setup & Onboarding",
            periodicity: "ONE_TIME",
            quantity: 1,
            referenceUnitPrice: 1200.0,
            negotiatedUnitPrice: 1000.0,
            discountAmount: 0.0,
            totalAmount: 1000.0,
            unitCost: 150.0,
            supplierNameSnapshot: "FORNECEDOR_SETUP_TERCEIRO",
          },
        ],
      } as unknown as ProposalVersionRecord;

      const pdfBuffer = await generateProposalPdf(mockProposal, mockVersion);

      expect(pdfBuffer).toBeDefined();
      expect(pdfBuffer.length).toBeGreaterThan(1000);

      // Converte o buffer do PDF para string e verifica se dados confidenciais NÃO vazaram
      const pdfText = pdfBuffer.toString("latin1");

      // O PDF DEVE conter o código da proposta e valores comerciais
      expect(pdfText).toContain("PROP-00042");
      expect(pdfText).toContain("Tech Solutions LTDA");

      // O PDF NÃO PODE conter fornecedores internos ou custos confidenciais
      expect(pdfText).not.toContain("FORNECEDOR_CONFIDENCIAL_SUPPLIER_99");
      expect(pdfText).not.toContain("FORNECEDOR_SETUP_TERCEIRO");
      expect(pdfText).not.toContain("FORNECEDOR_SECRETO_AGENCIA_X");
      expect(pdfText).not.toContain("MARGEM_DE_LUCRO_80_PORCENTO");
    });
  });

  describe("Cenário D & E: Schemas de Aprovação e Conversão Idempotente", () => {
    it("valida schema de aprovação com observações e número de versão", () => {
      const approval = ApproveProposalInputSchema.parse({
        approvedVersionNumber: 2,
        approvalNotes: "Cliente aprovou em reunião comercial às 15h.",
      });
      expect(approval.approvedVersionNumber).toBe(2);
      expect(approval.approvalNotes).toContain("Cliente aprovou");
    });

    it("valida schema de conversão em contrato com chave de idempotência obrigatória", () => {
      const conv = ConvertProposalToContractInputSchema.parse({
        idempotencyKey: "conv_prop_0001_v2_unique_token_xyz",
        dueDay: 15,
        startDate: "2026-11-01",
      });
      expect(conv.idempotencyKey).toBe("conv_prop_0001_v2_unique_token_xyz");
      expect(conv.dueDay).toBe(15);
    });

    it("rejeita conversão com chave de idempotência curta demais", () => {
      expect(() => {
        ConvertProposalToContractInputSchema.parse({
          idempotencyKey: "abc",
          dueDay: 10,
        });
      }).toThrow(/Chave de idempotência necessária/);
    });
  });
});
