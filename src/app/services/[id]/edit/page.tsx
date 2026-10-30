"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import { ServiceCategory, BillingUnit } from "@/modules/catalog/types";

export default function EditServicePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [defaultPrice, setDefaultPrice] = useState("");
  const [defaultCost, setDefaultCost] = useState("");
  const [billingUnit, setBillingUnit] = useState<BillingUnit>("MES");
  const [status, setStatus] = useState<"ACTIVE" | "ARCHIVED">("ACTIVE");

  useEffect(() => {
    Promise.all([
      fetch(`/api/services/${id}`).then((r) => r.json()),
      fetch("/api/services?type=categories").then((r) => r.json()),
    ])
      .then(([serviceData, categoriesData]) => {
        setName(serviceData.name || "");
        setCategoryId(serviceData.categoryId || "");
        setDescription(serviceData.description || "");
        setDefaultPrice(String(serviceData.defaultPrice || "0"));
        setDefaultCost(String(serviceData.defaultCost || "0"));
        setBillingUnit(serviceData.billingUnit || "MES");
        setStatus(serviceData.status || "ACTIVE");
        setCategories(categoriesData || []);
      })
      .catch((e) => setError("Erro ao carregar dados do serviço"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
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

      const res = await fetch(`/api/services/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: categoryId || null,
          name,
          description,
          defaultPrice: priceNum,
          defaultCost: costNum,
          billingUnit,
          status,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Falha ao salvar serviço.");
      }

      router.push("/services");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleArchive = async () => {
    const isArchived = status === "ARCHIVED";
    if (!confirm(isArchived ? "Deseja reativar este serviço?" : "Deseja arquivar este serviço?")) {
      return;
    }

    try {
      const res = await fetch(`/api/services/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: isArchived ? "REACTIVATE" : "ARCHIVE" }),
      });
      if (!res.ok) throw new Error("Erro ao alterar status");
      setStatus(isArchived ? "ACTIVE" : "ARCHIVED");
    } catch (e) {
      alert("Falha ao alterar status");
    }
  };

  if (loading) {
    return (
      <AppShell activeSection="catalog">
        <div className="p-12 text-center text-xs text-zinc-400">Carregando formulário...</div>
      </AppShell>
    );
  }

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
                Editar Serviço do Catálogo
              </h1>
              <p className="text-xs text-zinc-500">
                Ajuste os valores de tabela sem alterar contratos ou contratações anteriores
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleArchive}
              className={`px-4 py-2 rounded-full text-xs font-semibold border transition ${
                status === "ACTIVE"
                  ? "bg-white border-zinc-200 text-zinc-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
                  : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              {status === "ACTIVE" ? "Arquivar Serviço" : "Reativar Serviço"}
            </button>
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
              <label className="block font-medium text-zinc-700">Preço Padrão de Venda (R$) *</label>
              <input
                type="text"
                required
                value={defaultPrice}
                onChange={(e) => setDefaultPrice(e.target.value)}
                className="mt-1 w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900 font-mono"
              />
            </div>

            <div>
              <label className="block font-medium text-zinc-700">Custo Padrão Estimado (R$) *</label>
              <input
                type="text"
                required
                value={defaultCost}
                onChange={(e) => setDefaultCost(e.target.value)}
                className="mt-1 w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900 font-mono"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-medium text-zinc-700">Descrição Detalhada</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-zinc-950 text-white text-xs font-semibold hover:bg-zinc-800 transition shadow-xs disabled:opacity-50 active:scale-[0.98]"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Salvando..." : "Salvar Alterações"}</span>
          </button>
        </div>
      </form>
    </AppShell>
  );
}
