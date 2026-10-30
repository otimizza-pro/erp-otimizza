"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { ArrowLeft, Save, AlertCircle, Info, Calendar, DollarSign, Building2, Tag } from "lucide-react";
import { FinancialCategoryRecord } from "@/modules/financial/types";
import { Autocomplete, AutocompleteOption } from "@/components/ui/autocomplete";

interface ServiceOption {
  id: string;
  name: string;
}

interface ContractOption {
  id: string;
  contractNumber: string;
  title: string;
}

export default function NewPayablePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<FinancialCategoryRecord[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [contracts, setContracts] = useState<ContractOption[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Form fields
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [supplierName, setSupplierName] = useState("");
  const [supplierOptions, setSupplierOptions] = useState<AutocompleteOption[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [contractId, setContractId] = useState("");
  const [description, setDescription] = useState("");
  const [competency, setCompetency] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10)); // YYYY-MM-DD
  const [originalAmount, setOriginalAmount] = useState<number | string>("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [resCat, resServ, resCont] = await Promise.all([
          fetch("/api/financial/cashflow"), // or categories
          fetch("/api/services?limit=100"),
          fetch("/api/contracts?limit=100"),
        ]);

        if (resServ.ok) {
          const jsonServ = await resServ.json();
          setServices(jsonServ.services || []);
        }

        if (resCont.ok) {
          const jsonCont = await resCont.json();
          setContracts(jsonCont.contracts || []);
        }

        const resSup = await fetch("/api/suppliers?status=ACTIVE&limit=100");
        if (resSup.ok) {
          const jsonSup = await resSup.json();
          const opts: AutocompleteOption[] = (jsonSup.suppliers || []).map((s: { id: string; name: string; supplierCode: string; document?: string; category?: string; personType: string }) => ({
            id: s.id,
            label: s.name,
            sublabel: `${s.supplierCode}${s.document ? ` • ${s.document}` : ""}${s.category ? ` • ${s.category}` : ""}`,
            badge: s.personType,
          }));
          setSupplierOptions(opts);
        }
      } catch (err) {
        console.error("Erro ao carregar dados auxiliares:", err);
      } finally {
        setLoadingInitial(false);
      }
    }
    loadData();
  }, []);

  const fetchSuppliers = async (q: string): Promise<AutocompleteOption[]> => {
    try {
      const res = await fetch(`/api/suppliers?search=${encodeURIComponent(q)}&status=ACTIVE&limit=20`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.suppliers || []).map((s: { id: string; name: string; supplierCode: string; document?: string; category?: string; personType: string }) => ({
        id: s.id,
        label: s.name,
        sublabel: `${s.supplierCode}${s.document ? ` • ${s.document}` : ""}${s.category ? ` • ${s.category}` : ""}`,
        badge: s.personType,
      }));
    } catch {
      return [];
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!supplierName.trim()) {
      setErrorMsg("Informe o nome do fornecedor ou beneficiário.");
      return;
    }
    if (!description.trim()) {
      setErrorMsg("Informe a descrição da despesa.");
      return;
    }
    if (!competency || competency.length !== 7) {
      setErrorMsg("Competência deve estar no formato AAAA-MM.");
      return;
    }
    if (!dueDate) {
      setErrorMsg("Informe a data de vencimento.");
      return;
    }
    const amt = Number(originalAmount);
    if (!amt || amt <= 0) {
      setErrorMsg("Valor da despesa deve ser maior que zero.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/financial/payables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: supplierId || undefined,
          supplierName: supplierName.trim(),
          categoryId: categoryId || undefined,
          serviceId: serviceId || undefined,
          contractId: contractId || undefined,
          description: description.trim(),
          competency,
          dueDate,
          originalAmount: amt,
          notes: notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Erro ao registrar conta a pagar.");
      }

      const created = await res.json();
      router.push(`/financial/payables/${created.id}`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Erro desconhecido ao salvar conta a pagar.");
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/financial/payables"
              className="p-2 border border-slate-200 rounded-lg hover:bg-slate-100 transition text-slate-600"
              title="Voltar para Contas a Pagar"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Nova Despesa / Conta a Pagar
              </h1>
              <p className="text-sm text-slate-500">
                Lançamento manual de obrigação financeira no contas a pagar
              </p>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card: Beneficiário & Descrição */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                Dados do Fornecedor e Classificação
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Informe quem receberá o valor e faça a apropriação de custos para rentabilidade.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Fornecedor / Beneficiário <span className="text-red-500">*</span>
                </label>
                <Autocomplete
                  value={supplierName}
                  selectedId={supplierId}
                  onChange={(val, opt) => {
                    setSupplierName(val);
                    setSupplierId(opt?.id || null);
                  }}
                  fetchOptions={fetchSuppliers}
                  options={supplierOptions}
                  placeholder="Digite para buscar fornecedor (nome, código ou CNPJ)..."
                  required
                  disabled={saving}
                  allowCustom={true}
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Selecione um fornecedor cadastrado com autocomplete ou digite um novo beneficiário avulso.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Alocação em Serviço (Rentabilidade)
                </label>
                <select
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  disabled={saving}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Nenhum (Despesa Operacional / Fixa)</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Vincule a um serviço para dedução direta na análise de margem de contribuição.
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Descrição da Despesa <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Servidores em Nuvem Produção ou Honorários Contábeis"
                  disabled={saving}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Card: Valores e Datas */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Valores, Competência e Vencimento
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Competência (AAAA-MM) <span className="text-red-500">*</span>
                </label>
                <input
                  type="month"
                  value={competency}
                  onChange={(e) => setCompetency(e.target.value)}
                  disabled={saving}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Data de Vencimento <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={saving}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Valor a Pagar (R$) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={originalAmount}
                  onChange={(e) => setOriginalAmount(e.target.value)}
                  placeholder="0,00"
                  disabled={saving}
                  className="w-full px-3.5 py-2.5 text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Observações e Justificativas de Auditoria
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Número de nota fiscal, autorização de diretoria ou termos de pagamento..."
                  disabled={saving}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Link
              href="/financial/payables"
              className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-sm transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? "Salvando Despesa..." : "Salvar Despesa"}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
