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
  Building2,
  Package,
  Tag,
  Briefcase,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/whatsapp";
import { ProjectRecord, ProjectTaskRecord, TaskStatus, ProjectPriority } from "@/modules/projects/types";
import { toast } from "@/components/ui/toast-provider";
import { confirmAction } from "@/components/ui/confirm-dialog";

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
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [editingChecklistTitle, setEditingChecklistTitle] = useState<string>("");
  const [savingChecklistId, setSavingChecklistId] = useState<string | null>(null);

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

  // CNPJ e CNAE Inteligente
  const [cnpj, setCnpj] = useState<string>("");
  const [cnaeCode, setCnaeCode] = useState<string>("");
  const [cnaeDescription, setCnaeDescription] = useState<string>("");
  const [searchingCnpj, setSearchingCnpj] = useState<boolean>(false);

  // Campos Separados de Contexto Estratégico Prévio
  const [brandHistory, setBrandHistory] = useState<string>("");
  const [corePromise, setCorePromise] = useState<string>("");
  const [nonNegotiables, setNonNegotiables] = useState<string>("");
  const [salesObjections, setSalesObjections] = useState<string>("");

  // Catálogo Estruturado de Serviços & Produtos
  interface CatalogItemDraft {
    id?: string;
    type: "SERVICE" | "PRODUCT";
    name: string;
    description: string;
    differentials: string;
    deliverables: string;
    target_pain_points: string;
    solution_approach: string;
  }
  const [catalogItems, setCatalogItems] = useState<CatalogItemDraft[]>([]);
  const [isAddingItem, setIsAddingItem] = useState<boolean>(false);
  const [draftItem, setDraftItem] = useState<CatalogItemDraft>({
    type: "SERVICE",
    name: "",
    description: "",
    differentials: "",
    deliverables: "",
    target_pain_points: "",
    solution_approach: "",
  });

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
    setBriefingSession(null);
    setCatalogItems([]);
    setClientIdentity(null);
    try {
      const res = await fetch(`/api/projects/tasks/${taskId}/briefing`);
      const json = await res.json();
      if (json.success && json.session) {
        const clientExt = json.clientIdentity || {};
        const ext = json.session.extracted_identity || {};
        const audiencesList = Array.isArray(json.audiences) ? json.audiences : [];

        const normalizedInstagram = clientExt.instagram_handle
          ? (String(clientExt.instagram_handle).startsWith("http")
              ? String(clientExt.instagram_handle)
              : `https://instagram.com/${String(clientExt.instagram_handle).replace(/^@/, "")}`)
          : (json.session.instagram_url || "");

        setBriefingSession(json.session);
        setCompanyName(json.session.company_name || project.clientName || project.name || "");
        setContactName(json.session.contact_name || project.clientName || "Decisor");
        setWebsiteUrl(clientExt.website_url || json.session.website_url || "");
        setMapsUrl(json.session.maps_url || "");
        setInstagramUrl(normalizedInstagram);
        setInitialNotes(json.session.initial_notes || "");
        setCompetitorNotes(json.session.competitor_notes || "");
        setCnpj(json.cnpj || json.session.cnpj || "");
        setCnaeCode(json.cnaeCode || json.session.cnae_code || "");
        setCnaeDescription(json.cnaeDescription || json.session.cnae_description || "");
        setBrandHistory(clientExt.brand_history || json.brandHistory || json.session.brand_history || "");
        setCorePromise(clientExt.core_promise || json.corePromise || json.session.core_promise || "");
        setNonNegotiables(json.nonNegotiables || json.session.non_negotiables || "");
        setSalesObjections(clientExt.sales_objections || json.salesObjections || json.session.sales_objections || "");

        if (Array.isArray(json.catalogItems) && json.catalogItems.length > 0) {
          setCatalogItems(json.catalogItems);
        } else if (Array.isArray(json.session.catalog_items) && json.session.catalog_items.length > 0) {
          setCatalogItems(json.session.catalog_items);
        } else {
          setCatalogItems([]);
        }

        if (json.clientIdentity) {
          setClientIdentity(json.clientIdentity);
        } else {
          setClientIdentity(null);
        }

        setCategory(clientExt.market_niche || json.category || ext.marketNiche || "");
        setServicesOffered(clientExt.value_proposition || json.servicesOffered || ext.valueProposition || "");

        setBriefingToneOfVoice(
          Array.isArray(clientExt.tone_of_voice) && clientExt.tone_of_voice.length > 0
            ? clientExt.tone_of_voice.join(", ")
            : (Array.isArray(ext.toneOfVoice) && ext.toneOfVoice.length > 0
                ? ext.toneOfVoice.join(", ")
                : (ext.toneOfVoice || "Direto, especialista e focado em resultados reais"))
        );
        setBriefingDifferentials(
          Array.isArray(clientExt.differentials) && clientExt.differentials.length > 0
            ? clientExt.differentials.join("\n")
            : (ext.differentials || "")
        );
        const audienceSummary = audiencesList.length > 0
          ? audiencesList.map((a: { name: string; description?: string }) => `${a.name}${a.description ? `: ${a.description}` : ""}`).join("\n")
          : (Array.isArray(clientExt.target_audiences) && clientExt.target_audiences.length > 0
              ? clientExt.target_audiences.join("\n")
              : (ext.targetAudience || ""));
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

  const isLinkUnlocked = true;

  const briefingUrl = briefingSession?.token
    ? typeof window !== "undefined"
      ? `${window.location.origin}/briefing/${briefingSession.token}`
      : `/briefing/${briefingSession.token}`
    : "";

  const handleLookupCnpj = async () => {
    const clean = (cnpj || "").replace(/\D/g, "");
    if (clean.length !== 14) {
      setBriefingFeedback("Informe um CNPJ válido com 14 dígitos.");
      return;
    }
    setSearchingCnpj(true);
    setBriefingFeedback(null);
    try {
      const res = await fetch(`/api/cnpj/${clean}`);
      const json = await res.json();
      if (json.success && json.data) {
        if (json.data.tradeName && (!companyName || companyName === "Empresa")) {
          setCompanyName(json.data.tradeName);
        }
        if (json.data.suggestedCategory) {
          setCategory(json.data.suggestedCategory);
        }
        setCnaeCode(json.data.cnaeCode || "");
        setCnaeDescription(json.data.cnaeDescription || "");
        setBriefingFeedback("CNPJ consultado com sucesso! Categoria e CNAE sincronizados.");
        setTimeout(() => setBriefingFeedback(null), 4000);
      } else {
        setBriefingFeedback(json.error || "Não foi possível consultar os dados do CNPJ.");
      }
    } catch {
      setBriefingFeedback("Erro na comunicação com o serviço de CNPJ.");
    } finally {
      setSearchingCnpj(false);
    }
  };

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
          cnpj,
          cnaeCode,
          cnaeDescription,
          brandHistory,
          corePromise,
          nonNegotiables,
          salesObjections,
          catalogItems,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setBriefingSession(json.session);
        setBriefingFeedback("Dados salvos com sucesso! Catálogo e contexto estratégico sincronizados.");
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
    if (!(await confirmAction({ title: "Reiniciar chat da Edivânia", message: "Deseja realmente reiniciar o chat da Edivânia para este cliente? Todo o histórico de conversa do briefing voltará ao início.", confirmLabel: "Reiniciar chat", tone: "danger" }))) return;
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
          marketNiche: category,
          valueProposition: servicesOffered,
          brandHistory,
          corePromise,
          salesObjections,
          toneOfVoice: briefingToneOfVoice,
          differentials: briefingDifferentials,
          targetAudience: briefingTargetAudience,
          competitors: briefingCompetitors,
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
      const res = await fetch(`/api/projects/tasks/${task.id}/briefing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitorNotes }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setBriefingFeedback(json.error || "Não foi possível salvar os concorrentes informados.");
        return;
      }
      const list = competitorNotes
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
      setAuditReport(
        list.length > 0
          ? `Concorrentes registrados para monitoramento no DNA do cliente (${list.length}): ${list.join(", ")}. Utilize a aba Estratégia da Marca para cruzar diferenciais e objeções.`
          : "Nenhum concorrente informado. Liste perfis ou nomes separados por vírgula para registrar no histórico da marca."
      );
      onTaskUpdated();
    } catch (err) {
      console.error(err);
      setBriefingFeedback("Erro ao registrar concorrentes da tarefa.");
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
    const previousStatus = status;
    setStatus(newStatus);
    try {
      const res = await fetch(`/api/projects/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setStatus(previousStatus);
        setBriefingFeedback(json.error || "Não foi possível atualizar o status da tarefa.");
        return;
      }
      onTaskUpdated();
    } catch (err) {
      console.error(err);
      setStatus(previousStatus);
      setBriefingFeedback("Erro de conexão ao atualizar status da tarefa.");
    }
  };

  const handleAddChecklist = async () => {
    const text = newChecklistText.trim();
    if (!text) return;
    try {
      const res = await fetch(`/api/projects/tasks/${task.id}/checklists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: text }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setBriefingFeedback(json.error || "Não foi possível adicionar o item do checklist.");
        return;
      }
      setNewChecklistText("");
      onTaskUpdated();
    } catch (err) {
      console.error(err);
      setBriefingFeedback("Erro de conexão ao adicionar item do checklist.");
    }
  };

  const handleToggleChecklist = async (checklistId: string, current: boolean) => {
    try {
      const res = await fetch(`/api/projects/checklists/${checklistId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: !current }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setBriefingFeedback(json.error || "Não foi possível atualizar o checklist.");
        return;
      }
      onTaskUpdated();
    } catch (err) {
      console.error(err);
      setBriefingFeedback("Erro de conexão ao atualizar checklist.");
    }
  };

  const handleSaveChecklistTitle = async (checklistId: string) => {
    const trimmed = editingChecklistTitle.trim();
    if (!trimmed) {
      toast.error("Informe um título para o item do checklist.");
      return;
    }
    setSavingChecklistId(checklistId);
    try {
      const res = await fetch(`/api/projects/checklists/${checklistId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast.error(json.error || "Não foi possível editar o item.");
        return;
      }
      setEditingChecklistId(null);
      setEditingChecklistTitle("");
      toast.success("Item atualizado.");
      onTaskUpdated();
    } catch (err) {
      console.error(err);
      toast.error("Erro de conexão ao editar item.");
    } finally {
      setSavingChecklistId(null);
    }
  };

  const handleDeleteChecklist = async (checklistId: string, title: string) => {
    const confirmed = await confirmAction({
      title: "Excluir item do checklist",
      message: `Remover "${title}" deste checklist?`,
      confirmLabel: "Excluir",
      tone: "danger",
    });
    if (!confirmed) return;
    setSavingChecklistId(checklistId);
    try {
      const res = await fetch(`/api/projects/checklists/${checklistId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast.error(json.error || "Não foi possível excluir o item.");
        return;
      }
      if (editingChecklistId === checklistId) {
        setEditingChecklistId(null);
        setEditingChecklistTitle("");
      }
      toast.success("Item excluído.");
      onTaskUpdated();
    } catch (err) {
      console.error(err);
      toast.error("Erro de conexão ao excluir item.");
    } finally {
      setSavingChecklistId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-950/45 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold bg-zinc-100 text-zinc-800 px-2.5 py-1 rounded-md border border-zinc-200">
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
                ? "border-zinc-400 text-zinc-800"
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
                ? "border-zinc-400 text-zinc-800"
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
                  <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3 shadow-hourline">
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

                    <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                      <input
                        type="text"
                        readOnly
                        value={
                          loadingBriefing
                            ? "Gerando link exclusivo..."
                            : briefingUrl || "Clique em 'Salvar Informações' abaixo para gerar o link"
                        }
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-xs font-mono text-zinc-700 select-all"
                      />

                      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 flex-wrap">
                        <button
                          type="button"
                          onClick={handleCopyLink}
                          disabled={!briefingUrl}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-950 hover:bg-zinc-800 disabled:opacity-40 text-white rounded-lg text-xs font-medium transition"
                        >
                          {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedLink ? "Copiado!" : "Copiar"}
                        </button>

                        <a
                          href={briefingUrl ? `https://wa.me/?text=${encodeURIComponent(
                            `Olá ${contactName || ""}! Aqui está seu link exclusivo de onboarding da Otimizza: ${briefingUrl}\n\nA Edivânia, nossa estrategista de IA, já está te esperando para batermos um papo tranquilo sobre o posicionamento e os conteúdos das suas redes sociais!`
                          )}` : "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 text-white rounded-lg text-xs font-medium transition bg-emerald-600 hover:bg-emerald-700"
                        >
                          <WhatsAppIcon className="w-3.5 h-3.5" />
                          WhatsApp
                        </a>

                        <a
                          href={briefingUrl || "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 border border-zinc-200 rounded-lg transition hover:bg-zinc-50 text-zinc-700"
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

                  {/* Informações prévias pelo Valdemar / Equipe */}
                  <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-4 shadow-hourline">
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
                      <h4 className="font-semibold text-zinc-950 text-xs">
                        1. Informações Base do Cliente & Identificação Inteligente
                      </h4>
                      <span className="text-[11px] text-zinc-400">
                        Base cadastral permanente do cliente no ERP
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {/* CNPJ COM BUSCA AUTOMÁTICA VIA IA E RECEITA */}
                      <div className="sm:col-span-2 p-3 bg-zinc-50 border border-zinc-200 rounded-lg space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                          <label className="font-semibold text-zinc-800 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-zinc-600" />
                            <span>CNPJ da Empresa (Busca Automática com IA)</span>
                          </label>
                          <span className="text-[11px] text-zinc-500">
                            Preenche Razão Social, CNAE e sugere o Nicho de Mercado
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={cnpj}
                            onChange={(e) => setCnpj(e.target.value)}
                            placeholder="Ex: 00.000.000/0000-00"
                            className="flex-1 bg-white border border-zinc-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-zinc-500 font-mono"
                          />
                          <button
                            type="button"
                            onClick={handleLookupCnpj}
                            disabled={searchingCnpj}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-medium transition disabled:opacity-50"
                          >
                            <Search className={`w-3.5 h-3.5 ${searchingCnpj ? "animate-spin" : ""}`} />
                            {searchingCnpj ? "Buscando..." : "Buscar Dados"}
                          </button>
                        </div>
                        {cnaeCode && (
                          <div className="text-[11px] text-zinc-600 bg-white p-2 rounded border border-zinc-200 flex items-start gap-1.5">
                            <Tag className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <span>
                              <strong>CNAE {cnaeCode}:</strong> {cnaeDescription}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* CATEGORIA / NICHO DE ATUAÇÃO (EDITÁVEL) */}
                      <div className="sm:col-span-2">
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-semibold text-zinc-800">
                            Categoria / Nicho de Atuação
                          </label>
                          <span className="text-[11px] text-zinc-400">
                            Preenchido pela IA ou editável livremente
                          </span>
                        </div>
                        <input
                          type="text"
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          placeholder="Ex: Fisioterapia e Reabilitação, Odontologia Estética, Marcenaria de Alto Padrão..."
                          className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-zinc-500 font-medium"
                        />
                      </div>

                      <div>
                        <label className="block font-medium text-zinc-700 mb-1">Nome da Empresa</label>
                        <input
                          type="text"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="Ex: Studio TRG"
                          className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-zinc-500 font-medium"
                        />
                      </div>

                      <div>
                        <label className="block font-medium text-zinc-700 mb-1">Nome do Contato / Decisor</label>
                        <input
                          type="text"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          placeholder="Ex: Rondinelle"
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
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-300"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Link do Google Maps</label>
                        <input
                          type="text"
                          value={mapsUrl}
                          onChange={(e) => setMapsUrl(e.target.value)}
                          placeholder="Link da ficha no Google Meu Negócio"
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-300"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block font-semibold text-slate-700 mb-1">Perfil do Instagram (@ ou Link)</label>
                        <input
                          type="text"
                          value={instagramUrl}
                          onChange={(e) => setInstagramUrl(e.target.value)}
                          placeholder="https://instagram.com/seuperfil"
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-300"
                        />
                      </div>
                    </div>
                  </div>

                  {/* BLOCO DE SERVIÇOS E PRODUTOS ESTRUTURADOS (CATÁLOGO) */}
                  <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-4 shadow-hourline">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-2.5">
                      <div>
                        <h4 className="font-semibold text-zinc-950 text-xs flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-zinc-700" />
                          <span>O que ele vende / Serviços & Produtos Estruturados</span>
                        </h4>
                        <p className="text-[11px] text-zinc-500">
                          Cada serviço ou produto é um bloco independente para direcionamento de conteúdo, dores e públicos.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAddingItem(!isAddingItem)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold self-start sm:self-auto transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {isAddingItem ? "Fechar Formulário" : "Inserir Serviço / Produto"}
                      </button>
                    </div>

                    {/* Formulário para Adicionar Item */}
                    {isAddingItem && (
                      <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-3 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-zinc-900">Novo Item no Catálogo</span>
                          <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-0.5">
                            <button
                              type="button"
                              onClick={() => setDraftItem((prev) => ({ ...prev, type: "SERVICE" }))}
                              className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
                                draftItem.type === "SERVICE" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:text-zinc-900"
                              }`}
                            >
                              Serviço
                            </button>
                            <button
                              type="button"
                              onClick={() => setDraftItem((prev) => ({ ...prev, type: "PRODUCT" }))}
                              className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
                                draftItem.type === "PRODUCT" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:text-zinc-900"
                              }`}
                            >
                              Produto
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="block font-medium text-zinc-700 mb-1">Nome do {draftItem.type === "SERVICE" ? "Serviço" : "Produto"} *</label>
                            <input
                              type="text"
                              value={draftItem.name}
                              onChange={(e) => setDraftItem((prev) => ({ ...prev, name: e.target.value }))}
                              placeholder="Ex: Performance Física, Correção Postural..."
                              className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-zinc-500"
                            />
                          </div>

                          <div>
                            <label className="block font-medium text-zinc-700 mb-1">Qual o seu Diferencial neste item?</label>
                            <input
                              type="text"
                              value={draftItem.differentials}
                              onChange={(e) => setDraftItem((prev) => ({ ...prev, differentials: e.target.value }))}
                              placeholder="Ex: Avaliação biomecânica personalizada..."
                              className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-zinc-500"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block font-medium text-zinc-700 mb-1">Descrição Breve</label>
                            <textarea
                              rows={2}
                              value={draftItem.description}
                              onChange={(e) => setDraftItem((prev) => ({ ...prev, description: e.target.value }))}
                              placeholder="Explique o que é este serviço/produto de forma clara..."
                              className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-zinc-500"
                            />
                          </div>

                          <div>
                            <label className="block font-medium text-zinc-700 mb-1">Dor Principal do Cliente</label>
                            <input
                              type="text"
                              value={draftItem.target_pain_points}
                              onChange={(e) => setDraftItem((prev) => ({ ...prev, target_pain_points: e.target.value }))}
                              placeholder="Ex: Dores crônicas nas costas, falta de tempo..."
                              className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-zinc-500"
                            />
                          </div>

                          <div>
                            <label className="block font-medium text-zinc-700 mb-1">Como você resolve a dor?</label>
                            <input
                              type="text"
                              value={draftItem.solution_approach}
                              onChange={(e) => setDraftItem((prev) => ({ ...prev, solution_approach: e.target.value }))}
                              placeholder="Ex: Plano de fortalecimento progressivo sem medicação..."
                              className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-zinc-500"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block font-medium text-zinc-700 mb-1">O que está incluso? (Entregáveis)</label>
                            <input
                              type="text"
                              value={draftItem.deliverables}
                              onChange={(e) => setDraftItem((prev) => ({ ...prev, deliverables: e.target.value }))}
                              placeholder="Ex: Sessões individuais, ficha digital, suporte via WhatsApp..."
                              className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-zinc-500"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setIsAddingItem(false)}
                            className="px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-900 border border-zinc-200 bg-white rounded-lg"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!draftItem.name.trim()) {
                                toast.warning("Informe o nome do serviço ou produto.");
                                return;
                              }
                              setCatalogItems((prev) => [...prev, { ...draftItem }]);
                              // Atualiza resumo textual em servicesOffered para retrocompatibilidade
                              setServicesOffered((prev) =>
                                prev ? `${prev}, ${draftItem.name.trim()}` : draftItem.name.trim()
                              );
                              setDraftItem({
                                type: "SERVICE",
                                name: "",
                                description: "",
                                differentials: "",
                                deliverables: "",
                                target_pain_points: "",
                                solution_approach: "",
                              });
                              setIsAddingItem(false);
                            }}
                            className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                          >
                            Adicionar ao Catálogo
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Lista de Blocos de Serviços */}
                    {catalogItems.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {catalogItems.map((item, idx) => (
                          <div
                            key={item.id || idx}
                            className="p-3.5 bg-zinc-50/70 border border-zinc-200 rounded-xl space-y-2 text-xs relative group"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-200 text-zinc-800 mb-1">
                                  {item.type === "PRODUCT" ? "Produto" : "Serviço"}
                                </span>
                                <h5 className="font-bold text-zinc-950 text-sm">{item.name}</h5>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setCatalogItems((prev) => prev.filter((_, i) => i !== idx));
                                }}
                                className="text-zinc-400 hover:text-rose-600 transition p-1"
                                title="Remover item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {item.description && (
                              <p className="text-zinc-600 text-xs leading-relaxed">{item.description}</p>
                            )}

                            {item.differentials && (
                              <div className="text-[11px] text-zinc-700">
                                <strong className="text-zinc-900">Diferencial:</strong> {item.differentials}
                              </div>
                            )}

                            {item.deliverables && (
                              <div className="text-[11px] text-zinc-700">
                                <strong className="text-zinc-900">Incluso:</strong> {item.deliverables}
                              </div>
                            )}

                            {(item.target_pain_points || item.solution_approach) && (
                              <div className="pt-1.5 border-t border-zinc-200/70 text-[11px] space-y-0.5">
                                {item.target_pain_points && (
                                  <p className="text-amber-900">
                                    <span className="font-semibold">Dor resolvida:</span> {item.target_pain_points}
                                  </p>
                                )}
                                {item.solution_approach && (
                                  <p className="text-emerald-900">
                                    <span className="font-semibold">Como resolve:</span> {item.solution_approach}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 border border-dashed border-zinc-300 rounded-xl text-center space-y-1">
                        <p className="text-xs text-zinc-600 font-medium">Nenhum serviço ou produto estruturado cadastrado ainda.</p>
                        <p className="text-[11px] text-zinc-400">
                          Clique em &quot;Inserir Serviço / Produto&quot; acima para cadastrar em blocos independentes.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* CAMPOS SEPARADOS DE CONTEXTO ESTRATÉGICO PRÉVIO */}
                  <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-4 shadow-hourline">
                    <div className="border-b border-zinc-100 pb-2.5">
                      <h4 className="font-semibold text-zinc-950 text-xs">
                        Contexto Estratégico & DNA da Marca (Campos Separados)
                      </h4>
                      <p className="text-[11px] text-zinc-400">
                        Preencha os campos que você tiver disponíveis. Todos são opcionais e ajudam a IA a alinhar a comunicação.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block font-semibold text-zinc-700 mb-1">
                          História da Marca & Fundação (Opcional)
                        </label>
                        <textarea
                          rows={2}
                          value={brandHistory}
                          onChange={(e) => setBrandHistory(e.target.value)}
                          placeholder="Como surgiu a empresa, trajetória e marcos importantes..."
                          className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-zinc-500"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-zinc-700 mb-1">
                          Promessa Central de Valor (Opcional)
                        </label>
                        <textarea
                          rows={2}
                          value={corePromise}
                          onChange={(e) => setCorePromise(e.target.value)}
                          placeholder="Qual a grande transformação ou promessa que a marca entrega ao cliente..."
                          className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-zinc-500"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-zinc-700 mb-1">
                          Princípios & Não-Negociáveis da Marca (Opcional)
                        </label>
                        <textarea
                          rows={2}
                          value={nonNegotiables}
                          onChange={(e) => setNonNegotiables(e.target.value)}
                          placeholder="O que a empresa NUNCA faz ou não abre mão (ex: não atende sem agendamento, transparência total)..."
                          className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-zinc-500"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-zinc-700 mb-1">
                          Principais Objeções Comerciais (Opcional)
                        </label>
                        <textarea
                          rows={2}
                          value={salesObjections}
                          onChange={(e) => setSalesObjections(e.target.value)}
                          placeholder="Dúvidas comuns dos clientes antes de fechar: preço, tempo de resultado, dor, etc..."
                          className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-zinc-500"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block font-semibold text-zinc-700 mb-1">
                          Outras Notas e Observações Estratégicas
                        </label>
                        <textarea
                          rows={2}
                          value={initialNotes}
                          onChange={(e) => setInitialNotes(e.target.value)}
                          placeholder="Anotações gerais, acordos de contratação, prazos acordados, etc..."
                          className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-zinc-500"
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
                        Salvar Informações Prévias & Catálogo
                      </button>
                    </div>
                  </div>

                  {/* Informações Coletadas pela Edivânia (IA) organizadas por Domínio */}
                  <div className="space-y-4">
                    {/* 2. DIRETRIZES PARA HEADLINES & COPYWRITING (EDITÁVEL) */}
                    <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3 shadow-hourline">
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
                    <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3 shadow-hourline">
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
                          href={`/strategy?clientId=${encodeURIComponent(project.clientId)}`}
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
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-2.5">
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
                  <div className="bg-zinc-100 border border-zinc-200 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-zinc-800 text-sm font-bold">
                      <Search className="w-4 h-4 text-zinc-800" />
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
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-zinc-300"
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
                  <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 space-y-2">
                    <h4 className="font-bold text-slate-900 text-xs">Os 4 Pilares Estratégicos de Conteúdo da Otimizza</h4>
                    <p className="text-xs text-slate-600">
                      Conecte estes pilares diretamente ao Estúdio de Criação de Conteúdo e aos Funis de Marketing.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="font-bold text-zinc-800 block mb-0.5">1. Autoridade & Bastidores</span>
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
                      <Layers className="w-3.5 h-3.5 text-zinc-800" />
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
                      <Calendar className="w-4 h-4 text-zinc-800" />
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
                {task.checklists?.map((item) => {
                  const isEditing = editingChecklistId === item.id;
                  const isBusy = savingChecklistId === item.id;

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (!isEditing) handleToggleChecklist(item.id, item.isCompleted);
                      }}
                      className={`group flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200 transition text-xs ${
                        isEditing ? "bg-white border-zinc-300" : "hover:bg-slate-100 cursor-pointer"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={item.isCompleted}
                        onChange={() => {}}
                        className="rounded text-zinc-800 focus:ring-zinc-300 shrink-0"
                      />

                      {isEditing ? (
                        <div
                          className="flex flex-1 items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            autoFocus
                            disabled={isBusy}
                            value={editingChecklistTitle}
                            onChange={(e) => setEditingChecklistTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                void handleSaveChecklistTitle(item.id);
                              } else if (e.key === "Escape") {
                                setEditingChecklistId(null);
                                setEditingChecklistTitle("");
                              }
                            }}
                            className="flex-1 px-2.5 py-1 bg-white border border-zinc-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-zinc-500"
                          />
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleSaveChecklistTitle(item.id)}
                            title="Salvar alteração"
                            className="p-1 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => {
                              setEditingChecklistId(null);
                              setEditingChecklistTitle("");
                            }}
                            title="Cancelar"
                            className="p-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span
                            className={`flex-1 text-slate-800 ${
                              item.isCompleted ? "line-through text-slate-400" : ""
                            }`}
                          >
                            {item.title}
                          </span>
                          <div
                            className="flex items-center gap-1 opacity-75 group-hover:opacity-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => {
                                setEditingChecklistId(item.id);
                                setEditingChecklistTitle(item.title);
                              }}
                              title="Editar item"
                              className="p-1 rounded-lg text-slate-400 hover:text-zinc-900 hover:bg-white transition"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handleDeleteChecklist(item.id, item.title)}
                              title="Excluir item"
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}

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
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-zinc-300"
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
