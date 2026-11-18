"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Target,
  Megaphone,
  Sparkles,
  TrendingUp,
  Users,
  Repeat,
  HeartHandshake,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Layers,
  BarChart3,
  Calendar,
  FileText,
  DollarSign,
  Plus,
  Save,
  Check,
  Building,
  HelpCircle,
  Lightbulb,
  Rocket,
  Activity,
  Zap,
} from "lucide-react";

interface ClientOption {
  id: string;
  name: string;
}

interface ERPFunnelsMetrics {
  acquisition: {
    realLeadsMonth: number;
    totalActiveLeads: number;
    topSources: { source: string; count: number }[];
  };
  nutrition: {
    openOpportunities: number;
    pipelineAmount: number;
    monthlyActivities: number;
  };
  conversion: {
    wonMonthCount: number;
    wonMonthAmount: number;
    lostMonthCount: number;
    totalWonCount: number;
    realConversionRate: number;
    avgTicket: number;
  };
  retention: {
    activeContracts: number;
    realMrr: number;
    canceledContractsMonth: number;
    retentionRate: number;
  };
}

type FunnelTab = "acquisition" | "nutrition" | "conversion" | "retention";

export default function MarketingFunnelsPage() {
  const [activeTab, setActiveTab] = useState<FunnelTab>("acquisition");
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("otimizza");
  const [loadingClients, setLoadingClients] = useState(true);

  // Métricas Reais do ERP
  const [erpMetrics, setErpMetrics] = useState<ERPFunnelsMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  // Anotações e Estratégia persistida localmente por cliente
  const [strategyNotes, setStrategyNotes] = useState<Record<string, Record<FunnelTab, string>>>({});
  const [savingNotes, setSavingNotes] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Carrega clientes da API
  useEffect(() => {
    fetch("/api/clients")
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.clients || [];
        setClients(list);
      })
      .catch((err) => console.error("Erro ao carregar clientes:", err))
      .finally(() => setLoadingClients(false));

    // Carrega anotações salvas do localStorage
    try {
      const stored = localStorage.getItem("otimizza_marketing_funnel_notes");
      if (stored) {
        setStrategyNotes(JSON.parse(stored));
      }
    } catch {}
  }, []);

  // Carrega métricas reais do ERP
  useEffect(() => {
    setLoadingMetrics(true);
    fetch(`/api/marketing/funnels/metrics?clientId=${selectedClientId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.metrics) {
          setErpMetrics(data.metrics);
        }
      })
      .catch((err) => console.error("Erro ao carregar métricas do ERP:", err))
      .finally(() => setLoadingMetrics(false));
  }, [selectedClientId]);

  const currentNotes = strategyNotes[selectedClientId]?.[activeTab] || "";

  const handleNotesChange = (val: string) => {
    setStrategyNotes((prev) => ({
      ...prev,
      [selectedClientId]: {
        ...(prev[selectedClientId] || {
          acquisition: "",
          nutrition: "",
          conversion: "",
          retention: "",
        }),
        [activeTab]: val,
      },
    }));
  };

  const handleSaveNotes = () => {
    setSavingNotes(true);
    try {
      localStorage.setItem("otimizza_marketing_funnel_notes", JSON.stringify(strategyNotes));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch {}
    setSavingNotes(false);
  };

  const selectedClientName =
    selectedClientId === "otimizza"
      ? "Otimizza Data & Growth (Própria Empresa)"
      : clients.find((c) => c.id === selectedClientId)?.name || "Cliente";

  return (
    <AppShell activeSection="marketing_funnels">
      <div className="space-y-6 pb-20">
        {/* Header com Contexto Estratégico */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-purple-600 text-white shadow-sm">
                <Target className="w-6 h-6" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
                    Funis de Marketing & Vendas
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                    Gestão Estratégica da Jornada
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Planejamento e acompanhamento dos 4 funis estratégicos: Aquisição, Nutrição, Conversão e Pós-Venda.
                </p>
              </div>
            </div>

            {/* Seletor de Empresa / Cliente com Digitação e Busca */}
            <div className="flex items-center gap-2 bg-zinc-50 p-1.5 rounded-xl border border-zinc-200">
              <span className="text-xs font-semibold text-zinc-600 pl-2">Estratégia para:</span>
              <SearchableSelect
                options={[
                  {
                    value: "otimizza",
                    label: "⭐ Otimizza Data & Growth (Própria Empresa)",
                    sublabel: "Visão Geral Consolidada",
                  },
                  ...clients.map((c) => ({
                    value: c.id,
                    label: `Cliente: ${c.name}`,
                    sublabel: "Estratégia do Cliente",
                  })),
                ]}
                value={selectedClientId}
                onChange={(val) => setSelectedClientId(val)}
                placeholder="Selecionar cliente..."
                searchPlaceholder="Digitar para buscar cliente..."
                className="w-72"
              />
            </div>
          </div>

          {/* Banner Didático Explicativo: Funil de Marketing vs Funil Comercial */}
          <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-200/80 flex items-start gap-3 text-xs text-purple-950">
            <Lightbulb className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">
                Como os Funis de Marketing conversam com os Funis Comerciais:
              </p>
              <p className="text-[11px] text-purple-800 leading-relaxed">
                • <strong>Funis de Marketing (aqui):</strong> Concentram a estratégia global, metas, canais de atração, produção de conteúdo e indicadores de retenção.
                <br />
                • <strong>Funis Comerciais (no CRM):</strong> Gerenciam as negociações individuais em andamento (quadros Kanban, prospecção e fechamento de contratos).
                <br />
                Quando uma campanha de marketing gera um contato interessado, ele se torna um <strong>Lead</strong> e avança pelo <strong>Funil Comercial</strong> até o fechamento.
              </p>
            </div>
          </div>

          {/* Abas dos 4 Funis Estratégicos */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-zinc-100">
            <button
              type="button"
              onClick={() => setActiveTab("acquisition")}
              className={`p-3 rounded-xl border text-left transition flex items-center gap-3 ${
                activeTab === "acquisition"
                  ? "bg-blue-50/80 border-blue-400 text-blue-950 shadow-xs"
                  : "bg-zinc-50/70 border-zinc-200/80 text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              <div className="p-2 rounded-lg bg-blue-100 text-blue-700 shrink-0">
                <Megaphone className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-blue-600 block">Pilar 1</span>
                <span className="text-xs font-bold">1. Aquisição</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("nutrition")}
              className={`p-3 rounded-xl border text-left transition flex items-center gap-3 ${
                activeTab === "nutrition"
                  ? "bg-amber-50/80 border-amber-400 text-amber-950 shadow-xs"
                  : "bg-zinc-50/70 border-zinc-200/80 text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              <div className="p-2 rounded-lg bg-amber-100 text-amber-700 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-600 block">Pilar 2</span>
                <span className="text-xs font-bold">2. Nutrição</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("conversion")}
              className={`p-3 rounded-xl border text-left transition flex items-center gap-3 ${
                activeTab === "conversion"
                  ? "bg-emerald-50/80 border-emerald-400 text-emerald-950 shadow-xs"
                  : "bg-zinc-50/70 border-zinc-200/80 text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-600 block">Pilar 3</span>
                <span className="text-xs font-bold">3. Conversão</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("retention")}
              className={`p-3 rounded-xl border text-left transition flex items-center gap-3 ${
                activeTab === "retention"
                  ? "bg-indigo-50/80 border-indigo-400 text-indigo-950 shadow-xs"
                  : "bg-zinc-50/70 border-zinc-200/80 text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700 shrink-0">
                <HeartHandshake className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-indigo-600 block">Pilar 4</span>
                <span className="text-xs font-bold">4. Pós-Venda</span>
              </div>
            </button>
          </div>
        </div>

        {/* CONTEÚDO DO FUNIL SELECIONADO */}
        {activeTab === "acquisition" && (
          <div className="space-y-6 animate-in fade-in">
            {/* Header do Funil 1 */}
            <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                    Estratégia de Atração & Captação
                  </span>
                  <h2 className="text-xl font-bold text-zinc-950">Funil de Aquisição</h2>
                  <p className="text-xs text-zinc-500">
                    Atrair potenciais clientes, gerar tráfego qualificado e transformar desconhecidos em leads no CRM.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href="/crm/leads"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition shadow-xs"
                  >
                    <Users className="w-3.5 h-3.5" />
                    Ver Leads Captados no CRM
                  </Link>
                </div>
              </div>

              {/* Indicadores do Funil de Aquisição */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200/70 space-y-1">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase">Canais Principais</span>
                  <div className="text-sm font-bold text-zinc-900">Meta Ads, Google & Outbound</div>
                  <p className="text-[10px] text-zinc-400">Tráfego pago e prospecção direta</p>
                </div>

                <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200/70 space-y-1">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase">Meta de Leads / Mês</span>
                  <div className="text-sm font-bold text-blue-700">50 Leads Qualificados</div>
                  <p className="text-[10px] text-zinc-400">Para abastecer o funil comercial</p>
                </div>

                <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200/70 space-y-1">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase">CPL Esperado</span>
                  <div className="text-sm font-bold text-emerald-700">R$ 35,00 a R$ 60,00</div>
                  <p className="text-[10px] text-zinc-400">Custo médio por lead gerado</p>
                </div>

                <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200/70 space-y-1">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase">Formatos de Criativos</span>
                  <div className="text-sm font-bold text-purple-700">Feed 4:5 & Stories 9:16</div>
                  <p className="text-[10px] text-zinc-400">Otimizados para Instagram e Meta Ads</p>
                </div>
              </div>

              {/* Métricas Reais do ERP Otimizza */}
              <div className="p-4 bg-gradient-to-r from-blue-50/50 via-zinc-50 to-white rounded-xl border border-blue-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-blue-600 text-white shadow-2xs">
                      <BarChart3 className="w-3.5 h-3.5" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-950 flex items-center gap-2">
                        Real do ERP Otimizza: Base & Captação
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                          Sincronizado
                        </span>
                      </h4>
                      <p className="text-[10px] text-zinc-500">Dados consolidados do CRM de Leads</p>
                    </div>
                  </div>
                  <Link
                    href="/crm/leads"
                    className="text-[11px] font-bold text-blue-700 hover:text-blue-800 hover:underline flex items-center gap-1"
                  >
                    Gerenciar Leads <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-white rounded-lg border border-zinc-200/80 space-y-0.5">
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase">Leads Captados este Mês</span>
                    <div className="text-lg font-bold text-blue-700">
                      {loadingMetrics ? "..." : erpMetrics?.acquisition?.realLeadsMonth || 0}
                      <span className="text-xs font-normal text-zinc-400 ml-1">leads</span>
                    </div>
                    <p className="text-[10px] text-zinc-400">Criados a partir de 1º do mês</p>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-zinc-200/80 space-y-0.5">
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase">Total na Base CRM</span>
                    <div className="text-lg font-bold text-zinc-900">
                      {loadingMetrics ? "..." : erpMetrics?.acquisition?.totalActiveLeads || 0}
                      <span className="text-xs font-normal text-zinc-400 ml-1">contatos ativos</span>
                    </div>
                    <p className="text-[10px] text-zinc-400">Total não arquivado no pipeline</p>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-zinc-200/80 space-y-0.5">
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase">Canais Mais Ativos no ERP</span>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {erpMetrics?.acquisition?.topSources && erpMetrics.acquisition.topSources.length > 0 ? (
                        erpMetrics.acquisition.topSources.map((s, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-100 text-zinc-700 border border-zinc-200">
                            {s.source}: {s.count}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-zinc-400">Nenhum canal registrado ainda</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Etapas da Jornada & Plano de Ação */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
                  <Rocket className="w-4 h-4 text-blue-600" />
                  Etapas da Jornada de Aquisição
                </h3>
                <ol className="space-y-3 text-xs text-zinc-600">
                  <li className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 space-y-1">
                    <span className="font-bold text-zinc-900 block">1. Descoberta & Atenção</span>
                    <p className="text-[11px] text-zinc-500">
                      Anúncios patrocinados, reels de alto impacto e prospecção direta apresentam a marca e a dor de mercado.
                    </p>
                  </li>
                  <li className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 space-y-1">
                    <span className="font-bold text-zinc-900 block">2. Clique & Landing Page / Direct</span>
                    <p className="text-[11px] text-zinc-500">
                      O visitante clica no anúncio e é direcionado para página com oferta clara ou conversa no WhatsApp.
                    </p>
                  </li>
                  <li className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 space-y-1">
                    <span className="font-bold text-zinc-900 block">3. Conversão em Lead (Entrada no CRM)</span>
                    <p className="text-[11px] text-zinc-500">
                      O formulário é preenchido ou o contato é iniciado, gerando automaticamente um Lead na Base do CRM.
                    </p>
                  </li>
                </ol>
              </div>

              {/* Anotações Estratégicas do Cliente */}
              <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-purple-600" />
                      Planejamento de Aquisição ({selectedClientName})
                    </h3>
                    {savedSuccess && (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Salvo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500">
                    Registre as diretrizes de público-alvo, personas, orçamento de anúncios e canais planejados para esta empresa.
                  </p>
                  <textarea
                    rows={6}
                    value={currentNotes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    placeholder="Ex: Público: Donos de médias empresas no RS e SC. Oferta de entrada: Diagnóstico de Dados e Crescimento. Investimento mensal em Meta Ads: R$ 3.000,00..."
                    className="w-full text-xs border border-zinc-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl transition shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Salvar Planejamento
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "nutrition" && (
          <div className="space-y-6 animate-in fade-in">
            {/* Header do Funil 2 */}
            <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                    Estratégia de Relacionamento & Confiança
                  </span>
                  <h2 className="text-xl font-bold text-zinc-950">Funil de Nutrição</h2>
                  <p className="text-xs text-zinc-500">
                    Desenvolver autoridade, esclarecer objeções e aquecer os contatos para que cheguem prontos para comprar.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href="/prompt-creator"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Abrir Estúdio de Conteúdo IA
                  </Link>
                  <Link
                    href="/prompt-creator/saved"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl transition"
                  >
                    Feed & Criativos Salvos
                  </Link>
                </div>
              </div>

              {/* Indicadores do Funil de Nutrição */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200/70 space-y-1">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase">Linhas Editoriais</span>
                  <div className="text-sm font-bold text-zinc-900">Cases, Métricas & Soluções</div>
                  <p className="text-[10px] text-zinc-400">Conteúdos de autoridade e valor</p>
                </div>

                <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200/70 space-y-1">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase">Frequência Semanal</span>
                  <div className="text-sm font-bold text-amber-700">4 Posts / Semana</div>
                  <p className="text-[10px] text-zinc-400">Feed 4:5 e carrosséis instrutivos</p>
                </div>

                <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200/70 space-y-1">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase">Remarketing</span>
                  <div className="text-sm font-bold text-purple-700">Ativo para quem engajou</div>
                  <p className="text-[10px] text-zinc-400">Públicos de 30 e 60 dias no Meta Ads</p>
                </div>

                <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200/70 space-y-1">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase">Objetivo da Nutrição</span>
                  <div className="text-sm font-bold text-emerald-700">Gerar Desejo & Agendar</div>
                  <p className="text-[10px] text-zinc-400">Levar o lead para o diagnóstico</p>
                </div>
              </div>

              {/* Métricas Reais do ERP Otimizza */}
              <div className="p-4 bg-gradient-to-r from-amber-50/50 via-zinc-50 to-white rounded-xl border border-amber-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-amber-600 text-white shadow-2xs">
                      <BarChart3 className="w-3.5 h-3.5" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-950 flex items-center gap-2">
                        Real do ERP Otimizza: Negociações & Relacionamento
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          Sincronizado
                        </span>
                      </h4>
                      <p className="text-[10px] text-zinc-500">Pipeline ativo de oportunidades no Kanban</p>
                    </div>
                  </div>
                  <Link
                    href="/crm/deals"
                    className="text-[11px] font-bold text-amber-700 hover:text-amber-800 hover:underline flex items-center gap-1"
                  >
                    Ver Kanban Comercial <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-white rounded-lg border border-zinc-200/80 space-y-0.5">
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase">Oportunidades em Aberto</span>
                    <div className="text-lg font-bold text-amber-700">
                      {loadingMetrics ? "..." : erpMetrics?.nutrition?.openOpportunities || 0}
                      <span className="text-xs font-normal text-zinc-400 ml-1">negociações</span>
                    </div>
                    <p className="text-[10px] text-zinc-400">Aguardando avanço de etapa</p>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-zinc-200/80 space-y-0.5">
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase">Pipeline em Negociação</span>
                    <div className="text-lg font-bold text-zinc-900">
                      R$ {loadingMetrics ? "..." : (erpMetrics?.nutrition?.pipelineAmount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                    <p className="text-[10px] text-zinc-400">Valor total em aberto no CRM</p>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-zinc-200/80 space-y-0.5">
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase">Atividades no Mês</span>
                    <div className="text-lg font-bold text-purple-700">
                      {loadingMetrics ? "..." : erpMetrics?.nutrition?.monthlyActivities || 0}
                      <span className="text-xs font-normal text-zinc-400 ml-1">tarefas/reuniões</span>
                    </div>
                    <p className="text-[10px] text-zinc-400">Registradas no CRM este mês</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Estratégia de Conteúdo e Anotações */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-600" />
                  Mecanismos de Nutrição Ativa
                </h3>
                <div className="space-y-3 text-xs text-zinc-600">
                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 space-y-1">
                    <span className="font-bold text-zinc-900 block">• Conteúdo de Meio de Funil</span>
                    <p className="text-[11px] text-zinc-500">
                      Comparativos, demonstrações práticas de dashboards e métricas de retorno que evidenciam o valor da assessoria.
                    </p>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 space-y-1">
                    <span className="font-bold text-zinc-900 block">• Nutrição por WhatsApp / E-mail</span>
                    <p className="text-[11px] text-zinc-500">
                      Envio de materiais educativos e convites para reuniões de diagnóstico estratégico.
                    </p>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 space-y-1">
                    <span className="font-bold text-zinc-900 block">• Quebra de Objeções</span>
                    <p className="text-[11px] text-zinc-500">
                      Postagens e conversas que respondem dúvidas sobre tempo de implantação, custo e resultados esperados.
                    </p>
                  </div>
                </div>
              </div>

              {/* Anotações de Nutrição */}
              <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-purple-600" />
                      Planejamento de Nutrição ({selectedClientName})
                    </h3>
                    {savedSuccess && (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Salvo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500">
                    Defina temas dos conteúdos, tom de voz, rotina de postagens e réguas de relacionamento.
                  </p>
                  <textarea
                    rows={6}
                    value={currentNotes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    placeholder="Ex: Tom de voz: Analítico e Pragmático. Tema central: Gestão financeira com Power BI. Frequência de newsletters: quinzenal toda terça-feira..."
                    className="w-full text-xs border border-zinc-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl transition shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Salvar Planejamento
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "conversion" && (
          <div className="space-y-6 animate-in fade-in">
            {/* Header do Funil 3 */}
            <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                    Fechamento de Negócios & Contratos
                  </span>
                  <h2 className="text-xl font-bold text-zinc-950">Funil de Conversão</h2>
                  <p className="text-xs text-zinc-500">
                    O momento em que o lead qualificado entra no Funil Comercial do CRM, recebe a proposta e fecha contrato.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href="/crm/opportunities"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition shadow-xs"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    Abrir Funis Comerciais (Kanban)
                  </Link>
                  <Link
                    href="/proposals/new"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl transition"
                  >
                    Nova Proposta Comercial
                  </Link>
                </div>
              </div>

              {/* Indicadores do Funil de Conversão */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200/70 space-y-1">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase">Taxa de Conversão Esperada</span>
                  <div className="text-sm font-bold text-emerald-700">20% a 35%</div>
                  <p className="text-[10px] text-zinc-400">De oportunidades para contratos fechados</p>
                </div>

                <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200/70 space-y-1">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase">Ciclo Médio de Venda</span>
                  <div className="text-sm font-bold text-zinc-900">14 a 28 dias</div>
                  <p className="text-[10px] text-zinc-400">Do diagnóstico ao contrato assinado</p>
                </div>

                <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200/70 space-y-1">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase">Passagem de Bastão</span>
                  <div className="text-sm font-bold text-purple-700">1-Clique para Funil Comercial</div>
                  <p className="text-[10px] text-zinc-400">Transição ágil da prospecção para negociação</p>
                </div>

                <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200/70 space-y-1">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase">Geração de Contrato</span>
                  <div className="text-sm font-bold text-blue-700">Automática no Fechamento</div>
                  <p className="text-[10px] text-zinc-400">Alimenta o financeiro e faturamento</p>
                </div>
              </div>

              {/* Métricas Reais do ERP Otimizza */}
              <div className="p-4 bg-gradient-to-r from-emerald-50/50 via-zinc-50 to-white rounded-xl border border-emerald-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-emerald-600 text-white shadow-2xs">
                      <BarChart3 className="w-3.5 h-3.5" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-950 flex items-center gap-2">
                        Real do ERP Otimizza: Conversões & Contratos Fechados
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Sincronizado
                        </span>
                      </h4>
                      <p className="text-[10px] text-zinc-500">Taxa efetiva de conversão e faturamento conquistado</p>
                    </div>
                  </div>
                  <Link
                    href="/proposals"
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1"
                  >
                    Ver Propostas <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-white rounded-lg border border-zinc-200/80 space-y-0.5">
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase">Taxa Real de Conversão</span>
                    <div className="text-lg font-bold text-emerald-700">
                      {loadingMetrics ? "..." : `${erpMetrics?.conversion?.realConversionRate || 0}%`}
                    </div>
                    <p className="text-[10px] text-zinc-400">
                      {(erpMetrics?.conversion?.realConversionRate || 0) >= 20 ? "✅ Dentro do esperado" : "⚠️ Meta: 20% a 35%"}
                    </p>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-zinc-200/80 space-y-0.5">
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase">Ganhos no Mês Atual</span>
                    <div className="text-lg font-bold text-zinc-900">
                      {loadingMetrics ? "..." : erpMetrics?.conversion?.wonMonthCount || 0}
                      <span className="text-xs font-normal text-zinc-400 ml-1">fechados</span>
                    </div>
                    <p className="text-[10px] text-zinc-400">
                      R$ {loadingMetrics ? "..." : (erpMetrics?.conversion?.wonMonthAmount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-zinc-200/80 space-y-0.5">
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase">Ticket Médio Ganho</span>
                    <div className="text-lg font-bold text-blue-700">
                      R$ {loadingMetrics ? "..." : (erpMetrics?.conversion?.avgTicket || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                    <p className="text-[10px] text-zinc-400">Média por oportunidade ganha</p>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-zinc-200/80 space-y-0.5">
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase">Total Ganho no Histórico</span>
                    <div className="text-lg font-bold text-purple-700">
                      {loadingMetrics ? "..." : erpMetrics?.conversion?.totalWonCount || 0}
                      <span className="text-xs font-normal text-zinc-400 ml-1">contratos</span>
                    </div>
                    <p className="text-[10px] text-zinc-400">Desde o início da operação</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Alinhamento de Conversão */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Gatilhos de Conversão Comercial
                </h3>
                <div className="space-y-3 text-xs text-zinc-600">
                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 space-y-1">
                    <span className="font-bold text-zinc-900 block">1. Diagnóstico & Briefing</span>
                    <p className="text-[11px] text-zinc-500">
                      Reunião de alinhamento com o cliente para identificar dores de dados, processos e metas de crescimento.
                    </p>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 space-y-1">
                    <span className="font-bold text-zinc-900 block">2. Apresentação de Proposta Personalizada</span>
                    <p className="text-[11px] text-zinc-500">
                      Geração de proposta formal com escopo congelado, parcelas e cronograma de entregas.
                    </p>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 space-y-1">
                    <span className="font-bold text-zinc-900 block">3. Negociação & Fechamento</span>
                    <p className="text-[11px] text-zinc-500">
                      Ajuste final de valores, emissão do contrato e conversão do Lead em Cliente ativo no sistema.
                    </p>
                  </div>
                </div>
              </div>

              {/* Anotações de Conversão */}
              <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-purple-600" />
                      Estratégia de Conversão ({selectedClientName})
                    </h3>
                    {savedSuccess && (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Salvo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500">
                    Defina argumentos comerciais, gatilhos de urgência, pacotes de serviços e metas de fechamento.
                  </p>
                  <textarea
                    rows={6}
                    value={currentNotes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    placeholder="Ex: Oferta principal: Assessoria Growth + Gestão de Tráfego. Critério de qualificação: Empresa com faturamento acima de R$ 50k/mês..."
                    className="w-full text-xs border border-zinc-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl transition shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Salvar Planejamento
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "retention" && (
          <div className="space-y-6 animate-in fade-in">
            {/* Header do Funil 4 */}
            <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                    Fidelização, Retenção & Expansão
                  </span>
                  <h2 className="text-xl font-bold text-zinc-950">Funil de Pós-Venda</h2>
                  <p className="text-xs text-zinc-500">
                    Garantir onboarding de excelência, manter contratos ativos, realizar upsell de novos serviços e estimular indicações.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href="/contracts"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition shadow-xs"
                  >
                    <Repeat className="w-3.5 h-3.5" />
                    Contratos Vigentes
                  </Link>
                  <Link
                    href="/projects/templates?category=onboarding"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl transition"
                  >
                    Onboardings de Clientes
                  </Link>
                </div>
              </div>

              {/* Indicadores do Funil de Pós-Venda */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200/70 space-y-1">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase">Taxa de Retenção (Meta)</span>
                  <div className="text-sm font-bold text-emerald-700">&gt; 95% ao mês</div>
                  <p className="text-[10px] text-zinc-400">Churn mensal inferior a 5%</p>
                </div>

                <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200/70 space-y-1">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase">Tempo de Onboarding</span>
                  <div className="text-sm font-bold text-indigo-700">14 dias úteis</div>
                  <p className="text-[10px] text-zinc-400">Setup inicial e primeira entrega de valor</p>
                </div>

                <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200/70 space-y-1">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase">Expansão de Receita (Upsell)</span>
                  <div className="text-sm font-bold text-purple-700">+25% LTV</div>
                  <p className="text-[10px] text-zinc-400">Combos adicionais de serviços</p>
                </div>

                <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200/70 space-y-1">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase">Satisfação (NPS)</span>
                  <div className="text-sm font-bold text-blue-700">Zona de Excelência (&gt; 75)</div>
                  <p className="text-[10px] text-zinc-400">Pesquisas trimestrais de feedback</p>
                </div>
              </div>

              {/* Métricas Reais do ERP Otimizza */}
              <div className="p-4 bg-gradient-to-r from-indigo-50/50 via-zinc-50 to-white rounded-xl border border-indigo-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-2xs">
                      <BarChart3 className="w-3.5 h-3.5" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-950 flex items-center gap-2">
                        Real do ERP Otimizza: Contratos Vigentes & MRR
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                          Sincronizado
                        </span>
                      </h4>
                      <p className="text-[10px] text-zinc-500">Módulo de Contratos e Faturamento Ativo</p>
                    </div>
                  </div>
                  <Link
                    href="/contracts"
                    className="text-[11px] font-bold text-indigo-700 hover:text-indigo-800 hover:underline flex items-center gap-1"
                  >
                    Ver Contratos <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-white rounded-lg border border-zinc-200/80 space-y-0.5">
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase">Contratos Ativos</span>
                    <div className="text-lg font-bold text-indigo-700">
                      {loadingMetrics ? "..." : erpMetrics?.retention?.activeContracts || 0}
                      <span className="text-xs font-normal text-zinc-400 ml-1">vigentes</span>
                    </div>
                    <p className="text-[10px] text-zinc-400">Com faturamento recorrente</p>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-zinc-200/80 space-y-0.5">
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase">MRR Recorrente Real</span>
                    <div className="text-lg font-bold text-emerald-700">
                      R$ {loadingMetrics ? "..." : (erpMetrics?.retention?.realMrr || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      <span className="text-xs font-normal text-zinc-400 ml-1">/mês</span>
                    </div>
                    <p className="text-[10px] text-zinc-400">Receita mensal contratada</p>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-zinc-200/80 space-y-0.5">
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase">Taxa de Retenção</span>
                    <div className="text-lg font-bold text-zinc-900">
                      {loadingMetrics ? "..." : `${erpMetrics?.retention?.retentionRate || 100}%`}
                    </div>
                    <p className="text-[10px] text-zinc-400">Contratos ativos vs churn</p>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-zinc-200/80 space-y-0.5">
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase">Cancelamentos no Mês</span>
                    <div className="text-lg font-bold text-rose-700">
                      {loadingMetrics ? "..." : erpMetrics?.retention?.canceledContractsMonth || 0}
                      <span className="text-xs font-normal text-zinc-400 ml-1">churn</span>
                    </div>
                    <p className="text-[10px] text-zinc-400">Contratos cancelados este mês</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Estratégia de Pós-Venda e Anotações */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
                  <HeartHandshake className="w-4 h-4 text-indigo-600" />
                  Pilares de Fidelização & LTV
                </h3>
                <div className="space-y-3 text-xs text-zinc-600">
                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 space-y-1">
                    <span className="font-bold text-zinc-900 block">1. Onboarding Estruturado</span>
                    <p className="text-[11px] text-zinc-500">
                      Coleta de acessos no Gerenciador de Senhas, alinhamento de expectativas e cronograma de marcos iniciais.
                    </p>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 space-y-1">
                    <span className="font-bold text-zinc-900 block">2. Reuniões Mensais de Resultados</span>
                    <p className="text-[11px] text-zinc-500">
                      Apresentação de métricas claras de crescimento para renovação antecipada e alinhamento tático.
                    </p>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 space-y-1">
                    <span className="font-bold text-zinc-900 block">3. Programa de Indicação (Member Get Member)</span>
                    <p className="text-[11px] text-zinc-500">
                      Estimular clientes satisfeitos a indicarem novos contatos para entrar diretamente no Funil de Conversão.
                    </p>
                  </div>
                </div>
              </div>

              {/* Anotações de Pós-Venda */}
              <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-purple-600" />
                      Estratégia de Pós-Venda ({selectedClientName})
                    </h3>
                    {savedSuccess && (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Salvo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500">
                    Defina periodicidade de relatórios, oportunidades de novos módulos a oferecer e rotina de Customer Success.
                  </p>
                  <textarea
                    rows={6}
                    value={currentNotes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    placeholder="Ex: Reunião mensal: toda primeira quinta-feira do mês. Oportunidade de upsell após 3 meses: Módulo de Automação de E-mails..."
                    className="w-full text-xs border border-zinc-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl transition shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Salvar Planejamento
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
