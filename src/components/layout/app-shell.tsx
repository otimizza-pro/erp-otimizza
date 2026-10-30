"use client";

import React, { useState } from "react";
import Link from "next/link";
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
} from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
  activeSection?: "dashboard" | "clients" | "catalog" | "combos" | "contracts" | "receivables" | "payables" | "accounts" | "cashflow" | "settings";
}

export function AppShell({ children, activeSection = "dashboard" }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const navItems = [
    { id: "dashboard", label: "Visão Geral", href: "/", icon: LayoutDashboard },
    { id: "clients", label: "Clientes", href: "/clients", icon: Users },
    { id: "contracts", label: "Contratações", href: "/contracts", icon: RefreshCw },
    { id: "receivables", label: "Contas a Receber", href: "/financial/receivables", icon: DollarSign },
    { id: "payables", label: "Contas a Pagar", href: "/financial/payables", icon: Layers },
    { id: "cashflow", label: "Fluxo de Caixa", href: "/financial/cashflow", icon: Database },
    { id: "reports", label: "Relatórios & BI", href: "/reports", icon: BarChart3 },
    { id: "accounts", label: "Contas & Bancos", href: "/financial/accounts", icon: ShieldCheck },
    { id: "catalog", label: "Catálogo de Serviços", href: "/services", icon: Package },
    { id: "combos", label: "Combos Comerciais", href: "/combos", icon: Layers },
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
              <div className="w-9 h-9 rounded-xl bg-zinc-950 flex items-center justify-center font-bold text-white text-xs tracking-wider shadow-sm">
                ERP
              </div>
              <div>
                <h1 className="font-semibold text-sm tracking-tight text-zinc-950 flex items-center gap-1.5">
                  Otimizza ERP
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 font-mono font-medium">
                    v1.0
                  </span>
                </h1>
                <p className="text-[11px] text-zinc-500 font-normal">Empresa: Otimizza</p>
              </div>
            </Link>
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
              Módulos Ativos (Fase 1)
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 ${
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
                </Link>
              );
            })}
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
              <div className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center font-semibold text-xs shadow-xs">
                OT
              </div>
              <div className="hidden lg:block text-left">
                <div className="text-xs font-semibold text-zinc-900">Administrador</div>
                <div className="text-[10px] text-zinc-400">otimizzapro@gmail.com</div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
