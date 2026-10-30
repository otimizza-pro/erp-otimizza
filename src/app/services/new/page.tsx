"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";
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

  useEffect(() => {
    fetch("/api/services?type=categories")
      .then((res) => res.json())
      .then((data) => setCategories(data || []))
      .catch((e) => console.error(e));
  }, []);

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
              <label className="block font-medium text-zinc-700">Categoria Vinculada</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="mt-1 w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
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
              <label className="block font-medium text-zinc-700">Fornecedor Padrão (Custo Vinculado)</label>
              <Autocomplete
                value={defaultSupplierName}
                selectedId={defaultSupplierId}
                onChange={(val, opt) => {
                  setDefaultSupplierName(val);
                  setDefaultSupplierId(opt?.id || null);
                }}
                fetchOptions={fetchSuppliers}
                placeholder="Buscar fornecedor por nome, código ou CNPJ..."
                allowCustom={false}
              />
              <span className="text-[10px] text-zinc-400 mt-0.5 block">
                Fornecedor de referência herdado automaticamente em novas contratações.
              </span>
            </div>

            <div>
              <label className="block font-medium text-zinc-700">Periodicidade do Custo</label>
              <select
                value={defaultCostPeriodicity}
                onChange={(e) => setDefaultCostPeriodicity(e.target.value as "MONTHLY" | "ONE_TIME" | "YEARLY")}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900 text-xs"
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
    </AppShell>
  );
}
