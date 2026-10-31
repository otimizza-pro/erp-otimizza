"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/app-shell";
import {
  Layers,
  Plus,
  Archive,
  Edit2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  X,
  Lock,
} from "lucide-react";
import { CostCenterRecord } from "@/modules/financial/dre/types";

export default function CostCentersPage() {
  const [costCenters, setCostCenters] = useState<CostCenterRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal de criação / edição
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formCode, setFormCode] = useState<string>("");
  const [formName, setFormName] = useState<string>("");
  const [formDesc, setFormDesc] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);

  const loadCostCenters = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/financial/cost-centers?includeArchived=true");
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Erro ao listar centros de custo");
      setCostCenters(json.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCostCenters();
  }, [loadCostCenters]);

  const openNewModal = () => {
    setEditingId(null);
    setFormCode("");
    setFormName("");
    setFormDesc("");
    setIsModalOpen(true);
  };

  const openEditModal = (cc: CostCenterRecord) => {
    setEditingId(cc.id);
    setFormCode(cc.code);
    setFormName(cc.name);
    setFormDesc(cc.description || "");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (editingId) {
        const res = await fetch(`/api/financial/cost-centers/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: formName, description: formDesc }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "Erro ao atualizar");
        setSuccess("Centro de custo atualizado com sucesso!");
      } else {
        const res = await fetch("/api/financial/cost-centers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: formCode, name: formName, description: formDesc }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "Erro ao criar");
        setSuccess("Centro de custo cadastrado com sucesso!");
      }

      setIsModalOpen(false);
      loadCostCenters();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar centro de custo.");
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (cc: CostCenterRecord) => {
    if (cc.isSystemDefault) {
      alert("Centros de custo padrão do sistema não podem ser arquivados.");
      return;
    }

    if (!confirm(`Deseja arquivar o centro de custo ${cc.code} - ${cc.name}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/financial/cost-centers/${cc.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Erro ao arquivar");
      setSuccess("Centro de custo arquivado com sucesso!");
      loadCostCenters();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao arquivar centro de custo.");
    }
  };

  return (
    <AppShell>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
              <span>Financeiro</span>
              <span>/</span>
              <span className="text-slate-900 font-semibold">Centros de Custo</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-1 flex items-center gap-2">
              <Layers className="w-7 h-7 text-indigo-600" />
              Centros de Custo e Unidades de Negócio
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Estruturação departamental para rateio de despesas e apropriação gerencial na DRE.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openNewModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Novo Centro de Custo
            </button>
            <button
              onClick={loadCostCenters}
              disabled={loading}
              className="p-2 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-50 shadow-sm transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Alertas */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 flex items-center gap-3 text-sm">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Tabela de Centros de Custo */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-28">Código</th>
                <th className="py-3 px-4">Nome do Centro</th>
                <th className="py-3 px-4">Descrição</th>
                <th className="py-3 px-4 w-28">Status</th>
                <th className="py-3 px-4 text-right w-28">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && costCenters.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                    Carregando centros de custo...
                  </td>
                </tr>
              ) : costCenters.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Nenhum centro de custo encontrado.
                  </td>
                </tr>
              ) : (
                costCenters.map((cc) => (
                  <tr key={cc.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                      {cc.code}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2">
                      {cc.name}
                      {cc.isSystemDefault && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium border border-slate-200">
                          <Lock className="w-2.5 h-2.5" /> Padrão
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-xs">
                      {cc.description || "-"}
                    </td>
                    <td className="py-3 px-4">
                      {cc.status === "ACTIVE" ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          Arquivado
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(cc)}
                          title="Editar"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {!cc.isSystemDefault && cc.status === "ACTIVE" && (
                          <button
                            onClick={() => handleArchive(cc)}
                            title="Arquivar"
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Modal de Cadastro / Edição */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-bold text-slate-900 text-base">
                  {editingId ? "Editar Centro de Custo" : "Novo Centro de Custo"}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Código do Centro (ex: MKT, RH, JUR)
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingId}
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    placeholder="MKT"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm uppercase font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome do Centro de Custo
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Marketing Digital"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Descrição e Finalidade
                  </label>
                  <textarea
                    rows={3}
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="Despesas com campanhas, branding e agências"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? "Salvando..." : "Salvar Centro"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
