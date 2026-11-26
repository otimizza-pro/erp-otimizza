"use client";

import React, { useState, useEffect } from "react";
import { toast } from "@/components/ui/toast-provider";
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  DollarSign,
  TrendingUp,
  Settings,
  ShieldCheck,
  CheckCircle2,
  Menu,
  X,
  Database,
  RefreshCw,
  Search,
  Sparkles,
  ArrowUpRight,
  ChevronRight,
  Filter,
} from "lucide-react";

type NavSection =
  | "dashboard"
  | "clients"
  | "catalog"
  | "contracts"
  | "finance"
  | "cashflow"
  | "settings";

interface HealthData {
  status: string;
  uptimeSeconds: number;
  nodeVersion: string;
  environment: string;
  services: {
    database: {
      status: string;
      latencyMs: number | null;
      error: string | null;
    };
  };
}

export function AdminShell() {
  const [activeSection, setActiveSection] = useState<NavSection>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let isMounted = true;
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) setHealth(data);
      })
      .catch(() => {
        if (isMounted) setHealth(null);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRefreshHealth = async () => {
    setHealthLoading(true);
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      setHealth(data);
    } catch {
      setHealth(null);
    } finally {
      setHealthLoading(false);
    }
  };

  const navItems = [
    { id: "dashboard" as const, label: "Visão Geral", icon: LayoutDashboard },
    { id: "clients" as const, label: "Clientes", icon: Users },
    { id: "catalog" as const, label: "Produtos & Serviços", icon: Package },
    { id: "contracts" as const, label: "Contratações & Vendas", icon: FileText },
    { id: "finance" as const, label: "Financeiro", icon: DollarSign },
    { id: "cashflow" as const, label: "Fluxo de Caixa", icon: TrendingUp },
    { id: "settings" as const, label: "Configurações", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-zinc-900 flex flex-col md:flex-row antialiased font-sans">
      {/* Sidebar Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Clean Minimalist SaaS Style */}
      <aside
        className={`fixed md:sticky top-0 h-screen w-68 bg-white border-r border-zinc-200/80 z-50 flex flex-col justify-between transition-transform duration-200 ease-out shadow-xs ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo & Brand Header */}
          <div className="p-6 pb-4 border-b border-zinc-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-zinc-950 flex items-center justify-center font-bold text-white text-xs tracking-wider shadow-sm">
                ERP
              </div>
              <div>
                <h1 className="font-semibold text-sm tracking-tight text-zinc-950 flex items-center gap-1.5">
                  Otimizza ERP
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 font-mono font-medium">
                    v0.1
                  </span>
                </h1>
                <p className="text-[11px] text-zinc-500 font-normal">Gestão & Previsibilidade</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-zinc-400 hover:text-zinc-700 p-1.5 rounded-lg hover:bg-zinc-100 transition"
              aria-label="Fechar menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
            <div className="px-3 py-2 text-[10px] font-semibold tracking-wider uppercase text-zinc-400">
              Menu Principal
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSection(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors duration-150 ${
                    isActive
                      ? "bg-zinc-900 text-white shadow-xs font-semibold"
                      : "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100/80"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-zinc-500"}`} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </button>
              );
            })}
          </nav>

          {/* Infrastructure Health Badge Footer */}
          <div className="p-4 border-t border-zinc-100 bg-[#FAF9F7]/70 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500 flex items-center gap-1.5 text-[11px]">
                <Database className="w-3.5 h-3.5 text-blue-600" />
                Supabase
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-medium">
                Conectado
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500 flex items-center gap-1.5 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-zinc-700" />
                Vercel
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 font-medium">
                Produção
              </span>
            </div>
            <div className="pt-2 border-t border-zinc-200/50 flex items-center justify-between text-[11px] text-zinc-400">
              <span>Porta 3000</span>
              <span className="text-zinc-600 font-mono">BRL • Centavos</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header - Floating Glassmorphic Pill Style */}
        <header className="h-18 border-b border-zinc-200/70 bg-white/80 px-6 md:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-zinc-600 hover:text-zinc-950 p-2 rounded-xl border border-zinc-200 bg-white shadow-xs"
              aria-label="Abrir menu"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Quick Pill Search */}
            <div className="relative hidden sm:block w-72 md:w-84">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar clientes, títulos ou contratos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-12 py-2 rounded-full bg-zinc-100/80 border border-transparent hover:bg-zinc-100 focus:bg-white focus:border-zinc-300 focus:outline-none text-xs text-zinc-800 placeholder-zinc-400 transition"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-zinc-400 bg-white px-1.5 py-0.5 rounded border border-zinc-200 pointer-events-none">
                ⌘K
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Action Pill Button */}
            <button
              onClick={() => toast.info("Utilize o menu lateral ou a aba de Criação para novos lançamentos.")}
              className="hidden lg:inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800 transition shadow-xs"
            >
              <span>+ Nova Operação</span>
            </button>

            {/* Healthcheck Indicator Pill */}
            <button
              onClick={handleRefreshHealth}
              disabled={healthLoading}
              title="Clique para verificar conectividade do servidor"
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium bg-white hover:bg-zinc-50 border border-zinc-200/90 shadow-2xs transition text-zinc-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-zinc-500 ${healthLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline text-zinc-500">API:</span>
              {health ? (
                <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {health.status === "healthy" ? "Online" : "Ativa"}
                </span>
              ) : (
                <span className="text-zinc-400">Verificando...</span>
              )}
            </button>

            {/* User Profile Pill Avatar */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-zinc-200">
              <div className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center font-semibold text-xs shadow-xs">
                OP
              </div>
              <div className="hidden xl:block text-left">
                <div className="text-xs font-semibold text-zinc-900">Operador ERP</div>
                <div className="text-[10px] text-zinc-500">Administrador</div>
              </div>
            </div>
          </div>
        </header>

        {/* Body Viewport */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
          {activeSection === "dashboard" && <DashboardHourlineView />}
          {activeSection === "clients" && <ClientsHourlineView />}
          {activeSection === "catalog" && <CatalogHourlineView />}
          {activeSection === "contracts" && <ContractsHourlineView />}
          {activeSection === "finance" && <FinanceHourlineView />}
          {activeSection === "cashflow" && <CashflowHourlineView />}
          {activeSection === "settings" && <SettingsHourlineView health={health} />}
        </main>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// SEÇÃO: DASHBOARD HOURLINE STYLE (PASTEL GRADIENTS & SMART INSIGHTS)
// -----------------------------------------------------------------------------
function DashboardHourlineView() {
  const kpis = [
    {
      badge: "Alerta • 3 Títulos Vencendo",
      badgeColor: "bg-orange-500/10 text-orange-700 border-orange-300/40",
      value: "R$ 2.800,00",
      label: "Em atraso ou vencendo hoje",
      sub: "Ação preventiva recomendada",
      meshClass: "card-mesh-coral",
      metricColor: "text-zinc-950",
    },
    {
      badge: "Faturamento Previsto",
      badgeColor: "bg-emerald-500/10 text-emerald-700 border-emerald-300/40",
      value: "R$ 48.750,00",
      label: "Competência mês corrente",
      sub: "94% da meta atingida",
      meshClass: "card-mesh-mint",
      metricColor: "text-zinc-950",
    },
    {
      badge: "Novas Contratações",
      badgeColor: "bg-blue-500/10 text-blue-700 border-blue-300/40",
      value: "14 Contratos",
      label: "Recorrências ativas",
      sub: "R$ 18.900/mês MRR",
      meshClass: "card-mesh-sky",
      metricColor: "text-zinc-950",
    },
    {
      badge: "Margem Operacional",
      badgeColor: "bg-amber-500/10 text-amber-700 border-amber-300/40",
      value: "34%",
      label: "Saldo Caixa: R$ 63.820,00",
      sub: "Liquidez imediata garantida",
      meshClass: "card-mesh-amber",
      metricColor: "text-zinc-950",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Title & Subtitle in Hourline Style */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Segunda-feira • Visão Semanal de Recursos
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-950">
            Previsão e Desempenho Operacional
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 max-w-2xl">
            Acompanhe indicadores em tempo real, liquidações previstas e alertas de fluxo antes do fechamento semanal.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 rounded-full bg-white border border-zinc-200 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition shadow-2xs flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-zinc-400" />
            Filtrar Período
          </button>
          <button className="px-4 py-2 rounded-full bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800 transition shadow-xs flex items-center gap-1">
            Simular Cenário <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4 Signature Hourline Mesh Gradient Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => (
          <div
            key={idx}
            className={`p-5 rounded-2xl ${kpi.meshClass} shadow-hourline hover:shadow-hourline-hover transition-colors duration-200 flex flex-col justify-between`}
          >
            <div>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold border ${kpi.badgeColor}`}
              >
                {kpi.badge}
              </span>
              <div className="mt-4">
                <div className={`text-2xl sm:text-3xl font-bold tracking-tight ${kpi.metricColor}`}>
                  {kpi.value}
                </div>
                <div className="text-xs text-zinc-600 font-medium mt-1">{kpi.label}</div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-black/5 text-[11px] text-zinc-500 font-normal flex items-center justify-between">
              <span>{kpi.sub}</span>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
            </div>
          </div>
        ))}
      </div>

      {/* Hourline Feature: "Otimizza Sugere" (Smart Predictive Insight Card) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#FAF9F7] border border-zinc-200/90 shadow-hourline flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-zinc-900 text-amber-300 flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                Otimizza Sugere
              </span>
              <span className="text-xs text-zinc-400 font-medium">• Hoje, 08:30</span>
            </div>
            <h3 className="text-sm font-semibold text-zinc-900">
              3 contratos fixados no dia 31 vencerão no último dia deste mês curto
            </h3>
            <p className="text-xs text-zinc-500 leading-relaxed max-w-3xl">
              Nossa regra de fechamento financeiro ajustou automaticamente as faturas para 28 de fevereiro, retornando ao dia 31 em março. A chave de idempotência garante que nenhuma cobrança redundante seja disparada.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          <button className="px-4 py-2 rounded-full bg-white border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition shadow-2xs">
            Dispensar
          </button>
          <button className="px-4 py-2 rounded-full bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 transition shadow-xs flex items-center gap-1.5">
            Ver Contratos <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Grid: Data Table & Infrastructure Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Financial Titles Table */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-hourline space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">Títulos Financeiros Recentes</h3>
              <p className="text-xs text-zinc-500">
                Controle de recebíveis com suporte a liquidação parcial e cálculo exato em centavos
              </p>
            </div>
            <span className="text-[10px] uppercase font-mono px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-600 font-medium">
              Demonstração
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-600">
              <thead className="text-[10px] uppercase tracking-wider text-zinc-400 border-b border-zinc-100">
                <tr>
                  <th className="py-3 px-3">Cliente / Razão Social</th>
                  <th className="py-3 px-3">Vencimento</th>
                  <th className="py-3 px-3">Valor Nominal</th>
                  <th className="py-3 px-3">Saldo Restante</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                <tr className="hover:bg-zinc-50/70 transition">
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px]">
                        AT
                      </div>
                      <div>
                        <div className="font-semibold text-zinc-900">Alpha Soluções LTDA</div>
                        <div className="text-[10px] text-zinc-400">TIT-2026-001 • PJ</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-zinc-600 font-medium">10/11/2026</td>
                  <td className="py-3.5 px-3 font-mono font-medium text-zinc-900">R$ 5.400,00</td>
                  <td className="py-3.5 px-3 font-mono text-zinc-400">R$ 0,00</td>
                  <td className="py-3.5 px-3">
                    <span className="px-3 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      PAGO
                    </span>
                  </td>
                </tr>

                <tr className="hover:bg-zinc-50/70 transition">
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-[10px]">
                        CS
                      </div>
                      <div>
                        <div className="font-semibold text-zinc-900">Carlos Eduardo Silva</div>
                        <div className="text-[10px] text-zinc-400">TIT-2026-002 • PF</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-zinc-600 font-medium">28/02/2026</td>
                  <td className="py-3.5 px-3 font-mono font-medium text-zinc-900">R$ 1.200,00</td>
                  <td className="py-3.5 px-3 font-mono font-semibold text-amber-700">R$ 400,00</td>
                  <td className="py-3.5 px-3">
                    <span className="px-3 py-1 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      PARCIAL
                    </span>
                  </td>
                </tr>

                <tr className="hover:bg-zinc-50/70 transition">
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-[10px]">
                        BC
                      </div>
                      <div>
                        <div className="font-semibold text-zinc-900">Beta Consultoria Tech</div>
                        <div className="text-[10px] text-zinc-400">TIT-2026-003 • PJ</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-zinc-600 font-medium">15/11/2026</td>
                  <td className="py-3.5 px-3 font-mono font-medium text-zinc-900">R$ 3.850,00</td>
                  <td className="py-3.5 px-3 font-mono font-semibold text-zinc-900">R$ 3.850,00</td>
                  <td className="py-3.5 px-3">
                    <span className="px-3 py-1 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      PENDENTE
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* System Architecture & Principles Card */}
        <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-hourline space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-800 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-zinc-700" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-900">Governança & Arquitetura</h3>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Monólito modular estrito baseado em Next.js App Router, banco relacional PostgreSQL e pools de conexão otimizados para Vercel Serverless.
            </p>

            <div className="space-y-2 pt-2">
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100 space-y-1">
                <span className="text-[11px] font-semibold text-zinc-800 block">Precisão Financeira</span>
                <span className="text-[11px] text-zinc-500">Matemática rigorosa em centavos inteiros (BRL), prevenindo erros de arredondamento em float.</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100 space-y-1">
                <span className="text-[11px] font-semibold text-zinc-800 block">Histórico Imutável</span>
                <span className="text-[11px] text-zinc-500">Sem deleção física em registros contábeis. Estornos geram trilha auditável de movimentação.</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-100 flex items-center justify-between">
            <span className="text-[11px] text-zinc-400">Qualidade de Código</span>
            <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> 23 Testes Passando
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// SEÇÃO: CLIENTES HOURLINE VIEW
// -----------------------------------------------------------------------------
function ClientsHourlineView() {
  const mockClients = [
    {
      id: "1",
      initials: "AT",
      name: "Alpha Soluções em Tecnologia LTDA",
      tradeName: "Alpha Tech",
      doc: "11.222.333/0001-81",
      type: "PJ",
      email: "financeiro@alphatech.com.br",
      phone: "(11) 98765-4321",
      status: "ATIVO",
    },
    {
      id: "2",
      initials: "CS",
      name: "Carlos Eduardo Silva",
      tradeName: "-",
      doc: "529.982.247-25",
      type: "PF",
      email: "carlos.silva@email.com",
      phone: "(21) 99123-4567",
      status: "ATIVO",
    },
    {
      id: "3",
      initials: "DN",
      name: "Distribuidora Nacional de Peças",
      tradeName: "Peças Mais",
      doc: "22.333.444/0001-90",
      type: "PJ",
      email: "contato@pecasmais.com.br",
      phone: "(31) 3211-9000",
      status: "INATIVO",
    },
  ];

  return (
    <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-hourline space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-zinc-950">Gestão de Clientes</h3>
          <p className="text-xs text-zinc-500">
            Cadastros com validação de CPF/CNPJ, normalização de documentos e suporte a soft delete
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 rounded-full bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 transition shadow-xs">
            + Cadastrar Cliente
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-zinc-600">
          <thead className="text-[10px] uppercase tracking-wider text-zinc-400 border-b border-zinc-100">
            <tr>
              <th className="py-3 px-3">Tipo</th>
              <th className="py-3 px-3">Cliente / Razão Social</th>
              <th className="py-3 px-3">Documento (CPF/CNPJ)</th>
              <th className="py-3 px-3">Contato</th>
              <th className="py-3 px-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {mockClients.map((c) => (
              <tr key={c.id} className="hover:bg-zinc-50/70 transition">
                <td className="py-3.5 px-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-zinc-100 text-zinc-700">
                    {c.type}
                  </span>
                </td>
                <td className="py-3.5 px-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-zinc-100 text-zinc-800 flex items-center justify-center font-bold text-[10px]">
                      {c.initials}
                    </div>
                    <div>
                      <div className="font-semibold text-zinc-900">{c.name}</div>
                      {c.tradeName !== "-" && (
                        <div className="text-[10px] text-zinc-400">Fantasia: {c.tradeName}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-3 font-mono text-zinc-600">{c.doc}</td>
                <td className="py-3.5 px-3">
                  <div className="text-zinc-800">{c.email}</div>
                  <div className="text-[10px] text-zinc-400">{c.phone}</div>
                </td>
                <td className="py-3.5 px-3">
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-semibold border ${
                      c.status === "ATIVO"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-zinc-100 text-zinc-500 border-zinc-200"
                    }`}
                  >
                    {c.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// SEÇÃO: CATÁLOGO HOURLINE VIEW
// -----------------------------------------------------------------------------
function CatalogHourlineView() {
  const items = [
    {
      type: "PRODUTO SIMPLES",
      name: "Cabo de Rede Blindado Cat6 (100m)",
      sku: "PROD-CABO-CAT6",
      price: "R$ 380,00",
      period: "Avulso",
      status: "ATIVO",
    },
    {
      type: "PRODUTO COM VARIAÇÃO",
      name: "Uniforme Técnico Corporativo",
      sku: "VAR-UNIF-CORP",
      price: "R$ 89,90 - R$ 119,90",
      period: "Avulso",
      status: "ATIVO",
      variants: "Tamanhos P, M, G, GG • Cores Azul e Preto",
    },
    {
      type: "SERVIÇO RECORRENTE",
      name: "Suporte e Manutenção de Infraestrutura TI",
      sku: "SRV-SUP-INFRA",
      price: "R$ 1.500,00",
      period: "Mensal",
      status: "ATIVO",
    },
  ];

  return (
    <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-hourline space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-950">Catálogo Unificado</h3>
          <p className="text-xs text-zinc-500">
            Produtos físicos, itens com variações de atributos e serviços avulsos ou de assinatura
          </p>
        </div>
        <button className="px-4 py-2 rounded-full bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 transition shadow-xs">
          + Novo Item
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="p-5 rounded-2xl bg-zinc-50/70 border border-zinc-200/70 flex flex-col justify-between hover:border-zinc-300 transition"
          >
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-white border border-zinc-200 text-zinc-600">
                {item.type}
              </span>
              <h4 className="text-sm font-semibold text-zinc-900 pt-1">{item.name}</h4>
              <p className="text-xs text-zinc-400 font-mono">SKU: {item.sku}</p>
              {item.variants && (
                <p className="text-[11px] text-zinc-500 bg-white p-2 rounded-xl border border-zinc-100">
                  {item.variants}
                </p>
              )}
            </div>
            <div className="mt-5 pt-3 border-t border-zinc-200/60 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-zinc-400">{item.period}</div>
                <div className="text-sm font-bold text-zinc-950 font-mono">{item.price}</div>
              </div>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                {item.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// SEÇÃO: CONTRATAÇÕES HOURLINE VIEW
// -----------------------------------------------------------------------------
function ContractsHourlineView() {
  return (
    <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-hourline space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-950">Contratos & Recorrências</h3>
          <p className="text-xs text-zinc-500">
            Contratos com snapshots de preços negociados, periodicidades e dia de vencimento
          </p>
        </div>
        <button className="px-4 py-2 rounded-full bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 transition shadow-xs">
          + Nova Contratação
        </button>
      </div>

      <div className="p-5 rounded-2xl bg-[#FAF9F7] border border-zinc-200 text-xs space-y-3 text-zinc-700">
        <div className="flex items-center gap-2 text-zinc-950 font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Regra de Fim de Mês & Idempotência Garantida
        </div>
        <p className="leading-relaxed">
          Contratos fixados no dia 31 vencem automaticamente no último dia de meses curtos (ex: 28 ou 29 de fevereiro e 30 de abril/junho), retornando ao dia 31 nos meses completos.
        </p>
        <div className="p-3 rounded-xl bg-white border border-zinc-200 font-mono text-[11px] text-zinc-600">
          Chave de Idempotência: <code>contract-id_YYYY-MM</code> (bloqueia cobrança redundante no banco).
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// SEÇÃO: FINANCEIRO HOURLINE VIEW
// -----------------------------------------------------------------------------
function FinanceHourlineView() {
  return (
    <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-hourline space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-950">Contas a Pagar e a Receber</h3>
          <p className="text-xs text-zinc-500">
            Títulos com suporte a pagamentos parciais, estornos auditáveis e moeda BRL exata
          </p>
        </div>
        <button className="px-4 py-2 rounded-full bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 transition shadow-xs">
          + Lançar Título
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="p-5 rounded-2xl card-mesh-mint shadow-2xs space-y-2">
          <strong className="text-emerald-800 block text-sm font-semibold">Contas a Receber (Ativo)</strong>
          <p className="text-zinc-600">Total em aberto: <strong className="text-zinc-950">R$ 24.300,00</strong></p>
          <p className="text-zinc-500 text-[11px]">O faturamento não aumenta o caixa até a liquidação efetiva.</p>
        </div>
        <div className="p-5 rounded-2xl card-mesh-coral shadow-2xs space-y-2">
          <strong className="text-rose-800 block text-sm font-semibold">Contas a Pagar (Passivo)</strong>
          <p className="text-zinc-600">Total a pagar este mês: <strong className="text-zinc-950">R$ 14.800,00</strong></p>
          <p className="text-zinc-500 text-[11px]">Despesas categorizadas por centro de custo e fornecedor.</p>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// SEÇÃO: FLUXO DE CAIXA HOURLINE VIEW
// -----------------------------------------------------------------------------
function CashflowHourlineView() {
  return (
    <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-hourline space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-950">Fluxo de Caixa (Regime de Caixa)</h3>
          <p className="text-xs text-zinc-500">
            Realizado (movimentações efetivadas) vs. Projetado (títulos com vencimento futuro)
          </p>
        </div>
      </div>

      <div className="p-8 rounded-2xl bg-zinc-50 border border-zinc-200/80 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-white border border-zinc-200 flex items-center justify-center mx-auto shadow-2xs">
          <TrendingUp className="w-6 h-6 text-zinc-800" />
        </div>
        <h4 className="text-sm font-semibold text-zinc-950">Separação Estrita de Regime</h4>
        <p className="text-xs text-zinc-500 max-w-lg mx-auto leading-relaxed">
          O fluxo de caixa computa apenas transferências e liquidações efetivas. Transferências entre contas correntes internas são neutras e não poluem receitas ou despesas operacionais.
        </p>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// SEÇÃO: CONFIGURAÇÕES HOURLINE VIEW
// -----------------------------------------------------------------------------
function SettingsHourlineView({ health }: { health: HealthData | null }) {
  return (
    <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-hourline space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-zinc-950">Configurações & Diagnóstico da Infraestrutura</h3>
        <p className="text-xs text-zinc-500">
          Estado atual da aplicação, parâmetros de conexão e checklist de prontidão para Vercel e Supabase
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Card Supabase */}
        <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-zinc-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-600" />
              Supabase PostgreSQL
            </span>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">
              Conectado
            </span>
          </div>
          <p className="text-zinc-500">
            Camada de conexão configurada para o Transaction Pooler (porta 6543) e conexão direta para migrações (porta 5432).
          </p>
          <div className="font-mono text-[11px] p-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-700">
            Status: {health?.services?.database?.status ?? "Aguardando"} • Latência: {health?.services?.database?.latencyMs ?? 0}ms
          </div>
        </div>

        {/* Card Vercel */}
        <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-zinc-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-zinc-800" />
              Hospedagem Vercel
            </span>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
              Produção Ativa
            </span>
          </div>
          <p className="text-zinc-500">
            Execução serverless de alta performance integrada ao GitHub na branch main com zero retenção de estado em disco local.
          </p>
          <div className="font-mono text-[11px] p-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-700">
            Node: {health?.nodeVersion ?? "v26.12.1"} • Amb: {health?.environment ?? "development"}
          </div>
        </div>
      </div>
    </div>
  );
}
