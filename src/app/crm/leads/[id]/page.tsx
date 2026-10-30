"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import {
  Users,
  ArrowLeft,
  Building,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Clock,
  Target,
  ExternalLink,
  Archive,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { LeadRecord, OpportunityRecord, ActivityRecord, LeadStatus } from "@/modules/crm/types";
import { formatBRL } from "@/components/analytics/report-charts";

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [lead, setLead] = useState<LeadRecord | null>(null);
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([]);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Modal de Conversão
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertMode, setConvertMode] = useState<"NEW_CLIENT" | "LINK_EXISTING">("NEW_CLIENT");
  const [existingClients, setExistingClients] = useState<{ id: string; name: string; document?: string }[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [converting, setConverting] = useState(false);
  const [convertError, setConvertError] = useState("");

  // Modal de Nova Atividade
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [newActivity, setNewActivity] = useState({
    activityType: "FOLLOW_UP" as "CALL" | "WHATSAPP" | "EMAIL" | "MEETING" | "FOLLOW_UP" | "NOTE" | "OTHER",
    title: "",
    description: "",
    dueDate: "",
  });
  const [savingActivity, setSavingActivity] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [leadRes, oppsRes, actRes] = await Promise.all([
        fetch(`/api/crm/leads/${id}`),
        fetch(`/api/crm/opportunities?leadId=${id}`),
        fetch(`/api/crm/activities?leadId=${id}`),
      ]);

      if (!leadRes.ok) throw new Error("Lead não encontrado.");
      setLead(await leadRes.json());

      if (oppsRes.ok) {
        const data = await oppsRes.json();
        setOpportunities(data.opportunities || []);
      }
      if (actRes.ok) setActivities(await actRes.json());
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Erro ao carregar lead.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [id]);

  // Carrega clientes para vínculo se necessário
  useEffect(() => {
    if (showConvertModal && convertMode === "LINK_EXISTING") {
      fetch("/api/clients?limit=100")
        .then((res) => res.json())
        .then((data) => setExistingClients(data.clients || []))
        .catch(console.error);
    }
  }, [showConvertModal, convertMode]);

  const handleStatusChange = async (newStatus: LeadStatus) => {
    try {
      const res = await fetch(`/api/crm/leads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleConvert = async () => {
    setConverting(true);
    setConvertError("");

    try {
      const res = await fetch(`/api/crm/leads/${id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: convertMode,
          existingClientId: convertMode === "LINK_EXISTING" ? selectedClientId : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao converter lead.");

      setShowConvertModal(false);
      router.push(`/clients/${data.clientId}`);
    } catch (err: unknown) {
      setConvertError(err instanceof Error ? err.message : "Erro na conversão.");
      setConverting(false);
    }
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingActivity(true);
    try {
      const res = await fetch("/api/crm/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newActivity,
          leadId: id,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao registrar atividade.");
      }
      setShowActivityModal(false);
      setNewActivity({ activityType: "FOLLOW_UP", title: "", description: "", dueDate: "" });
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro.");
    } finally {
      setSavingActivity(false);
    }
  };

  const handleCompleteActivity = async (actId: string) => {
    try {
      await fetch(`/api/crm/activities/${actId}/complete`, { method: "POST" });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <AppShell activeSection="crm_leads">
        <div className="py-20 text-center text-xs text-zinc-400">Carregando detalhes do lead...</div>
      </AppShell>
    );
  }

  if (errorMsg || !lead) {
    return (
      <AppShell activeSection="crm_leads">
        <div className="max-w-xl mx-auto py-12 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold text-zinc-800">Lead não encontrado</h2>
          <p className="text-sm text-zinc-500">{errorMsg || "O registro solicitado não existe."}</p>
          <Link
            href="/crm/leads"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-zinc-900 text-white rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar para listagem
          </Link>
        </div>
      </AppShell>
    );
  }

  const isConverted = lead.status === "CONVERTED" || Boolean(lead.convertedClientId);

  return (
    <AppShell activeSection="crm_leads">
      <div className="max-w-6xl mx-auto space-y-6 pb-16">
        {/* Header Breadcrumb & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/crm/leads"
              className="p-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 transition shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-zinc-400">{lead.leadCode}</span>
                <h1 className="text-xl font-bold tracking-tight text-zinc-950">{lead.name}</h1>
                {lead.personType === "PJ" ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    PJ
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    PF
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500">
                {lead.tradeName ? `${lead.tradeName} • ` : ""}Origem: {lead.source}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isConverted ? (
              <Link
                href={`/clients/${lead.convertedClientId}`}
                className="px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 flex items-center gap-1.5 transition shadow-2xs"
              >
                <CheckCircle2 className="w-4 h-4" /> Cliente Vinculado (Abrir Cadastro)
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setShowConvertModal(true)}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" /> Converter em Cliente
              </button>
            )}

            <Link
              href={`/crm/opportunities/new?leadId=${lead.id}`}
              className="px-3.5 py-2 text-xs font-semibold text-zinc-900 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 flex items-center gap-1.5 transition shadow-2xs"
            >
              <Plus className="w-4 h-4" /> Criar Oportunidade
            </Link>
          </div>
        </div>

        {/* Status Bar */}
        <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-500">Fase Comercial:</span>
            <select
              value={lead.status}
              disabled={isConverted}
              onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
              className="px-3 py-1.5 text-xs font-bold bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 disabled:opacity-60"
            >
              <option value="NEW">1. Novo Lead</option>
              <option value="CONTACTED">2. Contatado</option>
              <option value="QUALIFIED">3. Qualificado</option>
              <option value="UNQUALIFIED">Desqualificado</option>
              {isConverted && <option value="CONVERTED">Convertido em Cliente</option>}
              <option value="ARCHIVED">Arquivado</option>
            </select>
          </div>

          <div className="flex items-center gap-4 text-xs text-zinc-400">
            <span>Criado em: {new Date(lead.createdAt).toLocaleDateString("pt-BR")}</span>
            {lead.convertedAt && (
              <span className="text-emerald-600 font-semibold">
                Convertido em: {new Date(lead.convertedAt).toLocaleDateString("pt-BR")}
              </span>
            )}
          </div>
        </div>

        {/* Detalhes do Lead & Contato */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-zinc-950 uppercase tracking-wider border-b border-zinc-100 pb-2">
              Ficha Cadastral do Lead
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-zinc-400 block mb-0.5">Documento (CPF / CNPJ)</span>
                <span className="font-mono font-bold text-zinc-900">{lead.document || "Não informado"}</span>
              </div>
              <div>
                <span className="text-zinc-400 block mb-0.5">Contato Principal</span>
                <span className="font-semibold text-zinc-800">{lead.primaryContact || "-"}</span>
              </div>
              <div>
                <span className="text-zinc-400 block mb-0.5">E-mail</span>
                <span className="font-medium text-zinc-800">{lead.email || "-"}</span>
              </div>
              <div>
                <span className="text-zinc-400 block mb-0.5">Telefone / WhatsApp</span>
                <span className="font-mono text-zinc-800">{lead.phone || lead.whatsapp || "-"}</span>
              </div>
              <div>
                <span className="text-zinc-400 block mb-0.5">Segmento de Mercado</span>
                <span className="font-medium text-zinc-800">{lead.segment || "-"}</span>
              </div>
              <div>
                <span className="text-zinc-400 block mb-0.5">Cidade / UF</span>
                <span className="font-medium text-zinc-800">
                  {lead.city && lead.state ? `${lead.city} - ${lead.state}` : "-"}
                </span>
              </div>
            </div>

            {lead.notes && (
              <div className="pt-3 border-t border-zinc-100">
                <span className="text-zinc-400 text-xs block mb-1">Observações Internas</span>
                <p className="text-xs text-zinc-700 bg-zinc-50 p-3 rounded-xl border border-zinc-100 whitespace-pre-wrap">
                  {lead.notes}
                </p>
              </div>
            )}
          </div>

          {/* Card Resumo do Pipeline */}
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-zinc-950 border-b border-zinc-100 pb-2">
                Resumo Comercial do Lead
              </h3>
              <div className="space-y-4 my-4">
                <div>
                  <div className="text-[11px] text-zinc-400 font-semibold uppercase">Oportunidades em Aberto</div>
                  <div className="text-xl font-extrabold text-purple-700 font-mono mt-0.5">
                    {formatBRL(lead.openOpportunitiesAmount || 0)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-zinc-400 font-semibold uppercase">Total de Negócios</div>
                  <div className="text-lg font-bold text-zinc-900 mt-0.5">
                    {opportunities.length} {opportunities.length === 1 ? "oportunidade" : "oportunidades"}
                  </div>
                </div>
              </div>
            </div>

            <Link
              href={`/crm/opportunities/new?leadId=${lead.id}`}
              className="w-full py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition text-center shadow-xs flex items-center justify-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" /> Nova Oportunidade
            </Link>
          </div>
        </div>

        {/* Oportunidades do Lead */}
        <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-bold text-zinc-950">Oportunidades Comerciais Vinculadas</h3>
            </div>
            <Link
              href={`/crm/opportunities/new?leadId=${lead.id}`}
              className="text-xs font-semibold text-purple-600 hover:text-purple-800 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar
            </Link>
          </div>

          {opportunities.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400">
              Nenhuma oportunidade criada para este lead.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-100 text-[11px] font-semibold text-zinc-400 uppercase">
                    <th className="py-2.5 px-3">Título</th>
                    <th className="py-2.5 px-3">Funil / Etapa</th>
                    <th className="py-2.5 px-3 text-right">Valor</th>
                    <th className="py-2.5 px-3 text-right">Probabilidade</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {opportunities.map((opp) => (
                    <tr key={opp.id} className="hover:bg-zinc-50/60 transition">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-zinc-900">{opp.title}</div>
                        <span className="text-[10px] text-zinc-400 font-mono">{opp.opportunityCode}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-zinc-700">{opp.stageName}</span>
                        <span className="text-[10px] text-zinc-400 block">{opp.pipelineName}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-zinc-950 font-mono">
                        {formatBRL(opp.amount)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-purple-700">
                        {opp.probability}%
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            opp.status === "WON"
                              ? "bg-emerald-50 text-emerald-700"
                              : opp.status === "LOST" || opp.status === "CANCELED"
                              ? "bg-rose-50 text-rose-700"
                              : "bg-blue-50 text-blue-700"
                          }`}
                        >
                          {opp.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Link
                          href={`/crm/opportunities/${opp.id}`}
                          className="p-1 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 inline-block"
                          title="Ver detalhes"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Atividades e Histórico */}
        <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-zinc-950">Atividades Comerciais & Follow-ups</h3>
            </div>
            <button
              type="button"
              onClick={() => setShowActivityModal(true)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Nova Atividade
            </button>
          </div>

          {activities.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400">
              Nenhuma atividade registrada para este lead.
            </div>
          ) : (
            <div className="space-y-2.5">
              {activities.map((act) => (
                <div
                  key={act.id}
                  className={`p-3.5 rounded-xl border transition flex items-center justify-between ${
                    act.status === "COMPLETED"
                      ? "bg-zinc-50 border-zinc-200 opacity-70"
                      : act.isOverdue
                      ? "bg-rose-50/50 border-rose-200"
                      : "bg-white border-zinc-200"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700">
                        {act.activityType}
                      </span>
                      <span className="font-bold text-xs text-zinc-900">{act.title}</span>
                      {act.isOverdue && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                          Atrasada
                        </span>
                      )}
                    </div>
                    {act.description && <p className="text-xs text-zinc-600">{act.description}</p>}
                    <div className="text-[11px] text-zinc-400 flex items-center gap-3">
                      <span>Vencimento: {act.dueDate ? new Date(act.dueDate).toLocaleDateString("pt-BR") : "Sem data"}</span>
                      {act.completedAt && (
                        <span className="text-emerald-600 font-semibold">
                          Concluída em: {new Date(act.completedAt).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </div>
                  </div>

                  {act.status === "PENDING" && (
                    <button
                      type="button"
                      onClick={() => handleCompleteActivity(act.id)}
                      className="px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Concluir
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal de Conversão em Cliente */}
        {showConvertModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-zinc-950">Converter Lead em Cliente</h3>
              </div>

              {convertError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                  {convertError}
                </div>
              )}

              <p className="text-xs text-zinc-600">
                A conversão transfere formalmente o lead para a base oficial de clientes, preservando todo o histórico comercial e oportunidades.
              </p>

              <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-700 block">Modo de Conversão</label>
                <div className="space-y-2">
                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-zinc-200 cursor-pointer hover:bg-zinc-50">
                    <input
                      type="radio"
                      name="convertMode"
                      value="NEW_CLIENT"
                      checked={convertMode === "NEW_CLIENT"}
                      onChange={() => setConvertMode("NEW_CLIENT")}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="text-xs font-bold text-zinc-900">Criar Novo Cliente</div>
                      <div className="text-[11px] text-zinc-500">
                        Cria um novo registro em Clientes com os dados atuais do lead.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-zinc-200 cursor-pointer hover:bg-zinc-50">
                    <input
                      type="radio"
                      name="convertMode"
                      value="LINK_EXISTING"
                      checked={convertMode === "LINK_EXISTING"}
                      onChange={() => setConvertMode("LINK_EXISTING")}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="text-xs font-bold text-zinc-900">Vincular a Cliente Existente</div>
                      <div className="text-[11px] text-zinc-500">
                        Conecta as oportunidades e histórico a um cliente já cadastrado.
                      </div>
                    </div>
                  </label>
                </div>

                {convertMode === "LINK_EXISTING" && (
                  <div className="pt-2">
                    <label className="text-xs font-semibold text-zinc-700 block mb-1">
                      Selecione o Cliente Existente:
                    </label>
                    <select
                      value={selectedClientId}
                      onChange={(e) => setSelectedClientId(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    >
                      <option value="">Selecione um cliente...</option>
                      {existingClients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.document ? `(${c.document})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowConvertModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-950 transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={converting || (convertMode === "LINK_EXISTING" && !selectedClientId)}
                  onClick={handleConvert}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs disabled:opacity-50"
                >
                  {converting ? "Convertendo..." : "Confirmar Conversão"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Nova Atividade */}
        {showActivityModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <form onSubmit={handleCreateActivity} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-zinc-950 border-b border-zinc-100 pb-2">
                Agendar Atividade Comercial
              </h3>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">Tipo de Atividade</label>
                <select
                  value={newActivity.activityType}
                  onChange={(e) => setNewActivity((prev) => ({ ...prev, activityType: e.target.value as any }))}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl"
                >
                  <option value="FOLLOW_UP">Follow-up</option>
                  <option value="CALL">Ligação Telefônica</option>
                  <option value="WHATSAPP">Mensagem WhatsApp</option>
                  <option value="MEETING">Reunião / Apresentação</option>
                  <option value="EMAIL">E-mail</option>
                  <option value="NOTE">Nota Interna</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">Título da Atividade *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Ligar para verificar recebimento da proposta"
                  value={newActivity.title}
                  onChange={(e) => setNewActivity((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">Data Prevista</label>
                <input
                  type="datetime-local"
                  value={newActivity.dueDate}
                  onChange={(e) => setNewActivity((prev) => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">Descrição</label>
                <textarea
                  rows={2}
                  placeholder="Detalhes ou pontos a abordar..."
                  value={newActivity.description}
                  onChange={(e) => setNewActivity((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowActivityModal(false)}
                  className="px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-950 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingActivity}
                  className="px-4 py-2 text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl disabled:opacity-50"
                >
                  {savingActivity ? "Salvando..." : "Salvar Atividade"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AppShell>
  );
}
