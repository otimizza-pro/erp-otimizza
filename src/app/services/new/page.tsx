"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { ArrowLeft, Save, AlertCircle, Plus, X, Check } from "lucide-react";
import { ServiceCategory, BillingUnit } from "@/modules/catalog/types";
import { Autocomplete, AutocompleteOption } from "@/components/ui/autocomplete";
import { CurrencyInput } from "@/components/ui/currency-input";

export default function NewServicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [defaultPrice, setDefaultPrice] = useState("");
  const [defaultCost, setDefaultCost] = useState("");
  const [billingUnit, setBillingUnit] = useState<BillingUnit>("MES");
  const [defaultSupplierId, setDefaultSupplierId] = useState<string | null>(null);
  const [defaultSupplierName, setDefaultSupplierName] = useState("");
  const [defaultCostPeriodicity, setDefaultCostPeriodicity] = useState<"MONTHLY" | "ONE_TIME" | "YEARLY">("MONTHLY");

  // Quick Category creation
  const [newCatModalOpen, setNewCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [savingCat, setSavingCat] = useState(false);

  const loadCategories = () => {
    fetch("/api/services?type=categories")
      .then((res) => res.json())
      .then((data) => setCategories(data || []))
      .catch((e) => console.error(e));
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleQuickCreateCategory = async () => {
    if (!newCatName.trim()) return;
    setSavingCat(true);
    try {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "CATEGORY",
          name: newCatName.trim(),
          description: newCatDesc.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao criar categoria.");

      setCategoryId(data.id);
      setNewCatModalOpen(false);
      setNewCatName("");
      setNewCatDesc("");
      loadCategories();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao criar categoria.");
    } finally {
      setSavingCat(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const priceNum = parseFloat(defaultPrice.replace(",", "."));
      const costNum = parseFloat(defaultCost.replace(",", "."));

      if (isNaN(priceNum) || priceNum < 0) {
        throw new Error("Informe um preço padrão válido.");
      }
      if (isNaN(costNum) || costNum < 0) {
        throw new Error("Informe um custo padrão válido.");
      }

      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: categoryId || null,
          name,
          description,
          defaultPrice: priceNum,
          defaultCost: costNum,
          billingUnit,
          defaultSupplierId: defaultSupplierId || null,
          defaultCostPeriodicity,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Falha ao cadastrar serviço.");
      }

      router.push("/services");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async (q: string): Promise<AutocompleteOption[]> => {
    try {
      const res = await fetch(`/api/suppliers?search=${encodeURIComponent(q)}&status=ACTIVE&limit=20`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.suppliers || []).map((s: { id: string; name: string; supplierCode: string; document?: string }) => ({
        id: s.id,
        label: s.name,
        sublabel: `${s.supplierCode}${s.document ? ` • ${s.document}` : ""}`,
      }));
    } catch {
      return [];
    }
  };

  return (
    <AppShell activeSection="catalog">
      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/services"
              className="p-2 rounded-full bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100 transition shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-950">
                Novo Serviço no Catálogo
              </h1>
              <p className="text-xs text-zinc-500">
                Defina precificação de referência, custo estimado e unidade de cobrança
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-hourline space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900">Definições do Serviço</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="md:col-span-2">
              <label className="block font-medium text-zinc-700">Nome do Serviço *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Consultoria em Otimização de Processos"
                className="mt-1 w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-medium text-zinc-700">Categoria Vinculada</label>
                <button
                  type="button"
                  onClick={() => setNewCatModalOpen(true)}
                  className="text-[11px] font-semibold text-zinc-900 hover:text-zinc-600 underline underline-offset-2 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Nova Categoria
                </button>
              </div>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
              >
                <option value="">Sem categoria (Geral)</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-zinc-700">Unidade de Cobrança *</label>
              <select
                value={billingUnit}
                onChange={(e) => setBillingUnit(e.target.value as BillingUnit)}
                className="mt-1 w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900 font-medium"
              >
                <option value="MES">Mensal (Assinatura / Recorrência)</option>
                <option value="HORA">Por Hora Técnica</option>
                <option value="PROJETO">Por Projeto / Escopo Fechado</option>
                <option value="UNIDADE">Por Unidade / Entrega</option>
                <option value="ANUAL">Anual</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-zinc-700">Preço Padrão de Venda *</label>
              <CurrencyInput
                required
                value={defaultPrice}
                onChangeValue={(val) => setDefaultPrice(String(val))}
                placeholder="0,00"
                className="mt-1 w-full py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900 font-mono"
              />
              <span className="text-[10px] text-zinc-400 mt-0.5 block">
                Preço de tabela de referência (pode ser negociado no fechamento de contratos).
              </span>
            </div>

            <div>
              <label className="block font-medium text-zinc-700">Custo Padrão Estimado *</label>
              <CurrencyInput
                required
                value={defaultCost}
                onChangeValue={(val) => setDefaultCost(String(val))}
                placeholder="0,00"
                className="mt-1 w-full py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900 font-mono"
              />
              <span className="text-[10px] text-zinc-400 mt-0.5 block">
                Custo base para cálculo da margem de contribuição.
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-medium text-zinc-700">
                  Fornecedor Padrão <span className="text-zinc-400 font-normal">(Opcional)</span>
                </label>
                {defaultSupplierId && (
                  <button
                    type="button"
                    onClick={() => {
                      setDefaultSupplierId(null);
                      setDefaultSupplierName("");
                    }}
                    className="text-[11px] font-medium text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3 h-3" /> Limpar fornecedor
                  </button>
                )}
              </div>
              <Autocomplete
                value={defaultSupplierName}
                selectedId={defaultSupplierId}
                onChange={(val, opt) => {
                  setDefaultSupplierName(val);
                  setDefaultSupplierId(opt?.id || null);
                }}
                fetchOptions={fetchSuppliers}
                placeholder="Buscar fornecedor por nome, código ou CNPJ (ou deixe em branco)..."
                allowCustom={false}
              />
              <span className="text-[10px] text-zinc-400 mt-0.5 block">
                {defaultSupplierId
                  ? "Fornecedor vinculado. O custo estimado gerará contas a pagar correspondentes."
                  : "Sem fornecedor vinculado (serviço interno / sem custo de terceiro)."}
              </span>
            </div>

            <div>
              <label className="block font-medium text-zinc-700">Periodicidade do Custo</label>
              <select
                value={defaultCostPeriodicity}
                onChange={(e) => setDefaultCostPeriodicity(e.target.value as "MONTHLY" | "ONE_TIME" | "YEARLY")}
                className="mt-1 w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900 text-xs"
              >
                <option value="MONTHLY">Mensal (Custo Recorrente)</option>
                <option value="ONE_TIME">Pontual / Único</option>
                <option value="YEARLY">Anual</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block font-medium text-zinc-700">Descrição Detalhada</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Escopo do serviço, entregáveis inclusos e metodologia de execução..."
                className="mt-1 w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
              />
            </div>
          </div>
        </div>

        {/* Ações no Final da Página */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200">
          <Link
            href="/services"
            className="px-5 py-2.5 rounded-full border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition shadow-2xs"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-zinc-950 text-white text-xs font-semibold hover:bg-zinc-800 transition shadow-xs disabled:opacity-50 active:scale-[0.98]"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? "Salvando..." : "Salvar Serviço"}</span>
          </button>
        </div>
      </form>

      {/* Modal Rápido de Nova Categoria */}
      {newCatModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-zinc-200 space-y-4">
            <h3 className="font-bold text-zinc-950 text-base">Nova Categoria de Serviços</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Nome da Categoria *</label>
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Ex: Tráfego Pago, Social Media..."
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
                  autoFocus
                />
              </div>
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Descrição</label>
                <input
                  type="text"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  placeholder="Ex: Campanhas de anúncios e mídia de performance"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewCatModalOpen(false)}
                  className="px-3 py-1.5 font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={savingCat || !newCatName.trim()}
                  onClick={handleQuickCreateCategory}
                  className="px-4 py-1.5 font-medium text-white bg-zinc-950 hover:bg-zinc-800 rounded-lg disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingCat ? "Salvando..." : "Criar Categoria"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
