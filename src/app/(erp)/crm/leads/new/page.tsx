"use client";

import { useCompany } from "@/lib/context/company-context";
import { LeadSourceInput } from "@/components/crm/lead-source-input";
import {ServiceInterestInput} from "@/components/crm/service-interest-input";
import { CommercialDnaFields } from "@/components/crm/commercial-dna";
import { emptyCommercialDna } from "@/modules/crm/commercial-dna-schema";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  Users,
  ArrowLeft,
  Building,
  User,
  Save,
  AlertCircle,
  CheckCircle2,
  Phone,
  Layers,
  DollarSign,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/whatsapp";
import { formatDocument } from "@/shared/cpf-cnpj";
import { toast } from "@/components/ui/toast-provider";

interface PipelineStage {
  id: string;
  name: string;
  stageType: string;
}

interface PipelineOption {
  id: string;
  name: string;
  isDefault: boolean;
  stages?: PipelineStage[];
}

export default function NewLeadPage() {
  const { selectedCompany } = useCompany();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [commercialDna, setCommercialDna] = useState(emptyCommercialDna);

  const [form, setForm] = useState({
    personType: "PJ" as "PF" | "PJ",
    name: "",
    tradeName: "",
    document: "",
    email: "",
    phone: "",
    whatsapp: "",
    primaryContact: "",
    segment: "",
    city: "",
    state: "",
    source: "Indicação",
    notes: "",
    acquisitionType: "NAO_INFORMADO" as "INBOUND" | "OUTBOUND" | "NAO_INFORMADO",
    leadSource: "",
    firstContactChannel: "",
    serviceOfInterest: "",
    urgencyTimeline: "",
    estimatedBudget: "",
    needSummary: "",
  });

  // Funil e Oportunidade Integrada
  const [pipelines, setPipelines] = useState<PipelineOption[]>([]);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === "document") {
      setForm((prev) => ({ ...prev, [name]: formatDocument(value) }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      const numericBudget = form.estimatedBudget ? parseFloat(form.estimatedBudget.replace(/\./g, "").replace(",", ".")) : 0;
      const res = await fetch("/api/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          commercialDna,
          ownerClientId: selectedCompany.isOtimizza ? null : selectedCompany.id,
          source: form.leadSource || form.source,
          estimatedBudget: isNaN(numericBudget) ? 0 : numericBudget,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao salvar lead.");
      }

      toast.success("Lead cadastrado com sucesso!");
      router.push(`/crm/leads/${data.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro inesperado.";
      setErrorMsg(msg);
      toast.error(msg);
      setLoading(false);
    }
  };

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-6 pb-16">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/crm/leads"
              className="p-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 transition shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-950">Novo Lead Comercial</h1>
              <p className="text-xs text-zinc-500">Cadastre um novo contato para início do processo de qualificação.</p>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs space-y-6">
          {/* Tipo de Pessoa */}
          <div>
            <label className="text-xs font-bold text-zinc-700 block mb-2">Tipo de Cadastro</label>
            <div className="flex items-center gap-3">
              <label
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-xs font-bold cursor-pointer transition ${form.personType === "PJ"
                  ? "bg-zinc-900 text-white border-zinc-900 shadow-xs"
                  : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
                  }`}
              >
                <input
                  type="radio"
                  name="personType"
                  value="PJ"
                  checked={form.personType === "PJ"}
                  onChange={() => setForm((prev) => ({ ...prev, personType: "PJ" }))}
                  className="hidden"
                />
                <Building className="w-4 h-4" /> Pessoa Jurídica (Empresa)
              </label>

              <label
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-xs font-bold cursor-pointer transition ${form.personType === "PF"
                  ? "bg-zinc-900 text-white border-zinc-900 shadow-xs"
                  : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
                  }`}
              >
                <input
                  type="radio"
                  name="personType"
                  value="PF"
                  checked={form.personType === "PF"}
                  onChange={() => setForm((prev) => ({ ...prev, personType: "PF" }))}
                  className="hidden"
                />
                <User className="w-4 h-4" /> Pessoa Física (Individual)
              </label>
            </div>
          </div>

          {/* Dados Principais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-zinc-700 block mb-1">
                {form.personType === "PJ" ? "Razão Social *" : "Nome Completo *"}
              </label>
              <input
                type="text"
                name="name"
                required
                value={form.name}
                onChange={handleChange}
                placeholder={form.personType === "PJ" ? "Ex: Empresa de Tecnologia Ltda" : "Ex: Carlos Silva"}
                className="w-full px-3.5 py-2 text-xs bg-zinc-50/50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700 block mb-1">
                {form.personType === "PJ" ? "Nome Fantasia" : "Apelido / Como prefere ser chamado"}
              </label>
              <input
                type="text"
                name="tradeName"
                value={form.tradeName}
                onChange={handleChange}
                placeholder="Ex: Tech Solutions"
                className="w-full px-3.5 py-2 text-xs bg-zinc-50/50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700 block mb-1">
                {form.personType === "PJ" ? "CNPJ (opcional)" : "CPF (opcional)"}
              </label>
              <input
                type="text"
                name="document"
                value={form.document}
                onChange={handleChange}
                placeholder={form.personType === "PJ" ? "00.000.000/0000-00" : "000.000.000-00"}
                className="w-full px-3.5 py-2 text-xs bg-zinc-50/50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700 block mb-1">Canal de Origem</label>
              <select
                name="source"
                value={form.source}
                onChange={handleChange}
                className="w-full px-3 py-2 text-xs bg-zinc-50/50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white font-medium"
              >
                <option value="Indicação">Indicação de Cliente / Parceiro</option>
                <option value="Google Ads">Google Ads</option>
                <option value="Instagram">Instagram</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Prospecção Ativa">Prospecção Ativa (Outbound)</option>
                <option value="Evento">Evento / Feira</option>
                <option value="OUTROS">Outros</option>
              </select>
            </div>
          </div>

          {/* Contato & Localização */}
          <div className="pt-4 border-t border-zinc-100">
            <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider mb-3">Contato & Localização</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">E-mail</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="contato@empresa.com"
                  className="w-full px-3.5 py-2 text-xs bg-zinc-50/50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-zinc-400" />
                  Telefone
                </label>
                <input
                  type="text"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="(11) 3211-0000"
                  className="w-full px-3.5 py-2 text-xs bg-zinc-50/50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1 flex items-center gap-1 text-emerald-700 font-semibold">
                  <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600" />
                  WhatsApp
                </label>
                <input
                  type="text"
                  name="whatsapp"
                  value={form.whatsapp}
                  onChange={handleChange}
                  placeholder="(11) 98765-4321"
                  className="w-full px-3.5 py-2 text-xs bg-zinc-50/50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">Contato Principal / Cargo</label>
                <input
                  type="text"
                  name="primaryContact"
                  value={form.primaryContact}
                  onChange={handleChange}
                  placeholder="Ex: Ana Souza - Gerente de Marketing"
                  className="w-full px-3.5 py-2 text-xs bg-zinc-50/50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">Cidade</label>
                <input
                  type="text"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  placeholder="Ex: São Paulo"
                  className="w-full px-3.5 py-2 text-xs bg-zinc-50/50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">Estado (UF)</label>
                <input
                  type="text"
                  name="state"
                  maxLength={2}
                  value={form.state}
                  onChange={handleChange}
                  placeholder="SP"
                  className="w-full px-3.5 py-2 text-xs bg-zinc-50/50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white uppercase"
                />
              </div>
            </div>
          </div>

          {/* Origem & Estratégia de Aquisição */}
          <div className="pt-4 border-t border-zinc-100 space-y-4">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Origem & Aquisição</h2>
              <p className="text-[11px] text-zinc-500">Diferencie a natureza de captação (Inbound vs Outbound), a origem e o canal de contato.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">Tipo de Aquisição *</label>
                <select
                  name="acquisitionType"
                  value={form.acquisitionType}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 text-xs bg-zinc-50/50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white font-medium"
                >
                  <option value="NAO_INFORMADO">Não informado</option><option value="INBOUND">INBOUND (Captação Receptiva - Lead Procurou)</option>
                  <option value="OUTBOUND">OUTBOUND (Prospecção Ativa - Otimizza Procurou)</option>
                </select>
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  {form.acquisitionType === "INBOUND"
                    ? "O cliente entrou em contato por iniciativa própria."
                    : "A Otimizza identificou a empresa e realizou abordagem ativa."}
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">Origem do Lead *</label>
                <LeadSourceInput value={form.leadSource} onChange={value => setForm(prev => ({...prev, leadSource:value}))} />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">Canal de Primeiro Contato *</label>
                <select
                  name="firstContactChannel"
                  value={form.firstContactChannel}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 text-xs bg-zinc-50/50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white"
                >
                  <option value="">Não informado</option><option value="WhatsApp">WhatsApp</option>
                  <option value="Telefone">Ligação Telefônica</option>
                  <option value="Formulário do Site">Formulário no Site</option>
                  <option value="Instagram Direct">Instagram Direct</option>
                  <option value="Facebook Messenger">Facebook Messenger</option>
                  <option value="E-mail">E-mail</option>
                  <option value="Presencial">Reunião / Visita Presencial</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
            </div>
          </div>

          {/* Diagnóstico Inicial & Qualificação (Opcional) */}
          <div className="pt-4 border-t border-zinc-100 space-y-4">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Qualificação & Perfil de Interesse</h2>
              <p className="text-[11px] text-zinc-500">Dados coletados na primeira conversa para apoiar a decisão de avanço comercial.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">Serviço de Interesse Principal</label>
                <ServiceInterestInput value={form.serviceOfInterest} onChange={value=>setForm(prev=>({...prev,serviceOfInterest:value}))}/>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">Urgência / Momento de Compra</label>
                <select
                  name="urgencyTimeline"
                  value={form.urgencyTimeline}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 text-xs bg-zinc-50/50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white"
                >
                  <option value="">Não informado</option><option value="Imediato (Urgente)">Imediato (Quer começar já)</option>
                  <option value="Próximos 15 dias">Curto Prazo (Próximos 15 dias)</option>
                  <option value="Próximo mês">Médio Prazo (Próximo mês)</option>
                  <option value="Futuro / Pesquisando">Pesquisando / Apenas orçando</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">Faixa de Investimento Estimada (R$)</label>
                <input
                  type="text"
                  name="estimatedBudget"
                  value={form.estimatedBudget}
                  onChange={handleChange}
                  placeholder="Ex: 1.500,00"
                  className="w-full px-3.5 py-2 text-xs bg-zinc-50/50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700 block mb-1">Necessidade ou Problema Apresentado pelo Lead</label>
              <textarea
                rows={5}
                name="needSummary"
                value={form.needSummary}
                onChange={handleChange}
                placeholder="Ex: Não tem presença digital e precisa gerar mais contatos no WhatsApp para vendas locais."
                className="w-full min-h-32 resize-y px-3.5 py-2 text-xs bg-zinc-50/50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white"
              />
            </div>
          </div>

          <p className="text-sm p-4 bg-zinc-50 rounded-xl">Depois de cadastrar, qualifique o lead na ficha. A criação da oportunidade é uma ação separada; passar por nutrição é opcional.</p>

          <section className="space-y-4 border-t border-zinc-100 pt-5"><h2 className="text-sm font-bold text-zinc-900">DNA comercial inicial</h2><p className="text-xs text-zinc-500">Pode preencher agora ou completar na ficha. Cliente ideal, objetivo e escopo serão usados nas propostas e preservados na conversão em cliente.</p><CommercialDnaFields value={commercialDna} onChange={setCommercialDna} /></section>
          {/* Observações */}
          <div className="pt-4 border-t border-zinc-100">
            <label className="text-xs font-semibold text-zinc-700 block mb-1">Observações e Histórico Inicial</label>
            <textarea
              name="notes"
              rows={3}
              value={form.notes}
              onChange={handleChange}
              placeholder="Descreva detalhes sobre a necessidade do lead, contexto de mercado ou canais de contato..."
              className="w-full px-3.5 py-2 text-xs bg-zinc-50/50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white"
            />
          </div>

          {/* Botões no final da página */}
          <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-3">
            <Link
              href="/crm/leads"
              className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-950 transition"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition shadow-xs flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? "Salvando Lead..." : "Salvar Lead"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
