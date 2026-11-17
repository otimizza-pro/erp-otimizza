"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
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
  promptUsed?: string;
  toneOfVoice?: string;
  callToAction?: string;
  createdAt: string;
}

export default function SavedPostsPage() {
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<"SOCIAL_MEDIA" | "ADS">("SOCIAL_MEDIA");
  const [adStatusFilter, setAdStatusFilter] = useState<"ALL" | "ACTIVE" | "PAUSED" | "FINISHED">("ALL");
  const [loading, setLoading] = useState(true);

  // Modal de Edição
  const [editingPost, setEditingPost] = useState<PostItem | null>(null);
  const [editForm, setEditForm] = useState<{
    title: string;
    postTag: string;
    adStatus: "ACTIVE" | "PAUSED" | "FINISHED";
    selectedHeadline: string;
    selectedCaption: string;
    callToAction: string;
    scheduledDate: string;
  }>({
    title: "",
    postTag: "",
    adStatus: "ACTIVE",
    selectedHeadline: "",
    selectedCaption: "",
    callToAction: "",
    scheduledDate: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Upload state
  const [uploadingPostId, setUploadingPostId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Carregar Clientes
  useEffect(() => {
    fetch("/api/clients?limit=100")
      .then((res) => res.json())
      .then((json) => {
        const list = Array.isArray(json) ? json : json.clients || [];
        setClients(list.map((c: { id: string; name: string; tradeName?: string }) => ({
          id: c.id,
          name: c.tradeName || c.name,
        })));
      })
      .catch((err) => console.error(err));
  }, []);

  // Carregar Posts
  const loadPosts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedClientId !== "ALL") params.set("clientId", selectedClientId);
      params.set("contentType", activeTab);
      if (activeTab === "ADS" && adStatusFilter !== "ALL") {
        params.set("adStatus", adStatusFilter);
      }

      const res = await fetch(`/api/content-studio/posts?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setPosts(json.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [selectedClientId, activeTab, adStatusFilter]);

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
      if (!upJson.success) throw new Error(upJson.error || "Falha no upload");

      // Salva a imageUrl no post
      await fetch(`/api/content-studio/posts/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: upJson.imageUrl }),
      });

      await loadPosts();
    } catch (err) {
      console.error(err);
      alert("Erro ao fazer upload da imagem.");
    } finally {
      setUploadingPostId(null);
    }
  };

  // Alterar Status do Anúncio (Ativo, Pausado, Finalizado)
  const handleUpdateAdStatus = async (postId: string, newStatus: "ACTIVE" | "PAUSED" | "FINISHED") => {
    try {
      await fetch(`/api/content-studio/posts/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adStatus: newStatus }),
      });
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, adStatus: newStatus } : p))
      );
    } catch (e) {
      console.error(e);
    }
  };

  // Excluir Post
  const handleDeletePost = async (postId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta publicação salva?")) return;
    try {
      const res = await fetch(`/api/content-studio/posts/${postId}`, { method: "DELETE" });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      }
    } catch (e) {
      alert("Erro ao excluir post.");
    }
  };

  // Abrir Modal de Edição
  const handleOpenEdit = (p: PostItem) => {
    setEditingPost(p);
    setEditForm({
      title: p.title,
      postTag: p.postTag || "",
      adStatus: p.adStatus,
      selectedHeadline: p.selectedHeadline || "",
      selectedCaption: p.selectedCaption || "",
      callToAction: p.callToAction || "",
      scheduledDate: p.scheduledDate || "",
    });
  };

  // Salvar Edição
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost) return;
    setSavingEdit(true);

    try {
      const res = await fetch(`/api/content-studio/posts/${editingPost.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (res.ok) {
        setEditingPost(null);
        await loadPosts();
      } else {
        alert("Erro ao salvar alterações.");
      }
    } catch (e) {
      alert("Erro de conexão.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <AppShell activeSection="prompt_creator">
      <div className="max-w-7xl mx-auto space-y-6 pb-24">
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
                <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                  Estúdio de Conteúdo & IA
                </span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-950 mt-1 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Feed & Criativos Salvos dos Clientes
              </h1>
              <p className="text-xs text-zinc-500">
                Organize os posts no formato de feed (4:3), suba imagens e gerencie campanhas de Ads ativas, pausadas e finalizadas.
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

        {/* Barra de Filtros: Cliente + Abas Social Media / Ads */}
        <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* Seletor de Cliente */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-600">Cliente:</span>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              >
                <option value="ALL">Todos os Clientes</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Separador */}
            <div className="h-5 w-px bg-zinc-200 hidden md:block" />

            {/* Alternador Social Media vs Ads */}
            <div className="flex items-center bg-zinc-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab("SOCIAL_MEDIA")}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  activeTab === "SOCIAL_MEDIA"
                    ? "bg-white text-zinc-950 shadow-2xs"
                    : "text-zinc-600 hover:text-zinc-950"
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-pink-600" />
                Social Media (Feed 4:3)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("ADS")}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  activeTab === "ADS"
                    ? "bg-white text-zinc-950 shadow-2xs"
                    : "text-zinc-600 hover:text-zinc-950"
                }`}
              >
                <Megaphone className="w-3.5 h-3.5 text-blue-600" />
                Campanhas & Ads
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
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                  adStatusFilter === "ALL" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setAdStatusFilter("ACTIVE")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                  adStatusFilter === "ACTIVE"
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
                }`}
              >
                🟢 Ativos
              </button>
              <button
                type="button"
                onClick={() => setAdStatusFilter("PAUSED")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                  adStatusFilter === "PAUSED"
                    ? "bg-amber-600 text-white"
                    : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
                }`}
              >
                🟡 Pausados
              </button>
              <button
                type="button"
                onClick={() => setAdStatusFilter("FINISHED")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                  adStatusFilter === "FINISHED"
                    ? "bg-zinc-600 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                ⚪ Finalizados
              </button>
            </div>
          )}
        </div>

        {/* Feed Grid (Visualização em Formato de Feed 4:3) */}
        {loading ? (
          <div className="p-20 text-center text-xs text-zinc-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-zinc-600" />
            Carregando publicações e criativos...
          </div>
        ) : posts.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-2xl border border-zinc-200 text-xs text-zinc-400 space-y-3">
            <ImageIcon className="w-10 h-10 text-zinc-300 mx-auto" />
            <p className="font-semibold text-zinc-700">Nenhum conteúdo salvo nesta categoria.</p>
            <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
              Acesse o Estúdio de Conteúdo & IA para gerar headlines, legendas e criativos e salve-os diretamente aqui.
            </p>
            <Link
              href="/prompt-creator"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white font-semibold rounded-xl"
            >
              <Sparkles className="w-3.5 h-3.5" /> Abrir Estúdio de Criação
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => {
              const isAd = post.contentType === "ADS";

              return (
                <div
                  key={post.id}
                  className="bg-white border border-zinc-200/90 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  {/* Container da Imagem com Aspect Ratio 4:3 Exato */}
                  <div className="relative aspect-[4/3] bg-zinc-950 overflow-hidden group">
                    {post.imageUrl ? (
                      <img
                        src={post.imageUrl}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-zinc-900 to-zinc-950 text-white">
                        <ImageIcon className="w-8 h-8 text-zinc-500 mb-2" />
                        <span className="text-xs font-semibold text-zinc-400">
                          {isAd ? "Criativo do Anúncio" : "Imagem do Post (4:3)"}
                        </span>
                        <span className="text-[10px] text-zinc-600 mt-1 max-w-[200px] line-clamp-2">
                          {post.selectedHeadline || post.title}
                        </span>
                      </div>
                    )}

                    {/* Botão de Upload Overlay */}
                    <label
                      className="absolute bottom-3 right-3 p-2 bg-black/60 hover:bg-black/90 backdrop-blur-xs text-white rounded-xl cursor-pointer transition shadow-md flex items-center gap-1.5 text-[10px] font-semibold"
                      title="Subir / Trocar imagem (formato feed 4:3)"
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
                      <span className="px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold">
                        {post.clientTradeName || post.clientName}
                      </span>
                    </div>

                    {/* Status de Anúncio se for ADS */}
                    {isAd && (
                      <div className="absolute top-3 right-3">
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold shadow-xs ${
                            post.adStatus === "ACTIVE"
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
                      {/* Tag do Post & Formato */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          <Tag className="w-2.5 h-2.5" />
                          {post.postTag || (isAd ? "Meta Ads" : "Feed Social")}
                        </span>

                        <span className="text-[10px] text-zinc-400 font-mono">
                          {post.format}
                        </span>
                      </div>

                      {/* Headline */}
                      <h3 className="font-bold text-xs text-zinc-950 line-clamp-2 mb-1">
                        {post.selectedHeadline || post.title}
                      </h3>

                      {/* Legenda / Copy Preview */}
                      {post.selectedCaption && (
                        <p className="text-[11px] text-zinc-600 line-clamp-3 leading-relaxed whitespace-pre-line bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
                          {post.selectedCaption}
                        </p>
                      )}

                      {/* CTA */}
                      {post.callToAction && (
                        <div className="mt-2 text-[10px] font-semibold text-emerald-700 bg-emerald-50/70 px-2.5 py-1 rounded-lg border border-emerald-100 flex items-center gap-1">
                          <span>CTA:</span>
                          <span className="truncate">{post.callToAction}</span>
                        </div>
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
                              className={`px-1.5 py-0.5 rounded ${
                                post.adStatus === "ACTIVE"
                                  ? "bg-emerald-600 text-white font-bold"
                                  : "text-zinc-600 hover:text-zinc-900"
                              }`}
                            >
                              Ativo
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateAdStatus(post.id, "PAUSED")}
                              className={`px-1.5 py-0.5 rounded ${
                                post.adStatus === "PAUSED"
                                  ? "bg-amber-600 text-white font-bold"
                                  : "text-zinc-600 hover:text-zinc-900"
                              }`}
                            >
                              Pausado
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateAdStatus(post.id, "FINISHED")}
                              className={`px-1.5 py-0.5 rounded ${
                                post.adStatus === "FINISHED"
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
                          onClick={() =>
                            handleCopyText(
                              `${post.selectedHeadline ? `${post.selectedHeadline}\n\n` : ""}${
                                post.selectedCaption || ""
                              }${post.callToAction ? `\n\n${post.callToAction}` : ""}`,
                              post.id
                            )
                          }
                          className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-[11px] font-semibold flex items-center gap-1 transition"
                        >
                          {copiedId === post.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          {copiedId === post.id ? "Copiado!" : "Copiar Copy"}
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(post)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition"
                            title="Editar post"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
            <form
              onSubmit={handleSaveEdit}
              className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl space-y-4 my-8"
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

                {editingPost.contentType === "ADS" && (
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

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">Legenda / Copy Completa</label>
                <textarea
                  rows={5}
                  value={editForm.selectedCaption}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, selectedCaption: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl leading-relaxed"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">Chamada para Ação (CTA)</label>
                <input
                  type="text"
                  value={editForm.callToAction}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, callToAction: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
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
            </form>
          </div>
        )}
      </div>
    </AppShell>
  );
}
