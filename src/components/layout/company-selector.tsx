"use client";

import React, { useState, useRef, useEffect } from "react";
import { Building2, ChevronDown, Check, Search, Building } from "lucide-react";
import { useCompany } from "@/lib/context/company-context";

export function CompanySelector() {
  const { selectedCompany, selectCompany, selectOtimizza, availableCompanies } = useCompany();
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
        title="Alternar para a empresa interna Otimizza Growth"
        className={`flex items-center gap-1.5 px-2.5 h-9 rounded-lg text-xs font-medium transition cursor-pointer border ${
          selectedCompany.id === "otimizza"
            ? "bg-zinc-900 text-white border-zinc-900"
            : "bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-200"
        }`}
      >
        <Building className={`w-3.5 h-3.5 ${selectedCompany.id === "otimizza" ? "text-white" : "text-zinc-400"}`} strokeWidth={1.5} />
        <span className="hidden md:inline">Otimizza</span>
      </button>

      {/* Dropdown Principal "Escolher Empresa" */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className={`flex items-center gap-2 px-3 h-9 rounded-lg text-xs font-medium transition border cursor-pointer max-w-[210px] ${
            selectedCompany.id === "otimizza"
              ? "bg-white hover:bg-zinc-50 text-zinc-900 border-zinc-200"
              : "bg-zinc-100 text-zinc-900 border-zinc-300 font-semibold"
          }`}
          title={`Empresa em foco: ${selectedCompany.name}`}
        >
          <Building2 className="w-3.5 h-3.5 shrink-0 text-zinc-500" strokeWidth={1.5} />
          <span className="truncate text-left">{selectedCompany.name}</span>
          <ChevronDown className="w-3 h-3 shrink-0 text-zinc-400 ml-0.5" strokeWidth={1.5} />
        </button>

        {dropdownOpen && (
          <div className="absolute left-0 sm:right-0 sm:left-auto mt-1.5 w-72 rounded-xl bg-white border border-zinc-200 shadow-lg p-2 z-50 text-xs animate-in fade-in duration-100 space-y-2">
            <div className="px-2 py-1 flex items-center justify-between border-b border-zinc-100 pb-1.5">
              <span className="text-[11px] font-medium text-zinc-500">
                Empresa em foco
              </span>
              <span className="text-[11px] font-mono text-zinc-400">
                {availableCompanies.length} empresas
              </span>
            </div>

            {/* Busca Rápida de Empresa */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" strokeWidth={1.5} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar empresa..."
                className="w-full pl-8 pr-3 h-8 bg-zinc-50 border border-zinc-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-zinc-400"
                autoFocus
              />
            </div>

            {/* Lista de Empresas */}
            <div className="max-h-60 overflow-y-auto space-y-0.5 pt-1">
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
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition text-left cursor-pointer ${
                      isSelected
                        ? "bg-zinc-900 text-white font-medium"
                        : "hover:bg-zinc-100 text-zinc-800"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <Building2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-white" : "text-zinc-400"}`} strokeWidth={1.5} />
                      <span className="truncate">{company.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {company.isOtimizza && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                          isSelected ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-600 border border-zinc-200"
                        }`}>
                          Padrão
                        </span>
                      )}
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={1.5} />}
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

            <div className="border-t border-zinc-100 pt-1.5 px-2 text-[11px] text-zinc-400 leading-tight">
              Define o cliente padrão nos módulos de produção e acompanhamento.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
