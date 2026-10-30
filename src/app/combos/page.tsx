"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Combo } from "@/modules/catalog/types";
import {
  Layers,
  Plus,
  Search,
  RefreshCw,
  Archive,
  ChevronRight,
  Sparkles,
  Trash2,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react";
import { formatBRL } from "@/shared/money";

export default function CombosPage() {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "ARCHIVED">("ACTIVE");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const loadCombos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/combos?status=${statusFilter}${search ? `&search=${search}` : ""}`);
      const data = await res.json();
      setCombos(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleArchive = async (id: string, currentStatus: string) => {
    const isArchiving = currentStatus === "ACTIVE";
    if (!window.confirm(isArchiving ? "Deseja realmente arquivar este combo?" : "Deseja reativar este combo?")) {
      return;
    }
    setFeedback(null);
    try {
      const res = await fetch(`/api/combos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: isArchiving ? "ARCHIVE" : "REACTIVATE" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao alterar status do combo");
      setFeedback({ type: "success", msg: data.message || "Status alterado com sucesso!" });
      loadCombos();
    } catch (err: unknown) {
      setFeedback({ type: "error", msg: err instanceof Error ? err.message : "Erro ao alterar status" });
    }
  };

  const handleDeleteCombo = async (combo: Combo) => {
    if (!window.confirm(`Tem certeza que deseja excluir o combo "${combo.name}"? Se ele já tiver contratos vinculados, será arquivado com segurança.`)) {
      return;
    }
    setFeedback(null);
    try {
      const res = await fetch(`/api/combos/${combo.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao excluir combo");
      setFeedback({ type: "success", msg: data.message || "Combo excluído com sucesso!" });
      loadCombos();
    } catch (err: unknown) {
      setFeedback({ type: "error", msg: err instanceof Error ? err.message : "Erro ao excluir combo" });
    }
  };

  useEffect(() => {
    loadCombos();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadCombos();
  };

  return (
    <AppShell activeSection="combos">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Agrupamentos Comerciais
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
              Combos de Serviços
            </h1>
            <p className="text-xs text-zinc-500">
              Pacotes comerciais reutilizáveis com múltiplos serviços, precificação negociada e transparência de componentes
            </p>
          </div>
          <Link
            href="/combos/new"
            className="px-4 py-2 rounded-full bg-zinc-950 text-white text-xs font-semibold hover:bg-zinc-800 transition shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Combo
          </Link>
        </div>

        {/* Notificações de Feedback */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
              feedback.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-rose-50 border-rose-200 text-rose-700"
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{feedback.msg}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="hover:opacity-70 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filtros e Busca */}
        <div className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-hourline flex flex-col md:flex-row items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar combos por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-full bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 placeholder-zinc-400 focus:bg-white focus:outline-none focus:border-zinc-900 transition"
            />
          </form>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <div className="flex items-center rounded-full bg-zinc-100 p-1 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter("ACTIVE")}
                className={`px-3 py-1 rounded-full font-medium transition ${
                  statusFilter === "ACTIVE"
                    ? "bg-white text-zinc-950 shadow-2xs font-semibold"
                    : "text-zinc-600 hover:text-zinc-950"
                }`}
              >
                Ativos
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("ARCHIVED")}
                className={`px-3 py-1 rounded-full font-medium transition ${
                  statusFilter === "ARCHIVED"
                    ? "bg-white text-zinc-950 shadow-2xs font-semibold"
                    : "text-zinc-600 hover:text-zinc-950"
                }`}
              >
                Arquivados
              </button>
            </div>

            <button
              onClick={loadCombos}
              title="Atualizar lista"
              className="p-2 rounded-full bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Grid de Combos */}
        {loading ? (
          <div className="p-12 text-center text-xs text-zinc-400">Carregando combos...</div>
        ) : combos.length === 0 ? (
          <div className="p-12 text-center text-zinc-400 bg-white rounded-2xl border border-zinc-200/80 shadow-hourline space-y-3">
            <Layers className="w-8 h-8 text-zinc-300 mx-auto" />
            <p className="text-xs">Nenhum combo comercial cadastrado.</p>
            <Link
              href="/combos/new"
              className="inline-block text-xs font-semibold text-zinc-900 underline underline-offset-4"
            >
              Criar primeiro combo
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {combos.map((combo) => (
              <div
                key={combo.id}
                className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-hourline flex flex-col justify-between hover:border-zinc-300 transition"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                      {combo.items?.length || 0} Serviços Agrupados
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        combo.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-zinc-100 text-zinc-500 border-zinc-200"
                      }`}
                    >
                      {combo.status === "ACTIVE" ? "ATIVO" : "ARQUIVADO"}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-zinc-950 mt-3">{combo.name}</h3>
                  {combo.description && (
                    <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{combo.description}</p>
                  )}

                  {/* Componentes do Combo */}
                  <div className="mt-4 pt-3 border-t border-zinc-100 space-y-2">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 block">
                      Componentes e Preços Atribuídos:
                    </span>
                    <div className="space-y-1.5">
                      {combo.items?.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-zinc-50 border border-zinc-100"
                        >
                          <span className="text-zinc-800 font-medium">{item.serviceName}</span>
                          <div className="text-right">
                            <span className="font-mono font-semibold text-zinc-950">
                              {formatBRL(Math.round(item.componentPrice * 100))}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-zinc-400 block">Preço Total do Combo</span>
                    <span className="text-lg font-bold font-mono text-zinc-950">
                      {formatBRL(Math.round(combo.totalPrice * 100))}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggleArchive(combo.id, combo.status)}
                      title={combo.status === "ACTIVE" ? "Arquivar Combo" : "Reativar Combo"}
                      className="p-2 rounded-xl border border-zinc-200 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 transition cursor-pointer"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCombo(combo)}
                      title="Excluir Combo"
                      className="p-2 rounded-xl border border-rose-200 text-rose-600 hover:text-rose-800 hover:bg-rose-50 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
