"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { ServiceCategory } from "@/modules/catalog/types";
import {
  Settings,
  FolderTree,
  Tag,
  DollarSign,
  Building2,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Save,
  Sparkles,
  Layers,
  ArrowRight,
} from "lucide-react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"categories" | "financial" | "tags" | "agency">("categories");

  // Service categories
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [savingCat, setSavingCat] = useState(false);
  const [catFeedback, setCatFeedback] = useState<string | null>(null);

  // Marketing Tags
  const defaultMarketingTags = [
    { id: "1", name: "Contrato Recorrente (Retainer)", color: "bg-blue-50 text-blue-700 border-blue-200" },
    { id: "2", name: "Gestão de Tráfego", color: "bg-purple-50 text-purple-700 border-purple-200" },
    { id: "3", name: "Social Media & Criação", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    { id: "4", name: "E-commerce / Vendas", color: "bg-amber-50 text-amber-700 border-amber-200" },
    { id: "5", name: "Infoproduto / Lançamentos", color: "bg-rose-50 text-rose-700 border-rose-200" },
    { id: "6", name: "Negócio Local", color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
    { id: "7", name: "Hospedagem & Domínio Ativo", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
    { id: "8", name: "Cliente VIP / Alta Prioridade", color: "bg-amber-100 text-amber-900 border-amber-300" },
  ];

  const [tags, setTags] = useState<{ id: string; name: string; color: string }[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("otimizza_agency_tags");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return defaultMarketingTags;
  });

  const [newTagName, setNewTagName] = useState("");

  // Agency info
  const [agencyName, setAgencyName] = useState("Otimizza Soluções");
  const [agencySlogan, setAgencySlogan] = useState("Data & Growth • Agência de Marketing Digital e Performance");
  const [agencyEmail, setAgencyEmail] = useState("otimizzapro@gmail.com");
  const [agencyCurrency, setAgencyCurrency] = useState("BRL (R$)");
  const [savedAgencyMsg, setSavedAgencyMsg] = useState(false);

  const loadCategories = async () => {
    setLoadingCats(true);
    try {
      const res = await fetch("/api/services?type=categories");
      const data = await res.json();
      setCategories(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCats(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setSavingCat(true);
    setCatFeedback(null);
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
      if (!res.ok) throw new Error(data.error || "Erro ao cadastrar categoria.");

      setNewCatName("");
      setNewCatDesc("");
      setCatFeedback("Categoria cadastrada com sucesso!");
      loadCategories();
      setTimeout(() => setCatFeedback(null), 4000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao cadastrar categoria.");
    } finally {
      setSavingCat(false);
    }
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    const colors = [
      "bg-blue-50 text-blue-700 border-blue-200",
      "bg-purple-50 text-purple-700 border-purple-200",
      "bg-emerald-50 text-emerald-700 border-emerald-200",
      "bg-amber-50 text-amber-700 border-amber-200",
      "bg-rose-50 text-rose-700 border-rose-200",
      "bg-indigo-50 text-indigo-700 border-indigo-200",
    ];
    const randomColor = colors[tags.length % colors.length];
    const newTag = {
      id: String(Date.now()),
      name: newTagName.trim(),
      color: randomColor,
    };
    const updated = [...tags, newTag];
    setTags(updated);
    setNewTagName("");
    if (typeof window !== "undefined") {
      localStorage.setItem("otimizza_agency_tags", JSON.stringify(updated));
    }
  };

  const handleRemoveTag = (id: string) => {
    const updated = tags.filter((t) => t.id !== id);
    setTags(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("otimizza_agency_tags", JSON.stringify(updated));
    }
  };

  const handleSaveAgency = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedAgencyMsg(true);
    setTimeout(() => setSavedAgencyMsg(false), 3000);
  };

  return (
    <AppShell activeSection="settings">
      <div className="space-y-6 max-w-5xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Administração & Parâmetros
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 flex items-center gap-2">
              <Settings className="w-6 h-6 text-zinc-900" />
              Configurações do Sistema
            </h1>
            <p className="text-xs text-zinc-500">
              Personalize categorias, tags, parâmetros de marketing e dados da Otimizza
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 p-1 bg-zinc-100 rounded-2xl w-full sm:w-max overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("categories")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === "categories"
                ? "bg-white text-zinc-950 shadow-2xs"
                : "text-zinc-600 hover:text-zinc-950"
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            Categorias de Serviços ({categories.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("tags")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === "tags"
                ? "bg-white text-zinc-950 shadow-2xs"
                : "text-zinc-600 hover:text-zinc-950"
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            Tags & Marcadores ({tags.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("financial")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === "financial"
                ? "bg-white text-zinc-950 shadow-2xs"
                : "text-zinc-600 hover:text-zinc-950"
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            Plano Financeiro
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("agency")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === "agency"
                ? "bg-white text-zinc-950 shadow-2xs"
                : "text-zinc-600 hover:text-zinc-950"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Dados da Agência
          </button>
        </div>

        {/* TAB 1: CATEGORIAS DE SERVIÇOS */}
        {activeTab === "categories" && (
          <div className="space-y-6">
            {/* Quick Add Form */}
            <form
              onSubmit={handleCreateCategory}
              className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-hourline space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-900">
                    Cadastrar Nova Categoria de Serviços
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Agrupe entregáveis como Tráfego, Social Media, Domínios, Hospedagem e Produção
                  </p>
                </div>
                <Link
                  href="/services/categories"
                  className="text-xs font-semibold text-zinc-900 hover:underline flex items-center gap-1"
                >
                  Gerenciamento Completo <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {catFeedback && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{catFeedback}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Nome da Categoria *</label>
                  <input
                    type="text"
                    required
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="Ex: Gestão de Tráfego Pago"
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
                  />
                </div>

                <div>
                  <label className="block font-medium text-zinc-700 mb-1">Descrição</label>
                  <input
                    type="text"
                    value={newCatDesc}
                    onChange={(e) => setNewCatDesc(e.target.value)}
                    placeholder="Ex: Meta Ads, Google Ads e mídia de performance"
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={savingCat || !newCatName.trim()}
                    className="w-full py-2 px-4 rounded-xl bg-zinc-950 text-white font-semibold hover:bg-zinc-800 transition shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {savingCat ? "Salvando..." : "Adicionar Categoria"}
                  </button>
                </div>
              </div>
            </form>

            {/* List of Categories */}
            <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-hourline space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-900">
                  Categorias Ativas da Agência ({categories.length})
                </h3>
                <Link
                  href="/services/categories"
                  className="px-3 py-1.5 rounded-full border border-zinc-200 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition"
                >
                  Editar / Excluir Categorias
                </Link>
              </div>

              {loadingCats ? (
                <div className="py-8 text-center text-xs text-zinc-400">Carregando categorias...</div>
              ) : categories.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-400">Nenhuma categoria cadastrada.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {categories.map((c) => (
                    <div
                      key={c.id}
                      className="p-3.5 rounded-xl border border-zinc-100 bg-zinc-50/50 hover:bg-zinc-50 transition flex items-start justify-between gap-3"
                    >
                      <div>
                        <div className="font-semibold text-zinc-900 text-xs">{c.name}</div>
                        {c.description && (
                          <div className="text-[11px] text-zinc-500 mt-0.5 line-clamp-2">
                            {c.description}
                          </div>
                        )}
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                        {c.status === "ACTIVE" ? "ATIVA" : "ARQUIVADA"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: TAGS E MARCADORES */}
        {activeTab === "tags" && (
          <div className="space-y-6">
            <form
              onSubmit={handleAddTag}
              className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-hourline space-y-4"
            >
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">Nova Tag da Agência</h2>
                <p className="text-xs text-zinc-500">
                  Crie etiquetas para categorizar rapidamente clientes, contratos, nichos e projetos
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs max-w-lg">
                <input
                  type="text"
                  required
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Ex: Nicho Imobiliário, Tráfego Pago, Lead Quente..."
                  className="flex-1 px-3.5 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-zinc-950 text-white font-semibold hover:bg-zinc-800 transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Criar Tag
                </button>
              </div>
            </form>

            <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-hourline space-y-4">
              <h3 className="text-sm font-semibold text-zinc-900">
                Tags Disponíveis no Sistema ({tags.length})
              </h3>
              <p className="text-xs text-zinc-500">
                Marcadores padrão prontos para utilização nos cadastros de clientes e fornecedores
              </p>

              <div className="flex flex-wrap gap-2 pt-2">
                {tags.map((t) => (
                  <span
                    key={t.id}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${t.color}`}
                  >
                    <span>{t.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t.id)}
                      className="opacity-60 hover:opacity-100 cursor-pointer ml-1"
                      title="Excluir tag"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PLANO FINANCEIRO */}
        {activeTab === "financial" && (
          <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-hourline space-y-5">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Plano de Contas Financeiro</h2>
              <p className="text-xs text-zinc-500">
                Estrutura de apropriação gerencial de receitas e despesas por competência
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2">
                <span className="font-semibold text-emerald-800 uppercase tracking-wider text-[10px]">
                  Categorias de Receita
                </span>
                <ul className="space-y-1.5 text-zinc-700">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    Mensalidade de Retainer / Recorrência
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    Setup & Implementação de Funis
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    Taxa de Sucesso / Performance de Vendas
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    Projetos Avulsos (Sites, Criativos, Vídeos)
                  </li>
                </ul>
              </div>

              <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 space-y-2">
                <span className="font-semibold text-rose-800 uppercase tracking-wider text-[10px]">
                  Categorias de Custo e Despesa
                </span>
                <ul className="space-y-1.5 text-zinc-700">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                    Serviços de Terceiros / Freelancers Vinculados
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                    Ferramentas de Marketing & SaaS (CRMs, Automações)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                    Infraestrutura, Hospedagem e Domínios
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                    Despesas Operacionais e Administrativas
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/financial/accounts"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-950 text-white text-xs font-semibold hover:bg-zinc-800 transition"
              >
                Gerenciar Contas Bancárias & Tesouraria
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* TAB 4: DADOS DA AGÊNCIA */}
        {activeTab === "agency" && (
          <form
            onSubmit={handleSaveAgency}
            className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-hourline space-y-4"
          >
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Dados da Agência de Marketing</h2>
              <p className="text-xs text-zinc-500">
                Informações da Otimizza exibidas em propostas, contratos e relatórios
              </p>
            </div>

            {savedAgencyMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Configurações da agência salvas com sucesso!</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-medium text-zinc-700 mb-1">Nome Fantasia</label>
                <input
                  type="text"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div>
                <label className="block font-medium text-zinc-700 mb-1">E-mail Principal de Contato</label>
                <input
                  type="email"
                  value={agencyEmail}
                  onChange={(e) => setAgencyEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-medium text-zinc-700 mb-1">Slogan / Posicionamento</label>
                <input
                  type="text"
                  value={agencySlogan}
                  onChange={(e) => setAgencySlogan(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div>
                <label className="block font-medium text-zinc-700 mb-1">Moeda Padrão do Sistema</label>
                <select
                  value={agencyCurrency}
                  onChange={(e) => setAgencyCurrency(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
                >
                  <option value="BRL (R$)">Real Brasileiro - R$ (BRL)</option>
                  <option value="USD ($)">Dólar Americano - $ (USD)</option>
                  <option value="EUR (€)">Euro - € (EUR)</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-zinc-950 text-white font-semibold hover:bg-zinc-800 transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  Salvar Preferências
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}
