"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import {
  TrendingUp,
  ArrowLeft,
  DollarSign,
  User,
  Building,
  Calendar,
  Layers,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  FileText,
  Info,
  CheckCircle2,
  ExternalLink,
  HelpCircle,
  Tag,
  RefreshCw,
} from "lucide-react";
import { BillingPeriod, PipelineRecord, PipelineStageRecord, OpportunityRecord } from "@/modules/crm/types";
import { formatBRL } from "@/components/analytics/report-charts";

interface SimpleContact {
  id: string;
  name: string;
  document?: string;
  source?: string;
  type: "LEAD" | "CLIENT";
}

function getProbabilityColor(prob: number): string {
  // 0% -> Vermelho vibrante (0), 50% -> Âmbar/Amarelo (42), 100% -> Verde esmeralda (142)
  if (prob <= 50) {
    const hue = Math.round((prob / 50) * 42);
    return `hsl(${hue}, 88%, 46%)`;
  } else {
    const hue = Math.round(42 + ((prob - 50) / 50) * (142 - 42));
    return `hsl(${hue}, 78%, 40%)`;
  }
}

function NewOpportunityForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialLeadId = searchParams.get("leadId") || "";
  const initialClientId = searchParams.get("clientId") || "";
  const initialPipelineId = searchParams.get("pipelineId") || "";

  const [pipelines, setPipelines] = useState<PipelineRecord[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>(initialPipelineId);
  const [stages, setStages] = useState<PipelineStageRecord[]>([]);
  const [selectedStageId, setSelectedStageId] = useState<string>("");

  const [contactMode, setContactMode] = useState<"LEAD" | "CLIENT" | "NONE">(
    initialClientId ? "CLIENT" : initialLeadId ? "LEAD" : "LEAD"
  );
  const [selectedContactId, setSelectedContactId] = useState<string>(
    initialClientId || initialLeadId || ""
  );

  const [leadsList, setLeadsList] = useState<SimpleContact[]>([]);
  const [clientsList, setClientsList] = useState<SimpleContact[]>([]);
  const [existingContactOpps, setExistingContactOpps] = useState<OpportunityRecord[]>([]);

  // Campos do formulário
  const [title, setTitle] = useState("");
  const [amountRaw, setAmountRaw] = useState<string>("");
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("MONTHLY");
  const [probability, setProbability] = useState<number>(20);
  const [isManualProbability, setIsManualProbability] = useState<boolean>(false);
  const [expectedCloseDate, setExpectedCloseDate] = useState<string>("");
  const [source, setSource] = useState<string>("");
  const [inheritedSource, setInheritedSource] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Efeito 1: Resolução imediata do Lead/Cliente passado por parâmetro
  useEffect(() => {
    if (initialLeadId) {
      setContactMode("LEAD");
      setSelectedContactId(initialLeadId);
      fetch(`/api/crm/leads/${initialLeadId}`)
        .then((r) => r.json())
        .then((lead) => {
          if (lead && lead.id) {
            const formatted: SimpleContact = {
              id: lead.id,
              name: `${lead.name}${lead.tradeName ? ` (${lead.tradeName})` : ""}`,
              document: lead.document || undefined,
              source: lead.source || undefined,
              type: "LEAD",
            };
            setLeadsList((prev) => {
              if (prev.some((x) => x.id === lead.id)) return prev;
              return [formatted, ...prev];
            });
            setTitle((prev) => (prev ? prev : `Negociação - ${lead.name}`));
            if (lead.source) {
              setInheritedSource(lead.source);
              setSource(lead.source);
            }
          }
        })
        .catch((e) => console.error("Erro ao puxar lead inicial:", e));
    } else if (initialClientId) {
      setContactMode("CLIENT");
      setSelectedContactId(initialClientId);
      fetch(`/api/clients/${initialClientId}`)
        .then((r) => r.json())
        .then((client) => {
          if (client && client.id) {
            const formatted: SimpleContact = {
              id: client.id,
              name: `${client.name}${client.tradeName ? ` (${client.tradeName})` : ""}`,
              document: client.document || undefined,
              type: "CLIENT",
            };
            setClientsList((prev) => {
              if (prev.some((x) => x.id === client.id)) return prev;
              return [formatted, ...prev];
            });
            setTitle((prev) => (prev ? prev : `Negociação - ${client.name}`));
          }
        })
        .catch((e) => console.error("Erro ao puxar cliente inicial:", e));
    }
  }, [initialLeadId, initialClientId]);

  // Efeito 2: Carrega pipelines, leads e clientes em massa
  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const [pipRes, leadsRes, clientsRes] = await Promise.all([
          fetch("/api/crm/pipelines"),
          fetch("/api/crm/leads?limit=100"),
          fetch("/api/clients?limit=100"),
        ]);

        let loadedPipelines: PipelineRecord[] = [];
        if (pipRes.ok) {
          const pData = await pipRes.json();
          loadedPipelines = Array.isArray(pData) ? pData : pData?.pipelines || [];
          setPipelines(loadedPipelines);

          const chosen =
            loadedPipelines.find((p) => p.id === initialPipelineId) ||
            loadedPipelines.find((p) => p.isDefault) ||
            loadedPipelines[0];

          if (chosen) {
            setSelectedPipelineId(chosen.id);
            const validStages = chosen.stages || [];
            setStages(validStages);
            if (validStages.length > 0) {
              setSelectedStageId(validStages[0].id);
              setProbability(validStages[0].winProbability ?? 20);
            }
          }
        }

        if (leadsRes.ok) {
          const lData = await leadsRes.json();
          const rawLeads = lData.leads || [];
          const mappedLeads: SimpleContact[] = rawLeads.map((l: { id: string; name: string; tradeName?: string | null; companyName?: string | null; document?: string | null; source?: string | null }) => ({
            id: l.id,
            name: `${l.name}${l.tradeName || l.companyName ? ` (${l.tradeName || l.companyName})` : ""}`,
            document: l.document || undefined,
            source: l.source || undefined,
            type: "LEAD",
          }));

          setLeadsList((prev) => {
            const combined = [...prev];
            for (const item of mappedLeads) {
              if (!combined.some((c) => c.id === item.id)) combined.push(item);
            }
            return combined;
          });
        }

        if (clientsRes.ok) {
          const cData = await clientsRes.json();
          const rawClients = Array.isArray(cData.clients) ? cData.clients : Array.isArray(cData) ? cData : [];
          const mappedClients: SimpleContact[] = rawClients.map((c: { id: string; name?: string | null; tradeName?: string | null; document?: string | null }) => ({
            id: c.id,
            name: `${c.name || "Cliente"}${c.tradeName ? ` (${c.tradeName})` : ""}`,
            document: c.document || undefined,
            type: "CLIENT",
          }));

          setClientsList((prev) => {
            const combined = [...prev];
            for (const item of mappedClients) {
              if (!combined.some((c) => c.id === item.id)) combined.push(item);
            }
            return combined;
          });
        }
      } catch (e) {
        console.error("Erro na inicialização dos dados:", e);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [initialPipelineId]);

  // Carrega oportunidades existentes do contato para alertar duplicidade
  useEffect(() => {
    if (!selectedContactId || contactMode === "NONE") {
      setExistingContactOpps([]);
      return;
    }

    const param = contactMode === "LEAD" ? `leadId=${selectedContactId}` : `clientId=${selectedContactId}`;
    fetch(`/api/crm/opportunities?${param}`)
      .then((res) => res.json())
      .then((data) => {
        const opps: OpportunityRecord[] = data.opportunities || [];
        setExistingContactOpps(opps.filter((o) => o.status === "OPEN"));
      })
      .catch(() => setExistingContactOpps([]));
  }, [selectedContactId, contactMode]);

  // Atualiza origem herdada e título quando o contato selecionado muda
  useEffect(() => {
    if (contactMode === "LEAD" && selectedContactId) {
      const found = leadsList.find((l) => l.id === selectedContactId);
      if (found) {
        if (!title || title.startsWith("Negociação - ")) {
          setTitle(`Negociação - ${found.name}`);
        }
        if (found.source) {
          setInheritedSource(found.source);
          setSource(found.source);
        } else {
          setInheritedSource("");
        }
      }
    } else if (contactMode === "CLIENT" && selectedContactId) {
      const found = clientsList.find((c) => c.id === selectedContactId);
      if (found) {
        if (!title || title.startsWith("Negociação - ")) {
          setTitle(`Negociação - ${found.name}`);
        }
      }
      setInheritedSource("");
    } else {
      setInheritedSource("");
    }
  }, [selectedContactId, contactMode, leadsList, clientsList]);

  // Ao mudar funil, atualiza etapas
  function handlePipelineChange(pipeId: string) {
    setSelectedPipelineId(pipeId);
    const chosen = pipelines.find((p) => p.id === pipeId);
    if (chosen && chosen.stages && chosen.stages.length > 0) {
      setStages(chosen.stages);
      setSelectedStageId(chosen.stages[0].id);
      setProbability(chosen.stages[0].winProbability ?? 20);
      setIsManualProbability(false);
    } else {
      setStages([]);
      setSelectedStageId("");
    }
  }

  // Ao mudar etapa, sugere a probabilidade padrão da etapa
  function handleStageChange(stgId: string) {
    setSelectedStageId(stgId);
    const chosen = stages.find((s) => s.id === stgId);
    if (chosen) {
      setProbability(chosen.winProbability ?? 20);
      setIsManualProbability(false);
    }
  }

  // Cálculo de MRR e Valor Ponderado
  const numericAmount = parseFloat(amountRaw.replace(/\./g, "").replace(",", ".")) || 0;
  let estimatedMonthlyMRR = 0;
  if (billingPeriod === "MONTHLY") estimatedMonthlyMRR = numericAmount;
  else if (billingPeriod === "YEARLY") estimatedMonthlyMRR = numericAmount / 12;
  else estimatedMonthlyMRR = 0;

  const weightedAmount = (numericAmount * probability) / 100;
  const currentStage = stages.find((s) => s.id === selectedStageId);
  const selectedLead = contactMode === "LEAD" ? leadsList.find((l) => l.id === selectedContactId) : null;
  const selectedClient = contactMode === "CLIENT" ? clientsList.find((c) => c.id === selectedContactId) : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");

    if (!title.trim()) {
      setErrorMessage("O título da oportunidade é obrigatório.");
      return;
    }

    if (numericAmount <= 0) {
      setErrorMessage("Informe um valor comercial válido.");
      return;
    }

    if (!selectedPipelineId) {
      setErrorMessage("Selecione um funil de vendas.");
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        pipelineId: selectedPipelineId,
        stageId: selectedStageId || undefined,
        amount: numericAmount,
        billingPeriod,
        probability,
        source: contactMode === "LEAD" ? (inheritedSource || source.trim() || undefined) : (source.trim() || undefined),
        expectedCloseDate: expectedCloseDate || undefined,
        notes: notes.trim() || undefined,
      };

      if (contactMode === "LEAD" && selectedContactId) {
        payload.leadId = selectedContactId;
      } else if (contactMode === "CLIENT" && selectedContactId) {
        payload.clientId = selectedContactId;
      }

      const res = await fetch("/api/crm/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/crm/opportunities/${data.opportunity.id}`);
      } else {
        const err = await res.json();
        setErrorMessage(err.error || "Erro ao criar oportunidade.");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Falha de comunicação com o servidor.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell activeSection="crm_opportunities">
      <div className="max-w-4xl mx-auto space-y-6 pb-16">
        {/* Cabeçalho */}
        <div>
          <Link
            href="/crm/opportunities"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 transition-colors mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar para Funil de vendas
          </Link>
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-zinc-900 text-white rounded-xl shadow-xs">
              <TrendingUp className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-zinc-950 tracking-tight">Nova Oportunidade Comercial</h1>
              <p className="text-xs text-zinc-500 mt-0.5">
                Registre uma negociação no funil de vendas, etapas de avanço e cálculo de valor ponderado.
              </p>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-800 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Alerta de Oportunidades Existentes para o mesmo Contato */}
        {existingContactOpps.length > 0 && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-950">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Atenção: este contato já possui {existingContactOpps.length} oportunidade(s) em aberto</span>
            </div>
            <p className="text-amber-800">
              Negociações simultâneas são permitidas, mas verifique se não se trata de uma duplicação acidental:
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {existingContactOpps.map((opp) => (
                <Link
                  key={opp.id}
                  href={`/crm/opportunities/${opp.id}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-[11px] font-semibold text-amber-900 hover:bg-amber-100/80 transition"
                >
                  <span>{opp.title}</span>
                  <span className="text-amber-600 font-mono">({formatBRL(opp.amount)})</span>
                  <ExternalLink className="w-3 h-3 text-amber-500" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="bg-white p-12 rounded-2xl border border-zinc-200/80 shadow-xs flex flex-col items-center justify-center gap-3 text-zinc-500">
            <RefreshCw className="w-6 h-6 animate-spin text-zinc-900" />
            <p className="text-xs font-semibold">Carregando funis e dados comerciais...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Card: Dados Básicos & Contato */}
            <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs space-y-5">
              <h2 className="text-sm font-bold text-zinc-950 border-b border-zinc-100 pb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-zinc-700" />
                Identificação & Contato
              </h2>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Título da Negociação <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Gestão de Tráfego + Consultoria - Empresa XYZ"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-sm border border-zinc-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-zinc-900 font-medium"
                />
              </div>

              {/* Associação com Lead ou Cliente */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-zinc-700">
                    Vincular a Contato (Lead ou Cliente)
                  </label>
                  {contactMode === "LEAD" && selectedLead && (
                    <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                      <User className="w-3 h-3 text-amber-600" /> Lead Vinculado
                    </span>
                  )}
                  {contactMode === "CLIENT" && selectedClient && (
                    <span className="text-[11px] font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 flex items-center gap-1">
                      <Building className="w-3 h-3 text-blue-600" /> Cliente Vinculado
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs font-medium">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="contactMode"
                      value="LEAD"
                      checked={contactMode === "LEAD"}
                      onChange={() => {
                        setContactMode("LEAD");
                        setSelectedContactId(leadsList[0]?.id || "");
                      }}
                      className="text-zinc-900 focus:ring-zinc-900"
                    />
                    <span className="flex items-center gap-1.5 text-zinc-800 font-semibold">
                      <User className="h-4 w-4 text-amber-600" /> Lead
                    </span>
                  </label>

                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="contactMode"
                      value="CLIENT"
                      checked={contactMode === "CLIENT"}
                      onChange={() => {
                        setContactMode("CLIENT");
                        setSelectedContactId(clientsList[0]?.id || "");
                      }}
                      className="text-zinc-900 focus:ring-zinc-900"
                    />
                    <span className="flex items-center gap-1.5 text-zinc-800 font-semibold">
                      <Building className="h-4 w-4 text-blue-600" /> Cliente
                    </span>
                  </label>

                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="contactMode"
                      value="NONE"
                      checked={contactMode === "NONE"}
                      onChange={() => {
                        setContactMode("NONE");
                        setSelectedContactId("");
                      }}
                      className="text-zinc-900 focus:ring-zinc-900"
                    />
                    <span className="text-zinc-500">Sem vínculo inicial</span>
                  </label>
                </div>

                {contactMode === "LEAD" && (
                  <div>
                    <select
                      value={selectedContactId}
                      onChange={(e) => setSelectedContactId(e.target.value)}
                      className="w-full text-xs font-medium border border-zinc-300 rounded-xl p-2.5 bg-white text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    >
                      <option value="">Selecione um Lead...</option>
                      {leadsList.map((lead) => (
                        <option key={lead.id} value={lead.id}>
                          {lead.name} {lead.document ? `• Doc: ${lead.document}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {contactMode === "CLIENT" && (
                  <div>
                    <select
                      value={selectedContactId}
                      onChange={(e) => setSelectedContactId(e.target.value)}
                      className="w-full text-xs font-medium border border-zinc-300 rounded-xl p-2.5 bg-white text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    >
                      <option value="">Selecione um Cliente cadastrado...</option>
                      {clientsList.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.document ? `• Doc: ${c.document}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Card: Funil e Etapa */}
            <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <h2 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-zinc-700" />
                  Funil e Etapa Inicial
                </h2>
                <Link
                  href="/crm/pipelines"
                  className="text-xs font-semibold text-purple-700 hover:text-purple-900 flex items-center gap-1"
                >
                  Configurar funis <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              {pipelines.length === 0 ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-3">
                  <span>Nenhum funil ativo encontrado. Cadastre um funil para organizar suas negociações.</span>
                  <Link
                    href="/crm/pipelines"
                    className="px-3 py-1.5 bg-amber-700 text-white font-bold rounded-lg hover:bg-amber-800 transition"
                  >
                    Criar Primeiro Funil
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Funil de Vendas <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={selectedPipelineId}
                      onChange={(e) => handlePipelineChange(e.target.value)}
                      className="w-full text-xs font-medium border border-zinc-300 rounded-xl p-2.5 bg-white text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    >
                      <option value="">Selecione o Funil...</option>
                      {pipelines.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.isDefault ? "(Padrão)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Etapa Inicial <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={selectedStageId}
                      onChange={(e) => handleStageChange(e.target.value)}
                      className="w-full text-xs font-medium border border-zinc-300 rounded-xl p-2.5 bg-white text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    >
                      <option value="">Selecione a Etapa...</option>
                      {stages.map((stg) => (
                        <option key={stg.id} value={stg.id}>
                          {stg.name} ({stg.winProbability}% prob.)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Card: Proposta Financeira & Previsão */}
            <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs space-y-5">
              <h2 className="text-sm font-bold text-zinc-950 border-b border-zinc-100 pb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-zinc-700" />
                Valores e Previsão de Fechamento
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Valor Estimado (R$) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 font-bold">
                      R$
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="0,00"
                      value={amountRaw}
                      onChange={(e) => setAmountRaw(e.target.value)}
                      className="w-full text-xs pl-9 pr-3 py-2.5 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 font-semibold text-zinc-900 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Recorrência / Período
                  </label>
                  <select
                    value={billingPeriod}
                    onChange={(e) => setBillingPeriod(e.target.value as BillingPeriod)}
                    className="w-full text-xs font-medium border border-zinc-300 rounded-xl p-2.5 bg-white text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  >
                    <option value="MONTHLY">Mensal (MRR Recorrente)</option>
                    <option value="YEARLY">Anual</option>
                    <option value="ONE_TIME">Pontual / Projeto Único</option>
                  </select>
                </div>

                {/* Probabilidade de Fechamento com Degradê Visual Vermelho -> Amarelo -> Verde */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-zinc-700">
                      Probabilidade de Fechamento (%)
                    </label>
                    <span
                      className="px-2.5 py-0.5 rounded-full text-[11px] font-bold text-white shadow-2xs transition-colors duration-200"
                      style={{ backgroundColor: getProbabilityColor(probability) }}
                    >
                      {probability}%
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative w-full flex items-center">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={probability}
                        onChange={(e) => {
                          setProbability(Number(e.target.value));
                          setIsManualProbability(true);
                        }}
                        className="w-full cursor-pointer h-2.5 rounded-lg appearance-none relative z-10 bg-transparent"
                      />
                      {/* Trilha em degrade vibrante de vermelho a amarelo e verde */}
                      <div
                        className="absolute inset-0 h-2.5 rounded-lg pointer-events-none"
                        style={{
                          background: "linear-gradient(to right, #ef4444 0%, #f59e0b 50%, #10b981 100%)",
                        }}
                      />
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={probability}
                      onChange={(e) => {
                        const v = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                        setProbability(v);
                        setIsManualProbability(true);
                      }}
                      className="w-14 text-center text-xs font-mono font-bold border border-zinc-300 rounded-lg py-1.5 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-1 flex items-center justify-between font-medium">
                    <span className="text-rose-600 font-semibold">0% (Baixa chance)</span>
                    {currentStage && (
                      <span className="text-zinc-500">
                        {isManualProbability ? "Definido manualmente" : `Padrão da etapa: ${currentStage.winProbability}%`}
                      </span>
                    )}
                    <span className="text-emerald-600 font-semibold">100% (Ganho)</span>
                  </div>
                </div>
              </div>

              {/* Destaque Explicativo do Valor Ponderado do Deal */}
              <div className="p-4 bg-zinc-50 border border-zinc-200/80 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-zinc-600">
                    <Sparkles className="h-4 w-4 text-purple-600 shrink-0" />
                    <span>
                      MRR Mensal Estimado: <strong className="font-mono text-zinc-900">{formatBRL(estimatedMonthlyMRR)}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-700">
                    <TrendingUp className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>
                      Valor Ponderado do Deal:{" "}
                      <strong className="font-mono text-emerald-700 font-bold text-sm">
                        {formatBRL(weightedAmount)}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Bloco de esclarecimento didático sobre o que é Valor Ponderado */}
                <div className="text-[11px] text-zinc-600 border-t border-zinc-200/70 pt-2.5 space-y-1.5 bg-white/70 p-2.5 rounded-lg border border-zinc-100">
                  <div className="flex items-center gap-1.5 font-bold text-zinc-900">
                    <HelpCircle className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>O que é o &quot;Valor Ponderado do Deal&quot;?</span>
                  </div>
                  <p className="text-zinc-500 leading-relaxed">
                    É a receita matematicamente esperada desta negociação (<strong>Valor Total × % Probabilidade</strong>).
                    Em vez de superestimar o caixa contando com 100% das propostas em negociação, a gestão comercial utiliza o valor ponderado para projetar com alta precisão o <strong>sales forecast</strong> (previsão realista de faturamento).
                    {numericAmount > 0 && (
                      <span className="block font-mono text-zinc-700 mt-1 font-semibold">
                        Cálculo atual: {formatBRL(numericAmount)} × {probability}% = {formatBRL(weightedAmount)}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Previsão Estimada de Fechamento
                  </label>
                  <input
                    type="date"
                    value={expectedCloseDate}
                    onChange={(e) => setExpectedCloseDate(e.target.value)}
                    className="w-full text-xs font-medium border border-zinc-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>

                {/* Canal de Origem: herdado automaticamente do Lead para evitar duplicidade */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Canal de Origem
                  </label>
                  {contactMode === "LEAD" && inheritedSource ? (
                    <div className="flex items-center gap-2 p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs">
                      <Tag className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span className="font-semibold text-zinc-900">{inheritedSource}</span>
                      <span className="text-[10px] text-zinc-400 font-normal ml-auto">
                        (Herdado diretamente da ficha do Lead)
                      </span>
                    </div>
                  ) : (
                    <input
                      type="text"
                      placeholder="Ex: Google Ads, Indicação, Prospecção Ativa..."
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      className="w-full text-xs border border-zinc-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Anotações e Escopo Proposto
                </label>
                <textarea
                  rows={3}
                  placeholder="Detalhes dos serviços ofertados, necessidades levantadas, expectativas..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs border border-zinc-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Link
                href="/crm/opportunities"
                className="px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 rounded-xl transition"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl shadow-xs transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? "Criando Oportunidade..." : "Salvar Oportunidade"}
              </button>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}

export default function NewOpportunityPage() {
  return (
    <Suspense
      fallback={
        <AppShell activeSection="crm_opportunities">
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-zinc-500">
            <RefreshCw className="w-6 h-6 animate-spin text-zinc-900" />
            <p className="text-xs">Carregando formulário...</p>
          </div>
        </AppShell>
      }
    >
      <NewOpportunityForm />
    </Suspense>
  );
}
