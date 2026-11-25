"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  Users,
  Package,
  Layers,
  Settings,
  ShieldCheck,
  Menu,
  X,
  Database,
  RefreshCw,
  LogOut,
  DollarSign,
  BarChart3,
  Truck,
  TrendingUp,
  FileText,
  Briefcase,
  ChevronDown,
  ChevronRight,
  Search,
  Plus,
  Building,
  CheckCircle2,
  FolderOpen,
  PieChart,
  ArrowRight,
  ExternalLink,
  Command,
  PanelLeftClose,
  PanelLeftOpen,
  Calendar,
  Sparkles,
  Lightbulb,
  Compass,
  BookOpen,
  Rocket,
  Image as ImageIcon,
  Target,
  Bell,
} from "lucide-react";
import { SearchItem } from "@/app/api/search/route";
import { CompanySelector } from "@/components/layout/company-selector";

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
}

interface NavGroup {
  id: string;
  title: string;
  icon: React.ElementType;
  section: "MARKETING & GROWTH" | "COMERCIAL" | "PRODUÇÃO" | "ADMINISTRATIVO";
  items: NavItem[];
}

interface AppShellProps {
  children: React.ReactNode;
  activeSection?: string;
}

function NavigationSearchSync({onChange}:{onChange:(value:string)=>void}) {
  const params=useSearchParams();
  const value=params.toString();
  useEffect(()=>onChange(value?"?"+value:""),[value,onChange]);
  return null;
}

export function AppShell({ children, activeSection }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isEmbedded, setIsEmbedded] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && (window.self !== window.top || window.location.search.includes("embedded=true"))) {
        setIsEmbedded(true);
      }
    } catch {
      setIsEmbedded(true);
    }
  }, []);

  // Estados de layout
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile drawer
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // Desktop compact
  const [loggingOut, setLoggingOut] = useState(false);

  // Estados de grupos expansíveis
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Estados de atalhos rápidos "+ Novo" e Busca Global
  const [newDropdownOpen, setNewDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(-1);
  const [searchLoading, setSearchLoading] = useState(false);

  // Acessibilidade por teclado: submenus recolhidos e foco em modais
  const [keyboardFlyoutGroupId, setKeyboardFlyoutGroupId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);
  const searchModalContainerRef = useRef<HTMLDivElement>(null);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);
  const newDropdownRef = useRef<HTMLDivElement>(null);
  const newDropdownButtonRef = useRef<HTMLButtonElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Mapeamento dos grupos do menu organizados nos Pilares Estratégicos: Marketing & Growth, Comercial, Produção e Administrativo
  const [commercialPipelines, setCommercialPipelines] = useState<{id:string;name:string;status:string}[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    let pending=false,updatedAt=0;
    const load = async (force=false) => {
      if(pending||(!force&&Date.now()-updatedAt<60000))return;
      pending=true;
      try {
        const response = await fetch("/api/crm/pipelines", {signal:controller.signal});
        if (!response.ok) throw new Error("Não foi possível atualizar os funis do menu");
        const data = await response.json();
        if (Array.isArray(data)) {setCommercialPipelines(data.filter(p => p.status === "ACTIVE"));updatedAt=Date.now();}
      } catch (error) {if (!controller.signal.aborted) console.error("Falha ao carregar menu comercial", error);}
      finally{pending=false;}
    };
    const onChange=()=>{void load(true);};
    const onFocus=()=>{void load();};
    void load();
    window.addEventListener("crm-pipelines-changed", onChange);
    window.addEventListener("focus", onFocus);
    return () => {controller.abort();window.removeEventListener("crm-pipelines-changed", onChange);window.removeEventListener("focus", onFocus);};
  }, []);

  const navigationGroups: NavGroup[] = [
    { id: "marketing_growth", title: "Marketing & Growth", icon: Target, section: "MARKETING & GROWTH", items: [
      { id: "marketing_funnels", label: "Funis de Marketing", href: "/marketing/funnels", icon: Target },
      { id: "marketing_strategy", label: "Estratégia da Empresa", href: "/marketing/strategy", icon: Target },
    ] },
    { id: "commercial", title: "CRM & Vendas", icon: TrendingUp, section: "COMERCIAL", items: [
      { id: "crm_overview", label: "Visão comercial", href: "/crm", icon: TrendingUp },
      { id: "crm_leads", label: "Leads", href: "/crm/leads", icon: TrendingUp },
      { id: "crm_opportunities", label: "Oportunidades", href: "/crm/opportunities", icon: TrendingUp },
      ...commercialPipelines.map(pipeline => ({id:"crm_pipeline_" + pipeline.id, label:pipeline.name, href:"/crm/pipelines/" + encodeURIComponent(pipeline.id), icon:TrendingUp})),
      { id: "crm_activities", label: "Atividades comerciais", href: "/crm/activities", icon: TrendingUp },
    ] },
    { id: "clients", title: "Clientes", icon: Users, section: "COMERCIAL", items: [
      { id: "clients_list", label: "Clientes", href: "/clients", icon: Users },
      { id: "former_clients", label: "Ex-Clientes", href: "/clients/former", icon: Users },
    ] },
    { id: "contracts", title: "Propostas e Contratos", icon: FileText, section: "COMERCIAL", items: [
      { id: "proposals_list", label: "Propostas comerciais", href: "/proposals", icon: FileText },
      { id: "contracts_list", label: "Contratos vigentes", href: "/contracts", icon: FileText },
    ] },
    { id: "strategy", title: "Estratégia", icon: Compass, section: "PRODUÇÃO", items: [
      { id: "strategy_overview", label: "Estratégia", href: "/strategy", icon: Compass },
    ] },
    { id: "projects", title: "Projetos", icon: Briefcase, section: "PRODUÇÃO", items: [
      { id: "projects_new", label: "Novo projeto", href: "/projects/new", icon: Briefcase },
      { id: "projects_list", label: "Projetos em andamento", href: "/projects", icon: Briefcase },
    ] },
    { id: "content_studio", title: "Social Media", icon: Sparkles, section: "PRODUÇÃO", items: [
      { id: "editorial", label: "Linha Editorial", href: "/social/editorial", icon: Layers },
      { id: "content_brainstorm", label: "Brainstorm de Conteúdo", href: "/prompt-creator/headlines", icon: Lightbulb },
      { id: "prompt_creator", label: "Estúdio Criativo", href: "/prompt-creator", icon: Sparkles },
      { id: "calendar", label: "Calendário de Conteúdo", href: "/prompt-creator?tab=CALENDAR", icon: Calendar },
      { id: "saved_posts", label: "Feed & Criativos", href: "/prompt-creator/saved", icon: ImageIcon },
    ] },
    { id: "paid_media", title: "Tráfego pago", icon: Target, section: "PRODUÇÃO", items: [
      { id: "meta-ads", label: "Anúncios Meta Ads", href: "/operations/meta-ads", icon: Target },
      { id: "google-ads", label: "Anúncios Google Ads", href: "/operations/google-ads", icon: Target },
    ] },
    { id: "web", title: "WEB", icon: Layers, section: "PRODUÇÃO", items: [
      { id: "domains", label: "Domínios", href: "/operations/domains", icon: Layers },
      { id: "hosting", label: "Hospedagem", href: "/operations/hosting", icon: Layers },
      { id: "landing-pages", label: "Landing Pages", href: "/operations/landing-pages", icon: Layers },
      { id: "websites", label: "Sites Institucionais", href: "/operations/websites", icon: Layers },
      { id: "google-business", label: "Google Meu Negócio", href: "/operations/google-business", icon: Layers },
      { id: "search", label: "SEO, AEO, GEO, SXO", href: "/operations/search", icon: Layers },
      { id: "web-settings", label: "Outras Configurações", href: "/operations/web-settings", icon: Layers },
    ] },
    { id: "financial", title: "Financeiro", icon: DollarSign, section: "ADMINISTRATIVO", items: [
      { id: "receivables", label: "Contas a Receber", href: "/financial/receivables", icon: DollarSign },
      { id: "payables", label: "Contas a pagar", href: "/financial/payables", icon: DollarSign },
      { id: "cashflow", label: "Fluxo de caixa", href: "/financial/cashflow", icon: DollarSign },
      { id: "dre", label: "DRE gerencial", href: "/financial/dre", icon: DollarSign },
      { id: "cost_centers", label: "Centros de custo", href: "/financial/cost-centers", icon: DollarSign },
    ] },
    { id: "reports", title: "Relatórios & BI", icon: BarChart3, section: "ADMINISTRATIVO", items: [
      { id: "client_results", label: "Resultado dos Clientes", href: "/reports/client-results", icon: BarChart3 },
      { id: "headline_bi", label: "BI de Headlines e IAs", href: "/prompt-creator/headlines/bi", icon: BarChart3 },
      { id: "reports_comm", label: "Indicadores comerciais", href: "/reports?tab=commercial", icon: BarChart3 },
      { id: "reports_fin", label: "Indicadores financeiros", href: "/reports?tab=financial", icon: BarChart3 },
      { id: "delivery", label: "Indicadores de Entrega", href: "/reports/delivery", icon: BarChart3 },
      { id: "performance", label: "Indicadores de Performance", href: "/reports/performance", icon: BarChart3 },
    ] },
    { id: "documents", title: "Documentos & Senhas", icon: FolderOpen, section: "ADMINISTRATIVO", items: [
      { id: "documents_repo", label: "Repositório de documentos", href: "/documents", icon: FolderOpen },
      { id: "passwords", label: "Gerenciador de senhas", href: "/passwords", icon: FolderOpen },
    ] },
    { id: "settings", title: "Configurações", icon: Settings, section: "ADMINISTRATIVO", items: [
      { id: "crm_pipelines", label: "Configurar Funis & Etapas", href: "/crm/pipelines", icon: Settings },
      { id: "projects_templates", label: "Onboarding e Templates", href: "/projects/templates", icon: Settings },
      { id: "services", label: "Serviços", href: "/services", icon: Settings },
      { id: "accounts", label: "Contas financeiras", href: "/financial/accounts", icon: Settings },
      { id: "suppliers_list", label: "Fornecedores", href: "/suppliers", icon: Settings },
      { id: "settings_main", label: "Dados da empresa", href: "/settings", icon: Settings },
      { id: "knowledge_manual", label: "Manuais da Otimizza", href: "/informacoes-otimizza", icon: Settings },
      { id: "settings_int", label: "Integrações", href: "/settings?tab=integrations", icon: Settings },
      { id: "settings_pref", label: "Preferências", href: "/settings?tab=preferences", icon: Settings },
    ] },
  ];

  // Estado da busca de URL (para sincronização perfeita de ?tab= e ?category=)
  const [currentSearch, setCurrentSearch] = useState("");


  // Determina de forma estrita e unívoca exatamente um único item ativo no menu
  const activeItemId = React.useMemo<string>(() => {
    if (!pathname) return "";
    if (pathname === "/") return "inicio";

    const allItems = navigationGroups.flatMap((g) => g.items);

    const pipelineItem = allItems.find(item => item.id.startsWith("crm_pipeline_") && pathname === item.href);
    if (pipelineItem) return pipelineItem.id;
    const currentParams = new URLSearchParams(currentSearch);
    const currentTab = currentParams.get("tab");
    const currentCategory = currentParams.get("category");

    // 0. PRIORIDADE ABSOLUTA: activeSection explícito declarado no AppShell da página
    if (activeSection && !currentTab && !currentCategory) {
      const directMatch = allItems.find((it) => it.id === activeSection);
      if (directMatch) return directMatch.id;
      if (activeSection === "clients_new") return "clients_list";
      if (activeSection === "contracts_new") return "contracts_list";
      if (activeSection === "suppliers_new") return "suppliers_list";
      if (activeSection === "projects_new") return "projects_new";
      if (activeSection === "projects_templates") return "projects_templates";
      if (activeSection === "projects_onboarding") return "projects_templates";
      if (activeSection === "clients") return "clients_list";
      if (activeSection === "contracts") return "contracts_list";
      if (activeSection === "projects") return "projects_list";
      if (activeSection === "crm") return "crm_overview";
      if (activeSection === "catalog" || activeSection === "combos" || activeSection === "service_cats") return "services";
      if (activeSection === "suppliers") return "suppliers_list";
      if (activeSection === "reports") return "reports_comm";
    }

    if (pathname === "/combos" || pathname.startsWith("/combos/")) return "services";

    // 1. Correspondência exata por rota + query parameter
    // Ex: /projects/templates?category=onboarding casa com projects_onboarding
    // Ex: /reports?tab=commercial casa com reports_comm
    // Ex: /strategy?tab=diagnosis casa com strategy_diagnosis
    for (const item of allItems) {
      const [itemPath, itemQuery] = item.href.split("?");
      if (itemQuery && pathname === itemPath) {
        const itemParams = new URLSearchParams(itemQuery);
        const itemTab = itemParams.get("tab");
        const itemCategory = itemParams.get("category");

        if (itemCategory && currentCategory === itemCategory) {
          return item.id;
        }
        if (itemTab && currentTab === itemTab) {
          return item.id;
        }
        if (currentSearch === `?${itemQuery}` || currentSearch.includes(itemQuery)) {
          return item.id;
        }
      }
    }

    if (pathname === "/reports" && currentTab === "profitability") return "reports_fin";

    // 2. CORRESPONDÊNCIA EXATA DE PATHNAME PURO (sem query string no item)
    // Identifica a página pelo caminho exato antes de verificar sub-rotas.
    for (const item of allItems) {
      const [itemPath, itemQuery] = item.href.split("?");
      if (!itemQuery && pathname === itemPath) {
        return item.id;
      }
    }

    // 3. SUB-ROTAS E PREFIXOS MAIS ESPECÍFICOS (ex: /contracts/uuid -> contracts_list, /crm/leads/uuid -> crm_leads)
    let bestMatch: { id: string; pathLength: number } | null = null;
    for (const item of allItems) {
      const itemPath = item.href.split("?")[0];
      if (itemPath !== "/" && pathname.startsWith(`${itemPath}/`)) {
        if (!bestMatch || itemPath.length > bestMatch.pathLength) {
          bestMatch = { id: item.id, pathLength: itemPath.length };
        }
      }
    }

    if (bestMatch) {
      return bestMatch.id;
    }

    // 5. Fallback por rota base sem query (ex: /reports sem parâmetros ativa o primeiro relatório)
    for (const item of allItems) {
      const itemPath = item.href.split("?")[0];
      if (pathname === itemPath) {
        return item.id;
      }
    }

    return "";
  }, [pathname, currentSearch, activeSection, navigationGroups]);

  // Função para determinar se um item específico é o item ativo (garante exclusividade mútua)
  const isItemActive = (item: NavItem, _group?: NavGroup): boolean => {
    return activeItemId === item.id;
  };

  // Determinar grupo ativo atual pelo item ativo
  const activeGroupId = React.useMemo(() => {
    if(pathname?.startsWith("/crm/pipelines/"))return "commercial";
    if (activeItemId === "inicio") return "inicio";
    for (const group of navigationGroups) {
      if (group.items.some((it) => it.id === activeItemId)) {
        return group.id;
      }
    }
    return "";
  }, [activeItemId, navigationGroups,pathname]);

  // Inicializar estado dos grupos: ler localStorage ou abrir apenas o grupo da página ativa
  useEffect(() => {
    let saved:string|null=null;
    try{saved=localStorage.getItem("otimizza_sidebar_groups");}catch{/* Storage can be unavailable. */}
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (activeGroupId && !parsed[activeGroupId]) {
          parsed[activeGroupId] = true;
        }
        setExpandedGroups(parsed);
        return;
      } catch {
        // Fallback
      }
    }
    if (activeGroupId) {
      setExpandedGroups(prev=>({...prev,[activeGroupId]:true}));
    }
  }, [activeGroupId]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = { ...prev, [groupId]: !prev[groupId] };
      try{localStorage.setItem("otimizza_sidebar_groups", JSON.stringify(next));}catch{/* The menu still works without storage. */}
      return next;
    });
  };

  const openSearchModal = () => {
    lastFocusedElementRef.current = (document.activeElement as HTMLElement) || searchTriggerRef.current;
    setSearchModalOpen(true);
  };

  const closeSearchModal = () => {
    setSearchModalOpen(false);
    setTimeout(() => {
      lastFocusedElementRef.current?.focus();
    }, 30);
  };

  // Atalho global Ctrl+K / Cmd+K para busca e Escape para fechar modais/submenus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (searchModalOpen) {
          closeSearchModal();
        } else {
          openSearchModal();
        }
      } else if (e.key === "Escape") {
        if (keyboardFlyoutGroupId) {
          const btn = document.getElementById(`collapsed-btn-${keyboardFlyoutGroupId}`);
          setKeyboardFlyoutGroupId(null);
          btn?.focus();
        }
        if (searchModalOpen) {
          closeSearchModal();
        }
        if (newDropdownOpen) {
          setNewDropdownOpen(false);
          newDropdownButtonRef.current?.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchModalOpen, newDropdownOpen, keyboardFlyoutGroupId]);

  // Foco no input de busca ao abrir modal
  useEffect(() => {
    if (searchModalOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [searchModalOpen]);

  // Fechar dropdown de "+ Novo" e notificações ao clicar fora ou apertar Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (newDropdownRef.current && !newDropdownRef.current.contains(e.target as Node)) {
        setNewDropdownOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setNewDropdownOpen(false);
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Busca instantânea com debounce e cancelamento via AbortController (previne race conditions)
  useEffect(() => {
    setSelectedSearchIndex(-1);
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    const controller = new AbortController();

    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
          setSelectedSearchIndex(-1);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          return; // Requisição cancelada intencionalmente
        }
        console.error("Erro na busca:", err);
      } finally {
        if (!controller.signal.aborted) {
          setSearchLoading(false);
        }
      }
    }, 250);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [searchQuery]);

  const handleLogout = async () => {
    if (typeof window !== "undefined" && !window.confirm("Deseja realmente sair do sistema?")) {
      return;
    }
    setLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Erro ao encerrar sessão:", err);
    } finally {
      router.push("/login");
    }
  };

  if (isEmbedded) {
    return <main className="w-full min-h-screen bg-transparent p-2 sm:p-4">{children}</main>;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-zinc-900 flex flex-col md:flex-row antialiased font-sans">
      <React.Suspense fallback={null}><NavigationSearchSync onChange={setCurrentSearch}/></React.Suspense>
      {/* Mobile Drawer Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Principal */}
      <aside
        className={`fixed md:sticky top-0 h-screen bg-white border-r border-zinc-200/80 z-50 flex flex-col justify-between transition-all duration-200 ease-out shadow-xs ${
          sidebarCollapsed ? "w-20" : "w-68"
        } ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Cabeçalho do Menu & Logotipo */}
          <div
            className={`border-b border-zinc-100 flex shrink-0 items-center transition-all ${
              sidebarCollapsed ? "h-16 justify-between px-2.5" : "h-24 justify-between px-3"
            }`}
          >
            <Link
              href="/"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center overflow-hidden transition-opacity hover:opacity-90 ${
                sidebarCollapsed ? "justify-center shrink-0" : "h-full flex-1 min-w-0 mr-2 py-2"
              }`}
              title="Otimizza ERP"
            >
              {sidebarCollapsed ? (
                <Image
                  src="/brand/perfil-otimizza-principal.png"
                  alt="Otimizza ERP"
                  width={34}
                  height={34}
                  priority
                  className="w-8 h-8 object-contain"
                />
              ) : (
                <Image
                  src="/brand/logo-principal.svg"
                  alt="Otimizza ERP"
                  width={224}
                  height={78}
                  priority
                  className="h-full w-full object-contain object-left"
                />
              )}
            </Link>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className={`hidden md:flex text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition ${
                  sidebarCollapsed ? "p-1" : "p-1.5"
                }`}
                title={sidebarCollapsed ? "Expandir barra lateral" : "Recolher barra lateral"}
                aria-label="Alternar barra lateral"
              >
                {sidebarCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4" />
                ) : (
                  <PanelLeftClose className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => setSidebarOpen(false)}
                className="md:hidden text-zinc-400 hover:text-zinc-700 p-1.5 rounded-lg hover:bg-zinc-100 transition"
                aria-label="Fechar menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navegação Hierárquica */}
          <nav className="p-2 space-y-1 flex-1 overflow-y-auto">
            {/* Item Raiz: Início */}
            <Link
              href="/"
              onClick={() => setSidebarOpen(false)}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                pathname === "/"
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100/70"
              }`}
              title="Início"
            >
              <LayoutDashboard className={`w-4 h-4 shrink-0 ${pathname === "/" ? "text-white" : "text-zinc-400"}`} strokeWidth={1.5} />
              {!sidebarCollapsed && <span>Início</span>}
            </Link>

            {/* Grupos Expansíveis e Recolhíveis nos 3 Pilares */}
            {navigationGroups.map((group, groupIdx) => {
              const prevGroup = groupIdx > 0 ? navigationGroups[groupIdx - 1] : null;
              const isNewSection = !prevGroup || prevGroup.section !== group.section;
              const isGroupActive = activeGroupId === group.id;
              const isExpanded = expandedGroups[group.id] ?? isGroupActive;
              const GroupIcon = group.icon;

              // No modo colapsado, exibe ícones com flyout no hover e controle via teclado
              if (sidebarCollapsed) {
                const isFlyoutOpen = keyboardFlyoutGroupId === group.id;

                return (
                  <React.Fragment key={group.id}>
                    {isNewSection && groupIdx > 0 && (
                      <div className="my-2 border-t border-zinc-200/80 w-8 mx-auto" />
                    )}
                    <div
                      className="relative group/flyout"
                      onBlur={(e) => {
                        // Se o foco sair do botão e do flyout deste grupo, fechar o flyout
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                          if (keyboardFlyoutGroupId === group.id) {
                            setKeyboardFlyoutGroupId(null);
                          }
                        }
                      }}
                    >
                      <button
                        id={`collapsed-btn-${group.id}`}
                        type="button"
                        aria-haspopup="true"
                        aria-expanded={isFlyoutOpen}
                        aria-controls={`collapsed-flyout-${group.id}`}
                        onClick={() => {
                          setKeyboardFlyoutGroupId((prev) => (prev === group.id ? null : group.id));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " " || e.key === "ArrowRight" || e.key === "ArrowDown") {
                            e.preventDefault();
                            setKeyboardFlyoutGroupId(group.id);
                            setTimeout(() => {
                              const firstItem = document.querySelector<HTMLAnchorElement>(`#collapsed-flyout-${group.id} a`);
                              firstItem?.focus();
                            }, 50);
                          } else if (e.key === "Escape") {
                            e.preventDefault();
                            setKeyboardFlyoutGroupId(null);
                          }
                        }}
                        className={`w-full flex items-center justify-center p-2.5 rounded-xl transition cursor-pointer focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:outline-none ${
                          isGroupActive
                            ? "bg-zinc-900 text-white"
                            : "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100"
                        }`}
                        title={group.title}
                        aria-label={group.title}
                      >
                        <GroupIcon className="w-4 h-4" />
                      </button>

                      {/* Popover Flyout acessível tanto no hover do mouse quanto via teclado */}
                      <div
                        id={`collapsed-flyout-${group.id}`}
                        role="menu"
                        aria-label={group.title}
                        className={`${
                          isFlyoutOpen ? "block" : "hidden"
                        } group-hover/flyout:block absolute left-full top-0 ml-2 w-52 bg-white border border-zinc-200/90 rounded-xl shadow-xl z-50 py-1.5 px-1 animate-in fade-in duration-100`}
                      >
                        <div className="px-2.5 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-100 mb-1 flex items-center gap-1.5">
                          <GroupIcon className="w-3 h-3 text-zinc-500" />
                          <span>{group.title}</span>
                        </div>
                        <div className="space-y-0.5">
                          {group.items.map((item, itemIdx) => {
                            const active = isItemActive(item, group);
                            return (
                              <Link
                                key={item.id}
                                href={item.href}
                                role="menuitem"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (e.key === "Escape" || e.key === "ArrowLeft") {
                                    e.preventDefault();
                                    setKeyboardFlyoutGroupId(null);
                                    document.getElementById(`collapsed-btn-${group.id}`)?.focus();
                                  } else if (e.key === "ArrowDown") {
                                    e.preventDefault();
                                    const items = document.querySelectorAll<HTMLAnchorElement>(`#collapsed-flyout-${group.id} a`);
                                    const next = (itemIdx + 1) % items.length;
                                    items[next]?.focus();
                                  } else if (e.key === "ArrowUp") {
                                    e.preventDefault();
                                    const items = document.querySelectorAll<HTMLAnchorElement>(`#collapsed-flyout-${group.id} a`);
                                    const prev = (itemIdx - 1 + items.length) % items.length;
                                    items[prev]?.focus();
                                  }
                                }}
                                onClick={() => {
                                  setKeyboardFlyoutGroupId(null);
                                  const q = item.href.includes("?") ? item.href.split("?")[1] : "";
                                  setCurrentSearch(q ? `?${q}` : "");
                                }}
                                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:outline-none ${
                                  active
                                    ? "bg-zinc-900 text-white font-semibold"
                                    : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 focus:bg-zinc-100"
                                }`}
                              >
                                <span className="truncate">{item.label}</span>
                                {active && <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              }

              return (
                <div key={group.id} className="space-y-0.5">
                  {/* Divisor e Título de Seção (Pilar) */}
                  {isNewSection && (
                    <div className="pt-3.5 pb-1 px-2.5 text-[11px] font-medium text-zinc-400 select-none flex items-center gap-2">
                      <span>{group.section === "MARKETING & GROWTH" ? "Marketing & Growth" : group.section === "COMERCIAL" ? "Comercial" : group.section === "PRODUÇÃO" ? "Produção" : "Administrativo"}</span>
                      <div className="h-px bg-zinc-100 flex-1" />
                    </div>
                  )}

                  {/* Cabeçalho do Grupo Expansível */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer select-none ${
                      isGroupActive
                        ? "text-zinc-950 font-semibold bg-zinc-100/70"
                        : "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <GroupIcon className={`w-4 h-4 shrink-0 ${isGroupActive ? "text-zinc-900" : "text-zinc-400"}`} strokeWidth={1.5} />
                      <span className="truncate">{group.title}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" strokeWidth={1.5} />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" strokeWidth={1.5} />
                    )}
                  </button>

                  {/* Itens do Grupo */}
                  {isExpanded && (
                    <div className="pl-4 space-y-0.5 border-l border-zinc-200 ml-4 my-0.5">
                      {group.items.map((item) => {
                        const active = isItemActive(item, group);

                        return (
                          <Link
                            key={item.id}
                            href={item.href}
                            onClick={() => {
                              const q = item.href.includes("?") ? item.href.split("?")[1] : "";
                              setCurrentSearch(q ? `?${q}` : "");
                              setSidebarOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition ${
                              active
                                ? "bg-zinc-900 text-white font-medium"
                                : "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100/70"
                            }`}
                          >
                            <span className="truncate">{item.label}</span>
                            {active && <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Viewport Principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Barra Superior (Header) */}
        <header className="h-16 border-b border-zinc-200/80 bg-white/90 backdrop-blur-md px-4 sm:px-6 md:px-8 flex items-center justify-between sticky top-0 z-30">
          {/* Lado Esquerdo: Mobile Trigger & Barra de Busca Global */}
          <div className="flex items-center gap-3 flex-1 max-w-lg">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-zinc-600 hover:text-zinc-950 p-2 rounded-xl border border-zinc-200 bg-white shadow-xs focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:outline-none"
              aria-label="Abrir menu"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Input de Busca Global com atalho Ctrl+K */}
            <button
              ref={searchTriggerRef}
              type="button"
              onClick={openSearchModal}
              className="w-full flex items-center justify-between px-3 h-9 rounded-lg border border-zinc-200 bg-zinc-50/70 hover:bg-white text-xs text-zinc-500 hover:text-zinc-700 transition cursor-pointer group focus-visible:ring-1 focus-visible:ring-zinc-400 focus-visible:outline-none"
            >
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-600" strokeWidth={1.5} />
                <span className="hidden sm:inline">Buscar clientes, propostas, contratos, títulos...</span>
                <span className="sm:hidden">Buscar...</span>
              </div>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-zinc-200 bg-white text-[10px] font-mono text-zinc-500">
                <Command className="w-2.5 h-2.5" /> K
              </kbd>
            </button>
          </div>

          {/* Lado Direito: Seletor de Empresa, Botão "+ Novo", Perfil e Logout Único */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Seletor de Empresa em Foco (Otimizza Growth / Clientes) */}
            <CompanySelector />

            {/* Botão de Atalho Global "+ Novo" */}
            <div className="relative" ref={newDropdownRef}>
              <button
                ref={newDropdownButtonRef}
                type="button"
                aria-haspopup="true"
                aria-expanded={newDropdownOpen}
                onClick={() => setNewDropdownOpen(!newDropdownOpen)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setNewDropdownOpen(false);
                  }
                }}
                className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition cursor-pointer focus-visible:ring-1 focus-visible:ring-zinc-400 focus-visible:outline-none"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>Novo</span>
                <ChevronDown className="w-3 h-3 text-zinc-400" strokeWidth={1.5} />
              </button>

              {newDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-56 rounded-xl bg-white border border-zinc-200 shadow-lg p-1 space-y-0.5 z-50 text-xs animate-in fade-in duration-100">
                  <div className="px-2.5 py-1 text-[11px] font-medium text-zinc-400">
                    Criar novo registro
                  </div>
                  <Link
                    href="/crm/leads/new"
                    onClick={() => setNewDropdownOpen(false)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 transition focus-visible:outline-none"
                  >
                    <Users className="w-4 h-4 text-zinc-400" strokeWidth={1.5} />
                    <span>Novo lead</span>
                  </Link>
                  <Link
                    href="/proposals/new"
                    onClick={() => setNewDropdownOpen(false)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 transition focus-visible:outline-none"
                  >
                    <FileText className="w-4 h-4 text-zinc-400" strokeWidth={1.5} />
                    <span>Nova proposta comercial</span>
                  </Link>
                  <Link
                    href="/clients/new"
                    onClick={() => setNewDropdownOpen(false)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 transition focus-visible:outline-none"
                  >
                    <Building className="w-4 h-4 text-zinc-400" strokeWidth={1.5} />
                    <span>Novo cliente</span>
                  </Link>
                  <Link
                    href="/contracts/new"
                    onClick={() => setNewDropdownOpen(false)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 transition focus-visible:outline-none"
                  >
                    <RefreshCw className="w-4 h-4 text-zinc-400" strokeWidth={1.5} />
                    <span>Novo contrato</span>
                  </Link>
                  <div className="border-t border-zinc-100 my-1" />
                  <Link
                    href="/financial/receivables/new"
                    onClick={() => setNewDropdownOpen(false)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 transition focus-visible:outline-none"
                  >
                    <DollarSign className="w-4 h-4 text-zinc-400" strokeWidth={1.5} />
                    <span>Conta a receber (Receita)</span>
                  </Link>
                  <Link
                    href="/financial/payables/new"
                    onClick={() => setNewDropdownOpen(false)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 transition focus-visible:outline-none"
                  >
                    <Layers className="w-4 h-4 text-zinc-400" strokeWidth={1.5} />
                    <span>Conta a pagar (Despesa)</span>
                  </Link>
                  <Link
                    href="/projects/new"
                    onClick={() => setNewDropdownOpen(false)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 transition focus-visible:outline-none"
                  >
                    <Briefcase className="w-4 h-4 text-zinc-400" strokeWidth={1.5} />
                    <span>Novo projeto</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Central de Notificações & Status Otimizza */}
            <div className="relative" ref={notificationsRef}>
              <button
                type="button"
                aria-label="Notificações e status do sistema"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 rounded-xl text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 transition cursor-pointer focus-visible:ring-1 focus-visible:ring-zinc-400 focus-visible:outline-none"
              >
                <Bell className="w-4 h-4" strokeWidth={1.5} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-1.5 w-80 rounded-2xl bg-white border border-zinc-200 shadow-xl p-4 space-y-3 z-50 text-xs animate-in fade-in duration-100">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
                    <div className="flex items-center gap-1.5 font-bold text-zinc-950">
                      <Bell className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Notificações & Status</span>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Operacional
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100 space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-zinc-900 text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        Ambiente Otimizza Data & Growth
                      </div>
                      <p className="text-[11px] text-zinc-500 leading-relaxed">
                        Sistema conectado ao PostgreSQL Supabase. Schema auditado, integridade referencial ativa e migrações sincronizadas.
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100 space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-zinc-900 text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        Inteligência Artificial & OpenRouter
                      </div>
                      <p className="text-[11px] text-zinc-500 leading-relaxed">
                        Assistente de estratégia e geradores de copy prontos nos modos Adicionar, Substituir e Melhorar.
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100 space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-zinc-900 text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        Notificações de Ação Ativas
                      </div>
                      <p className="text-[11px] text-zinc-500 leading-relaxed">
                        Toasts visuais ativos para confirmações de salvamento, alertas de rede e criação de registros.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px]">
                    <span className="text-zinc-400">Otimizza ERP v0.1.0</span>
                    <button
                      type="button"
                      onClick={() => setNotificationsOpen(false)}
                      className="font-semibold text-zinc-700 hover:text-zinc-950 cursor-pointer"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Perfil & Logout Único */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-zinc-200">
              <Image
                src="/brand/avatar-claro.png"
                alt="Avatar"
                width={32}
                height={32}
                className="w-8 h-8 rounded-full object-cover border border-zinc-200 shadow-2xs"
              />
              <div className="hidden lg:block text-left">
                <div className="text-xs font-semibold text-zinc-900 leading-tight">Administrador</div>
                <div className="text-[10px] text-zinc-400">otimizzapro@gmail.com</div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                title="Sair do sistema"
                className="p-2 rounded-xl text-zinc-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:outline-none"
                aria-label="Sair do sistema"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Viewport de Conteúdo da Página */}
        <main className="erp-content flex-1 min-w-0 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
          {children}
        </main>
      </div>

      {/* Modal de Busca Global com Focus Trap e Retorno de Foco */}
      {searchModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Busca Global no ERP"
          onClick={closeSearchModal}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              closeSearchModal();
              return;
            }
            if (e.key === "Tab") {
              if (!searchModalContainerRef.current) return;
              const focusables = searchModalContainerRef.current.querySelectorAll<HTMLElement>(
                'input, button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
              );
              if (focusables.length === 0) return;
              const firstEl = focusables[0];
              const lastEl = focusables[focusables.length - 1];

              if (e.shiftKey) {
                if (document.activeElement === firstEl) {
                  e.preventDefault();
                  lastEl.focus();
                }
              } else {
                if (document.activeElement === lastEl) {
                  e.preventDefault();
                  firstEl.focus();
                }
              }
            }
          }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
        >
          <div
            ref={searchModalContainerRef}
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-2xl rounded-xl shadow-xl border border-zinc-200 overflow-hidden flex flex-col max-h-[80vh]"
          >
            {/* Input Header */}
            <div className="p-3.5 border-b border-zinc-100 flex items-center gap-3">
              <Search className="w-4 h-4 text-zinc-400 shrink-0" strokeWidth={1.5} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setSelectedSearchIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : 0));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setSelectedSearchIndex((prev) => (prev > 0 ? prev - 1 : searchResults.length - 1));
                  } else if (e.key === "Enter" && selectedSearchIndex >= 0 && selectedSearchIndex < searchResults.length) {
                    e.preventDefault();
                    router.push(searchResults[selectedSearchIndex].href);
                    closeSearchModal();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    closeSearchModal();
                  }
                }}
                placeholder="Buscar clientes, propostas, contratos, títulos ou projetos..."
                className="w-full text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={closeSearchModal}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 focus-visible:outline-none"
                aria-label="Fechar busca"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            {/* Lista de Resultados */}
            <div className="p-2 overflow-y-auto flex-1 divide-y divide-zinc-100">
              {searchLoading && (
                <div className="p-8 text-center text-xs text-zinc-400">
                  Pesquisando registros no sistema...
                </div>
              )}

              {!searchLoading && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                <div className="p-8 text-center text-xs text-zinc-400">
                  Nenhum registro encontrado para &quot;{searchQuery}&quot;.
                </div>
              )}

              {!searchLoading && searchQuery.trim().length < 2 && (
                <div className="p-8 text-center text-xs text-zinc-400">
                  Digite pelo menos 2 caracteres para pesquisar em toda a base.
                </div>
              )}

              {!searchLoading &&
                searchResults.map((item, idx) => {
                  const isSelected = idx === selectedSearchIndex;
                  return (
                    <Link
                      key={`${item.type}-${item.id}`}
                      href={item.href}
                      onClick={() => closeSearchModal()}
                      className={`p-2.5 rounded-lg flex items-center justify-between text-xs transition group focus-visible:outline-none ${
                        isSelected
                          ? "bg-zinc-100 text-zinc-950 font-medium"
                          : "hover:bg-zinc-50 text-zinc-800"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-medium bg-zinc-100 text-zinc-600 border border-zinc-200">
                            {item.type}
                          </span>
                          <span className={`font-medium ${isSelected ? "text-zinc-950" : "text-zinc-900"}`}>
                            {item.title}
                          </span>
                        </div>
                        <p className="text-zinc-500 text-[11px]">{item.subtitle}</p>
                      </div>
                      <ArrowRight className={`w-3.5 h-3.5 transition ${isSelected ? "text-zinc-900" : "text-zinc-300 group-hover:text-zinc-500"}`} strokeWidth={1.5} />
                    </Link>
                  );
                })}
            </div>

            {/* Footer Dica */}
            <div className="p-3 border-t border-zinc-100 bg-zinc-50 flex items-center justify-between text-[11px] text-zinc-400">
              <span className="flex items-center gap-1.5">
                <span>Navegue com</span>
                <kbd className="px-1.5 py-0.5 bg-zinc-200/80 rounded text-[10px] font-mono font-semibold text-zinc-600">↓</kbd>
                <kbd className="px-1.5 py-0.5 bg-zinc-200/80 rounded text-[10px] font-mono font-semibold text-zinc-600">↑</kbd>
                <span>e</span>
                <kbd className="px-1.5 py-0.5 bg-zinc-200/80 rounded text-[10px] font-mono font-semibold text-zinc-600">Enter</kbd>
              </span>
              <kbd className="px-1.5 py-0.5 bg-zinc-200/80 rounded text-[10px] font-mono font-semibold text-zinc-600">
                ESC para fechar
              </kbd>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
