"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { ServiceItem, ServiceCategory } from "@/modules/catalog/types";
import {
  Package,
  Search,
  Plus,
  RefreshCw,
  FolderTree,
  Edit2,
  Archive,
  Layers,
  ChevronRight,
} from "lucide-react";
import { formatBRL } from "@/shared/money";

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "ARCHIVED">("ACTIVE");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [servicesRes, categoriesRes] = await Promise.all([
        fetch(
          `/api/services?status=${statusFilter}${search ? `&search=${search}` : ""}${
            selectedCategory ? `&categoryId=${selectedCategory}` : ""
          }`
        ),
        fetch(`/api/services?type=categories`),
      ]);

      const [servicesData, categoriesData] = await Promise.all([
        servicesRes.json(),
        categoriesRes.json(),
      ]);

      setServices(servicesData || []);
      setCategories(categoriesData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  return (
    <AppShell activeSection="catalog">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Catálogo Corporativo
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
              Catálogo de Serviços
            </h1>
            <p className="text-xs text-zinc-500">
              Serviços especializados, custos, precificação de referência e vinculação categórica
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/services/categories"
              className="px-4 py-2 rounded-full bg-white border border-zinc-200 text-zinc-700 text-xs font-semibold hover:bg-zinc-50 transition shadow-2xs flex items-center gap-1.5"
            >
              <FolderTree className="w-3.5 h-3.5 text-zinc-500" />
              Categorias
            </Link>
            <Link
              href="/services/new"
              className="px-4 py-2 rounded-full bg-zinc-950 text-white text-xs font-semibold hover:bg-zinc-800 transition shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo Serviço
            </Link>
          </div>
        </div>

        {/* Filtros e Busca */}
        <div className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-hourline flex flex-col md:flex-row items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar serviços por nome ou descrição..."
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

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 rounded-full bg-zinc-50 border border-zinc-200 text-xs text-zinc-700 focus:outline-none focus:border-zinc-900 font-medium"
            >
              <option value="">Todas as categorias</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>

            <button
              onClick={loadData}
              title="Atualizar lista"
              className="p-2 rounded-full bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Lista / Grid de Serviços */}
        <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-hourline space-y-4">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>
              Total cadastrado: <strong className="text-zinc-900">{services.length}</strong> serviço(s)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-600">
              <thead className="text-[10px] uppercase tracking-wider text-zinc-400 border-b border-zinc-100">
                <tr>
                  <th className="py-3 px-3">Serviço</th>
                  <th className="py-3 px-3">Categoria</th>
                  <th className="py-3 px-3">Unidade</th>
                  <th className="py-3 px-3">Preço Padrão</th>
                  <th className="py-3 px-3">Custo Padrão</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-400">
                      Carregando catálogo de serviços...
                    </td>
                  </tr>
                ) : services.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-400 space-y-2">
                      <Package className="w-8 h-8 text-zinc-300 mx-auto" />
                      <p>Nenhum serviço cadastrado.</p>
                      <Link
                        href="/services/new"
                        className="inline-block text-xs font-semibold text-zinc-900 underline underline-offset-4"
                      >
                        Cadastrar primeiro serviço
                      </Link>
                    </td>
                  </tr>
                ) : (
                  services.map((s) => (
                    <tr key={s.id} className="hover:bg-zinc-50/70 transition">
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-zinc-900">{s.name}</div>
                        {s.description && (
                          <div className="text-[11px] text-zinc-400 line-clamp-1">
                            {s.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        {s.categoryName ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-zinc-100 text-zinc-700 font-medium">
                            {s.categoryName}
                          </span>
                        ) : (
                          <span className="text-zinc-400">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-[11px] text-zinc-600">
                        {s.billingUnit}
                      </td>
                      <td className="py-3.5 px-3 font-mono font-semibold text-zinc-950">
                        {formatBRL(Math.round(s.defaultPrice * 100))}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-zinc-500">
                        {formatBRL(Math.round(s.defaultCost * 100))}
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-semibold border ${
                            s.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-zinc-100 text-zinc-500 border-zinc-200"
                          }`}
                        >
                          {s.status === "ACTIVE" ? "ATIVO" : "ARQUIVADO"}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <Link
                          href={`/services/${s.id}/edit`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-zinc-50 hover:bg-zinc-100 text-zinc-700 text-xs font-medium border border-zinc-200 transition"
                        >
                          Editar
                          <ChevronRight className="w-3 h-3 text-zinc-400" />
                        </Link>
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
