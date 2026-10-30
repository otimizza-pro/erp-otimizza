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
  ChevronRight,
} from "lucide-react";

export default function ServiceCategoriesPage() {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      loadCategories();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao criar categoria");
    } finally {
      setSaving(false);
    }
  };

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

        {/* Formulário de Criação Rápida */}
        <form
          onSubmit={handleCreateCategory}
          className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-hourline space-y-4"
        >
          <h2 className="text-sm font-semibold text-zinc-900">Nova Categoria de Serviços</h2>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

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
                className="w-full py-2.5 px-4 rounded-full bg-zinc-950 text-white font-semibold hover:bg-zinc-800 transition shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? "Cadastrando..." : "Adicionar Categoria"}
              </button>
            </div>
          </div>
        </form>

        {/* Tabela de Categorias */}
        <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-hourline space-y-4">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>
              Total cadastrado: <strong className="text-zinc-900">{categories.length}</strong> categoria(s)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-600">
              <thead className="text-[10px] uppercase tracking-wider text-zinc-400 border-b border-zinc-100">
                <tr>
                  <th className="py-3 px-3">Categoria</th>
                  <th className="py-3 px-3">Hierarquia (Categoria Pai)</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Criado em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-zinc-400">
                      Carregando categorias...
                    </td>
                  </tr>
                ) : categories.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-zinc-400">
                      Nenhuma categoria cadastrada.
                    </td>
                  </tr>
                ) : (
                  categories.map((c) => (
                    <tr key={c.id} className="hover:bg-zinc-50/70 transition">
                      <td className="py-3.5 px-3 font-semibold text-zinc-900">{c.name}</td>
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
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-zinc-400">
                        {new Date(c.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
