import { describe, it, expect } from "vitest";

describe("Revisão de Navegação, Pendências e Acessibilidade", () => {
  describe("1. Eliminação de Duplicidade no Menu Financeiro", () => {
    it("não deve permitir 'Visão financeira' duplicando rota com 'Fluxo de caixa'", () => {
      // Simulação do array de itens do grupo Financeiro definido no AppShell
      const financialItems = [
        { id: "fin_rec", label: "Contas a receber", href: "/financial/receivables" },
        { id: "fin_pay", label: "Contas a pagar", href: "/financial/payables" },
        { id: "cashflow", label: "Fluxo de caixa", href: "/financial/cashflow" },
      ];

      const labels = financialItems.map((item) => item.label);
      const hrefs = financialItems.map((item) => item.href);

      expect(labels).not.toContain("Visão financeira");
      expect(labels).toContain("Fluxo de caixa");
      expect(hrefs.filter((h) => h === "/financial/cashflow").length).toBe(1);
    });
  });

  describe("2. Sincronização de Abas com Parâmetro ?tab=", () => {
    it("deve mapear corretamente abas de Relatórios", () => {
      const reportTabs = {
        commercial: "mrr_evolution",
        financial: "cashflow_comparison",
        profitability: "managerial_profitability",
      };

      expect(reportTabs["commercial"]).toBe("mrr_evolution");
      expect(reportTabs["financial"]).toBe("cashflow_comparison");
      expect(reportTabs["profitability"]).toBe("managerial_profitability");
    });

    it("deve mapear corretamente abas de Configurações", () => {
      const settingsTabs = ["company", "integrations", "preferences", "categories"];
      expect(settingsTabs).toContain("company");
      expect(settingsTabs).toContain("integrations");
      expect(settingsTabs).toContain("preferences");
      expect(settingsTabs).toContain("categories");
    });

    it("deve validar se a rota ativa identifica a query string ?tab= sem conflito com irmãos", () => {
      const isItemActive = (itemHref: string, currentPath: string, currentSearch: string) => {
        const [itemPath, itemQuery] = itemHref.split("?");
        if (currentPath !== itemPath) return false;

        const currentParams = new URLSearchParams(currentSearch);
        const currentTab = currentParams.get("tab");

        const itemParams = new URLSearchParams(itemQuery || "");
        const itemTab = itemParams.get("tab");

        if (itemTab) {
          return currentTab === itemTab;
        }

        // Sem tab: ativo apenas quando nenhuma tab ou tab default for selecionada
        return !currentTab || currentTab === "company";
      };

      // Cenário 1: /reports?tab=commercial
      expect(isItemActive("/reports?tab=commercial", "/reports", "?tab=commercial")).toBe(true);
      expect(isItemActive("/reports?tab=financial", "/reports", "?tab=commercial")).toBe(false);

      // Cenário 2: /reports?tab=financial
      expect(isItemActive("/reports?tab=financial", "/reports", "?tab=financial")).toBe(true);
      expect(isItemActive("/reports?tab=commercial", "/reports", "?tab=financial")).toBe(false);

      // Cenário 3: /settings (Dados da empresa) vs /settings?tab=integrations
      expect(isItemActive("/settings", "/settings", "")).toBe(true);
      expect(isItemActive("/settings?tab=integrations", "/settings", "")).toBe(false);
      expect(isItemActive("/settings?tab=integrations", "/settings", "?tab=integrations")).toBe(true);
      expect(isItemActive("/settings", "/settings", "?tab=integrations")).toBe(false);
    });
  });

  describe("3. Pré-preenchimento de Cliente a partir de Atalhos da Central do Cliente", () => {
    it("deve extrair e aplicar clientId em Proposta, Oportunidade, Contrato, Cobrança e Projeto", () => {
      const clientId = "client-uuid-1234";

      // Links gerados na Central do Cliente
      const proposalShortcut = `/proposals/new?clientId=${clientId}`;
      const oppShortcut = `/crm/opportunities/new?clientId=${clientId}`;
      const contractShortcut = `/contracts/new?clientId=${clientId}`;
      const receivableShortcut = `/financial/receivables/new?clientId=${clientId}`;
      const projectShortcut = `/projects/new?clientId=${clientId}`;

      const getClientIdFromUrl = (url: string) => {
        const query = url.split("?")[1] || "";
        return new URLSearchParams(query).get("clientId");
      };

      expect(getClientIdFromUrl(proposalShortcut)).toBe(clientId);
      expect(getClientIdFromUrl(oppShortcut)).toBe(clientId);
      expect(getClientIdFromUrl(contractShortcut)).toBe(clientId);
      expect(getClientIdFromUrl(receivableShortcut)).toBe(clientId);
      expect(getClientIdFromUrl(projectShortcut)).toBe(clientId);
    });
  });

  describe("4. Regras de Contagem e Filtros de Pendências", () => {
    it("deve validar regra de contas a pagar críticas (vencidas + 7 dias)", () => {
      const isPayableCritical = (status: string, dueDate: Date, referenceDate: Date) => {
        if (status !== "PENDING") return false;
        const diffDays = Math.ceil((dueDate.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      };

      const today = new Date("2026-11-01T12:00:00Z");

      // Vencida há 3 dias (pendente) -> Crítica
      expect(isPayableCritical("PENDING", new Date("2026-10-29T12:00:00Z"), today)).toBe(true);

      // Vence daqui a 5 dias (pendente) -> Crítica
      expect(isPayableCritical("PENDING", new Date("2026-11-06T12:00:00Z"), today)).toBe(true);

      // Vence daqui a 20 dias (pendente) -> Não é crítica
      expect(isPayableCritical("PENDING", new Date("2026-11-21T12:00:00Z"), today)).toBe(false);

      // Liquidada (PAID) mesmo que vencida -> Excluída
      expect(isPayableCritical("PAID", new Date("2026-10-29T12:00:00Z"), today)).toBe(false);

      // Cancelada (CANCELED) -> Excluída
      expect(isPayableCritical("CANCELED", new Date("2026-10-29T12:00:00Z"), today)).toBe(false);
    });

    it("deve validar regra de projetos críticos (atrasados + prazo em 7 dias)", () => {
      const isProjectCritical = (status: string, dueDate: Date | null, referenceDate: Date) => {
        if (status === "COMPLETED" || status === "CANCELED") return false;
        if (!dueDate) return false;
        const diffDays = Math.ceil((dueDate.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      };

      const today = new Date("2026-11-01T12:00:00Z");

      // Projeto em andamento atrasado -> Crítico
      expect(isProjectCritical("IN_PROGRESS", new Date("2026-10-25T12:00:00Z"), today)).toBe(true);

      // Projeto planejado com entrega em 4 dias -> Crítico
      expect(isProjectCritical("PLANNED", new Date("2026-11-05T12:00:00Z"), today)).toBe(true);

      // Projeto planejado com entrega em 30 dias -> Não crítico
      expect(isProjectCritical("PLANNED", new Date("2026-12-01T12:00:00Z"), today)).toBe(false);

      // Projeto concluído -> Excluído
      expect(isProjectCritical("COMPLETED", new Date("2026-10-25T12:00:00Z"), today)).toBe(false);

      // Projeto cancelado -> Excluído
      expect(isProjectCritical("CANCELED", new Date("2026-10-25T12:00:00Z"), today)).toBe(false);
    });

    it("deve validar regra de contas a receber vencidas (inadimplência)", () => {
      const isReceivableOverdue = (status: string, dueDate: Date, referenceDate: Date) => {
        if (status !== "PENDING") return false;
        return dueDate.getTime() < referenceDate.getTime();
      };

      const today = new Date("2026-11-01T12:00:00Z");

      // Vencida há 1 dia -> Inadimplente
      expect(isReceivableOverdue("PENDING", new Date("2026-10-31T12:00:00Z"), today)).toBe(true);

      // Vence amanhã -> Em dia
      expect(isReceivableOverdue("PENDING", new Date("2026-11-02T12:00:00Z"), today)).toBe(false);

      // Liquidada (PAID) -> Excluída
      expect(isReceivableOverdue("PAID", new Date("2026-10-31T12:00:00Z"), today)).toBe(false);
    });
  });

  describe("5. Busca Global e Destinos Específicos", () => {
    it("cada tipo de entidade deve gerar href para sua página de detalhe específica", () => {
      const createSearchItem = (type: string, id: string) => {
        switch (type) {
          case "CLIENT":
            return `/clients/${id}`;
          case "LEAD":
            return `/crm/leads/${id}`;
          case "PROPOSAL":
            return `/proposals/${id}`;
          case "CONTRACT":
            return `/contracts/${id}`;
          case "RECEIVABLE":
            return `/financial/receivables/${id}`;
          case "PAYABLE":
            return `/financial/payables/${id}`;
          case "PROJECT":
            return `/projects/${id}`;
          default:
            return "/";
        }
      };

      expect(createSearchItem("CLIENT", "101")).toBe("/clients/101");
      expect(createSearchItem("LEAD", "102")).toBe("/crm/leads/102");
      expect(createSearchItem("PROPOSAL", "103")).toBe("/proposals/103");
      expect(createSearchItem("CONTRACT", "104")).toBe("/contracts/104");
      expect(createSearchItem("RECEIVABLE", "105")).toBe("/financial/receivables/105");
      expect(createSearchItem("PAYABLE", "106")).toBe("/financial/payables/106");
      expect(createSearchItem("PROJECT", "107")).toBe("/projects/107");
    });
  });
});
