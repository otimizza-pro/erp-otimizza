"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import {
  Layers,
  Plus,
  ArrowRight,
  CheckCircle2,
  Settings,
  Archive,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { PipelineRecord } from "@/modules/crm/types";
import { formatBRL } from "@/components/analytics/report-charts";

export default function PipelinesManagementPage() {
  const [pipelines, setPipelines] = useState<PipelineRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPipeline, setNewPipeline] = useState({ name: "", description: "", isDefault: false });
  const [creating, setCreating] = useState(false);

  async function loadPipelines() {
    setLoading(true);
    try {
      const res = await fetch("/api/crm/pipelines?includeArchived=true");
      if (res.ok) {
        setPipelines(await res.json());
      }
    } catch (e) {
      console.error("Erro ao carregar funis:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPipelines();
  }, []);

  const handleCreatePipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/crm/pipelines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPipeline),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setNewPipeline({ name: "", description: "", isDefault: false });
        loadPipelines();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <AppShell activeSection="crm_pipelines">
      <div className="space-y-6 pb-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-zinc-900 text-white">
                <Layers className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
                  Funis de Vendas & Processos Comerciais
                </h1>
                <p className="text-xs text-zinc-500">
                  Configure múltiplos funis com etapas, probabilidades e quadros Kanban independentes.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Criar Novo Funil
            </button>
          </div>
        </div>

        {/* Lista de Funis */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full py-16 text-center text-xs text-zinc-400">
              Carregando funis de venda...
            </div>
          ) : (
            pipelines.map((pipe) => (
              <div
                key={pipe.id}
                className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:border-zinc-300 transition space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base text-zinc-950">{pipe.name}</h3>
                    {pipe.isDefault && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        Funil Padrão
                      </span>
                    )}
                  </div>
                  {pipe.description && (
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{pipe.description}</p>
                  )}

                  <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-zinc-100">
                    <div>
                      <span className="text-[10px] text-zinc-400 font-semibold uppercase">Negócios Abertos</span>
                      <div className="text-sm font-bold text-zinc-900 mt-0.5">
                        {pipe.openOpportunitiesCount || 0}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 font-semibold uppercase">Valor do Pipeline</span>
                      <div className="text-sm font-extrabold text-purple-700 font-mono mt-0.5">
                        {formatBRL(pipe.totalPipelineAmount || 0)}
                      </div>
                    </div>
                  </div>

                  {/* Etapas do Funil */}
                  <div className="mt-4">
                    <span className="text-[10px] text-zinc-400 font-semibold uppercase block mb-1.5">
                      Etapas ({pipe.stages?.length || 0})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {pipe.stages?.map((st) => (
                        <span
                          key={st.id}
                          className="px-2 py-0.5 rounded-md text-[10px] font-semibold text-white shadow-2xs"
                          style={{ backgroundColor: st.color }}
                        >
                          {st.name} ({st.winProbability}%)
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-100 flex items-center justify-between">
                  <span className={`text-[10px] font-bold ${pipe.status === "ACTIVE" ? "text-emerald-600" : "text-zinc-400"}`}>
                    {pipe.status === "ACTIVE" ? "Ativo" : "Arquivado"}
                  </span>

                  <Link
                    href={`/crm/pipelines/${pipe.id}`}
                    className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                  >
                    Abrir Kanban <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal de Criar Funil */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <form
              onSubmit={handleCreatePipeline}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4"
            >
              <h3 className="text-base font-bold text-zinc-950 border-b border-zinc-100 pb-2">
                Novo Funil de Vendas
              </h3>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">Nome do Funil *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Aquisição Outbound, Consultoria Especial..."
                  value={newPipeline.name}
                  onChange={(e) => setNewPipeline((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">Descrição</label>
                <textarea
                  rows={2}
                  placeholder="Propósito e escopo deste processo comercial..."
                  value={newPipeline.description}
                  onChange={(e) => setNewPipeline((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={newPipeline.isDefault}
                  onChange={(e) => setNewPipeline((prev) => ({ ...prev, isDefault: e.target.checked }))}
                  className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                />
                <span>Definir como Funil Padrão do sistema</span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-950 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl disabled:opacity-50"
                >
                  {creating ? "Criando..." : "Criar Funil"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AppShell>
  );
}
