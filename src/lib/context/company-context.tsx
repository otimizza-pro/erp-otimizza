"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export interface SelectedCompany {
  id: string; // 'otimizza' ou UUID do cliente
  name: string;
  isOtimizza: boolean;
}

export const OTIMIZZA_DEFAULT_COMPANY: SelectedCompany = {
  id: "otimizza",
  name: "Otimizza Growth",
  isOtimizza: true,
};

const STORAGE_KEY = "otimizza_selected_company";

interface CompanyContextType {
  selectedCompany: SelectedCompany;
  selectCompany: (company: SelectedCompany) => void;
  selectOtimizza: () => void;
  availableCompanies: SelectedCompany[];
  reloadCompanies: () => Promise<void>;
  loading: boolean;
  hydrated: boolean;
}

const CompanyContext = createContext<CompanyContextType>({
  selectedCompany: OTIMIZZA_DEFAULT_COMPANY,
  selectCompany: () => {},
  selectOtimizza: () => {},
  availableCompanies: [OTIMIZZA_DEFAULT_COMPANY],
  reloadCompanies: async () => {},
  loading: false,
  hydrated: false,
});

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [selectedCompany, setSelectedCompanyState] = useState<SelectedCompany>(OTIMIZZA_DEFAULT_COMPANY);
  const [availableCompanies, setAvailableCompanies] = useState<SelectedCompany[]>([OTIMIZZA_DEFAULT_COMPANY]);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // 1. Carregar persistência do localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as SelectedCompany;
        if (parsed && parsed.id) {
          setSelectedCompanyState(parsed);
        }
      }
    } catch (e) {
      console.warn("Erro ao ler empresa selecionada do localStorage:", e);
    } finally {
      setHydrated(true);
    }
  }, []);

  // 2. Carregar empresas da base (Clientes Ativos)
  const reloadCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/content-studio/clients");
      if (res.ok) {
        const data = await res.json();
        const clients: SelectedCompany[] = (data.clients || []).map((c: {id:string;trade_name?:string;name?:string}) => ({
          id: c.id,
          name: c.trade_name || c.name || "Cliente sem Nome",
          isOtimizza: false,
        }));
        setAvailableCompanies([OTIMIZZA_DEFAULT_COMPANY, ...clients]);
      }
    } catch (e) {
      console.warn("Erro ao carregar lista de empresas:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadCompanies();
  }, [reloadCompanies]);

  const selectCompany = (company: SelectedCompany) => {
    setSelectedCompanyState(company);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(company));
      window.dispatchEvent(new CustomEvent("otimizza:company-changed", { detail: company }));
    } catch (e) {
      console.warn("Erro ao salvar empresa no localStorage:", e);
    }
  };

  const selectOtimizza = () => {
    selectCompany(OTIMIZZA_DEFAULT_COMPANY);
  };

  return (
    <CompanyContext.Provider
      value={{
        selectedCompany,
        selectCompany,
        selectOtimizza,
        availableCompanies,
        reloadCompanies,
        loading,
        hydrated,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  return useContext(CompanyContext);
}
