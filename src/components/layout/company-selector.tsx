"use client";

import React, { useState, useRef, useEffect } from "react";
import { Building2, ChevronDown, Check, Sparkles, Search, Layers, RefreshCw } from "lucide-react";
import { useCompany, OTIMIZZA_DEFAULT_COMPANY, SelectedCompany } from "@/lib/context/company-context";

export function CompanySelector() {
  const { selectedCompany, selectCompany, selectOtimizza, availableCompanies, loading } = useCompany();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  const filteredCompanies = availableCompanies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex items-center gap-1.5" ref={dropdownRef}>
      {/* Botão de Atalho Rápido para Otimizza Growth */}
      <button
        type="button"
        onClick={selectOtimizza}
        title="Alternar rapidamente para a estratégia padrão da Otimizza Growth"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer border ${
          selectedCompany.id === "otimizza"
            ? "bg-emerald-500/10 text-emerald-800 border-emerald-400 ring-1 ring-emerald-400/40"
            : "bg-white hover:bg-zinc-100 text-zinc-600 border-zinc-200"
        }`}
      >
        <Sparkles className={`w-3.5 h-3.5 ${selectedCompany.id === "otimizza" ? "text-emerald-600" : "text-zinc-400"}`} />
        <span className="hidden md:inline">Otimizza</span>
      </button>

      {/* Dropdown Principal "Escolher Empresa" */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition shadow-2xs border cursor-pointer max-w-[210px] ${
            selectedCompany.id === "otimizza"
              ? "bg-white hover:bg-zinc-50 text-zinc-900 border-zinc-200"
              : "bg-indigo-50/80 hover:bg-indigo-100/70 text-indigo-950 border-indigo-200 font-bold"
          }`}
          title={`Empresa em foco: ${selectedCompany.name}`}
        >
          <Building2 className={`w-3.5 h-3.5 shrink-0 ${selectedCompany.id === "otimizza" ? "text-emerald-600" : "text-indigo-600"}`} />
          <span className="truncate text-left">{selectedCompany.name}</span>
          <ChevronDown className="w-3 h-3 shrink-0 text-zinc-400 ml-0.5" />
        </button>

        {dropdownOpen && (
          <div className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-72 rounded-2xl bg-white border border-zinc-200 shadow-xl p-2 z-50 text-xs animate-in fade-in zoom-in-95 space-y-2">
            <div className="px-2 py-1 flex items-center justify-between border-b border-zinc-100 pb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Escolher Empresa em Foco
              </span>
              <span className="text-[10px] text-zinc-400">
                {availableCompanies.length} disponíveis
              </span>
            </div>

            {/* Busca Rápida de Empresa */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar cliente ou empresa..."
                className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
                autoFocus
              />
            </div>

            {/* Lista de Empresas */}
            <div className="max-h-60 overflow-y-auto space-y-1 pt-1">
              {filteredCompanies.map((company) => {
                const isSelected = selectedCompany.id === company.id;

                return (
                  <button
                    key={company.id}
                    type="button"
                    onClick={() => {
                      selectCompany(company);
                      setDropdownOpen(false);
                      setSearch("");
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition text-left cursor-pointer ${
                      isSelected
                        ? "bg-zinc-950 text-white font-semibold"
                        : "hover:bg-zinc-100 text-zinc-800"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      {company.isOtimizza ? (
                        <Sparkles className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-emerald-400" : "text-emerald-600"}`} />
                      ) : (
                        <Building2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-indigo-300" : "text-zinc-400"}`} />
                      )}
                      <span className="truncate">{company.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {company.isOtimizza && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          isSelected ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"
                        }`}>
                          Padrão
                        </span>
                      )}
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                  </button>
                );
              })}

              {filteredCompanies.length === 0 && (
                <div className="py-4 text-center text-[11px] text-zinc-400">
                  Nenhuma empresa encontrada com &quot;{search}&quot;.
                </div>
              )}
            </div>

            <div className="border-t border-zinc-100 pt-1.5 px-2 text-[10px] text-zinc-400 leading-tight">
              A seleção altera os painéis de <strong>Estratégia</strong> e <strong>Estúdio de Conteúdo</strong>. O CRM e a carteira de clientes permanecem intactos.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
