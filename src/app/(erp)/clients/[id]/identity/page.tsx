"use client";
import {useCompany} from "@/lib/context/company-context";
import {INTERNAL_COMPANY_ID} from "@/modules/clients/internal-company";

import {IdentityAiButton} from "@/components/clients/identity-ai-button";
import type {IdentityAiField} from "@/modules/clients/identity-ai";
import {CommunicationProfileFields} from "@/components/clients/communication-profile";
import {CommunicationProfileSchema,emptyCommunicationProfile} from "@/modules/clients/communication-profile";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import {
  ArrowLeft,
  Save,
  Sparkles,
  Building2,
  Check,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Hash,
  ShieldAlert,
  MessageSquare,
  Globe,
  Instagram,
  Target,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/whatsapp";

const ARCHETYPES = [
  { id: "SABIO", name: "O Sábio / Especialista", desc: "Autoridade, precisão técnica, dados, didática e clareza profunda." },
  { id: "AMIGO", name: "O Amigo / Parceiro", desc: "Proximidade, empatia, diálogo acessível e suporte constante." },
  { id: "CRIADOR", name: "O Criador / Visionário", desc: "Inovação, originalidade, design arrojado e soluções fora da caixa." },
  { id: "HEROI", name: "O Herói / Conquistador", desc: "Superação de desafios, alta performance, foco em resultados e vitórias." },
  { id: "MAGO", name: "O Mago / Transformador", desc: "Transformação rápida, visão estratégica, saltos de crescimento e impacto." },
  { id: "GOVERNANTE", name: "O Governante / Líder", desc: "Liderança de mercado, segurança, governança, estabilidade e solidez." },
];

const PRESET_TONES = [
  "Direto e didático",
  "Sem juridiquês ou jargões vazios",
  "Focado em decisões e crescimento",
  "Orientado a dados com clareza",
  "Enérgico e persuasivo",
  "Empático e consultivo",
  "Sofisticado e exclusivo",
  "Provocativo e instigante",
  "Calmo e acolhedor",
  "Técnico e fundamentado",
];

export default function ClientIdentityPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const {selectCompany}=useCompany();

  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form Fields
  const [communicationProfile,setCommunicationProfile]=useState(emptyCommunicationProfile);
  const [valueProposition, setValueProposition] = useState("");
  const [marketNiche, setMarketNiche] = useState("");
  const [archetype, setArchetype] = useState("");
  const [selectedTones, setSelectedTones] = useState<string[]>([]);
  const [newCustomTone, setNewCustomTone] = useState("");
  const [brandContext, setBrandContext] = useState("");

  const [targetAudiences, setTargetAudiences] = useState<string[]>([]);
  const [newAudience, setNewAudience] = useState("");

  const [painPoints, setPainPoints] = useState<string[]>([]);
  const [newPain, setNewPain] = useState("");

  const [differentials, setDifferentials] = useState<string[]>([]);
  const [newDifferential, setNewDifferential] = useState("");

  const [forbiddenWords, setForbiddenWords] = useState<string[]>([]);
  const [newForbidden, setNewForbidden] = useState("");

  const [mandatoryTerms, setMandatoryTerms] = useState<string[]>([]);
  const [newMandatory, setNewMandatory] = useState("");

  const [defaultCtas, setDefaultCtas] = useState<string[]>([]);
  const [newCta, setNewCta] = useState("");

  const [instagramHandle, setInstagramHandle] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [whatsappCta, setWhatsappCta] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [cRes, idRes] = await Promise.all([
          fetch(`/api/clients/${id}`),
          fetch(`/api/clients/${id}/identity`),
        ]);

        if (cRes.ok) {
          const c = await cRes.json();
          setClientName(c.tradeName || c.name);
        }

        if (idRes.ok) {
          const data = await idRes.json();
          setValueProposition(data.valueProposition || "");
          setCommunicationProfile(CommunicationProfileSchema.parse(data.communicationProfile||{}));
          setMarketNiche(data.marketNiche || "");
          setArchetype(data.archetype || "");
          setSelectedTones(data.toneOfVoice || []);
          setBrandContext(data.brandContext || "");
          setTargetAudiences(data.targetAudiences || []);
          setPainPoints(data.painPoints || []);
          setDifferentials(data.differentials || []);
          setForbiddenWords(data.forbiddenWords || []);
          setMandatoryTerms(data.mandatoryTerms || []);
          setDefaultCtas(data.defaultCtas || []);
          setInstagramHandle(data.instagramHandle || "");
          setWebsiteUrl(data.websiteUrl || "");
          setWhatsappCta(data.whatsappCta || "");
          setNotes(data.notes || "");
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadData();
    }
  }, [id]);

  const draftIdentity = {valueProposition,marketNiche,archetype,toneOfVoice:selectedTones,brandContext,targetAudiences,painPoints,differentials,forbiddenWords,mandatoryTerms,defaultCtas,notes,communicationProfile};
  const aiButton = (field:IdentityAiField) => <IdentityAiButton clientId={id} field={field} draft={draftIdentity} onApply={value=>{
    const asText=Array.isArray(value)?value.join("\n"):value;const asList=Array.isArray(value)?value:[value];
    const setters={marketNiche:()=>setMarketNiche(asText),valueProposition:()=>setValueProposition(asText),brandContext:()=>setBrandContext(asText),archetype:()=>setArchetype(asText),toneOfVoice:()=>setSelectedTones(asList),targetAudiences:()=>setTargetAudiences(asList),painPoints:()=>setPainPoints(asList),differentials:()=>setDifferentials(asList),forbiddenWords:()=>setForbiddenWords(asList),mandatoryTerms:()=>setMandatoryTerms(asList),defaultCtas:()=>setDefaultCtas(asList),notes:()=>setNotes(asText),communicationDetails:()=>setCommunicationProfile({...communicationProfile,details:asText})};setters[field]();
  }}/>;

  const toggleTone = (tone: string) => {
    if (selectedTones.includes(tone)) {
      setSelectedTones(selectedTones.filter((t) => t !== tone));
    } else {
      setSelectedTones([...selectedTones, tone]);
    }
  };

  const handleAddCustomTone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomTone.trim()) return;
    if (!selectedTones.includes(newCustomTone.trim())) {
      setSelectedTones([...selectedTones, newCustomTone.trim()]);
    }
    setNewCustomTone("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const payload = {
        communicationProfile,
        valueProposition,
        marketNiche,
        archetype,
        toneOfVoice: selectedTones,
        brandContext,
        painPoints,
        differentials,
        forbiddenWords,
        mandatoryTerms,
        defaultCtas,
        instagramHandle,
        websiteUrl,
        whatsappCta,
        notes,
      };

      const res = await fetch(`/api/clients/${id}/identity`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setFeedback("Identidade do cliente salva com sucesso! Os novos conteúdos gerados já usarão este DNA.");
        setTimeout(() => setFeedback(null), 4000);
      } else {
        alert("Erro ao salvar identidade.");
      }
    } catch (e) {
      console.error(e);
      alert("Falha de conexão ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <div className="p-16 text-center text-xs text-zinc-400">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-zinc-600" />
          Carregando Identidade e DNA da Marca...
        </div>
      </>
    );
  }

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-6 pb-20">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-zinc-200 shadow-2xs">
          <div className="flex items-center gap-3">
            <Link
              href={`/clients/${id}`}
              className="p-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-600 transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                  DNA & Estratégia
                </span>
                <span className="text-xs text-zinc-400">• {clientName}</span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-950 mt-1 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Identidade do Cliente & Diretrizes de Conteúdo
              </h1>
              <p className="text-xs text-zinc-500">
                Informações e presets que a IA e a equipe utilizam para criar posts, anúncios e roteiros fiéis ao tom da marca.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition shadow-2xs disabled:opacity-50 cursor-pointer self-start sm:self-auto"
          >
            <Save className="w-4 h-4" />
            {saving ? "Salvando..." : "Salvar Identidade"}
          </button>
        </div>

        {feedback && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{feedback}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <CommunicationProfileFields value={communicationProfile} onChange={setCommunicationProfile} detailsAction={aiButton("communicationDetails")}/>
          {/* 1. Proposta de Valor e Nicho */}
          <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2">
              1. Posicionamento, Nicho & Proposta de Valor
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">
                  Nicho de Mercado & Atuação
                </label>
                {aiButton("marketNiche")}
                <input
                  type="text"
                  placeholder="Ex: Clínicas Odontológicas de Alto Padrão, Assessoria Contábil..."
                  value={marketNiche}
                  onChange={(e) => setMarketNiche(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">
                  Promessa Central / Proposta de Valor
                </label>
                {aiButton("valueProposition")}
                <input
                  type="text"
                  placeholder="Ex: Aumentar o faturamento da clínica com pacientes particulares..."
                  value={valueProposition}
                  onChange={(e) => setValueProposition(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700 block mb-1">
                Contexto, História e DNA da Marca (Usado pela IA na geração de textos)
              </label>
                {aiButton("brandContext")}
              <textarea
                rows={3}
                placeholder="Conte a história da empresa, valores centrais, modelo de entrega e como ela se diferencia..."
                value={brandContext}
                onChange={(e) => setBrandContext(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>
          </div>

          {/* 2. Arquétipo da Marca */}
          <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-4">
            <div>
              <h2 className="text-sm font-bold text-zinc-900 mb-0.5">2. Arquétipo de Marca</h2>{aiButton("archetype")}
              <p className="text-[11px] text-zinc-500">
                Selecione o arquétipo que melhor define a postura e a personalidade da comunicação.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {ARCHETYPES.map((arch) => {
                const isSelected = archetype === arch.name || archetype === arch.id;

                return (
                  <div
                    key={arch.id}
                    onClick={() => setArchetype(arch.name)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                      isSelected
                        ? "bg-purple-50/70 border-purple-400 ring-2 ring-purple-600/20"
                        : "bg-zinc-50/60 border-zinc-200 hover:border-zinc-300"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-zinc-900">{arch.name}</span>
                        {isSelected && <Check className="w-4 h-4 text-purple-700" />}
                      </div>
                      <p className="text-[11px] text-zinc-500 leading-relaxed">{arch.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Tom de Voz (Checkboxes / Caixas de Diálogo) */}
          <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-4">
            <div>
              <h2 className="text-sm font-bold text-zinc-900 mb-0.5">
                3. Tom de Voz (Marque com X os que combinam com este cliente)
              </h2>{aiButton("toneOfVoice")}
              <p className="text-[11px] text-zinc-500">
                Estes tons ficarão marcados automaticamente no Estúdio de Criação de Conteúdo & IA.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {PRESET_TONES.map((tone) => {
                const isChecked = selectedTones.includes(tone);

                return (
                  <label
                    key={tone}
                    onClick={() => toggleTone(tone)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs cursor-pointer select-none transition ${
                      isChecked
                        ? "bg-zinc-900 text-white border-zinc-900 font-semibold shadow-2xs"
                        : "bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="sr-only"
                    />
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                        isChecked
                          ? "bg-white text-zinc-900 border-white"
                          : "border-zinc-300 bg-white"
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span>{tone}</span>
                  </label>
                );
              })}
            </div>

            {/* Adicionar tom customizado */}
            <div className="flex items-center gap-2 pt-2 border-t border-zinc-100">
              <input
                type="text"
                placeholder="Adicionar outro tom específico (Ex: Bem-humorado com trocadilhos)..."
                value={newCustomTone}
                onChange={(e) => setNewCustomTone(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCustomTone(e);
                  }
                }}
                className="flex-1 px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
              <button
                type="button"
                onClick={handleAddCustomTone}
                className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold rounded-xl transition"
              >
                + Adicionar Tom
              </button>
            </div>
          </div>

          {/* 4. Públicos-Alvo & Dores */}
          <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2">
              4. Públicos-Alvo, ICP & Dores Principais
            </h2>

            <div className="space-y-3"><h3 className="text-xs font-semibold text-zinc-700">Públicos cadastrados</h3><p className="text-xs leading-relaxed text-zinc-500">O cadastro é único para o DNA, Estúdio, calendário e campanhas. Edite descrições, dores, desejos e objeções na gestão de públicos.</p><div className="flex flex-wrap gap-2">{targetAudiences.map(aud=><span key={aud} className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs">{aud}</span>)}</div><Link className="inline-flex rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold" href="/prompt-creator/configuracoes?tab=publicos" onClick={()=>selectCompany({id:id===INTERNAL_COMPANY_ID?"otimizza":id,name:clientName,isOtimizza:id===INTERNAL_COMPANY_ID})}>Gerenciar públicos e gerar com IA</Link></div>
            {/* Dores */}
            <div className="space-y-2 pt-2 border-t border-zinc-100">
              <label className="text-xs font-semibold text-zinc-700 block">Dores e Objeções do Cliente</label>
                {aiButton("painPoints")}
              <div className="flex flex-wrap gap-2">
                {painPoints.map((pain, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium"
                  >
                    <span>{pain}</span>
                    <button
                      type="button"
                      onClick={() => setPainPoints(painPoints.filter((_, i) => i !== idx))}
                      className="hover:text-rose-600"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Nova dor (Ex: Medo de gastar e não ter retorno em anúncios)..."
                  value={newPain}
                  onChange={(e) => setNewPain(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (newPain.trim()) {
                        setPainPoints([...painPoints, newPain.trim()]);
                        setNewPain("");
                      }
                    }
                  }}
                  className="flex-1 px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newPain.trim()) {
                      setPainPoints([...painPoints, newPain.trim()]);
                      setNewPain("");
                    }
                  }}
                  className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold rounded-xl"
                >
                  + Adicionar Dor
                </button>
              </div>
            </div>
          </div>

          {/* 5. Palavras Proibidas e CTAs */}
          <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2">
              5. Diretrizes Rígidas: Palavras Proibidas & CTAs Padrão
            </h2>

            {/* Palavras Proibidas */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-rose-700 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                Palavras Proibidas (Termos que a IA NUNCA deve gerar para este cliente)
              </label>
              {aiButton("forbiddenWords")}
              <div className="flex flex-wrap gap-2">
                {forbiddenWords.map((word, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-medium"
                  >
                    <span>{word}</span>
                    <button
                      type="button"
                      onClick={() => setForbiddenWords(forbiddenWords.filter((_, i) => i !== idx))}
                      className="hover:text-rose-900"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Termo proibido (Ex: 'Garantia de 10x', 'Barato', 'Promoção relâmpago')..."
                  value={newForbidden}
                  onChange={(e) => setNewForbidden(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (newForbidden.trim()) {
                        setForbiddenWords([...forbiddenWords, newForbidden.trim()]);
                        setNewForbidden("");
                      }
                    }
                  }}
                  className="flex-1 px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newForbidden.trim()) {
                      setForbiddenWords([...forbiddenWords, newForbidden.trim()]);
                      setNewForbidden("");
                    }
                  }}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl border border-rose-200"
                >
                  + Proibir Palavra
                </button>
              </div>
            </div>

            {/* CTAs Sugeridas */}
            <div className="space-y-2 pt-2 border-t border-zinc-100">
              <label className="text-xs font-semibold text-zinc-700 block">Chamadas para Ação (CTAs) Sugeridas</label>
                {aiButton("defaultCtas")}
              <div className="flex flex-wrap gap-2">
                {defaultCtas.map((cta, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium"
                  >
                    <span>{cta}</span>
                    <button
                      type="button"
                      onClick={() => setDefaultCtas(defaultCtas.filter((_, i) => i !== idx))}
                      className="hover:text-rose-600"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Nova CTA (Ex: 'Comente RESULTADO para receber o diagnóstico no direct')..."
                  value={newCta}
                  onChange={(e) => setNewCta(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (newCta.trim()) {
                        setDefaultCtas([...defaultCtas, newCta.trim()]);
                        setNewCta("");
                      }
                    }
                  }}
                  className="flex-1 px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newCta.trim()) {
                      setDefaultCtas([...defaultCtas, newCta.trim()]);
                      setNewCta("");
                    }
                  }}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-200"
                >
                  + Adicionar CTA
                </button>
              </div>
            </div>
          </div>

          {/* 6. Canais e Redes */}
          <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2">
              6. Redes e Links de Destino
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1 flex items-center gap-1">
                  <Instagram className="w-3.5 h-3.5 text-pink-600" />
                  Instagram do Cliente
                </label>
                <input
                  type="text"
                  placeholder="@perfil.cliente"
                  value={instagramHandle}
                  onChange={(e) => setInstagramHandle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-blue-600" />
                  Site ou Landing Page
                </label>
                <input
                  type="url"
                  placeholder="https://cliente.com.br"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1 flex items-center gap-1">
                  <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600" />
                  Link WhatsApp CTA
                </label>
                <input
                  type="text"
                  placeholder="https://wa.me/55..."
                  value={whatsappCta}
                  onChange={(e) => setWhatsappCta(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>
            </div>
          </div>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-5"><h2 className="text-sm font-bold text-zinc-900">Diferenciais e orientações complementares</h2>{([{field:"differentials",label:"Diferenciais comprovados",value:differentials.join("\n"),set:(text:string)=>setDifferentials(text.split("\n").filter(Boolean))},{field:"mandatoryTerms",label:"Termos obrigatórios",value:mandatoryTerms.join("\n"),set:(text:string)=>setMandatoryTerms(text.split("\n").filter(Boolean))},{field:"notes",label:"Observações editoriais",value:notes,set:setNotes}] as const).map(item=><div key={item.field}><label className="mb-2 block text-xs font-semibold text-zinc-700" htmlFor={item.field}>{item.label}</label>{aiButton(item.field)}<textarea id={item.field} rows={3} value={item.value} onChange={event=>item.set(event.target.value)} className="block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs outline-none focus:bg-white focus:border-zinc-500"/></div>)}</section>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200">
            <Link
              href={`/clients/${id}`}
              className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-950"
            >
              Voltar ao Cliente
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? "Salvando..." : "Salvar Identidade & DNA"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

