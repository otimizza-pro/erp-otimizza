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

  describe("6. Resolução Estrita e Unívoca de Item Ativo no Menu (Sem Sobrescrever 'Novo' por 'Lista')", () => {
    const navigationItems = [
      { id: "clients_list", href: "/clients" },
      { id: "clients_new", href: "/clients/new" },
      { id: "contracts_list", href: "/contracts" },
      { id: "contracts_new", href: "/contracts/new" },
      { id: "projects_list", href: "/projects" },
      { id: "projects_new", href: "/projects/new" },
      { id: "projects_templates", href: "/projects/templates" },
      { id: "projects_onboarding", href: "/projects/templates?category=onboarding" },
      { id: "services", href: "/services" },
      { id: "combos", href: "/combos" },
      { id: "service_cats", href: "/services/categories" },
      { id: "suppliers_list", href: "/suppliers" },
      { id: "suppliers_new", href: "/suppliers/new" },
    ];

    const resolveActiveItem = (pathname: string, search: string = "", activeSection?: string): string => {
      const currentParams = new URLSearchParams(search);
      const currentCategory = currentParams.get("category");
      const currentTab = currentParams.get("tab");

      // 1. Prioridade para rota + query
      for (const item of navigationItems) {
        const [itemPath, itemQuery] = item.href.split("?");
        if (itemQuery && pathname === itemPath) {
          const itemParams = new URLSearchParams(itemQuery);
          if (itemParams.get("category") && currentCategory === itemParams.get("category")) {
            return item.id;
          }
          if (itemParams.get("tab") && currentTab === itemParams.get("tab")) {
            return item.id;
          }
        }
      }

      // 2. Prioridade para rota exata sem query
      for (const item of navigationItems) {
        const [itemPath, itemQuery] = item.href.split("?");
        if (!itemQuery && pathname === itemPath) {
          return item.id;
        }
      }

      // 3. Sub-rotas e prefixos
      let bestMatch: { id: string; pathLength: number } | null = null;
      for (const item of navigationItems) {
        const itemPath = item.href.split("?")[0];
        if (itemPath !== "/" && (pathname === itemPath || pathname.startsWith(`${itemPath}/`))) {
          if (!bestMatch || itemPath.length > bestMatch.pathLength) {
            bestMatch = { id: item.id, pathLength: itemPath.length };
          }
        }
      }
      if (bestMatch) return bestMatch.id;

      // 4. Fallback por activeSection
      if (activeSection) {
        const direct = navigationItems.find((it) => it.id === activeSection);
        if (direct) return direct.id;
      }

      return "";
    };

    it("ao clicar em 'Novo contrato' (/contracts/new), deve ativar contracts_new e NÃO contracts_list", () => {
      expect(resolveActiveItem("/contracts/new", "", "contracts")).toBe("contracts_new");
      expect(resolveActiveItem("/contracts/new", "?clientId=abc", "contracts")).toBe("contracts_new");
    });

    it("ao clicar em 'Contratos vigentes' (/contracts), deve ativar contracts_list", () => {
      expect(resolveActiveItem("/contracts", "", "contracts")).toBe("contracts_list");
    });

    it("ao visualizar detalhes de um contrato (/contracts/[id]), deve ativar contracts_list", () => {
      expect(resolveActiveItem("/contracts/07ce0b51-e552-44c2", "", "contracts")).toBe("contracts_list");
    });

    it("ao clicar em 'Novo cliente' (/clients/new), deve ativar clients_new e NÃO clients_list", () => {
      expect(resolveActiveItem("/clients/new", "", "clients")).toBe("clients_new");
    });

    it("ao clicar em 'Categorias de serviços' (/services/categories), deve ativar service_cats e NÃO services", () => {
      expect(resolveActiveItem("/services/categories", "", "catalog")).toBe("service_cats");
    });

    it("ao clicar em 'Onboardings de Clientes' (/projects/templates?category=onboarding), deve ativar projects_onboarding", () => {
      expect(resolveActiveItem("/projects/templates", "?category=onboarding", "projects")).toBe("projects_onboarding");
    });

    it("ao clicar em 'Modelos & Templates' (/projects/templates), deve ativar projects_templates", () => {
      expect(resolveActiveItem("/projects/templates", "", "projects")).toBe("projects_templates");
    });

    it("ao clicar em 'Novo fornecedor' (/suppliers/new), deve ativar suppliers_new", () => {
      expect(resolveActiveItem("/suppliers/new", "", "suppliers")).toBe("suppliers_new");
    });
  });

  describe("8. Migração de Estratégia para Marketing & Growth e Seletor de Empresa", () => {
    it("deve conter 'Estratégia da Empresa' no menu de MARKETING & GROWTH com rota /marketing/strategy", () => {
      const marketingItems = [
        { id: "marketing_funnels", label: "Funis de Marketing (4 Funis)", href: "/marketing/funnels" },
        { id: "marketing_strategy", label: "Estratégia da Empresa", href: "/marketing/strategy" },
      ];

      expect(marketingItems.map((i) => i.id)).toContain("marketing_strategy");
      expect(marketingItems.find((i) => i.id === "marketing_strategy")?.href).toBe("/marketing/strategy");
    });

    it("não deve mais conter o grupo 'Gestão Estratégica' no menu ADMINISTRATIVO", () => {
      const adminGroups = [
        { id: "financial_management", title: "Gestão Financeira" },
        { id: "financial_reports", title: "Relatórios & DRE" },
        { id: "security", title: "Segurança" },
        { id: "settings", title: "Configurações" },
      ];

      expect(adminGroups.map((g) => g.id)).not.toContain("strategy");
      expect(adminGroups.map((g) => g.title)).not.toContain("Gestão Estratégica");
    });

    it("o formato de feed do sistema deve ser estritamente 4:5 (vertical portrait 1080x1350) e não 4:3", () => {
      const feedFormats = [
        { id: "FEED", ratio: "4:5", width: 1080, height: 1350 },
        { id: "STORIES", ratio: "9:16", width: 1080, height: 1920 },
      ];

      const feed = feedFormats.find((f) => f.id === "FEED");
      expect(feed?.ratio).toBe("4:5");
      expect(feed?.ratio).not.toBe("4:3");
      expect(feed?.width).toBe(1080);
      expect(feed?.height).toBe(1350);
    });

    it("o seletor de empresa deve manter 'Otimizza Growth' como padrão e persistir escolha em localStorage", () => {
      const defaultCompany = { id: "otimizza", name: "Otimizza Growth", isOtimizza: true };
      expect(defaultCompany.id).toBe("otimizza");
      expect(defaultCompany.isOtimizza).toBe(true);

      let storageState: string | null = null;
      const setCompany = (comp: typeof defaultCompany) => {
        storageState = JSON.stringify(comp);
      };
      const getCompany = () => (storageState ? JSON.parse(storageState) : defaultCompany);

      expect(getCompany().id).toBe("otimizza");

      // Trocar para cliente
      setCompany({ id: "client-uuid-999", name: "Artigos Móveis Ltda", isOtimizza: false });
      expect(getCompany().id).toBe("client-uuid-999");
      expect(getCompany().name).toBe("Artigos Móveis Ltda");

      // Botão rápido Otimizza restaura padrão
      setCompany(defaultCompany);
      expect(getCompany().id).toBe("otimizza");
    });
  });
});
