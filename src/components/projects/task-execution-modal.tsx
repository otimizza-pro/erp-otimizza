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
  Edit2,
  RotateCcw,
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

function formatDateBR(dateStr?: string | null): string {
  if (!dateStr) return "-";
  try {
    const raw = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
    const parts = raw.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
  } catch {
    return dateStr;
  }
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
  const [briefingSession, setBriefingSession] = useState<{token?:string;status?:string;progress_percent?:number;project_id?:string;company_name?:string;contact_name?:string;credentials_saved?:boolean;extracted_identity?:{targetAudience?:string;differentials?:string;toneOfVoice?:string|string[];competitors?:string};conversation_history?:{sender:string;content?:string;text?:string;timestamp?:string}[]}|null>(null);
  const [clientIdentity, setClientIdentity] = useState<Record<string, unknown> | null>(null);
  const [loadingBriefing, setLoadingBriefing] = useState<boolean>(false);
  const [briefingFeedback, setBriefingFeedback] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Form fields for team pre-fill
  const [companyName, setCompanyName] = useState<string>("");
  const [contactName, setContactName] = useState<string>("");
  const [websiteUrl, setWebsiteUrl] = useState<string>("");
  const [mapsUrl, setMapsUrl] = useState<string>("");
  const [instagramUrl, setInstagramUrl] = useState<string>("");
  const [initialNotes, setInitialNotes] = useState<string>("");
  const [competitorNotes, setCompetitorNotes] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [servicesOffered, setServicesOffered] = useState<string>("");
  const [resettingChat, setResettingChat] = useState<boolean>(false);

  // Audit competitors state
  const [auditing, setAuditing] = useState<boolean>(false);
  const [auditReport, setAuditReport] = useState<string | null>(null);

  // Checklist state
  const [newChecklistText, setNewChecklistText] = useState<string>("");

  // Status and Priority update
  const [status, setStatus] = useState<TaskStatus>(task?.status || "TODO");
  const [priority, setPriority] = useState<ProjectPriority>(task?.priority || "MEDIUM");

  // Editable Briefing & Strategy Fields
  const [isEditingStrategy, setIsEditingStrategy] = useState<boolean>(false);
  const [briefingToneOfVoice, setBriefingToneOfVoice] = useState<string>("");
  const [briefingDifferentials, setBriefingDifferentials] = useState<string>("");
  const [briefingTargetAudience, setBriefingTargetAudience] = useState<string>("");
  const [briefingCompetitors, setBriefingCompetitors] = useState<string>("");
  const [savingStrategy, setSavingStrategy] = useState<boolean>(false);

  const taskId = task?.id;

  const loadBriefingSession = useCallback(async () => {
    if (!taskId) return;
    setLoadingBriefing(true);
    try {
      const res = await fetch(`/api/projects/tasks/${taskId}/briefing`);
      const json = await res.json();
      if (json.success && json.session) {
        setBriefingSession(json.session);
        setCompanyName(json.session.company_name || project.clientName || project.name || "");
        setContactName(json.session.contact_name || project.clientName || "Decisor");
        setWebsiteUrl(json.session.website_url || "");
        setMapsUrl(json.session.maps_url || "");
        setInstagramUrl(json.session.instagram_url || "");
        setInitialNotes(json.session.initial_notes || "");
        setCompetitorNotes(json.session.competitor_notes || "");
        if (json.clientIdentity) {
          setClientIdentity(json.clientIdentity);
        }

        const ext = json.session.extracted_identity || {};
        const clientExt = json.clientIdentity || {};
        const audiencesList = Array.isArray(json.audiences) ? json.audiences : [];

        setCategory(json.category || ext.marketNiche || clientExt.market_niche || "");
        setServicesOffered(json.servicesOffered || ext.valueProposition || clientExt.value_proposition || "");

        setBriefingToneOfVoice(
          Array.isArray(ext.toneOfVoice) && ext.toneOfVoice.length > 0
            ? ext.toneOfVoice.join(", ")
            : (Array.isArray(clientExt.tone_of_voice) && clientExt.tone_of_voice.length > 0
                ? clientExt.tone_of_voice.join(", ")
                : (ext.toneOfVoice || "Direto, especialista e focado em resultados reais"))
        );
        setBriefingDifferentials(
          ext.differentials || (Array.isArray(clientExt.differentials) ? clientExt.differentials.join("\n") : "")
        );
        const audienceSummary = audiencesList.length > 0
          ? audiencesList.map((a: { name: string; description?: string }) => `${a.name}${a.description ? `: ${a.description}` : ""}`).join("\n")
          : (ext.targetAudience || (Array.isArray(clientExt.target_audiences) ? clientExt.target_audiences.join("\n") : ""));
        setBriefingTargetAudience(audienceSummary);
        setBriefingCompetitors(
          ext.competitors || json.session.competitor_notes || ""
        );
      }
    } catch (err) {
      console.error("Erro ao carregar briefing:", err);
    } finally {
      setLoadingBriefing(false);
    }
  }, [taskId, project.clientName, project.name]);

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

  const isLinkUnlocked = !!(category.trim() && servicesOffered.trim());

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
          category,
          servicesOffered,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setBriefingSession(json.session);
        setBriefingFeedback("Dados prévios salvos! As informações de nicho foram registradas.");
        setTimeout(() => setBriefingFeedback(null), 4000);
      } else {
        setBriefingFeedback("Erro ao salvar dados prévios.");
      }
    } catch {
      setBriefingFeedback("Erro na comunicação com o servidor.");
    } finally {
      setLoadingBriefing(false);
    }
  };

  const handleResetBriefing = async () => {
    if (!confirm("Deseja realmente reiniciar o chat da Edivânia para este cliente? Todo o histórico de conversa do briefing voltará ao início.")) return;
    setResettingChat(true);
    setBriefingFeedback(null);
    try {
      const res = await fetch(`/api/projects/tasks/${task.id}/briefing/reset`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setBriefingSession(json.session);
        setBriefingFeedback("Chat da Edivânia reiniciado com sucesso! A conversa foi resetada para o início.");
        loadBriefingSession();
        setTimeout(() => setBriefingFeedback(null), 4000);
      } else {
        setBriefingFeedback(json.error || "Erro ao resetar chat.");
      }
    } catch {
      setBriefingFeedback("Erro na comunicação com o servidor.");
    } finally {
      setResettingChat(false);
    }
  };

  const handleSaveStrategy = async () => {
    if (!task?.id) return;
    setSavingStrategy(true);
    setBriefingFeedback(null);
    try {
      const res = await fetch(`/api/projects/tasks/${task.id}/briefing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          extractedIdentity: {
            toneOfVoice: briefingToneOfVoice,
            differentials: briefingDifferentials,
            targetAudience: briefingTargetAudience,
            competitors: briefingCompetitors,
          },
        }),
      });
      const json = await res.json();
      if (json.success) {
        setBriefingSession(json.session);
        setIsEditingStrategy(false);
        setBriefingFeedback("Informações de copy e estratégia salvas com sucesso!");
        onTaskUpdated();
        setTimeout(() => setBriefingFeedback(null), 4000);
      } else {
        setBriefingFeedback(json.error || "Erro ao salvar informações estratégicas.");
      }
    } catch {
      setBriefingFeedback("Erro na comunicação com o servidor.");
    } finally {
      setSavingStrategy(false);
    }
  };

  const handleSyncToClientIdentity = async () => {
    setLoadingBriefing(true);
    setBriefingFeedback(null);
    try {
      const res = await fetch(`/api/projects/tasks/${task.id}/briefing/sync`, {
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
                  <div className="bg-white border border-zinc-200 rounded-xl p-4.5 space-y-3 shadow-hourline">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-zinc-950 text-sm font-semibold">
                        <Sparkles className="w-4 h-4 text-zinc-700" />
                        <span>Link Personalizado do Briefing com IA (Edivânia)</span>
                      </div>
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded border ${
                          briefingSession?.status === "COMPLETED"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                            : briefingSession?.status === "IN_PROGRESS"
                            ? "bg-amber-50 text-amber-800 border-amber-300"
                            : "bg-zinc-100 text-zinc-700 border-zinc-300"
                        }`}
                      >
                        {briefingSession?.status === "COMPLETED"
                          ? "Briefing Concluído"
                          : briefingSession?.status === "IN_PROGRESS"
                          ? `Em Andamento (${briefingSession?.progress_percent || 0}%)`
                          : "Pendente de Envio"}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-600 leading-relaxed">
                      Envie este link para o cliente abrir no celular via WhatsApp. A <strong>Edivânia (IA Estrategista da Otimizza)</strong>{" "}
                      vai guiar o cliente em uma conversa tranquila, com exemplos reais adaptados ao nicho dele e botões rápidos.
                    </p>

                    {!isLinkUnlocked && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-900">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold block">Link Bloqueado: Preenchimento do Nicho Obrigatório</span>
                          <span className="text-[11px] text-amber-800">
                            Para liberar o link e garantir que a Edivânia converse com exemplos práticos do negócio, preencha a <strong>Categoria</strong> e <strong>O que ele vende / Serviços Principais</strong> no formulário abaixo e clique em &quot;Salvar Informações Prévias&quot;.
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                      <input
                        type="text"
                        readOnly
                        value={
                          !isLinkUnlocked
                            ? "🔒 Preencha a Categoria e O que ele vende abaixo para liberar o link"
                            : loadingBriefing
                            ? "Gerando link exclusivo..."
                            : briefingUrl || "Clique em 'Salvar Informações Prévias' abaixo para gerar o link"
                        }
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs font-mono text-zinc-700 select-all"
                      />

                      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 flex-wrap">
                        <button
                          type="button"
                          onClick={handleCopyLink}
                          disabled={!briefingUrl || !isLinkUnlocked}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-950 hover:bg-zinc-800 disabled:opacity-40 text-white rounded-lg text-xs font-medium transition"
                        >
                          {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedLink ? "Copiado!" : "Copiar"}
                        </button>

                        <a
                          href={isLinkUnlocked ? `https://wa.me/?text=${encodeURIComponent(
                            `Olá ${contactName || ""}! Aqui está seu link exclusivo de onboarding da Otimizza: ${briefingUrl}\n\nA Edivânia, nossa estrategista de IA, já está te esperando para batermos um papo tranquilo sobre o posicionamento e os conteúdos das suas redes sociais!`
                          )}` : "#"}
                          onClick={(e) => {
                            if (!isLinkUnlocked) {
                              e.preventDefault();
                              alert("Preencha a Categoria e O que ele vende abaixo para liberar o envio pelo WhatsApp.");
                            }
                          }}
                          target={isLinkUnlocked ? "_blank" : undefined}
                          rel="noreferrer"
                          className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 text-white rounded-lg text-xs font-medium transition ${
                            isLinkUnlocked ? "bg-emerald-600 hover:bg-emerald-700" : "bg-emerald-600/40 cursor-not-allowed"
                          }`}
                        >
                          <WhatsAppIcon className="w-3.5 h-3.5" />
                          WhatsApp
                        </a>

                        <a
                          href={isLinkUnlocked ? briefingUrl : "#"}
                          onClick={(e) => {
                            if (!isLinkUnlocked) {
                              e.preventDefault();
                              alert("Preencha a Categoria e O que ele vende abaixo para abrir o chat.");
                            }
                          }}
                          target={isLinkUnlocked ? "_blank" : undefined}
                          rel="noreferrer"
                          className={`p-2 border border-zinc-200 rounded-lg transition ${
                            isLinkUnlocked ? "hover:bg-zinc-50 text-zinc-700" : "text-zinc-300 cursor-not-allowed"
                          }`}
                          title="Abrir e Testar Briefing"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>

                        <button
                          type="button"
                          onClick={handleResetBriefing}
                          disabled={resettingChat || !briefingSession}
                          className="inline-flex items-center gap-1.5 px-2.5 py-2 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-medium transition disabled:opacity-40"
                          title="Reiniciar chat da Edivânia e limpar histórico para recomeçar do zero"
                        >
                          <RotateCcw className={`w-3.5 h-3.5 ${resettingChat ? "animate-spin" : ""}`} />
                          Resetar Chat
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Informações prévias pelo Valdemar */}
                  <div className="bg-white border border-zinc-200 rounded-xl p-4.5 space-y-4 shadow-hourline">
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
                      <h4 className="font-semibold text-zinc-950 text-xs">
                        1. Informações Base do Cliente (Cadastro & Presença Digital)
                      </h4>
                      <span className="text-[11px] text-zinc-400">
                        Base cadastral permanente da empresa no ERP
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {/* DADOS DE NICHO OBRIGATÓRIOS PARA LIBERAÇÃO DO LINK */}
                      <div className="sm:col-span-2 p-3 bg-zinc-50/80 border border-zinc-200 rounded-lg space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-950">
                            <Sparkles className="w-3.5 h-3.5 text-zinc-700" />
                            <span>Contexto do Negócio para Personalização da Edivânia</span>
                          </div>
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Obrigatórios para liberar o link
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block font-medium text-zinc-700 mb-1">
                              Categoria / Nicho de Atuação *
                            </label>
                            <textarea
                              rows={3}
                              value={category}
                              onChange={(e) => setCategory(e.target.value)}
                              placeholder="Ex: Fisioterapia e Reabilitação, Marcenaria de Alto Padrão..."
                              className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-zinc-500 font-medium leading-relaxed resize-y min-h-[72px]"
                            />
                          </div>

                          <div>
                            <label className="block font-medium text-zinc-700 mb-1">
                              O que ele vende / Serviços Principais *
                            </label>
                            <textarea
                              rows={3}
                              value={servicesOffered}
                              onChange={(e) => setServicesOffered(e.target.value)}
                              placeholder="Ex: Sessões individuais de fisioterapia, tratamento de dor na coluna..."
                              className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-zinc-500 font-medium leading-relaxed resize-y min-h-[72px]"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block font-medium text-zinc-700 mb-1">Nome da Empresa</label>
                        <input
                          type="text"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="Ex: RS Artigos para Móveis"
                          className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-zinc-500 font-medium"
                        />
                      </div>

                      <div>
                        <label className="block font-medium text-zinc-700 mb-1">Nome do Contato / Decisor</label>
                        <input
                          type="text"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          placeholder="Ex: Sérgio"
                          className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-zinc-500 font-medium"
                        />
                      </div>

                      <div>
                        <label className="block font-medium text-zinc-700 mb-1">Link do Site</label>
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
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold transition"
                      >
                        {loadingBriefing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        Salvar Informações Prévias
                      </button>
                    </div>
                  </div>

                  {/* Informações Coletadas pela Edivânia (IA) organizadas por Domínio */}
                  <div className="space-y-4">
                    {/* 2. DIRETRIZES PARA HEADLINES & COPYWRITING (EDITÁVEL) */}
                    <div className="bg-white border border-zinc-200 rounded-xl p-4.5 space-y-3 shadow-hourline">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-zinc-700 shrink-0" />
                          <h4 className="text-xs font-semibold text-zinc-950">
                            2. Informações para construção de headlines & copywriting
                          </h4>
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => setIsEditingStrategy(!isEditingStrategy)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-700 transition"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-zinc-500" />
                            {isEditingStrategy ? "Cancelar Edição" : "Editar Informações"}
                          </button>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200">
                            Texto & Estratégia
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-zinc-500">
                        Dados utilizados pela IA para gerar ganchos de retenção, headlines de alto impacto e legendas persuasivas. Você pode editar diretamente qualquer um dos campos abaixo.
                      </p>

                      {isEditingStrategy ? (
                        <div className="space-y-3 pt-1">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="space-y-1">
                              <label className="text-[11px] font-medium text-zinc-700 block">Tom de voz aprovado</label>
                              <input
                                type="text"
                                value={briefingToneOfVoice}
                                onChange={(e) => setBriefingToneOfVoice(e.target.value)}
                                placeholder="Ex: Direto, especialista e focado em resultados reais"
                                className="w-full text-xs font-medium border border-zinc-300 rounded-lg p-2.5 bg-white text-zinc-900 focus:outline-none focus:border-zinc-500"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[11px] font-medium text-zinc-700 block">Concorrentes ou referências</label>
                              <input
                                type="text"
                                value={briefingCompetitors}
                                onChange={(e) => setBriefingCompetitors(e.target.value)}
                                placeholder="Ex: @concorrente1, @referencia2"
                                className="w-full text-xs font-medium border border-zinc-300 rounded-lg p-2.5 bg-white text-zinc-900 focus:outline-none focus:border-zinc-500"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[11px] font-medium text-zinc-700 block">Diferenciais da marca</label>
                              <textarea
                                rows={3}
                                value={briefingDifferentials}
                                onChange={(e) => setBriefingDifferentials(e.target.value)}
                                placeholder="Ex: Metodologia estruturada, atendimento humanizado, correção postural avançada..."
                                className="w-full text-xs font-medium border border-zinc-300 rounded-lg p-2.5 bg-white text-zinc-900 focus:outline-none focus:border-zinc-500 resize-none"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[11px] font-medium text-zinc-700 block">Público-alvo prioritário (ICP)</label>
                              <textarea
                                rows={3}
                                value={briefingTargetAudience}
                                onChange={(e) => setBriefingTargetAudience(e.target.value)}
                                placeholder="Ex: Pessoas com dor muscular ou lesões, jovens para correção postural..."
                                className="w-full text-xs font-medium border border-zinc-300 rounded-lg p-2.5 bg-white text-zinc-900 focus:outline-none focus:border-zinc-500 resize-none"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                            <button
                              type="button"
                              onClick={() => setIsEditingStrategy(false)}
                              className="px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={handleSaveStrategy}
                              disabled={savingStrategy}
                              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-medium transition disabled:opacity-50"
                            >
                              {savingStrategy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                              Salvar Alterações de Estratégia
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div className="p-3 bg-zinc-50/70 rounded-lg border border-zinc-200 space-y-1">
                            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">Tom de Voz Aprovado</span>
                            <p className="text-zinc-900 font-medium">
                              {briefingToneOfVoice || "Direto, especialista e focado em resultados reais"}
                            </p>
                          </div>

                          <div className="p-3 bg-zinc-50/70 rounded-lg border border-zinc-200 space-y-1">
                            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">Diferenciais da Marca</span>
                            <p className="text-zinc-900 font-medium">
                              {briefingDifferentials || "Velocidade na entrega, atendimento direto e resultados mensuráveis"}
                            </p>
                          </div>

                          <div className="p-3 bg-zinc-50/70 rounded-lg border border-zinc-200 space-y-1">
                            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">Público-Alvo Prioritário (ICP)</span>
                            <p className="text-zinc-900 font-medium">
                              {briefingTargetAudience || "Clientes qualificados buscando soluções completas"}
                            </p>
                          </div>

                          <div className="p-3 bg-zinc-50/70 rounded-lg border border-zinc-200 space-y-1">
                            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">Concorrentes Informados</span>
                            <p className="text-zinc-900 font-medium">
                              {briefingCompetitors || competitorNotes || "Mapeamento em andamento no Estúdio de Estratégia"}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 3. DIRETRIZES VISUAIS PARA PROMPTS DE IMAGEM */}
                    <div className="bg-white border border-zinc-200 rounded-xl p-4.5 space-y-3 shadow-hourline">
                      <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-zinc-700" />
                          <h4 className="text-xs font-semibold text-zinc-950">
                            3. Informações para construção do prompt para imagem
                          </h4>
                        </div>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200">
                          Diretrizes Visuais
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500">
                        Diretrizes estéticas aplicadas exclusivamente na geração de prompts visuais, renders e criativos.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 bg-zinc-50/70 rounded-lg border border-zinc-200 space-y-1">
                          <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">Proporção / Aspect Ratio Padrão</span>
                          <p className="text-zinc-900 font-medium">Feed Vertical 4:5 (1080x1350) & Stories 9:16 (1080x1920)</p>
                          <p className="text-[10px] text-zinc-400">Otimizado para máxima ocupação de tela nos smartphones.</p>
                        </div>

                        <div className="p-3 bg-zinc-50/70 rounded-lg border border-zinc-200 space-y-1">
                          <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">Estilo Visual & Iluminação</span>
                          <p className="text-zinc-900 font-medium">Fotografia profissional de alta qualidade, iluminação suave comercial, render limpo e sofisticado.</p>
                        </div>

                        <div className="p-3 bg-zinc-50/70 rounded-lg border border-zinc-200 space-y-1 sm:col-span-2">
                          <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">Regras de Exclusão (Negative Prompts)</span>
                          <p className="text-zinc-600 text-[11px]">
                            Sem mãos deformadas, sem textos borrados ou ilegíveis dentro da imagem, sem poluição visual, sem logos de terceiros conflitantes.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

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
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold transition"
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
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl transition"
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
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold rounded-xl transition shadow-xs"
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
                    <span className="font-semibold text-slate-700 mt-0.5 block">{formatDateBR(task.dueDate)}</span>
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
                  className="px-3.5 py-2 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold transition"
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
