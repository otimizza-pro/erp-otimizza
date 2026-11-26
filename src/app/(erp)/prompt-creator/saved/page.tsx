"use client";

import { contentCompanyId } from "@/modules/clients/internal-company";
import { useCompany } from "@/lib/context/company-context";
import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArchiveRecordAction } from "@/components/ui/archive-record-action";
import { SocialWorkflowStepper } from "@/components/content-studio/social-workflow-stepper";
import { toast } from "@/components/ui/toast-provider";
import { confirmAction } from "@/components/ui/confirm-dialog";

import {
  Sparkles,
  ArrowLeft,
  Image as ImageIcon,
  Upload,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Check,
  Filter,
  Play,
  Pause,
  CheckCircle2,
  Layers,
  Video,
  FileText,
  TrendingUp,
  Tag,
  Calendar,
  X,
  ExternalLink,
  RefreshCw,
  Eye,
  Megaphone,
  Archive,
  Search,
  ArrowUpDown,
} from "lucide-react";

interface PostItem {
  id: string;
  clientId: string;
  clientName: string;
  clientTradeName?: string;
  title: string;
  centralIdea: string;
  format: string;
  status: string;
  contentType: "SOCIAL_MEDIA" | "ADS";
  adStatus: "ACTIVE" | "PAUSED" | "FINISHED";
  imageUrl: string | null;
  postTag: string;
  scheduledDate?: string;
  selectedHeadline?: string;
  selectedCaption?: string;
  selectedReels?: string;
  selectedCarousel?: string;
  copySiteLp?: string;
  copyMetaAds?: string;
  copyGoogleAds?: string;
  promptUsed?: string;
  toneOfVoice?: string;
  callToAction?: string;
  publishedUrl?: string | null;
  createdAt: string;
}

function resolvePostImageUrl(rawUrl?: string | null): string | null {
  if (!rawUrl) return null;
  const legacyPublicMarker = "/storage/v1/object/public/client-documents/";
  const markerIdx = rawUrl.indexOf(legacyPublicMarker);
  if (markerIdx !== -1) {
    const path = rawUrl.slice(markerIdx + legacyPublicMarker.length).split("?")[0];
    if (path) return `/api/content-studio/upload?path=${encodeURIComponent(path)}`;
  }
  if (rawUrl.startsWith("/api/documents/stream?path=")) {
    return rawUrl.replace("/api/documents/stream?path=", "/api/content-studio/upload?path=");
  }
  return rawUrl;
}

const READY_STATUSES = new Set(["APPROVED", "SCHEDULED", "PUBLISHED", "ACTIVE"]);

function formatScheduledDateBR(raw?: string | null): string | null {
  if (!raw) return null;
  const iso = String(raw).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function SavedPostsPageContent() {
  const searchParams = useSearchParams();
  const targetPostId = searchParams.get("postId");
  const openedQueryPostRef = React.useRef<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [posts, setPosts] = useState<PostItem[]>([]);

  const { selectedCompany, availableCompanies, selectCompany } = useCompany();
  const selectedClientId = contentCompanyId(selectedCompany);
  const [activeTab, setActiveTab] = useState<"SOCIAL_MEDIA" | "ADS">("SOCIAL_MEDIA");
  const [adStatusFilter, setAdStatusFilter] = useState<"ALL" | "ACTIVE" | "PAUSED" | "FINISHED">("ALL");
  const [kpiFilter, setKpiFilter] = useState<"ALL" | "READY" | "DRAFT">("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [formatFilter, setFormatFilter] = useState("ALL");
  const [monthFilter, setMonthFilter] = useState("ALL");
  const [mediaFilter, setMediaFilter] = useState<"ALL" | "WITH_IMAGE" | "WITHOUT_IMAGE" | "WITH_LINK" | "WITHOUT_LINK">("ALL");
  const [sortOrder, setSortOrder] = useState<"FEED_DESC" | "FEED_ASC" | "CREATED_DESC">("FEED_DESC");
  const [loading, setLoading] = useState(true);

  // Modal de Edição
  const [editingPost, setEditingPost] = useState<PostItem | null>(null);
  const [editForm, setEditForm] = useState<{
    title: string;
    postTag: string;
    format: string;
    adStatus: "ACTIVE" | "PAUSED" | "FINISHED";
    selectedHeadline: string;
    selectedCaption: string;
    selectedReels: string;
    selectedCarousel: string;
    copySiteLp: string;
    copyMetaAds: string;
    copyGoogleAds: string;
    scheduledDate: string;
    publishedUrl: string;
  }>({
    title: "",
    postTag: "",
    format: "Post estático",
    adStatus: "ACTIVE",
    selectedHeadline: "",
    selectedCaption: "",
    selectedReels: "",
    selectedCarousel: "",
    copySiteLp: "",
    copyMetaAds: "",
    copyGoogleAds: "",
    scheduledDate: "",
    publishedUrl: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Upload state
  const [uploadingPostId, setUploadingPostId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const requestSequence = React.useRef(0);
  const [loadError, setLoadError] = useState("");
  // Carregar Posts
  const loadPosts = async () => {
    const requestId = ++requestSequence.current; setPosts([]); setLoadError(""); setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("archived", String(showArchived));
      if (selectedClientId !== "ALL") params.set("clientId", selectedClientId);
      params.set("contentType", activeTab);
      if (activeTab === "ADS" && adStatusFilter !== "ALL") {
        params.set("adStatus", adStatusFilter);
      }

      const res = await fetch(`/api/content-studio/posts?${params.toString()}`);
      const json = await res.json();
      if (requestId !== requestSequence.current) return;
      if (!res.ok || !json.success) throw new Error(json.error || "Erro ao consultar conteúdos");
      if (json.success) {
        setPosts(json.data || []);
      }
    } catch (e) {
      if (requestId === requestSequence.current) setLoadError(e instanceof Error ? e.message : "Erro ao consultar conteúdos");
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [selectedClientId, activeTab, adStatusFilter, showArchived]);

  // Upload de Imagem de Post
  const handleImageUpload = async (postId: string, file: File, clientId: string) => {
    setUploadingPostId(postId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("clientId", clientId);

      const upRes = await fetch("/api/content-studio/upload", {
        method: "POST",
        body: formData,
      });

      const upJson = await upRes.json();
      const uploadedUrl = upJson.imageUrl || upJson.url;
      if (!upRes.ok || !upJson.success || !uploadedUrl) {
        throw new Error(upJson.error || "Falha no upload");
      }

      // Salva a imageUrl no post
      const putRes = await fetch(`/api/content-studio/posts/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: uploadedUrl }),
      });
      if (!putRes.ok) {
        const errJson = await putRes.json().catch(() => ({}));
        throw new Error(errJson.error || "Erro ao vincular imagem ao post.");
      }

      toast.success("Imagem vinculada com sucesso.");
      await loadPosts();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Erro ao fazer upload da imagem.");
    } finally {
      setUploadingPostId(null);
    }
  };

  // Alterar Status do Anúncio (Ativo, Pausado, Finalizado)
  const handleUpdateAdStatus = async (postId: string, newStatus: "ACTIVE" | "PAUSED" | "FINISHED") => {
    try {
      const res = await fetch(`/api/content-studio/posts/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adStatus: newStatus }),
      });
      if (!res.ok) {
        toast.error("Não foi possível atualizar o status do anúncio.");
        return;
      }
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, adStatus: newStatus } : p))
      );
    } catch (e) {
      console.error(e);
      toast.error("Erro de conexão ao atualizar anúncio.");
    }
  };

  // Excluir Post
  const handleDeletePost = async (postId: string) => {
    const confirmed = await confirmAction({
      title: "Excluir publicação salva",
      message: "Tem certeza que deseja excluir esta publicação salva?",
      confirmLabel: "Excluir",
      tone: "danger",
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/content-studio/posts/${postId}`, { method: "DELETE" });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
        toast.success("Publicação removida.");
      } else {
        const json = await res.json().catch(() => ({}));
        toast.error(json.error || "Erro ao excluir post.");
      }
    } catch {
      toast.error("Erro ao excluir post.");
    }
  };

  // Abrir Modal de Edição
  const handleOpenEdit = (p: PostItem) => {
    setEditingPost(p);
    setEditForm({
      title: p.title,
      postTag: p.postTag || p.format || "",
      format: p.format || "Post estático",
      adStatus: p.adStatus,
      selectedHeadline: p.selectedHeadline || "",
      selectedCaption: p.selectedCaption || "",
      selectedReels: p.selectedReels || "",
      selectedCarousel: p.selectedCarousel || "",
      copySiteLp: p.copySiteLp || "",
      copyMetaAds: p.copyMetaAds || "",
      copyGoogleAds: p.copyGoogleAds || "",
      scheduledDate: p.scheduledDate ? String(p.scheduledDate).slice(0, 10) : "",
      publishedUrl: p.publishedUrl || "",
    });
  };

  // Abrir automaticamente um post específico quando vindo de link (?postId=...)
  useEffect(() => {
    if (!targetPostId || openedQueryPostRef.current === targetPostId) return;
    let active = true;

    const existing = posts.find((p) => p.id === targetPostId);
    if (existing) {
      openedQueryPostRef.current = targetPostId;
      handleOpenEdit(existing);
      return;
    }

    (async () => {
      try {
        const res = await fetch(`/api/content-studio/posts?id=${encodeURIComponent(targetPostId)}`);
        const json = await res.json();
        if (!active || !res.ok || !json.success || !Array.isArray(json.data) || json.data.length === 0) return;
        const found = json.data[0] as PostItem;
        openedQueryPostRef.current = targetPostId;

        if (found.clientId && found.clientId !== selectedClientId) {
          const matchedCompany = availableCompanies.find((c) => c.id === found.clientId);
          selectCompany(
            matchedCompany || {
              id: found.clientId,
              name: found.clientTradeName || found.clientName,
              isOtimizza: false,
            }
          );
        }
        if (found.contentType === "ADS" || found.contentType === "SOCIAL_MEDIA") {
          setActiveTab(found.contentType);
        }
        handleOpenEdit(found);
      } catch {
        // Ignora silenciosamente se o post não puder ser carregado por link direto
      }
    })();

    return () => {
      active = false;
    };
  }, [targetPostId, posts, selectedClientId, availableCompanies, selectCompany]);

  // Salvar Edição
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost) return;
    setSavingEdit(true);

    try {
      const res = await fetch(`/api/content-studio/posts/${editingPost.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          scheduledDate: editForm.scheduledDate || null,
          confirmContentRevision: true,
        }),
      });

      if (res.ok) {
        setEditingPost(null);
        toast.success("Alterações salvas.");
        await loadPosts();
      } else {
        const json = await res.json().catch(() => ({}));
        toast.error(json.error || "Erro ao salvar alterações.");
      }
    } catch {
      toast.error("Erro de conexão.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const availableFormats = useMemo(() => {
    const defaults = ["Post estático", "Carrossel", "Reels", "Stories", "Feed"];
    const set = new Set<string>(defaults);
    for (const p of posts) {
      if (p.format) set.add(p.format);
    }
    return Array.from(set);
  }, [posts]);

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    for (const p of posts) {
      const iso = p.scheduledDate ? String(p.scheduledDate).slice(0, 7) : "";
      if (/^\d{4}-\d{2}$/.test(iso)) set.add(iso);
    }
    return Array.from(set).sort().reverse();
  }, [posts]);

  const filteredPosts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const list = posts.filter((p) => {
      const upperStatus = (p.status || "").toUpperCase();
      if (kpiFilter === "READY" && !READY_STATUSES.has(upperStatus)) return false;
      if (kpiFilter === "DRAFT" && READY_STATUSES.has(upperStatus)) return false;
      if (formatFilter !== "ALL" && p.format !== formatFilter) return false;
      const monthKey = p.scheduledDate ? String(p.scheduledDate).slice(0, 7) : "";
      if (monthFilter === "NO_DATE" && monthKey) return false;
      if (monthFilter !== "ALL" && monthFilter !== "NO_DATE" && monthKey !== monthFilter) return false;
      if (mediaFilter === "WITH_IMAGE" && !resolvePostImageUrl(p.imageUrl)) return false;
      if (mediaFilter === "WITHOUT_IMAGE" && resolvePostImageUrl(p.imageUrl)) return false;
      if (mediaFilter === "WITH_LINK" && !p.publishedUrl) return false;
      if (mediaFilter === "WITHOUT_LINK" && p.publishedUrl) return false;
      if (q) {
        const hay = `${p.title || ""} ${p.selectedHeadline || ""} ${p.selectedCaption || ""} ${p.postTag || ""} ${p.format || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortOrder === "CREATED_DESC") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      const dateA = a.scheduledDate ? String(a.scheduledDate).slice(0, 10) : "";
      const dateB = b.scheduledDate ? String(b.scheduledDate).slice(0, 10) : "";
      if (!dateA && !dateB) return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (!dateA) return 1;
      if (!dateB) return -1;
      return sortOrder === "FEED_DESC" ? dateB.localeCompare(dateA) : dateA.localeCompare(dateB);
    });
  }, [posts, kpiFilter, formatFilter, monthFilter, mediaFilter, searchTerm, sortOrder]);

  const hasActiveFilters =
    kpiFilter !== "ALL" ||
    searchTerm.trim() !== "" ||
    formatFilter !== "ALL" ||
    monthFilter !== "ALL" ||
    mediaFilter !== "ALL";

  const clearFilters = () => {
    setKpiFilter("ALL");
    setSearchTerm("");
    setFormatFilter("ALL");
    setMonthFilter("ALL");
    setMediaFilter("ALL");
  };

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6 pb-24">
        <SocialWorkflowStepper activeStep="calendar" />
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-zinc-200 shadow-2xs">
          <div className="flex items-center gap-3">
            <Link
              href="/prompt-creator"
              className="p-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-600 transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-zinc-700 bg-zinc-100 px-2.5 py-0.5 rounded-md border border-zinc-200">
                  Estúdio de Conteúdo & IA
                </span>
              </div>
              <h1 className="text-xl font-semibold tracking-tight text-zinc-950 mt-1 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-zinc-700" />
                Feed & Criativos Salvos dos Clientes
              </h1>
              <p className="text-xs text-zinc-500">
                Organize os posts no formato de feed (4:5), suba imagens e gerencie campanhas de Ads ativas, pausadas e finalizadas.
              </p>
            </div>
          </div>

          <Link
            href="/prompt-creator"
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition shadow-2xs self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" /> Criar Novo Conteúdo com IA
          </Link>
        </div>

        {/* Resumo de Produção & Aprovação (Filtros rápidos clicáveis) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => setKpiFilter("ALL")}
            className={`text-left rounded-xl border p-3.5 shadow-2xs transition cursor-pointer ${
              kpiFilter === "ALL"
                ? "border-zinc-900 bg-white ring-1 ring-zinc-900"
                : "border-zinc-200 bg-white hover:border-zinc-300"
            }`}
          >
            <span className="text-[11px] font-medium text-zinc-500 block">Total de Peças</span>
            <span className="text-lg font-bold text-zinc-950 font-mono tabular-nums">{posts.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setKpiFilter((prev) => (prev === "READY" ? "ALL" : "READY"))}
            className={`text-left rounded-xl border p-3.5 shadow-2xs transition cursor-pointer ${
              kpiFilter === "READY"
                ? "border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600"
                : "border-emerald-200 bg-emerald-50/40 hover:border-emerald-400"
            }`}
          >
            <span className="text-[11px] font-medium text-emerald-700 block">Aprovadas / Prontas</span>
            <span className="text-lg font-bold text-emerald-800 font-mono tabular-nums">
              {posts.filter((c) => READY_STATUSES.has((c.status || "").toUpperCase())).length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setKpiFilter((prev) => (prev === "DRAFT" ? "ALL" : "DRAFT"))}
            className={`text-left rounded-xl border p-3.5 shadow-2xs transition cursor-pointer ${
              kpiFilter === "DRAFT"
                ? "border-amber-600 bg-amber-50 ring-1 ring-amber-600"
                : "border-amber-200 bg-amber-50/40 hover:border-amber-400"
            }`}
          >
            <span className="text-[11px] font-medium text-amber-700 block">Em Revisão / Rascunho</span>
            <span className="text-lg font-bold text-amber-800 font-mono tabular-nums">
              {posts.filter((c) => !READY_STATUSES.has((c.status || "").toUpperCase())).length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("ADS");
              setKpiFilter("ALL");
            }}
            className={`text-left rounded-xl border p-3.5 shadow-2xs transition cursor-pointer ${
              activeTab === "ADS"
                ? "border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900"
                : "border-zinc-200 bg-white hover:border-zinc-300"
            }`}
          >
            <span className="text-[11px] font-medium text-zinc-500 block">Criativos de Ads</span>
            <span className="text-lg font-bold text-zinc-950 font-mono tabular-nums">
              {posts.filter((c) => c.contentType === "ADS").length}
            </span>
          </button>
        </div>

        {/* Barra de Filtros: Cliente + Abas Social Media / Ads */}
        <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* Seletor de Cliente */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-600">{selectedCompany.name}</span><span className="text-[11px] text-zinc-400">Selecionado no cabeçalho</span>
            </div>

            {/* Separador */}
            <div className="h-5 w-px bg-zinc-200 hidden md:block" />

            {/* Alternador Social Media vs Ads */}
            <div className="flex items-center bg-zinc-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab("SOCIAL_MEDIA")}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${activeTab === "SOCIAL_MEDIA"
                  ? "bg-white text-zinc-950 shadow-2xs"
                  : "text-zinc-600 hover:text-zinc-950"
                  }`}
              >
                <Layers className="w-3.5 h-3.5 text-pink-600" />
                Social Media (Feed 4:5)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("ADS")}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${activeTab === "ADS"
                  ? "bg-white text-zinc-950 shadow-2xs"
                  : "text-zinc-600 hover:text-zinc-950"
                  }`}
              >
                <Megaphone className="w-3.5 h-3.5 text-blue-600" />
                Campanhas & Ads
              </button>
            </div>

            {/* Alternador Ativos vs Arquivados */}
            <div className="flex items-center bg-zinc-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setShowArchived(false)}
                className={`px-3 py-1.5 rounded-lg transition ${!showArchived
                  ? "bg-white text-zinc-950 shadow-2xs"
                  : "text-zinc-600 hover:text-zinc-950"
                  }`}
              >
                Ativos
              </button>
              <button
                type="button"
                onClick={() => setShowArchived(true)}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${showArchived
                  ? "bg-white text-zinc-950 shadow-2xs"
                  : "text-zinc-600 hover:text-zinc-950"
                  }`}
              >
                <Archive className="w-3.5 h-3.5 text-amber-600" />
                Arquivados
              </button>
            </div>
          </div>

          {/* Subfiltro de Status para Ads */}
          {activeTab === "ADS" && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-zinc-400 text-[11px] font-semibold">Status:</span>
              <button
                type="button"
                onClick={() => setAdStatusFilter("ALL")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${adStatusFilter === "ALL" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setAdStatusFilter("ACTIVE")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${adStatusFilter === "ACTIVE"
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
                  }`}
              >
                Ativos
              </button>
              <button
                type="button"
                onClick={() => setAdStatusFilter("PAUSED")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${adStatusFilter === "PAUSED"
                  ? "bg-amber-600 text-white"
                  : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
                  }`}
              >
                Pausados
              </button>
              <button
                type="button"
                onClick={() => setAdStatusFilter("FINISHED")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${adStatusFilter === "FINISHED"
                  ? "bg-zinc-600 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
              >
                Finalizados
              </button>
            </div>
          )}
        </div>

        {/* Barra de Filtros Secundários: Busca, Formato, Mês, Mídia/Link e Ordenação por Data */}
        <div className="bg-white px-4 py-3 rounded-2xl border border-zinc-200 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar título, copy, tag..."
                className="w-full h-8 pl-8 pr-2.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs text-zinc-800 placeholder-zinc-400 focus:bg-white focus:outline-none focus:border-zinc-400"
              />
            </div>

            <select
              value={formatFilter}
              onChange={(e) => setFormatFilter(e.target.value)}
              aria-label="Filtrar por formato"
              className="h-8 px-2.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs text-zinc-700 font-medium focus:bg-white focus:outline-none focus:border-zinc-400"
            >
              <option value="ALL">Todos os formatos</option>
              {availableFormats.map((fmt) => (
                <option key={fmt} value={fmt}>
                  {fmt}
                </option>
              ))}
            </select>

            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              aria-label="Filtrar por mês de postagem"
              className="h-8 px-2.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs text-zinc-700 font-medium focus:bg-white focus:outline-none focus:border-zinc-400"
            >
              <option value="ALL">Todos os meses</option>
              {availableMonths.map((ym) => {
                const [y, m] = ym.split("-");
                return (
                  <option key={ym} value={ym}>
                    {m}/{y}
                  </option>
                );
              })}
              <option value="NO_DATE">Sem data agendada</option>
            </select>

            <select
              value={mediaFilter}
              onChange={(e) =>
                setMediaFilter(
                  e.target.value as "ALL" | "WITH_IMAGE" | "WITHOUT_IMAGE" | "WITH_LINK" | "WITHOUT_LINK",
                )
              }
              aria-label="Filtrar por mídia ou publicação"
              className="h-8 px-2.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs text-zinc-700 font-medium focus:bg-white focus:outline-none focus:border-zinc-400"
            >
              <option value="ALL">Mídia & Link: Todos</option>
              <option value="WITH_IMAGE">Com imagem</option>
              <option value="WITHOUT_IMAGE">Sem imagem</option>
              <option value="WITH_LINK">Com link publicado</option>
              <option value="WITHOUT_LINK">Sem link publicado</option>
            </select>

            <div className="flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400 hidden sm:block" />
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as "FEED_DESC" | "FEED_ASC" | "CREATED_DESC")}
                aria-label="Ordenação do feed"
                className="h-8 px-2.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs text-zinc-700 font-medium focus:bg-white focus:outline-none focus:border-zinc-400"
              >
                <option value="FEED_DESC">Feed: Data mais recente</option>
                <option value="FEED_ASC">Feed: Próximos primeiro</option>
                <option value="CREATED_DESC">Criação: Mais recentes</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-zinc-500">
            <span className="font-mono tabular-nums">
              {filteredPosts.length} de {posts.length}
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="px-2 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold transition"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        {loadError && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
            {loadError}
          </div>
        )}

        {/* Feed Grid (Visualização em Formato de Feed 4:5) */}
        {loading ? (
          <div className="p-20 text-center text-xs text-zinc-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-zinc-600" />
            Carregando publicações e criativos...
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-2xl border border-zinc-200 text-xs text-zinc-400 space-y-3">
            <ImageIcon className="w-10 h-10 text-zinc-300 mx-auto" />
            <p className="font-semibold text-zinc-700">
              {posts.length === 0
                ? "Nenhum conteúdo salvo nesta categoria."
                : "Nenhuma publicação corresponde aos filtros selecionados."}
            </p>
            <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
              {posts.length === 0
                ? "Acesse o Estúdio de Conteúdo & IA para gerar headlines, legendas e criativos e salve-os diretamente aqui."
                : "Ajuste os filtros acima ou limpe a seleção para visualizar todos os itens."}
            </p>
            {posts.length === 0 ? (
              <Link
                href="/prompt-creator"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white font-semibold rounded-xl"
              >
                <Sparkles className="w-3.5 h-3.5" /> Abrir Estúdio de Criação
              </Link>
            ) : (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white font-semibold rounded-xl"
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map((post) => {
              const isAd = post.contentType === "ADS";
              const displayImageUrl = resolvePostImageUrl(post.imageUrl);
              const scheduledLabel = formatScheduledDateBR(post.scheduledDate);

              return (
                <div
                  key={post.id}
                  className="bg-white border border-zinc-200/90 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  {/* Container da Imagem com Aspect Ratio 4:5 Vertical Exato */}
                  <div
                    onClick={() => handleOpenEdit(post)}
                    title="Clique na imagem para editar esta publicação"
                    className="relative aspect-[4/5] w-full bg-zinc-100 flex items-center justify-center overflow-hidden group cursor-pointer"
                  >
                    {displayImageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={displayImageUrl}
                        alt={post.title}
                        className="w-full h-full object-contain transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-zinc-50 text-white">
                        <ImageIcon className="w-8 h-8 text-zinc-500 mb-2" />
                        <span className="text-xs font-semibold text-zinc-400">
                          {isAd ? "Criativo do Anúncio" : "Imagem do Post (4:5)"}
                        </span>
                        <span className="text-[10px] text-zinc-600 mt-1 max-w-[200px] line-clamp-2">
                          {post.selectedHeadline || post.title}
                        </span>
                      </div>
                    )}

                    {/* Botão de Upload Overlay */}
                    <label
                      onClick={(e) => e.stopPropagation()}
                      className="absolute bottom-3 right-3 p-2 bg-zinc-950/45 hover:bg-black/90 text-white rounded-xl cursor-pointer transition shadow-md flex items-center gap-1.5 text-[10px] font-semibold"
                      title="Subir / Trocar imagem (formato feed 4:5)"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingPostId === post.id ? "Enviando..." : "Subir Imagem"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        disabled={uploadingPostId === post.id}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(post.id, file, post.clientId);
                        }}
                      />
                    </label>

                    {/* Badge de Cliente e Formato no Topo */}
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                      <span className="px-2 py-0.5 rounded-lg bg-zinc-950/45 text-white text-[10px] font-bold">
                        {post.clientTradeName || post.clientName}
                      </span>
                    </div>

                    {/* Status de Anúncio se for ADS */}
                    {isAd && (
                      <div className="absolute top-3 right-3">
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold shadow-xs ${post.adStatus === "ACTIVE"
                            ? "bg-emerald-500 text-white"
                            : post.adStatus === "PAUSED"
                              ? "bg-amber-500 text-white"
                              : "bg-zinc-600 text-white"
                            }`}
                        >
                          {post.adStatus === "ACTIVE"
                            ? "Ativo / Rodando"
                            : post.adStatus === "PAUSED"
                              ? "Pausado"
                              : "Finalizado"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Detalhes do Post & Tags Abaixo da Imagem */}
                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Tag do Post, Data & Formato */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-100 text-zinc-800 border border-zinc-200">
                          <Tag className="w-2.5 h-2.5" />
                          {post.postTag || post.format || (isAd ? "Meta Ads" : "Feed Social")}
                        </span>

                        <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
                          {scheduledLabel && (
                            <span className="inline-flex items-center gap-1 text-zinc-600 font-medium" title="Data de postagem">
                              <Calendar className="w-2.5 h-2.5 text-zinc-400" />
                              {scheduledLabel}
                            </span>
                          )}
                          <span className="text-zinc-400">{post.format}</span>
                        </div>
                      </div>

                      {/* Headline */}
                      <h3 className="font-bold text-xs text-zinc-950 line-clamp-2 mb-1">
                        {post.selectedHeadline || post.title}
                      </h3>

                      {/* Conteúdo do Formato (Reels / Carrossel / LP / Ads) e Legenda */}
                      {(() => {
                        const fmt = (post.format || "").toLowerCase();
                        const pieceContent =
                          fmt.includes("reel")
                            ? post.selectedReels || post.selectedCarousel
                            : fmt.includes("carross")
                              ? post.selectedCarousel || post.selectedReels
                              : fmt.includes("landing")
                                ? post.copySiteLp
                                : post.contentType === "ADS"
                                  ? post.copyMetaAds || post.copyGoogleAds || post.selectedCarousel || post.selectedReels
                                  : post.selectedCarousel || post.selectedReels || post.copySiteLp;
                        const contentBadgeLabel = fmt.includes("reel")
                          ? "Roteiro de Reels"
                          : fmt.includes("carross")
                            ? "Cards do Carrossel"
                            : fmt.includes("landing")
                              ? "Copy da Página"
                              : post.contentType === "ADS"
                                ? "Copy do Anúncio"
                                : "Conteúdo da Peça";
                        return (
                          <div className="space-y-2">
                            {pieceContent && (
                              <div className="text-[11px] text-zinc-700 leading-relaxed whitespace-pre-line bg-emerald-50/40 p-2.5 rounded-xl border border-emerald-200/70">
                                <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-800 mb-1">
                                  {contentBadgeLabel}
                                </span>
                                <span className="line-clamp-5">{pieceContent}</span>
                              </div>
                            )}
                            {post.selectedCaption && (
                              <p className="text-[11px] text-zinc-600 line-clamp-6 leading-relaxed whitespace-pre-line bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
                                {post.selectedCaption}
                              </p>
                            )}
                          </div>
                        );
                      })()}

                      {/* CTA */}
                      {post.callToAction && (
                        <div className="mt-2 text-[10px] font-semibold text-emerald-700 bg-emerald-50/70 px-2.5 py-1 rounded-lg border border-emerald-100 flex items-center gap-1">
                          <span>CTA:</span>
                          <span className="truncate">{post.callToAction}</span>
                        </div>
                      )}

                      {/* Link do Post Publicado */}
                      {post.publishedUrl ? (
                        <a
                          href={post.publishedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 flex items-center justify-between gap-2 text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg border border-emerald-200 transition"
                        >
                          <span className="flex items-center gap-1.5 truncate">
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            <span className="truncate">Post publicado</span>
                          </span>
                          <span className="text-[10px] text-emerald-700 shrink-0">Abrir ↗</span>
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(post)}
                          className="mt-2 w-full flex items-center justify-center gap-1.5 text-[11px] font-medium text-zinc-600 bg-zinc-50 hover:bg-zinc-100 px-2.5 py-1.5 rounded-lg border border-dashed border-zinc-300 transition"
                        >
                          <Plus className="w-3 h-3 shrink-0" />
                          <span>Adicionar link do post feito</span>
                        </button>
                      )}
                    </div>

                    {/* Barra de Ações do Post */}
                    <div className="pt-3 border-t border-zinc-100 space-y-2">
                      {/* Alternador rápido de status de Ads */}
                      {isAd && (
                        <div className="flex items-center justify-between text-[10px] font-semibold bg-zinc-50 p-1 rounded-lg">
                          <span className="text-zinc-500 pl-1">Status:</span>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateAdStatus(post.id, "ACTIVE")}
                              className={`px-1.5 py-0.5 rounded ${post.adStatus === "ACTIVE"
                                ? "bg-emerald-600 text-white font-bold"
                                : "text-zinc-600 hover:text-zinc-900"
                                }`}
                            >
                              Ativo
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateAdStatus(post.id, "PAUSED")}
                              className={`px-1.5 py-0.5 rounded ${post.adStatus === "PAUSED"
                                ? "bg-amber-600 text-white font-bold"
                                : "text-zinc-600 hover:text-zinc-900"
                                }`}
                            >
                              Pausado
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateAdStatus(post.id, "FINISHED")}
                              className={`px-1.5 py-0.5 rounded ${post.adStatus === "FINISHED"
                                ? "bg-zinc-600 text-white font-bold"
                                : "text-zinc-600 hover:text-zinc-900"
                                }`}
                            >
                              Finalizado
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-1 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            const fmt = (post.format || "").toLowerCase();
                            const pieceContent = fmt.includes("reel")
                              ? post.selectedReels || post.selectedCarousel || ""
                              : fmt.includes("carross")
                                ? post.selectedCarousel || post.selectedReels || ""
                                : post.selectedCarousel || post.selectedReels || post.copySiteLp || post.copyMetaAds || "";
                            const parts = [
                              post.selectedHeadline || "",
                              pieceContent,
                              post.selectedCaption || "",
                              post.callToAction || "",
                            ].filter(Boolean);
                            handleCopyText(parts.join("\n\n"), post.id);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-[11px] font-semibold flex items-center gap-1 transition"
                        >
                          {copiedId === post.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          {copiedId === post.id ? "Copiado!" : "Copiar Copy"}
                        </button>

                        <div className="flex items-center gap-1">
                          <Link
                            href={`/prompt-creator?contentId=${post.id}&tab=content`}
                            className="px-2 py-1 rounded-lg text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition inline-flex items-center gap-1"
                            title="Abrir peça completa no Estúdio Criativo (Brainstorm, Headlines, Roteiro e Arte)"
                          >
                            <Sparkles className="w-3 h-3" />
                            Estúdio
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(post)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition"
                            title="Editar post"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <ArchiveRecordAction url="/api/content-studio/calendar" payload={{ id: post.id, clientId: post.clientId }} archived={showArchived} onChanged={loadPosts} />
                          <button
                            type="button"
                            onClick={() => handleDeletePost(post.id)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:bg-rose-50 hover:text-rose-600 transition"
                            title="Excluir post"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal de Edição de Post */}
        {editingPost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-4 overflow-y-auto">
            <form
              onSubmit={handleSaveEdit}
              className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl space-y-4 my-8 max-h-[92vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <h3 className="text-base font-bold text-zinc-950">Editar Publicação</h3>
                <button
                  type="button"
                  onClick={() => setEditingPost(null)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">Título do Conteúdo</label>
                <input
                  type="text"
                  required
                  value={editForm.title}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">Tag do Post</label>
                  <input
                    type="text"
                    value={editForm.postTag}
                    placeholder="Ex: Carrossel, Reels, Topo de Funil..."
                    onChange={(e) => setEditForm((prev) => ({ ...prev, postTag: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl"
                  />
                </div>

                {editingPost.contentType === "ADS" ? (
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 block mb-1">Status do Anúncio</label>
                    <select
                      value={editForm.adStatus}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          adStatus: e.target.value as "ACTIVE" | "PAUSED" | "FINISHED",
                        }))
                      }
                      className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl font-semibold"
                    >
                      <option value="ACTIVE">Ativo / Rodando</option>
                      <option value="PAUSED">Pausado</option>
                      <option value="FINISHED">Finalizado</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 block mb-1">Tipo / Formato</label>
                    <select
                      value={editForm.format}
                      onChange={(e) => {
                        const nextFmt = e.target.value;
                        setEditForm((prev) => ({
                          ...prev,
                          format: nextFmt,
                          postTag: !prev.postTag || prev.postTag === prev.format ? nextFmt : prev.postTag,
                        }));
                      }}
                      className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl font-semibold"
                    >
                      <option value="Post estático">Post estático</option>
                      <option value="Carrossel">Carrossel</option>
                      <option value="Reels">Reels</option>
                      <option value="Stories">Stories</option>
                      <option value="Post em texto">Post em texto</option>
                      <option value="Landing page">Landing page</option>
                      <option value="Feed">Feed</option>
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">Headline Principal</label>
                <input
                  type="text"
                  value={editForm.selectedHeadline}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, selectedHeadline: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl font-semibold"
                />
              </div>

              {(() => {
                const fmtLower = (editForm.format || "").toLowerCase();
                const isReels = fmtLower.includes("reel");
                const isCarousel = fmtLower.includes("carross");
                const isLanding = fmtLower.includes("landing");
                const isAd = editingPost.contentType === "ADS";

                const fieldKey: "selectedReels" | "selectedCarousel" | "copySiteLp" | "copyMetaAds" = isReels
                  ? "selectedReels"
                  : isLanding
                    ? "copySiteLp"
                    : isAd
                      ? "copyMetaAds"
                      : "selectedCarousel";

                const fieldLabel = isReels
                  ? "Conteúdo (Roteiro do Reels / Vídeo)"
                  : isCarousel
                    ? "Conteúdo (Textos dos Cards / Slides do Carrossel)"
                    : isLanding
                      ? "Conteúdo (Copy da Landing Page)"
                      : isAd
                        ? "Conteúdo (Copy do Anúncio / Roteiro Ads)"
                        : "Conteúdo (Texto da Arte / Cards / Roteiro)";

                const fieldPlaceholder = isReels
                  ? "Escreva ou cole aqui as falas, ganchos, marcações de cena e textos na tela do Reels..."
                  : isCarousel
                    ? "Slide 1 (Capa): ...\n\nSlide 2: ...\n\nSlide Final (CTA): ..."
                    : "Escreva ou cole aqui o conteúdo interno da peça (texto nos cards, roteiro ou copy estruturada)...";

                return (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-zinc-700">{fieldLabel}</label>
                      <span className="text-[10px] font-medium text-emerald-700">
                        {isReels ? "Salvo no roteiro de Reels" : isCarousel ? "Salvo nos cards do Carrossel" : isLanding ? "Salvo na copy de LP" : isAd ? "Salvo na copy de Ads" : "Salvo no conteúdo da peça"}
                      </span>
                    </div>
                    <textarea
                      rows={6}
                      value={editForm[fieldKey]}
                      placeholder={fieldPlaceholder}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, [fieldKey]: e.target.value }))}
                      className="w-full px-3 py-2 text-xs font-mono bg-zinc-50 border border-zinc-200 rounded-xl leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                );
              })()}

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">Legenda do Post (Instagram / Descrição)</label>
                <textarea
                  rows={5}
                  value={editForm.selectedCaption}
                  placeholder="Legenda completa que acompanha a publicação no feed..."
                  onChange={(e) => setEditForm((prev) => ({ ...prev, selectedCaption: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">Data de Postagem</label>
                  <input
                    type="date"
                    value={editForm.scheduledDate}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, scheduledDate: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">Link do Post Publicado (URL)</label>
                  <input
                    type="url"
                    value={editForm.publishedUrl}
                    placeholder="https://instagram.com/p/..."
                    onChange={(e) => setEditForm((prev) => ({ ...prev, publishedUrl: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-zinc-100">
                <Link
                  href={`/prompt-creator?contentId=${editingPost.id}&tab=content`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Abrir no Estúdio Criativo
                </Link>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingPost(null)}
                    className="px-3.5 py-2 text-xs text-zinc-600 hover:text-zinc-950 font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="px-4 py-2 text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl disabled:opacity-50"
                  >
                    {savingEdit ? "Salvando..." : "Salvar Alterações"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </>
  );
}

export default function SavedPostsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-xs text-zinc-400">
          Carregando publicações...
        </div>
      }
    >
      <SavedPostsPageContent />
    </Suspense>
  );
}

