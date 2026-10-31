"use client";

import React, { useState } from "react";
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
} from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
  activeSection?:
    | "dashboard"
    | "crm"
    | "crm_leads"
    | "crm_pipelines"
    | "crm_opportunities"
    | "crm_activities"
    | "proposals"
    | "clients"
    | "contracts"
    | "suppliers"
    | "service_categories"
    | "catalog"
    | "combos"
    | "receivables"
    | "payables"
    | "accounts"
    | "cashflow"
    | "dre"
    | "cost_centers"
    | "reports"
    | "settings"
    | "documents"
    | "projects"
    | "project_templates";
}

export function AppShell({ children, activeSection = "dashboard" }: AppShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();

  const currentSection = React.useMemo(() => {
    if (pathname) {
      if (pathname.startsWith("/projects/templates")) return "project_templates";
      if (pathname.startsWith("/projects")) return "projects";
      if (pathname.startsWith("/documents")) return "documents";
      if (pathname.startsWith("/proposals")) return "proposals";
      if (pathname.startsWith("/crm/leads")) return "crm_leads";
      if (pathname.startsWith("/crm/pipelines")) return "crm_pipelines";
      if (pathname.startsWith("/crm/opportunities")) return "crm_opportunities";
      if (pathname.startsWith("/crm/activities")) return "crm_activities";
      if (pathname === "/crm" || pathname.startsWith("/crm/")) return "crm";
      if (pathname.startsWith("/clients")) return "clients";
      if (pathname.startsWith("/suppliers")) return "suppliers";
      if (pathname.startsWith("/contracts")) return "contracts";
      if (pathname.startsWith("/financial/receivables")) return "receivables";
      if (pathname.startsWith("/financial/payables")) return "payables";
      if (pathname.startsWith("/financial/dre")) return "dre";
      if (pathname.startsWith("/financial/cost-centers")) return "cost_centers";
      if (pathname.startsWith("/financial/cashflow")) return "cashflow";
      if (pathname.startsWith("/financial/accounts")) return "accounts";
      if (pathname.startsWith("/services/categories")) return "service_categories";
      if (pathname.startsWith("/services")) return "catalog";
      if (pathname.startsWith("/combos")) return "combos";
      if (pathname.startsWith("/reports")) return "reports";
      if (pathname.startsWith("/settings")) return "settings";
      if (pathname === "/") return "dashboard";
    }
    return activeSection || "dashboard";
  }, [pathname, activeSection]);

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

  const navGroups = [
    {
      group: "Visão Geral",
      items: [
        { id: "dashboard", label: "Dashboard", href: "/", icon: LayoutDashboard },
      ],
    },
    {
      group: "Comercial",
      items: [
        { id: "crm", label: "CRM", href: "/crm", icon: TrendingUp },
        { id: "crm_leads", label: "Leads", href: "/crm/leads", icon: Users },
        { id: "crm_opportunities", label: "Oportunidades", href: "/crm/opportunities", icon: RefreshCw },
        { id: "crm_pipelines", label: "Funis", href: "/crm/pipelines", icon: Layers },
        { id: "crm_activities", label: "Atividades Comerciais", href: "/crm/activities", icon: ShieldCheck },
        { id: "clients", label: "Clientes", href: "/clients", icon: Users },
        { id: "proposals", label: "Propostas Comerciais", href: "/proposals", icon: FileText },
      ],
    },
    {
      group: "Catálogo",
      items: [
        { id: "service_categories", label: "Categorias", href: "/services/categories", icon: Layers },
        { id: "catalog", label: "Serviços", href: "/services", icon: Package },
        { id: "combos", label: "Combos", href: "/combos", icon: Layers },
      ],
    },
    {
      group: "Financeiro",
      items: [
        { id: "contracts", label: "Assinaturas / Contratos", href: "/contracts", icon: RefreshCw },
        { id: "receivables", label: "Contas a Receber", href: "/financial/receivables", icon: DollarSign },
        { id: "payables", label: "Contas a Pagar", href: "/financial/payables", icon: Layers },
        { id: "suppliers", label: "Fornecedores", href: "/suppliers", icon: Truck },
        { id: "accounts", label: "Contas Financeiras", href: "/financial/accounts", icon: ShieldCheck },
        { id: "cashflow", label: "Fluxo de Caixa", href: "/financial/cashflow", icon: Database },
        { id: "cost_centers", label: "Centros de Custo", href: "/financial/cost-centers", icon: Layers },
        { id: "dre", label: "DRE Gerencial", href: "/financial/dre", icon: TrendingUp },
      ],
    },
    {
      group: "Dados & BI",
      items: [
        { id: "reports", label: "Indicadores & Relatórios", href: "/reports", icon: BarChart3 },
      ],
    },
    {
      group: "Projetos",
      items: [
        { id: "projects", label: "Projetos", href: "/projects", icon: Briefcase },
        { id: "project_templates", label: "Modelos", href: "/projects/templates", icon: Layers },
      ],
    },
    {
      group: "Documentos",
      items: [
        { id: "documents", label: "Repositório", href: "/documents", icon: FileText },
      ],
    },
    {
      group: "Configurações",
      items: [
        { id: "settings", label: "Configurações", href: "/settings", icon: Settings },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-zinc-900 flex flex-col md:flex-row antialiased font-sans">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:sticky top-0 h-screen w-68 bg-white border-r border-zinc-200/80 z-50 flex flex-col justify-between transition-transform duration-200 ease-out shadow-xs ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo & Brand Header */}
          <div className="p-6 pb-4 border-b border-zinc-100 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/brand/principal-cor.png"
                alt="Otimizza ERP"
                width={140}
                height={32}
                priority
                className="h-8 w-auto object-contain"
              />
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-zinc-400 hover:text-zinc-700 p-1.5 rounded-lg hover:bg-zinc-100 transition"
              aria-label="Fechar menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Links agrupados */}
          <nav className="p-3 space-y-4 flex-1 overflow-y-auto">
            {navGroups.map((group) => (
              <div key={group.group} className="space-y-1">
                <div className="px-3 py-1 text-[10px] font-bold tracking-wider uppercase text-zinc-400">
                  {group.group}
                </div>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentSection === item.id;
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                        isActive
                          ? "bg-zinc-900 text-white shadow-xs font-semibold"
                          : "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100/80"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-zinc-500"}`} />
                        <span>{item.label}</span>
                      </div>
                      {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Footer Info */}
          <div className="p-4 border-t border-zinc-100 bg-[#FAF9F7]/70 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500 flex items-center gap-1.5 text-[11px]">
                <Database className="w-3.5 h-3.5 text-blue-600" />
                PostgreSQL
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-medium">
                Conectado
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
              <span>Usuário Único</span>
              <span className="text-zinc-600 font-medium">ADMIN</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-zinc-200/80 bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-zinc-600 text-xs font-semibold transition shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{loggingOut ? "Encerrando sessão..." : "Sair do Sistema"}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-zinc-200/70 bg-white/80 backdrop-blur-md px-6 md:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-zinc-600 hover:text-zinc-950 p-2 rounded-xl border border-zinc-200 bg-white shadow-xs"
              aria-label="Abrir menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="text-xs font-medium text-zinc-500 hidden sm:block">
              Otimizza Soluções • Sistema de Gestão Empresarial
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Ambiente Otimizza</span>
            </div>

            <div className="flex items-center gap-2 pl-3 border-l border-zinc-200">
              <Image
                src="/brand/avatar-claro.png"
                alt="Avatar"
                width={32}
                height={32}
                className="w-8 h-8 rounded-full object-cover border border-zinc-200 shadow-xs"
              />
              <div className="hidden lg:block text-left">
                <div className="text-xs font-semibold text-zinc-900">Administrador</div>
                <div className="text-[10px] text-zinc-400">otimizzapro@gmail.com</div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              title="Sair do sistema"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-zinc-200 text-zinc-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{loggingOut ? "Saindo..." : "Sair"}</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
