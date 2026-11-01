"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
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
} from "lucide-react";
import { SearchItem } from "@/app/api/search/route";

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
  items: NavItem[];
}

interface AppShellProps {
  children: React.ReactNode;
  activeSection?: string;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Estados de layout
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile drawer
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // Desktop compact
  const [loggingOut, setLoggingOut] = useState(false);

  // Estados de grupos expansíveis
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Estados de atalhos rápidos "+ Novo" e Busca Global
  const [newDropdownOpen, setNewDropdownOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const newDropdownRef = useRef<HTMLDivElement>(null);

  // Mapeamento dos grupos do menu segundo as diretrizes
  const navigationGroups: NavGroup[] = [
    {
      id: "commercial",
      title: "Comercial",
      icon: TrendingUp,
      items: [
        { id: "crm_overview", label: "Visão comercial", href: "/crm", icon: TrendingUp },
        { id: "crm_leads", label: "Leads", href: "/crm/leads", icon: Users },
        { id: "crm_opportunities", label: "Oportunidades", href: "/crm/opportunities", icon: RefreshCw },
        { id: "proposals", label: "Propostas", href: "/proposals", icon: FileText },
        { id: "crm_activities", label: "Atividades comerciais", href: "/crm/activities", icon: Calendar },
      ],
    },
    {
      id: "clients",
      title: "Clientes",
      icon: Users,
      items: [
        { id: "clients_list", label: "Clientes", href: "/clients", icon: Users },
      ],
    },
    {
      id: "contracts",
      title: "Contratos",
      icon: RefreshCw,
      items: [
        { id: "contracts_list", label: "Contratos", href: "/contracts", icon: RefreshCw },
      ],
    },
    {
      id: "financial",
      title: "Financeiro",
      icon: DollarSign,
      items: [
        { id: "financial_cashflow", label: "Visão financeira", href: "/financial/cashflow", icon: BarChart3 },
        { id: "receivables", label: "Contas a receber", href: "/financial/receivables", icon: DollarSign },
        { id: "payables", label: "Contas a pagar", href: "/financial/payables", icon: Layers },
        { id: "cashflow_detail", label: "Fluxo de caixa", href: "/financial/cashflow", icon: Database },
      ],
    },
    {
      id: "projects",
      title: "Projetos",
      icon: Briefcase,
      items: [
        { id: "projects_list", label: "Projetos", href: "/projects", icon: Briefcase },
        { id: "projects_templates", label: "Modelos de projeto", href: "/projects/templates", icon: Layers },
      ],
    },
    {
      id: "reports",
      title: "Relatórios",
      icon: BarChart3,
      items: [
        { id: "reports_comm", label: "Indicadores comerciais", href: "/reports?tab=commercial", icon: TrendingUp },
        { id: "reports_fin", label: "Indicadores financeiros", href: "/reports?tab=financial", icon: DollarSign },
        { id: "dre", label: "DRE gerencial", href: "/financial/dre", icon: PieChart },
        { id: "reports_prof", label: "Rentabilidade", href: "/reports?tab=profitability", icon: BarChart3 },
      ],
    },
    {
      id: "cadastros",
      title: "Cadastros",
      icon: Layers,
      items: [
        { id: "services", label: "Serviços", href: "/services", icon: Package },
        { id: "combos", label: "Combos", href: "/combos", icon: Layers },
        { id: "service_cats", label: "Categorias de serviços", href: "/services/categories", icon: Layers },
        { id: "suppliers", label: "Fornecedores", href: "/suppliers", icon: Truck },
        { id: "accounts", label: "Contas financeiras", href: "/financial/accounts", icon: ShieldCheck },
        { id: "cost_centers", label: "Centros de custo", href: "/financial/cost-centers", icon: Layers },
      ],
    },
    {
      id: "documents",
      title: "Documentos",
      icon: FolderOpen,
      items: [
        { id: "documents_repo", label: "Documentos", href: "/documents", icon: FolderOpen },
      ],
    },
    {
      id: "settings",
      title: "Configurações",
      icon: Settings,
      items: [
        { id: "settings_main", label: "Dados da empresa", href: "/settings", icon: Building },
        { id: "settings_int", label: "Integrações", href: "/settings?tab=integrations", icon: Layers },
        { id: "settings_pref", label: "Preferências", href: "/settings?tab=preferences", icon: Settings },
        { id: "settings_crm", label: "Configurações comerciais", href: "/crm/pipelines", icon: TrendingUp },
      ],
    },
  ];

  // Determinar grupo ativo atual pelo pathname
  const activeGroupId = React.useMemo(() => {
    if (!pathname) return "";
    if (pathname === "/") return "inicio";
    for (const group of navigationGroups) {
      for (const item of group.items) {
        const itemPath = item.href.split("?")[0];
        if (pathname === itemPath || (itemPath !== "/" && pathname.startsWith(itemPath))) {
          return group.id;
        }
      }
    }
    return "";
  }, [pathname]);

  // Inicializar estado dos grupos: ler localStorage ou abrir apenas o grupo da página ativa
  useEffect(() => {
    const saved = localStorage.getItem("otimizza_sidebar_groups");
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
      setExpandedGroups({ [activeGroupId]: true });
    }
  }, [activeGroupId]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = { ...prev, [groupId]: !prev[groupId] };
      localStorage.setItem("otimizza_sidebar_groups", JSON.stringify(next));
      return next;
    });
  };

  // Atalho global Ctrl+K / Cmd+K para busca
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchModalOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        setSearchModalOpen(false);
        setNewDropdownOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Foco no input de busca ao abrir modal
  useEffect(() => {
    if (searchModalOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [searchModalOpen]);

  // Fechar dropdown de "+ Novo" ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (newDropdownRef.current && !newDropdownRef.current.contains(e.target as Node)) {
        setNewDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Busca instantânea com debounce
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
        }
      } catch (err) {
        console.error("Erro na busca:", err);
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => clearTimeout(timeout);
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

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-zinc-900 flex flex-col md:flex-row antialiased font-sans">
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
          <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
            <Link
              href="/"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-2 overflow-hidden"
            >
              {sidebarCollapsed ? (
                <div className="w-10 h-10 rounded-xl bg-zinc-950 flex items-center justify-center text-white font-extrabold text-sm tracking-wider">
                  OP
                </div>
              ) : (
                <Image
                  src="/brand/principal-cor.png"
                  alt="Otimizza ERP"
                  width={130}
                  height={30}
                  priority
                  className="h-7 w-auto object-contain"
                />
              )}
            </Link>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden md:flex text-zinc-400 hover:text-zinc-700 p-1.5 rounded-lg hover:bg-zinc-100 transition"
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
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                pathname === "/"
                  ? "bg-zinc-950 text-white shadow-xs"
                  : "text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100"
              }`}
              title="Início"
            >
              <LayoutDashboard className={`w-4 h-4 shrink-0 ${pathname === "/" ? "text-white" : "text-zinc-500"}`} />
              {!sidebarCollapsed && <span>Início</span>}
            </Link>

            {/* Grupos Expansíveis e Recolhíveis */}
            {navigationGroups.map((group) => {
              const isGroupActive = activeGroupId === group.id;
              const isExpanded = !!expandedGroups[group.id];
              const GroupIcon = group.icon;

              // No modo colapsado, exibe apenas os ícones
              if (sidebarCollapsed) {
                return (
                  <div key={group.id} className="relative group/tooltip">
                    <button
                      onClick={() => {
                        setSidebarCollapsed(false);
                        setExpandedGroups((prev) => ({ ...prev, [group.id]: true }));
                      }}
                      className={`w-full flex items-center justify-center p-2.5 rounded-xl transition ${
                        isGroupActive
                          ? "bg-zinc-900 text-white"
                          : "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100"
                      }`}
                      title={group.title}
                    >
                      <GroupIcon className="w-4 h-4" />
                    </button>
                  </div>
                );
              }

              return (
                <div key={group.id} className="space-y-0.5 pt-1">
                  {/* Cabeçalho do Grupo Expansível */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer select-none ${
                      isGroupActive
                        ? "text-zinc-950 font-bold bg-zinc-50"
                        : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/60"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <GroupIcon className={`w-3.5 h-3.5 ${isGroupActive ? "text-zinc-950" : "text-zinc-400"}`} />
                      <span>{group.title}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                    )}
                  </button>

                  {/* Itens do Grupo */}
                  {isExpanded && (
                    <div className="pl-6 space-y-0.5 border-l-2 border-zinc-100 ml-3.5 my-0.5">
                      {group.items.map((item) => {
                        const itemPath = item.href.split("?")[0];
                        const isItemActive =
                          pathname === itemPath ||
                          (itemPath !== "/" && pathname.startsWith(itemPath));

                        return (
                          <Link
                            key={item.id}
                            href={item.href}
                            onClick={() => setSidebarOpen(false)}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                              isItemActive
                                ? "bg-zinc-900 text-white font-semibold shadow-2xs"
                                : "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100"
                            }`}
                          >
                            <span className="truncate">{item.label}</span>
                            {isItemActive && <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />}
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
              className="md:hidden text-zinc-600 hover:text-zinc-950 p-2 rounded-xl border border-zinc-200 bg-white shadow-xs"
              aria-label="Abrir menu"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Input de Busca Global com atalho Ctrl+K */}
            <button
              type="button"
              onClick={() => setSearchModalOpen(true)}
              className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl border border-zinc-200 bg-zinc-50/80 hover:bg-white text-xs text-zinc-400 hover:text-zinc-600 transition shadow-2xs cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-600" />
                <span className="hidden sm:inline">Buscar clientes, propostas, contratos, títulos...</span>
                <span className="sm:hidden">Buscar no ERP...</span>
              </div>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-zinc-200/80 text-[10px] font-mono font-semibold text-zinc-600">
                <Command className="w-2.5 h-2.5" /> K
              </kbd>
            </button>
          </div>

          {/* Lado Direito: Botão "+ Novo", Perfil e Logout Único */}
          <div className="flex items-center gap-3">
            {/* Botão de Atalho Global "+ Novo" */}
            <div className="relative" ref={newDropdownRef}>
              <button
                type="button"
                onClick={() => setNewDropdownOpen(!newDropdownOpen)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo</span>
                <ChevronDown className="w-3 h-3 text-zinc-400" />
              </button>

              {newDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-zinc-200 shadow-xl p-1.5 space-y-0.5 z-50 text-xs animate-in fade-in zoom-in-95">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Criar Novo Registro
                  </div>
                  <Link
                    href="/crm/leads/new"
                    onClick={() => setNewDropdownOpen(false)}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 transition"
                  >
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    <span>Novo Lead</span>
                  </Link>
                  <Link
                    href="/proposals/new"
                    onClick={() => setNewDropdownOpen(false)}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 transition"
                  >
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Nova Proposta Comercial</span>
                  </Link>
                  <Link
                    href="/clients/new"
                    onClick={() => setNewDropdownOpen(false)}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 transition"
                  >
                    <Building className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Novo Cliente</span>
                  </Link>
                  <Link
                    href="/contracts/new"
                    onClick={() => setNewDropdownOpen(false)}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                    <span>Novo Contrato</span>
                  </Link>
                  <div className="border-t border-zinc-100 my-1" />
                  <Link
                    href="/financial/receivables/new"
                    onClick={() => setNewDropdownOpen(false)}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 transition"
                  >
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Conta a Receber (Receita)</span>
                  </Link>
                  <Link
                    href="/financial/payables/new"
                    onClick={() => setNewDropdownOpen(false)}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 transition"
                  >
                    <Layers className="w-3.5 h-3.5 text-rose-600" />
                    <span>Conta a Pagar (Despesa)</span>
                  </Link>
                  <Link
                    href="/projects/new"
                    onClick={() => setNewDropdownOpen(false)}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 transition"
                  >
                    <Briefcase className="w-3.5 h-3.5 text-purple-600" />
                    <span>Novo Projeto</span>
                  </Link>
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
                className="p-2 rounded-xl text-zinc-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer disabled:opacity-50"
                aria-label="Sair do sistema"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Viewport de Conteúdo da Página */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
          {children}
        </main>
      </div>

      {/* Modal de Busca Global */}
      {searchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[80vh]">
            {/* Input Header */}
            <div className="p-4 border-b border-zinc-100 flex items-center gap-3">
              <Search className="w-4 h-4 text-zinc-400 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar clientes, propostas, contratos, contas ou projetos..."
                className="w-full text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none"
              />
              <button
                onClick={() => setSearchModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Lista de Resultados */}
            <div className="p-3 overflow-y-auto flex-1 divide-y divide-zinc-100">
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
                searchResults.map((item) => (
                  <Link
                    key={`${item.type}-${item.id}`}
                    href={item.href}
                    onClick={() => setSearchModalOpen(false)}
                    className="p-3 rounded-xl hover:bg-zinc-50 flex items-center justify-between text-xs transition group"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                            item.type === "CLIENT"
                              ? "bg-blue-100 text-blue-800"
                              : item.type === "LEAD"
                              ? "bg-amber-100 text-amber-800"
                              : item.type === "PROPOSAL"
                              ? "bg-indigo-100 text-indigo-800"
                              : item.type === "CONTRACT"
                              ? "bg-emerald-100 text-emerald-800"
                              : item.type === "PROJECT"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-zinc-100 text-zinc-700"
                          }`}
                        >
                          {item.type}
                        </span>
                        <span className="font-semibold text-zinc-900 group-hover:text-indigo-600">
                          {item.title}
                        </span>
                      </div>
                      <p className="text-zinc-500 text-[11px]">{item.subtitle}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-600 transition" />
                  </Link>
                ))}
            </div>

            {/* Footer Dica */}
            <div className="p-3 border-t border-zinc-100 bg-zinc-50 flex items-center justify-between text-[11px] text-zinc-400">
              <span>Navegue com o mouse ou teclado</span>
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
