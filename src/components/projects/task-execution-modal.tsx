"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  X,
  Sparkles,
  Link as LinkIcon,
  Copy,
  ExternalLink,
  Check,
  ShieldCheck,
  Lock,
  Search,
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  FileText,
  User,
  Plus,
  Trash2,
  RefreshCw,
  Share2,
  Layers,
  Sliders,
  Send,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/whatsapp";
import { ProjectRecord, ProjectTaskRecord, TaskStatus, ProjectPriority } from "@/modules/projects/types";

interface TaskExecutionModalProps {
  task: ProjectTaskRecord | null;
  project: ProjectRecord;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated: () => void;
}

export function TaskExecutionModal({
  task,
  project,
  isOpen,
  onClose,
  onTaskUpdated,
}: TaskExecutionModalProps) {
  const [activeTab, setActiveTab] = useState<"EXECUTE" | "CHECKLIST" | "TIMES">("EXECUTE");

  // Briefing state
  const [briefingSession, setBriefingSession] = useState<any>(null);
  const [loadingBriefing, setLoadingBriefing] = useState<boolean>(false);
  const [briefingFeedback, setBriefingFeedback] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Form fields for Valdemar pre-fill
  const [companyName, setCompanyName] = useState<string>("");
  const [contactName, setContactName] = useState<string>("");
  const [websiteUrl, setWebsiteUrl] = useState<string>("");
  const [mapsUrl, setMapsUrl] = useState<string>("");
  const [instagramUrl, setInstagramUrl] = useState<string>("");
  const [initialNotes, setInitialNotes] = useState<string>("");
  const [competitorNotes, setCompetitorNotes] = useState<string>("");

  // Audit competitors state
  const [auditing, setAuditing] = useState<boolean>(false);
  const [auditReport, setAuditReport] = useState<string | null>(null);

  // Checklist state
  const [newChecklistText, setNewChecklistText] = useState<string>("");

  // Status and Priority update
  const [status, setStatus] = useState<TaskStatus>(task?.status || "TODO");
  const [priority, setPriority] = useState<ProjectPriority>(task?.priority || "MEDIUM");

  const taskId = task?.id;

  const loadBriefingSession = useCallback(async () => {
    if (!taskId) return;
    setLoadingBriefing(true);
    try {
      const res = await fetch(`/api/projects/tasks/${taskId}/briefing`);
      const json = await res.json();
      if (json.success && json.session) {
        setBriefingSession(json.session);
        setCompanyName(json.session.company_name || "");
        setContactName(json.session.contact_name || "");
        setWebsiteUrl(json.session.website_url || "");
        setMapsUrl(json.session.maps_url || "");
        setInstagramUrl(json.session.instagram_url || "");
        setInitialNotes(json.session.initial_notes || "");
        setCompetitorNotes(json.session.competitor_notes || "");
      }
    } catch (err) {
      console.error("Erro ao carregar briefing:", err);
    } finally {
      setLoadingBriefing(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (isOpen && task) {
      setStatus(task.status);
      setPriority(task.priority);
      if (
        task.title.toLowerCase().includes("briefing") ||
        task.title.toLowerCase().includes("acesso") ||
        task.title.toLowerCase().includes("auditar") ||
        task.title.toLowerCase().includes("estratégia") ||
        task.title.toLowerCase().includes("pilares")
      ) {
        loadBriefingSession();
      }
    }
  }, [isOpen, task, loadBriefingSession]);

  if (!isOpen || !task) return null;

  const titleLower = task.title.toLowerCase();
  const isBriefingTask = titleLower.includes("briefing");
  const isAccessTask = titleLower.includes("acesso") || titleLower.includes("redes sociais");
  const isAuditTask = titleLower.includes("auditar") || titleLower.includes("concorrente");
  const isStrategyTask = titleLower.includes("estratégia") || titleLower.includes("pilares");
  const isCalendarTask = titleLower.includes("calendário") || titleLower.includes("editorial");

  const briefingUrl = briefingSession?.token
    ? typeof window !== "undefined"
      ? `${window.location.origin}/briefing/${briefingSession.token}`
      : `/briefing/${briefingSession.token}`
    : "";

  const handleSavePreFill = async () => {
    setLoadingBriefing(true);
    setBriefingFeedback(null);
    try {
      const res = await fetch(`/api/projects/tasks/${task.id}/briefing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          contactName,
          websiteUrl,
          mapsUrl,
          instagramUrl,
          initialNotes,
          competitorNotes,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setBriefingSession(json.session);
        setBriefingFeedback("Dados prévios salvos! O link do briefing está pronto para envio.");
      } else {
        setBriefingFeedback("Erro ao salvar dados prévios.");
      }
    } catch {
      setBriefingFeedback("Erro na comunicação com o servidor.");
    } finally {
      setLoadingBriefing(false);
    }
  };

  const handleSyncToClientIdentity = async () => {
    setLoadingBriefing(true);
    setBriefingFeedback(null);
    try {
      const res = await fetch(`/api/projects/tasks/${task.id}/briefing/sync`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success) {
        setBriefingFeedback("Identidade do cliente sincronizada com sucesso e tarefa concluída!");
        onTaskUpdated();
        loadBriefingSession();
      } else {
        setBriefingFeedback(json.error || "Erro ao sincronizar.");
      }
    } catch {
      setBriefingFeedback("Erro interno ao sincronizar.");
    } finally {
      setLoadingBriefing(false);
    }
  };

  const handleRunAudit = async () => {
    setAuditing(true);
    setAuditReport(null);
    try {
      const res = await fetch(`/api/projects/tasks/${task.id}/audit-competitors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitors: competitorNotes }),
      });
      const json = await res.json();
      if (json.success) {
        setAuditReport(json.report);
        onTaskUpdated();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAuditing(false);
    }
  };

  const handleCopyLink = () => {
    if (!briefingUrl) return;
    navigator.clipboard.writeText(briefingUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleUpdateStatus = async (newStatus: TaskStatus) => {
    setStatus(newStatus);
    try {
      await fetch(`/api/projects/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      onTaskUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddChecklist = async () => {
    const text = newChecklistText.trim();
    if (!text) return;
    try {
      await fetch(`/api/projects/tasks/${task.id}/checklists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: text }),
      });
      setNewChecklistText("");
      onTaskUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleChecklist = async (checklistId: string, current: boolean) => {
    try {
      await fetch(`/api/projects/checklists/${checklistId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: !current }),
      });
      onTaskUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md border border-indigo-200">
              {task.taskNumber}
            </span>
            <div>
              <h3 className="font-bold text-slate-900 text-base leading-tight">{task.title}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Projeto: <span className="font-semibold text-slate-700">{project.name}</span>
                {project.clientName && ` • Cliente: ${project.clientName}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={status}
              onChange={(e) => handleUpdateStatus(e.target.value as TaskStatus)}
              className="text-xs font-semibold border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 shadow-2xs"
            >
              <option value="TODO">A Fazer</option>
              <option value="IN_PROGRESS">Em Andamento</option>
              <option value="IN_REVIEW">Em Revisão</option>
              <option value="DONE">Concluído</option>
              <option value="CANCELED">Cancelado</option>
            </select>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Tabs */}
        <div className="border-b border-slate-200 px-6 flex items-center gap-4 text-xs font-bold text-slate-600 bg-white">
          <button
            onClick={() => setActiveTab("EXECUTE")}
            className={`py-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === "EXECUTE"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent hover:text-slate-900"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Execução & Automações
          </button>
          <button
            onClick={() => setActiveTab("CHECKLIST")}
            className={`py-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === "CHECKLIST"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent hover:text-slate-900"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Checklist ({task.checklists?.length || 0})
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === "EXECUTE" && (
            <>
              {/* 1. CASO BRIEFING E IDENTIDADE VISUAL */}
              {isBriefingTask && (
                <div className="space-y-6">
                  {/* Shareable Link Card */}
                  <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/30 rounded-2xl p-4.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-800 text-sm font-bold">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        <span>Link Personalizado do Briefing Interativo com IA</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          briefingSession?.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : briefingSession?.status === "IN_PROGRESS"
                            ? "bg-amber-100 text-amber-800 border-amber-300"
                            : "bg-slate-100 text-slate-700 border-slate-300"
                        }`}
                      >
                        {briefingSession?.status === "COMPLETED"
                          ? "Briefing Concluído"
                          : briefingSession?.status === "IN_PROGRESS"
                          ? `Em Andamento (${briefingSession?.progress_percent || 0}%)`
                          : "Pendente de Envio"}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      Envie este link para o cliente abrir no celular via WhatsApp. A <strong>Sofia (IA da Otimizza)</strong>{" "}
                      vai guiar o cliente em uma conversa amigável com botões rápidos de aprovação.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                      <input
                        type="text"
                        readOnly
                        value={briefingUrl || "Gerando link..."}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 select-all"
                      />

                      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                        <button
                          type="button"
                          onClick={handleCopyLink}
                          disabled={!briefingUrl}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition"
                        >
                          {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedLink ? "Copiado!" : "Copiar"}
                        </button>

                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(
                            `Olá ${contactName || ""}! Aqui está seu link exclusivo de onboarding da Otimizza: ${briefingUrl}\n\nA Sofia, nossa especialista de IA, já está te esperando para montarmos o briefing das suas redes sociais com toda agilidade!`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition"
                        >
                          <WhatsAppIcon className="w-3.5 h-3.5" />
                          WhatsApp
                        </a>

                        <a
                          href={briefingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl transition"
                          title="Abrir e Testar Briefing"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Informações prévias pelo Valdemar */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                        Informações que o Valdemar já possui sobre o Cliente
                      </h4>
                      <span className="text-[11px] text-slate-500">
                        A IA lerá estes dados antes de falar com o cliente
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Nome da Empresa</label>
                        <input
                          type="text"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="Ex: RS Artigos para Móveis"
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Nome do Contato / Decisor</label>
                        <input
                          type="text"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          placeholder="Ex: Sérgio"
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Link do Site</label>
                        <input
                          type="text"
                          value={websiteUrl}
                          onChange={(e) => setWebsiteUrl(e.target.value)}
                          placeholder="https://suaempresa.com.br"
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Link do Google Maps</label>
                        <input
                          type="text"
                          value={mapsUrl}
                          onChange={(e) => setMapsUrl(e.target.value)}
                          placeholder="Link da ficha no Google Meu Negócio"
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block font-semibold text-slate-700 mb-1">Perfil do Instagram (@ ou Link)</label>
                        <input
                          type="text"
                          value={instagramUrl}
                          onChange={(e) => setInstagramUrl(e.target.value)}
                          placeholder="https://instagram.com/seuperfil"
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block font-semibold text-slate-700 mb-1">
                          Notas e Contexto Estratégico Prévio
                        </label>
                        <textarea
                          rows={3}
                          value={initialNotes}
                          onChange={(e) => setInitialNotes(e.target.value)}
                          placeholder="Descreva o que já foi conversado com o cliente, produtos principais, cidade de atuação e foco inicial..."
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      {briefingFeedback ? (
                        <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {briefingFeedback}
                        </span>
                      ) : (
                        <div />
                      )}

                      <button
                        type="button"
                        onClick={handleSavePreFill}
                        disabled={loadingBriefing}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition"
                      >
                        {loadingBriefing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        Salvar Informações Prévias
                      </button>
                    </div>
                  </div>

                  {/* Informações Coletadas pela Sofia (IA) */}
                  {briefingSession?.extracted_identity && Object.keys(briefingSession.extracted_identity).length > 0 && (
                    <div className="bg-gradient-to-r from-purple-50/60 to-white border border-purple-200 rounded-2xl p-4.5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-purple-900 text-xs font-bold uppercase tracking-wide">
                          <Sparkles className="w-4 h-4 text-purple-600" />
                          <span>Informações Coletadas e Estruturadas pela Sofia (IA)</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-300">
                          {briefingSession.status === "COMPLETED" ? "Briefing 100% Concluído" : "Em Andamento"}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {briefingSession.extracted_identity.differentials && (
                          <div className="p-3 bg-white rounded-xl border border-purple-100 space-y-1">
                            <span className="text-[10px] font-bold text-purple-600 uppercase">Diferenciais da Marca</span>
                            <p className="text-zinc-800 font-medium">{String(briefingSession.extracted_identity.differentials)}</p>
                          </div>
                        )}

                        {briefingSession.extracted_identity.targetAudience && (
                          <div className="p-3 bg-white rounded-xl border border-purple-100 space-y-1">
                            <span className="text-[10px] font-bold text-purple-600 uppercase">Público-Alvo Prioritário</span>
                            <p className="text-zinc-800 font-medium">{String(briefingSession.extracted_identity.targetAudience)}</p>
                          </div>
                        )}

                        {briefingSession.extracted_identity.toneOfVoice && (
                          <div className="p-3 bg-white rounded-xl border border-purple-100 space-y-1">
                            <span className="text-[10px] font-bold text-purple-600 uppercase">Tom de Voz Aprovado</span>
                            <p className="text-zinc-800 font-medium">
                              {Array.isArray(briefingSession.extracted_identity.toneOfVoice)
                                ? briefingSession.extracted_identity.toneOfVoice.join(", ")
                                : String(briefingSession.extracted_identity.toneOfVoice)}
                            </p>
                          </div>
                        )}

                        {briefingSession.extracted_identity.competitors && (
                          <div className="p-3 bg-white rounded-xl border border-purple-100 space-y-1">
                            <span className="text-[10px] font-bold text-purple-600 uppercase">Concorrentes Informados</span>
                            <p className="text-zinc-800 font-medium">{String(briefingSession.extracted_identity.competitors)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Sincronização direta com a Identidade do Cliente */}
                  <div className="border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs">Identidade do Cliente & Estúdio de Conteúdo</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Transfere automaticamente tom de voz, público e diferenciais coletados para a Identidade Oficial.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {project.clientId && (
                        <Link
                          href={`/clients/${project.clientId}/identity`}
                          target="_blank"
                          className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition"
                        >
                          Ver Identidade &rarr;
                        </Link>
                      )}

                      <button
                        type="button"
                        onClick={handleSyncToClientIdentity}
                        disabled={loadingBriefing}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition shadow-xs"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Sincronizar com ERP
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. CASO SOLICITAR ACESSOS ÀS REDES SOCIAIS */}
              {isAccessTask && (
                <div className="space-y-4">
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4.5 space-y-2.5">
                    <div className="flex items-center gap-2 text-amber-900 text-sm font-bold">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Integração com o Gerenciador de Senhas da Otimizza</span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      As senhas solicitadas ao cliente durante o briefing são criptografadas em <strong>AES-256</strong> e
                      armazenadas com a nomenclatura: <code>Instagram - {project.clientName || project.name}</code>.
                    </p>
                  </div>

                  <div className="p-4 border border-slate-200 rounded-2xl bg-slate-50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700">Status no Cofre:</span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          briefingSession?.credentials_saved
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {briefingSession?.credentials_saved ? "✅ Salvo no Cofre de Senhas" : "Aguardando Envio"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <Link
                        href="/passwords"
                        target="_blank"
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition"
                      >
                        <Lock className="w-3.5 h-3.5 text-emerald-400" />
                        Abrir Gerenciador de Senhas
                      </Link>

                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(
                          `Olá! Para podermos realizar as configurações e programações do Instagram da ${project.clientName || project.name}, você poderia nos enviar o usuário e senha de acesso? Seus dados são salvos com total segurança em nosso cofre criptografado.`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl transition"
                      >
                        <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600" />
                        Pedir via WhatsApp
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. CASO AUDITAR PERFIS E ANALISAR CONCORRENTES */}
              {isAuditTask && (
                <div className="space-y-4">
                  <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4.5 space-y-2">
                    <div className="flex items-center gap-2 text-indigo-900 text-sm font-bold">
                      <Search className="w-4 h-4 text-indigo-600" />
                      <span>Auditoria Competitiva com Inteligência Otimizza</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      A IA analisa as referências e concorrentes do nicho para identificar vulnerabilidades e sugerir
                      ângulos de diferenciação imediata.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Concorrentes ou Referências a Auditar:
                    </label>
                    <input
                      type="text"
                      value={competitorNotes}
                      onChange={(e) => setCompetitorNotes(e.target.value)}
                      placeholder="Ex: @concorrente_a, @concorrente_b, lojas da cidade X"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleRunAudit}
                    disabled={auditing}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition"
                  >
                    {auditing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {auditing ? "Auditando Concorrentes..." : "Gerar Diagnóstico Competitivo com IA"}
                  </button>

                  {auditReport && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 text-xs text-slate-800 space-y-2 shadow-xs">
                      <div className="whitespace-pre-wrap">{auditReport}</div>
                    </div>
                  )}
                </div>
              )}

              {/* 4. CASO DEFINIR ESTRATÉGIA E PILARES DE CONTEÚDO */}
              {isStrategyTask && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-indigo-500/10 to-teal-500/10 border border-indigo-200 rounded-2xl p-4 space-y-2">
                    <h4 className="font-bold text-slate-900 text-xs">Os 4 Pilares Estratégicos de Conteúdo da Otimizza</h4>
                    <p className="text-xs text-slate-600">
                      Conecte estes pilares diretamente ao Estúdio de Criação de Conteúdo e aos Funis de Marketing.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-bold text-indigo-700 block mb-0.5">1. Autoridade & Bastidores</span>
                      <p className="text-slate-600 text-[11px]">
                        Mostrar rigor técnico, processos de entrega e por que a marca é confiável.
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-bold text-teal-700 block mb-0.5">2. Educativo & Dicas de Ouro</span>
                      <p className="text-slate-600 text-[11px]">
                        Ensinar o cliente a resolver problemas e evitar erros comuns do mercado.
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-bold text-emerald-700 block mb-0.5">3. Prova Social & Resultados</span>
                      <p className="text-slate-600 text-[11px]">
                        Depoimentos, transformações reais e demonstração de valor prático.
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-bold text-amber-700 block mb-0.5">4. Conversão Direta & CTA</span>
                      <p className="text-slate-600 text-[11px]">
                        Oferta direta para iniciar conversa comercial no WhatsApp com diagnóstico.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center gap-2">
                    <Link
                      href="/prompt-creator"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Abrir no Estúdio de Conteúdo
                    </Link>

                    <Link
                      href="/marketing/funnels"
                      className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition"
                    >
                      <Layers className="w-3.5 h-3.5 text-indigo-600" />
                      Ver nos Funis de Marketing
                    </Link>
                  </div>
                </div>
              )}

              {/* 5. CASO CRIAR CALENDÁRIO EDITORIAL */}
              {isCalendarTask && (
                <div className="space-y-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                    <h4 className="font-bold text-slate-900 text-xs">Produção e Calendário de Conteúdo</h4>
                    <p className="text-xs text-slate-600">
                      Acesse as ferramentas de criação de prompts e feed planejado para este cliente.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <Link
                      href="/prompt-creator"
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-xs"
                    >
                      <Sparkles className="w-4 h-4" />
                      Criar Prompts & Roteiros
                    </Link>

                    <Link
                      href="/prompt-creator/saved"
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-xl transition shadow-2xs"
                    >
                      <Calendar className="w-4 h-4 text-indigo-600" />
                      Ver Feed & Posts Salvos
                    </Link>
                  </div>
                </div>
              )}

              {/* Informações Gerais da Tarefa */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <span className="text-xs font-semibold text-slate-700 block">Descrição e Escopo da Tarefa</span>
                <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed whitespace-pre-wrap">
                  {task.description || "Nenhuma descrição detalhada informada para esta tarefa."}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Prioridade:</span>
                    <span className="font-semibold text-slate-700 mt-0.5 block">{priority}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Prazo:</span>
                    <span className="font-semibold text-slate-700 mt-0.5 block">{task.dueDate || "-"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Horas Estimadas:</span>
                    <span className="font-semibold text-slate-700 mt-0.5 block">{task.estimatedHours || 1}h</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === "CHECKLIST" && (
            <div className="space-y-4">
              <div className="space-y-2">
                {task.checklists?.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleToggleChecklist(item.id, item.isCompleted)}
                    className="flex items-center gap-2.5 p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer border border-slate-200 transition text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={item.isCompleted}
                      onChange={() => {}}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span
                      className={`flex-1 text-slate-800 ${
                        item.isCompleted ? "line-through text-slate-400" : ""
                      }`}
                    >
                      {item.title}
                    </span>
                  </div>
                ))}

                {(!task.checklists || task.checklists.length === 0) && (
                  <p className="text-xs text-slate-400 text-center py-6">
                    Nenhum item no checklist ainda.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Novo item de checklist..."
                  value={newChecklistText}
                  onChange={(e) => setNewChecklistText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddChecklist();
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleAddChecklist}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition"
                >
                  Adicionar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Atualizado em: {new Date(task.updatedAt).toLocaleDateString("pt-BR")}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
