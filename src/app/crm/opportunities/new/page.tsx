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
  FileText,
  Info,
} from "lucide-react";
import { BillingPeriod, PipelineRecord, PipelineStageRecord } from "@/modules/crm/types";
import { formatBRL } from "@/components/analytics/report-charts";

interface SimpleContact {
  id: string;
  name: string;
  document?: string;
  type: "LEAD" | "CLIENT";
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

  // Campos do formulário
  const [title, setTitle] = useState("");
  const [amountRaw, setAmountRaw] = useState<string>("");
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("MONTHLY");
  const [probability, setProbability] = useState<number>(20);
  const [expectedCloseDate, setExpectedCloseDate] = useState<string>("");
  const [source, setSource] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Carrega pipelines, leads e clientes
  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const [pipRes, leadsRes, clientsRes] = await Promise.all([
          fetch("/api/crm/pipelines"),
          fetch("/api/crm/leads?status=NEW,CONTACTED,QUALIFIED"),
          fetch("/api/clients"),
        ]);

        let loadedPipelines: PipelineRecord[] = [];
        if (pipRes.ok) {
          const pData = await pipRes.json();
          loadedPipelines = pData.pipelines || [];
          setPipelines(loadedPipelines);

          const chosen =
            loadedPipelines.find((p) => p.id === initialPipelineId) ||
            loadedPipelines.find((p) => p.isDefault) ||
            loadedPipelines[0];

          if (chosen) {
            setSelectedPipelineId(chosen.id);
            setStages(chosen.stages || []);
            if (chosen.stages && chosen.stages.length > 0) {
              setSelectedStageId(chosen.stages[0].id);
              setProbability(chosen.stages[0].winProbability);
            }
          }
        }

        if (leadsRes.ok) {
          const lData = await leadsRes.json();
          const mapped: SimpleContact[] = (lData.leads || []).map((l: any) => ({
            id: l.id,
            name: `${l.name} ${l.companyName ? `(${l.companyName})` : ""}`,
            document: l.document,
            type: "LEAD",
          }));
          setLeadsList(mapped);
        }

        if (clientsRes.ok) {
          const cData = await clientsRes.json();
          const mapped: SimpleContact[] = (cData.clients || cData || []).map((c: any) => ({
            id: c.id,
            name: c.tradeName || c.name || "Cliente sem nome",
            document: c.document,
            type: "CLIENT",
          }));
          setClientsList(mapped);
        }
      } catch (e) {
        console.error("Erro na inicialização:", e);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [initialPipelineId]);

  // Ao mudar funil, atualiza etapas
  function handlePipelineChange(pipeId: string) {
    setSelectedPipelineId(pipeId);
    const chosen = pipelines.find((p) => p.id === pipeId);
    if (chosen && chosen.stages && chosen.stages.length > 0) {
      setStages(chosen.stages);
      setSelectedStageId(chosen.stages[0].id);
      setProbability(chosen.stages[0].winProbability);
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
      setProbability(chosen.winProbability);
    }
  }

  // Cálculo de MRR projetado
  const numericAmount = parseFloat(amountRaw.replace(/\./g, "").replace(",", ".")) || 0;
  let estimatedMonthlyMRR = 0;
  if (billingPeriod === "MONTHLY") estimatedMonthlyMRR = numericAmount;
  else if (billingPeriod === "YEARLY") estimatedMonthlyMRR = numericAmount / 12;
  else estimatedMonthlyMRR = 0; // ONE_TIME

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
      const payload: any = {
        title: title.trim(),
        pipelineId: selectedPipelineId,
        stageId: selectedStageId || undefined,
        amount: numericAmount,
        billingPeriod,
        probability,
        source: source.trim() || undefined,
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
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div>
          <Link
            href="/crm/opportunities"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-emerald-700 transition-colors mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar para Oportunidades
          </Link>
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
              <TrendingUp className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Nova Oportunidade Comercial</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Registre uma nova negociação em um dos seus funis de vendas com previsão e valor ponderado.
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card: Dados Básicos & Contato */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
            <h2 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-600" />
              Identificação & Contato
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Título da Negociação <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Gestão de Tráfego + Social Media Q1 - Empresa XYZ"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            {/* Associação com Lead ou Cliente */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-semibold text-slate-700">
                Vincular a Contato (Lead ou Cliente)
              </label>
              <div className="flex items-center gap-4 text-sm">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="contactMode"
                    value="LEAD"
                    checked={contactMode === "LEAD"}
                    onChange={() => {
                      setContactMode("LEAD");
                      setSelectedContactId("");
                    }}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                    <User className="h-4 w-4 text-amber-500" /> Lead do Funil
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
                      setSelectedContactId("");
                    }}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                    <Building className="h-4 w-4 text-blue-500" /> Cliente Cadastrado
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
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-slate-500">Sem vínculo inicial</span>
                </label>
              </div>

              {contactMode === "LEAD" && (
                <div>
                  <select
                    value={selectedContactId}
                    onChange={(e) => setSelectedContactId(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Selecione um Lead existente...</option>
                    {leadsList.map((lead) => (
                      <option key={lead.id} value={lead.id}>
                        {lead.name} {lead.document ? `• Doc: ${lead.document}` : ""}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Mostrando apenas leads com status Novo, Contatado ou Qualificado.
                  </p>
                </div>
              )}

              {contactMode === "CLIENT" && (
                <div>
                  <select
                    value={selectedContactId}
                    onChange={(e) => setSelectedContactId(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
            <h2 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-600" />
              Funil e Etapa Inicial
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Funil de Vendas <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedPipelineId}
                  onChange={(e) => handlePipelineChange(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {pipelines.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.isDefault ? "(Padrão)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Etapa Inicial <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedStageId}
                  onChange={(e) => handleStageChange(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {stages.map((stg) => (
                    <option key={stg.id} value={stg.id}>
                      {stg.name} ({stg.winProbability}% prob.)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Card: Proposta Financeira & Previsão */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
            <h2 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              Valores e Previsão de Fechamento
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Valor da Negociação (R$) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-semibold">
                    R$
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="0,00"
                    value={amountRaw}
                    onChange={(e) => setAmountRaw(e.target.value)}
                    className="w-full text-sm pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Recorrência / Período
                </label>
                <select
                  value={billingPeriod}
                  onChange={(e) => setBillingPeriod(e.target.value as BillingPeriod)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="MONTHLY">Mensal (MRR)</option>
                  <option value="YEARLY">Anual</option>
                  <option value="ONE_TIME">Pontual / Projeto Único</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Probabilidade de Fechamento (%)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={probability}
                    onChange={(e) => setProbability(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                  <span className="text-sm font-bold text-slate-800 w-12 text-right">
                    {probability}%
                  </span>
                </div>
              </div>
            </div>

            {/* Destaque do MRR Normalizado e Ponderado */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  MRR Mensal Estimado: <strong>{formatBRL(estimatedMonthlyMRR)}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <TrendingUp className="h-4 w-4 text-indigo-600 shrink-0" />
                <span>
                  Valor Ponderado do Deal:{" "}
                  <strong>{formatBRL((numericAmount * probability) / 100)}</strong>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Previsão Estimada de Fechamento
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={expectedCloseDate}
                    onChange={(e) => setExpectedCloseDate(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Canal de Origem
                </label>
                <input
                  type="text"
                  placeholder="Ex: Google Ads, Indicação, Instagram..."
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Anotações e Escopo Proposto
              </label>
              <textarea
                rows={3}
                placeholder="Detalhes dos serviços ofertados, dores do cliente, exigências especiais..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/crm/opportunities"
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              {submitting ? "Criando Oportunidade..." : "Salvar Oportunidade"}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}

export default function NewOpportunityPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-500">
            <p className="text-sm">Carregando formulário...</p>
          </div>
        </AppShell>
      }
    >
      <NewOpportunityForm />
    </Suspense>
  );
}

