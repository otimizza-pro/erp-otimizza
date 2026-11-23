"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
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
} from "lucide-react";
import { AudienceAiPlanner } from "@/components/content-studio/audience-ai-planner";

export interface ClientAudienceItem {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  demographics: string | null;
  pain_points: string[];
  desires: string[];
  objections: string[];
  is_default: boolean;
  archived_at: string | null;
}

interface ClientAudiencesManagerProps {
  clientId: string;
  clientName?: string;
  onAudiencesChange?: (audiences: ClientAudienceItem[]) => void;
}

export function ClientAudiencesManager({
  clientId,
  clientName,
  onAudiencesChange,
}: ClientAudiencesManagerProps) {
  const [audiences, setAudiences] = useState<ClientAudienceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal / Form state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAudience, setEditingAudience] = useState<ClientAudienceItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form inputs
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDemographics, setFormDemographics] = useState("");
  const [formPainPoints, setFormPainPoints] = useState("");
  const [formDesires, setFormDesires] = useState("");
  const [formObjections, setFormObjections] = useState("");
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const onAudiencesChangeRef = useRef(onAudiencesChange);
  const listRequest = useRef(0);
  useEffect(() => {
    onAudiencesChangeRef.current = onAudiencesChange;
  }, [onAudiencesChange]);

  const loadAudiences = useCallback(async () => {
    if (!clientId) return;
    const request = ++listRequest.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/content-studio/audiences?clientId=${encodeURIComponent(clientId)}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Erro ao carregar públicos do cliente.");
      const data = await res.json();
      const list: ClientAudienceItem[] = data.audiences || [];
      if (request !== listRequest.current) return;
      setAudiences(list);
      onAudiencesChangeRef.current?.(list);
    } catch (err) {
      if (request !== listRequest.current) return;
      console.error(err);
      setError(err instanceof Error ? err.message : "Falha ao carregar públicos.");
    } finally {
      if (request === listRequest.current) setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadAudiences();
    return () => { listRequest.current++; };
  }, [loadAudiences]);

  const openCreateModal = () => {
    setEditingAudience(null);
    setFormName("");
    setFormDescription("");
    setFormDemographics("");
    setFormPainPoints("");
    setFormDesires("");
    setFormObjections("");
    setFormIsDefault(audiences.length === 0);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (aud: ClientAudienceItem) => {
    setEditingAudience(aud);
    setFormName(aud.name);
    setFormDescription(aud.description || "");
    setFormDemographics(aud.demographics || "");
    setFormPainPoints((aud.pain_points || []).join("\n"));
    setFormDesires((aud.desires || []).join("\n"));
    setFormObjections((aud.objections || []).join("\n"));
    setFormIsDefault(Boolean(aud.is_default));
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
        isDefault: formIsDefault,
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
      await loadAudiences();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao salvar público.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente excluir o público "${name}"?`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/content-studio/audiences?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao remover público.");
      }
      await loadAudiences();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Falha ao remover público.");
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
          isDefault: true,
        }),
      });
      if (!res.ok) {
        throw new Error("Erro ao definir como padrão.");
      }
      await loadAudiences();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Falha ao atualizar público padrão.");
    }
  };

  return (
    <div className="space-y-4">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-purple-600" />
              Públicos Segmentados & Personas ({audiences.length})
            </h3>
            {audiences.length > 0 && (
              <span className="text-[10px] bg-purple-50 text-purple-700 font-semibold px-2 py-0.5 rounded-full border border-purple-100">
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-2xs transition cursor-pointer"
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
        <div className="p-6 text-center bg-purple-50/40 rounded-2xl border border-dashed border-purple-200 space-y-3">
          <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 mx-auto flex items-center justify-center">
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
                    ? "border-purple-300 ring-2 ring-purple-500/10 shadow-xs"
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
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold">
                            <Star className="w-2.5 h-2.5 fill-purple-700 text-purple-700" />
                            Principal
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSetDefault(aud)}
                            title="Tornar este o público principal"
                            className="text-[10px] text-zinc-400 hover:text-purple-600 transition"
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
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 flex items-center gap-1">
                          <ShieldAlert className="w-2.5 h-2.5" /> Objeções Comuns
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {aud.objections.slice(0, 2).map((obj, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200 line-clamp-1 max-w-[200px]"
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
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Criar / Editar Público */}
      {modalOpen && createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-audience-title"
            className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl border border-zinc-200 shadow-2xl p-6 sm:p-7 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 id="modal-audience-title" className="text-sm font-bold text-zinc-950 flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-purple-600" />
                  {editingAudience ? "Editar Público-Alvo" : "Cadastrar Novo Público-Alvo"}
                </h3>
                <p className="text-xs text-zinc-500">
                  Defina características, dores e objeções deste segmento para nortear a IA.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition"
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
              <div>
                <label className="text-xs font-semibold text-zinc-800 block mb-1">
                  Nome do Público *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Empresários PME, Profissionais Liberais, Médicos..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-800 block mb-1">
                  Descrição / Perfil do Público
                </label>
                <textarea
                  rows={3}
                  placeholder="Quem são, qual o momento atual, tamanho da empresa ou rotina..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 min-h-[75px] resize-y leading-relaxed"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-800 block mb-1">
                  Perfil Demográfico (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 30 a 55 anos, decisores de compra, todo o Brasil..."
                  value={formDemographics}
                  onChange={(e) => setFormDemographics(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-amber-800 block mb-1">
                    Dores (1 por linha)
                  </label>
                  <textarea
                    rows={7}
                    placeholder="Pouco tempo&#10;Falta de clientes&#10;Incerteza nas vendas"
                    value={formPainPoints}
                    onChange={(e) => setFormPainPoints(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[150px] resize-y leading-relaxed"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-emerald-800 block mb-1">
                    Desejos (1 por linha)
                  </label>
                  <textarea
                    rows={7}
                    placeholder="Escalar faturamento&#10;Ter previsibilidade&#10;Mais liberdade"
                    value={formDesires}
                    onChange={(e) => setFormDesires(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[150px] resize-y leading-relaxed"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-purple-800 block mb-1">
                    Objeções (1 por linha)
                  </label>
                  <textarea
                    rows={7}
                    placeholder="Já me frustrei antes&#10;Acho caro&#10;Não tenho tempo"
                    value={formObjections}
                    onChange={(e) => setFormObjections(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[150px] resize-y leading-relaxed"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-zinc-700">
                  <input
                    type="checkbox"
                    checked={formIsDefault}
                    onChange={(e) => setFormIsDefault(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span>Definir como público prioritário / padrão</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-3 py-1.5 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold shadow-2xs transition disabled:opacity-50 cursor-pointer"
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
