"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { ServiceCategory } from "@/modules/catalog/types";
import {
  FolderTree,
  Plus,
  ArrowLeft,
  RefreshCw,
  Save,
  AlertCircle,
  Pencil,
  Trash2,
  CheckCircle2,
  X,
} from "lucide-react";

export default function ServiceCategoriesPage() {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editParentId, setEditParentId] = useState("");
  const [editStatus, setEditStatus] = useState<"ACTIVE" | "ARCHIVED" | "INACTIVE">("ACTIVE");
  const [savingEdit, setSavingEdit] = useState(false);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "ARCHIVED">("ALL");

  const loadCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/services?type=categories");
      const data = await res.json();
      setCategories(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "CATEGORY",
          name,
          description,
          parentId: parentId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setName("");
      setDescription("");
      setParentId("");
      setSuccess("Categoria cadastrada com sucesso!");
      loadCategories();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao criar categoria");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEdit = (category: ServiceCategory) => {
    setEditingCategory(category);
    setEditName(category.name);
    setEditDescription(category.description || "");
    setEditParentId(category.parentId || "");
    setEditStatus((category.status as "ACTIVE" | "ARCHIVED" | "INACTIVE") || "ACTIVE");
    setEditModalOpen(true);
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    setSavingEdit(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/services/categories/${editingCategory.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          description: editDescription,
          parentId: editParentId || null,
          status: editStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao atualizar categoria");

      setEditModalOpen(false);
      setEditingCategory(null);
      setSuccess("Categoria atualizada com sucesso!");
      loadCategories();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar categoria");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteCategory = async (cat: ServiceCategory) => {
    if (!window.confirm(`Tem certeza que deseja excluir ou desativar a categoria "${cat.name}"?`)) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/services/categories/${cat.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao excluir categoria");

      setSuccess(data.message || "Operação realizada com sucesso!");
      loadCategories();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao excluir categoria");
    }
  };

  const filteredCategories = categories.filter((c) => {
    if (statusFilter === "ALL") return true;
    return c.status === statusFilter;
  });

  return (
    <AppShell activeSection="catalog">
      <div className="space-y-6 max-w-5xl">
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
                Categorias de Serviços
              </h1>
              <p className="text-xs text-zinc-500">
                Organização hierárquica e agrupamento de serviços prestados pela Otimizza
              </p>
            </div>
          </div>
        </div>

        {/* Notificações */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
            <button onClick={() => setSuccess(null)} className="text-emerald-500 hover:text-emerald-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Formulário de Criação Rápida */}
        <form
          onSubmit={handleCreateCategory}
          className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-hourline space-y-4"
        >
          <h2 className="text-sm font-semibold text-zinc-900">Nova Categoria de Serviços</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-medium text-zinc-700">Nome da Categoria *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Consultoria Estratégica"
                className="mt-1 w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
              />
            </div>

            <div>
              <label className="block font-medium text-zinc-700">Categoria Pai (Hierarquia)</label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="mt-1 w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
              >
                <option value="">Nenhuma (Categoria Principal)</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 px-4 rounded-full bg-zinc-950 text-white font-semibold hover:bg-zinc-800 transition shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? "Cadastrando..." : "Adicionar Categoria"}
              </button>
            </div>
          </div>
        </form>

        {/* Tabela de Categorias */}
        <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-hourline space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
            <span>
              Total cadastrado: <strong className="text-zinc-900">{filteredCategories.length}</strong> de{" "}
              <strong>{categories.length}</strong> categoria(s)
            </span>

            {/* Filtros de Status */}
            <div className="flex items-center gap-1 p-1 bg-zinc-100 rounded-xl">
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  statusFilter === "ALL" ? "bg-white text-zinc-950 shadow-2xs" : "text-zinc-500 hover:text-zinc-950"
                }`}
              >
                Todas ({categories.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("ACTIVE")}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  statusFilter === "ACTIVE" ? "bg-white text-zinc-950 shadow-2xs" : "text-zinc-500 hover:text-zinc-950"
                }`}
              >
                Ativas ({categories.filter((c) => c.status === "ACTIVE").length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("ARCHIVED")}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  statusFilter === "ARCHIVED" ? "bg-white text-zinc-950 shadow-2xs" : "text-zinc-500 hover:text-zinc-950"
                }`}
              >
                Arquivadas ({categories.filter((c) => c.status !== "ACTIVE").length})
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-600">
              <thead className="text-[10px] uppercase tracking-wider text-zinc-400 border-b border-zinc-100">
                <tr>
                  <th className="py-3 px-3">Categoria</th>
                  <th className="py-3 px-3">Hierarquia (Categoria Pai)</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Criado em</th>
                  <th className="py-3 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-zinc-400">
                      Carregando categorias...
                    </td>
                  </tr>
                ) : filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-zinc-400">
                      Nenhuma categoria encontrada no filtro selecionado.
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((c) => (
                    <tr key={c.id} className="hover:bg-zinc-50/70 transition">
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-zinc-900">{c.name}</div>
                        {c.description && (
                          <div className="text-[11px] text-zinc-400 mt-0.5">{c.description}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        {c.parentName ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-zinc-100 text-zinc-700 font-medium">
                            {c.parentName}
                          </span>
                        ) : (
                          <span className="text-zinc-400">Principal (Raiz)</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                            c.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-zinc-100 text-zinc-600 border-zinc-200"
                          }`}
                        >
                          {c.status === "ACTIVE" ? "ATIVA" : "ARQUIVADA"}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-zinc-400">
                        {new Date(c.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(c)}
                            title="Editar Categoria"
                            className="p-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 transition cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(c)}
                            title="Excluir ou Arquivar Categoria"
                            className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:text-rose-800 hover:bg-rose-50 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Editar Categoria */}
      {editModalOpen && editingCategory && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-zinc-200 space-y-4">
            <h3 className="font-bold text-zinc-950 text-base">Editar Categoria de Serviços</h3>
            <form onSubmit={handleUpdateCategory} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Nome da Categoria *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Descrição</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Categoria Pai</label>
                  <select
                    value={editParentId}
                    onChange={(e) => setEditParentId(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900"
                  >
                    <option value="">Nenhuma (Raiz)</option>
                    {categories
                      .filter((cat) => cat.id !== editingCategory.id)
                      .map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as "ACTIVE" | "ARCHIVED" | "INACTIVE")}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900"
                  >
                    <option value="ACTIVE">Ativa</option>
                    <option value="ARCHIVED">Arquivada</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 font-medium text-white bg-zinc-950 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {savingEdit ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
