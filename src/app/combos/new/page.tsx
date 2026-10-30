"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { ArrowLeft, Save, Plus, Trash2, AlertCircle } from "lucide-react";
import { ServiceItem } from "@/modules/catalog/types";
import { formatBRL } from "@/shared/money";

interface ComboItemForm {
  serviceId: string;
  componentPrice: string;
}

export default function NewComboPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [availableServices, setAvailableServices] = useState<ServiceItem[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<ComboItemForm[]>([
    { serviceId: "", componentPrice: "" },
    { serviceId: "", componentPrice: "" },
  ]);

  useEffect(() => {
    fetch("/api/services?status=ACTIVE")
      .then((res) => res.json())
      .then((data) => setAvailableServices(data || []))
      .catch((e) => console.error(e));
  }, []);

  const handleServiceChange = (index: number, serviceId: string) => {
    const service = availableServices.find((s) => s.id === serviceId);
    const updated = [...items];
    updated[index].serviceId = serviceId;
    if (service) {
      // Sugere o preço padrão do serviço, permitindo negociação
      updated[index].componentPrice = String(service.defaultPrice);
    }
    setItems(updated);
  };

  const handlePriceChange = (index: number, price: string) => {
    const updated = [...items];
    updated[index].componentPrice = price;
    setItems(updated);
  };

  const addItem = () => {
    setItems([...items, { serviceId: "", componentPrice: "" }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Cálculo do total em tempo real
  const calculatedTotal = items.reduce((acc, curr) => {
    const val = parseFloat(curr.componentPrice.replace(",", ".")) || 0;
    return acc + val;
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (items.length < 2) {
        throw new Error("Um combo comercial deve conter pelo menos 2 serviços associados.");
      }

      for (const item of items) {
        if (!item.serviceId) {
          throw new Error("Selecione todos os serviços componentes.");
        }
        const p = parseFloat(item.componentPrice.replace(",", "."));
        if (isNaN(p) || p < 0) {
          throw new Error("Todos os componentes devem possuir preço válido.");
        }
      }

      const res = await fetch("/api/combos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          items: items.map((i) => ({
            serviceId: i.serviceId,
            componentPrice: parseFloat(i.componentPrice.replace(",", ".")),
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Falha ao cadastrar combo.");
      }

      router.push("/combos");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell activeSection="combos">
      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/combos"
              className="p-2 rounded-full bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100 transition shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-950">
                Criar Combo Comercial de Serviços
              </h1>
              <p className="text-xs text-zinc-500">
                Agrupamento com precificação negociada por componente e cálculo exato de total
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

        {/* Identificação do Combo */}
        <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-hourline space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900">Identificação do Pacote Comercial</h2>
          <div className="grid grid-cols-1 gap-4 text-xs">
            <div>
              <label className="block font-medium text-zinc-700">Nome do Combo *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Pacote Aceleração Empresarial Completa"
                className="mt-1 w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
              />
            </div>

            <div>
              <label className="block font-medium text-zinc-700">Descrição Comercial</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Proposta de valor do pacote, escopo conjunto e condições comerciais..."
                className="mt-1 w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
              />
            </div>
          </div>
        </div>

        {/* Serviços Componentes */}
        <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-hourline space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Serviços Componentes do Combo</h2>
              <p className="text-xs text-zinc-500">
                Selecione no mínimo 2 serviços e defina o preço específico atribuído a cada um
              </p>
            </div>
            <button
              type="button"
              onClick={addItem}
              className="px-3.5 py-1.5 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar Serviço
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80 grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs items-end"
              >
                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-medium text-zinc-600">
                    Serviço #{idx + 1} *
                  </label>
                  <select
                    required
                    value={item.serviceId}
                    onChange={(e) => handleServiceChange(idx, e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-900"
                  >
                    <option value="">Selecione um serviço do catálogo...</option>
                    {availableServices.map((svc) => (
                      <option key={svc.id} value={svc.id}>
                        {svc.name} (Tabela: R$ {svc.defaultPrice.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-600">
                    Preço Atribuído (R$) *
                  </label>
                  <input
                    type="text"
                    required
                    value={item.componentPrice}
                    onChange={(e) => handlePriceChange(idx, e.target.value)}
                    placeholder="0,00"
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-900 font-mono"
                  />
                </div>

                <div className="flex justify-end pb-1">
                  {items.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Sumário do Preço do Combo */}
          <div className="mt-6 p-4 rounded-xl bg-zinc-100/70 border border-zinc-200/80 flex items-center justify-between">
            <div>
              <span className="text-xs text-zinc-500 block">Preço Total do Combo (Soma dos Componentes)</span>
              <span className="text-xl font-bold font-mono text-zinc-950">
                {formatBRL(Math.round(calculatedTotal * 100))}
              </span>
            </div>
            <span className="text-[11px] text-zinc-500">
              {items.filter((i) => i.serviceId).length} serviço(s) selecionados
            </span>
          </div>
        </div>

        {/* Ações no Final da Página */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200">
          <Link
            href="/combos"
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
            <span>{loading ? "Salvando..." : "Salvar Combo"}</span>
          </button>
        </div>
      </form>
    </AppShell>
  );
}
