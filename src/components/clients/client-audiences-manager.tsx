"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { confirmAction } from "@/components/ui/confirm-dialog";
import {
  Users,
  Plus,
  Sparkles,
  Trash2,
  Edit3,
  Star,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  RefreshCw,
  Target,
  ShieldAlert,
  Flame,
  Heart,
  Globe,
  Package,
} from "lucide-react";
import { AudienceAiPlanner } from "@/components/content-studio/audience-ai-planner";
import { toast } from "@/components/ui/toast-provider";

export interface ClientAudienceItem {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  demographics: string | null;
  pain_points: string[];
  desires: string[];
  objections: string[];
  digital_behavior?: string | null;
  is_default: boolean;
  archived_at: string | null;
  linkedCatalogItemIds?: string[];
  linkedCatalogItems?: { id: string; name: string; type: string }[];
}

interface ClientAudiencesManagerProps {
  clientId: string;
  clientName?: string;
  onAudiencesChange?: (audiences: ClientAudienceItem[]) => void;
  catalogItems?: Array<{ id: string; name: string; type?: string }>;
}

export function ClientAudiencesManager({
  clientId,
  clientName,
  onAudiencesChange,
  catalogItems: propCatalogItems,
}: ClientAudiencesManagerProps) {
  const [audiences, setAudiences] = useState<ClientAudienceItem[]>([]);
  const [catalogItems, setCatalogItems] = useState<{ id: string; name: string; type: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal / Form state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAudience, setEditingAudience] = useState<ClientAudienceItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form inputs (4 Pilares)
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDemographics, setFormDemographics] = useState("");
  const [formPainPoints, setFormPainPoints] = useState("");
  const [formDesires, setFormDesires] = useState("");
  const [formObjections, setFormObjections] = useState("");
  const [formDigitalBehavior, setFormDigitalBehavior] = useState("");
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formCatalogItemIds, setFormCatalogItemIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const onAudiencesChangeRef = useRef(onAudiencesChange);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    onAudiencesChangeRef.current = onAudiencesChange;
  }, [onAudiencesChange]);

  const loadCatalog = useCallback(async () => {
    if (!clientId) return;
    try {
      const res = await fetch(`/api/clients/${encodeURIComponent(clientId)}/catalog`, { cache: "no-store" });
      if (res.ok) {
        const catData = await res.json();
        if (Array.isArray(catData.items)) {
          setCatalogItems(
            catData.items.map((it: { id: string; name: string; type: string }) => ({
              id: it.id,
              name: it.name,
              type: it.type || "PRODUCT",
            }))
          );
        }
      }
    } catch (e) {
      console.warn("Erro ao recarregar catálogo no audiences manager:", e);
    }
  }, [clientId]);

  useEffect(() => {
    if (propCatalogItems && propCatalogItems.length > 0) {
      setCatalogItems(
        propCatalogItems.map((it) => ({
          id: it.id,
          name: it.name,
          type: it.type || "PRODUCT",
        }))
      );
    }
  }, [propCatalogItems]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && modalOpen) {
        setModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen]);

  const loadAudiences = useCallback(async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [audRes, catRes] = await Promise.all([
        fetch(`/api/content-studio/audiences?clientId=${encodeURIComponent(clientId)}`, { cache: "no-store" }),
        fetch(`/api/clients/${encodeURIComponent(clientId)}/catalog`, { cache: "no-store" }),
      ]);
      if (!audRes.ok) {
        const errJson = await audRes.json().catch(() => ({}));
        throw new Error(errJson.error || "Erro ao carregar públicos do cliente.");
      }
      const data = await audRes.json();
      const list: ClientAudienceItem[] = data.audiences || [];
      if (catRes.ok) {
        const catData = await catRes.json();
        if (Array.isArray(catData.items)) {
          setCatalogItems(catData.items.map((it: { id: string; name: string; type: string }) => ({
            id: it.id,
            name: it.name,
            type: it.type || "PRODUCT",
          })));
        }
      }
      if (isMountedRef.current) {
        setAudiences(list);
        onAudiencesChangeRef.current?.(list);
      }
    } catch (err) {
      if (isMountedRef.current) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Falha ao carregar públicos.");
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [clientId]);

  useEffect(() => {
    void loadAudiences();
  }, [loadAudiences]);

  const openCreateModal = () => {
    void loadCatalog();
    setEditingAudience(null);
    setFormName("");
    setFormDescription("");
    setFormDemographics("");
    setFormPainPoints("");
    setFormDesires("");
    setFormObjections("");
    setFormDigitalBehavior("");
    setFormIsDefault(audiences.length === 0);
    setFormCatalogItemIds([]);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (aud: ClientAudienceItem) => {
    void loadCatalog();
    setEditingAudience(aud);
    setFormName(aud.name);
    setFormDescription(aud.description || "");
    setFormDemographics(aud.demographics || "");
    setFormPainPoints((aud.pain_points || []).join("\n"));
    setFormDesires((aud.desires || []).join("\n"));
    setFormObjections((aud.objections || []).join("\n"));
    setFormDigitalBehavior(aud.digital_behavior || "");
    setFormIsDefault(Boolean(aud.is_default));
    setFormCatalogItemIds(aud.linkedCatalogItemIds || aud.linkedCatalogItems?.map((it) => it.id) || []);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!formName.trim()) {
      setFormError("O nome do público é obrigatório.");
      return;
    }

    setSaving(true);
    setFormError(null);

    const painPoints = formPainPoints
      .split("\n")
      .map((p) => p.trim())
      .filter(Boolean);
    const desires = formDesires
      .split("\n")
      .map((d) => d.trim())
      .filter(Boolean);
    const objections = formObjections
      .split("\n")
      .map((o) => o.trim())
      .filter(Boolean);

    try {
      const isEditing = Boolean(editingAudience);
      const url = "/api/content-studio/audiences";
      const method = isEditing ? "PUT" : "POST";
      const payload = {
        id: editingAudience?.id,
        clientId,
        name: formName.trim(),
        description: formDescription.trim() || null,
        demographics: formDemographics.trim() || null,
        painPoints,
        desires,
        objections,
        digitalBehavior: formDigitalBehavior.trim() || null,
        isDefault: formIsDefault,
        catalogItemIds: formCatalogItemIds,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.audience?.id) {
        throw new Error(data.error || "Não foi possível salvar o público.");
      }

      const saved: ClientAudienceItem = data.audience;
      const updated = audiences.filter(item => item.id !== saved.id)
        .map(item => saved.is_default ? { ...item, is_default: false } : item);
      updated.push(saved);
      updated.sort((a, b) => Number(b.is_default) - Number(a.is_default) || a.name.localeCompare(b.name, "pt-BR"));
      setAudiences(updated);
      onAudiencesChangeRef.current?.(updated);
      setModalOpen(false);
      toast.success(editingAudience ? "Público atualizado com sucesso!" : "Novo público cadastrado com sucesso!");
      await loadAudiences();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar público.";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!(await confirmAction({ title: "Excluir público", message: `Deseja realmente excluir o público "${name}"?`, confirmLabel: "Excluir", tone: "danger" }))) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/content-studio/audiences?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao remover público.");
      }
      toast.success("Público excluído com sucesso.");
      await loadAudiences();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao remover público.";
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (aud: ClientAudienceItem) => {
    if (aud.is_default) return;
    try {
      const res = await fetch("/api/content-studio/audiences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: aud.id,
          clientId,
          name: aud.name,
          description: aud.description,
          demographics: aud.demographics,
          painPoints: aud.pain_points,
          desires: aud.desires,
          objections: aud.objections,
          digitalBehavior: aud.digital_behavior,
          isDefault: true,
        }),
      });
      if (!res.ok) {
        throw new Error("Erro ao definir como padrão.");
      }
      toast.success(`"${aud.name}" definido como público padrão.`);
      await loadAudiences();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao atualizar público padrão.";
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              Públicos Segmentados & Personas ({audiences.length})
            </h3>
            {audiences.length > 0 && (
              <span className="text-[10px] bg-emerald-50 text-emerald-800 font-semibold px-2 py-0.5 rounded-full border border-emerald-100">
                {audiences.length} {audiences.length === 1 ? "cadastrado" : "cadastrados"}
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Empresas frequentemente atendem perfis distintos. Cada público orienta dores, desejos, linguagem e anúncios.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <AudienceAiPlanner clientId={clientId} onSaved={loadAudiences} />
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Público
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={loadAudiences}
            className="underline font-semibold hover:text-rose-900"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && audiences.length === 0 ? (
        <div className="p-8 text-center text-xs text-zinc-400 bg-zinc-50 rounded-2xl border border-zinc-200">
          <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-zinc-500" />
          Carregando públicos do cliente...
        </div>
      ) : audiences.length === 0 ? (
        /* Empty State */
        <div className="p-6 text-center bg-emerald-50/40 rounded-2xl border border-dashed border-emerald-200 space-y-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-zinc-900">Nenhum público segmentado cadastrado ainda</h4>
            <p className="text-xs text-zinc-500 max-w-md mx-auto mt-1">
              Cadastre perfis como <em>Empresários</em>, <em>Profissionais Liberais</em> ou <em>Consumidores Finais</em> para criar conteúdos e propostas sob medida.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold shadow-2xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Criar Público Manualmente
            </button>
            <AudienceAiPlanner clientId={clientId} onSaved={loadAudiences} />
          </div>
        </div>
      ) : (
        /* Grid of Audiences */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {audiences.map((aud) => {
            const hasPains = (aud.pain_points || []).length > 0;
            const hasDesires = (aud.desires || []).length > 0;
            const hasObjections = (aud.objections || []).length > 0;

            return (
              <div
                key={aud.id}
                className={`p-4 rounded-2xl border transition flex flex-col justify-between bg-white ${
                  aud.is_default
                    ? "border-emerald-300 ring-2 ring-emerald-500/10 shadow-xs"
                    : "border-zinc-200 hover:border-zinc-300 shadow-2xs"
                }`}
              >
                <div className="space-y-2.5">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-zinc-950 truncate">
                          {aud.name}
                        </span>
                        {aud.is_default ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            <Star className="w-2.5 h-2.5 fill-emerald-700 text-emerald-700" />
                            Principal
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSetDefault(aud)}
                            title="Tornar este o público principal"
                            className="text-[10px] text-zinc-400 hover:text-emerald-600 transition"
                          >
                            Definir como principal
                          </button>
                        )}
                      </div>
                      {aud.demographics && (
                        <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">
                          {aud.demographics}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditModal(aud)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition"
                        title="Editar público"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === aud.id}
                        onClick={() => handleDelete(aud.id, aud.name)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition disabled:opacity-50"
                        title="Excluir público"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  {aud.description && (
                    <p className="text-xs text-zinc-600 leading-relaxed line-clamp-3">
                      {aud.description}
                    </p>
                  )}

                  {/* Highlights / Pills */}
                  <div className="space-y-1.5 pt-1">
                    {hasPains && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1">
                          <Flame className="w-2.5 h-2.5" /> Dores Principais
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {aud.pain_points.slice(0, 3).map((pain, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 line-clamp-1 max-w-[200px]"
                              title={pain}
                            >
                              {pain}
                            </span>
                          ))}
                          {aud.pain_points.length > 3 && (
                            <span className="text-[10px] text-zinc-400 self-center">
                              +{aud.pain_points.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {hasDesires && (
                      <div className="space-y-1 pt-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                          <Heart className="w-2.5 h-2.5" /> Desejos & Objetivos
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {aud.desires.slice(0, 3).map((desire, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 line-clamp-1 max-w-[200px]"
                              title={desire}
                            >
                              {desire}
                            </span>
                          ))}
                          {aud.desires.length > 3 && (
                            <span className="text-[10px] text-zinc-400 self-center">
                              +{aud.desires.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {hasObjections && (
                      <div className="space-y-1 pt-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
                          <ShieldAlert className="w-2.5 h-2.5 text-amber-600" /> Objeções Comuns
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {aud.objections.slice(0, 2).map((obj, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 line-clamp-1 max-w-[200px]"
                              title={obj}
                            >
                              {obj}
                            </span>
                          ))}
                          {aud.objections.length > 2 && (
                            <span className="text-[10px] text-zinc-400 self-center">
                              +{aud.objections.length - 2}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Pilar 4: Comportamento no Digital */}
                    {aud.digital_behavior && (
                      <div className="space-y-1 pt-1.5 border-t border-zinc-100">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1">
                          <Globe className="w-2.5 h-2.5" /> Comportamento no Digital (Meta & Google Ads)
                        </span>
                        <p className="text-[11px] text-zinc-600 bg-blue-50/60 p-2 rounded-xl border border-blue-100/80 leading-relaxed line-clamp-2">
                          {aud.digital_behavior}
                        </p>
                      </div>
                    )}

                    {/* Vínculo com Produtos & Serviços do Catálogo */}
                    {aud.linkedCatalogItems && aud.linkedCatalogItems.length > 0 && (
                      <div className="space-y-1 pt-1.5 border-t border-zinc-100">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                          <Package className="w-2.5 h-2.5 text-emerald-600" /> Produtos / Serviços Vinculados ({aud.linkedCatalogItems.length})
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {aud.linkedCatalogItems.map((prod) => (
                            <span
                              key={prod.id}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 line-clamp-1 max-w-[200px]"
                              title={prod.name}
                            >
                              {prod.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Criar / Editar Público com os 4 Pilares */}
      {modalOpen && createPortal(
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-zinc-950/45 p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-audience-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl border border-zinc-200 shadow-2xl p-6 sm:p-7 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 id="modal-audience-title" className="text-sm font-bold text-zinc-950 flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-emerald-600" />
                  {editingAudience ? "Editar Público-Alvo (4 Pilares)" : "Cadastrar Novo Público-Alvo (4 Pilares)"}
                </h3>
                <p className="text-xs text-zinc-500">
                  Estrutura completa em 4 pilares pronta para Tráfego Pago e linha editorial de Social Media.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveForm} className="space-y-4">
              {/* Identificação Geral */}
              <div>
                <label className="text-xs font-semibold text-zinc-800 block mb-1">
                  Nome do Público *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Reabilitação, Postural, Atletas..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Vínculo de Produtos e Serviços */}
              <div className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-200/80 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-emerald-600" />
                    Produtos & Serviços Associados a Este Público
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md border border-emerald-200">
                      {formCatalogItemIds.length} de {catalogItems.length} selecionado(s)
                    </span>
                    {catalogItems.length > 0 && (
                      <div className="flex items-center gap-1 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setFormCatalogItemIds(catalogItems.map((c) => c.id))}
                          className="text-emerald-700 hover:text-emerald-900 font-medium underline cursor-pointer"
                        >
                          Todos
                        </button>
                        <span className="text-emerald-300">•</span>
                        <button
                          type="button"
                          onClick={() => setFormCatalogItemIds([])}
                          className="text-emerald-700 hover:text-emerald-900 font-medium underline cursor-pointer"
                        >
                          Limpar
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-emerald-800/90 leading-relaxed">
                  Vincule quais produtos e serviços deste cliente são consumidos ou destinados a esta persona. A IA usará este vínculo para sugerir a oferta certa em cada conteúdo:
                </p>

                {catalogItems.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {catalogItems.map((item) => {
                      const selected = formCatalogItemIds.includes(item.id);
                      const isService = item.type === "SERVICE";
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setFormCatalogItemIds((prev) =>
                              selected ? prev.filter((id) => id !== item.id) : [...prev, item.id]
                            );
                          }}
                          className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border font-semibold transition cursor-pointer select-none shadow-2xs ${
                            selected
                              ? "bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-600/30"
                              : "bg-white text-zinc-700 border-zinc-200 hover:border-emerald-300 hover:bg-emerald-50/30"
                          }`}
                        >
                          {selected ? (
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          ) : (
                            <Plus className="w-3.5 h-3.5 text-zinc-400" />
                          )}
                          <span>{item.name}</span>
                          <span
                            className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-bold ${
                              selected
                                ? "bg-white/20 text-white"
                                : isService
                                ? "bg-blue-50 text-blue-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {isService ? "Serviço" : "Produto"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 bg-white/80 rounded-xl border border-dashed border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-900">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        Nenhum produto ou serviço cadastrado ainda no catálogo do cliente.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void loadCatalog()}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-[11px] font-semibold transition cursor-pointer self-start sm:self-auto shrink-0"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Recarregar catálogo
                    </button>
                  </div>
                )}
              </div>

              {/* Pilar 1: Dados Demográficos (Quem são) */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-600" />
                  1. Dados Demográficos & Perfil (Quem são)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 block mb-1">
                      Idade, Gênero e Localização (Raio de atuação)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 35 a 65 anos, homens e mulheres, raio de 3 a 5 km, classe A/B..."
                      value={formDemographics}
                      onChange={(e) => setFormDemographics(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 block mb-1">
                      Ocupação / Rotina / Momento
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Profissionais de escritório, pessoas com dor crônica, praticantes de corrida..."
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Pilares 2 e 3: Dores e Desejos */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/80 space-y-1.5">
                  <label className="text-xs font-bold text-amber-900 block flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-amber-600" />
                    2. Dores e Problemas
                  </label>
                  <span className="text-[10px] text-amber-700 block">Dores físicas e impacto na rotina (1 por linha)</span>
                  <textarea
                    rows={6}
                    placeholder="Dor física latente (hérnia, dores articulares)&#10;Impacto na rotina diária&#10;Insegurança ao se movimentar"
                    value={formPainPoints}
                    onChange={(e) => setFormPainPoints(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[160px] resize-y leading-relaxed"
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200/80 space-y-1.5">
                  <label className="text-xs font-bold text-emerald-900 block flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5 text-emerald-600" />
                    3. Desejos e Objetivos
                  </label>
                  <span className="text-[10px] text-emerald-700 block">Objetivo primário e transformação (1 por linha)</span>
                  <textarea
                    rows={6}
                    placeholder="Viver sem dor e recuperar mobilidade&#10;Mais disposição e leveza no corpo&#10;Autonomia para atividades cotidianas"
                    value={formDesires}
                    onChange={(e) => setFormDesires(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[160px] resize-y leading-relaxed"
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-amber-50/40 border border-amber-200/70 space-y-1.5">
                  <label className="text-xs font-bold text-amber-950 block flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                    Medos e Objeções
                  </label>
                  <span className="text-[10px] text-amber-700 block">Travas e receios do cliente (1 por linha)</span>
                  <textarea
                    rows={6}
                    placeholder="Já me frustrei antes&#10;Medo de piorar a lesão&#10;Acho que não tenho tempo"
                    value={formObjections}
                    onChange={(e) => setFormObjections(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[160px] resize-y leading-relaxed"
                  />
                </div>
              </div>

              {/* Pilar 4: Comportamento no Digital */}
              <div className="p-4 rounded-xl bg-sky-50/40 border border-sky-200/70 space-y-2">
                <span className="text-[11px] font-bold text-sky-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-sky-600" />
                  4. Comportamento e Interesses no Digital (Como alcançar)
                </span>
                <p className="text-[11px] text-sky-800/80 leading-relaxed">
                  Interesses para segmentação no Meta Ads e termos que esse público digita na busca do Google ou Google Meu Negócio.
                </p>
                <textarea
                  rows={4}
                  placeholder="Ex: Interesses Meta: Fisioterapia, Pilates, Saúde e Bem-Estar. Palavras-chave Google: fisioterapia perto de mim, alívio de dor na coluna, studio de pilates..."
                  value={formDigitalBehavior}
                  onChange={(e) => setFormDigitalBehavior(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-sky-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 min-h-[130px] resize-y leading-relaxed"
                />
              </div>

              <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-zinc-700">
                  <input
                    type="checkbox"
                    checked={formIsDefault}
                    onChange={(e) => setFormIsDefault(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Definir como público prioritário / padrão</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition disabled:opacity-50 cursor-pointer"
                  >
                    {saving ? "Salvando..." : editingAudience ? "Atualizar Público" : "Salvar Público"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
