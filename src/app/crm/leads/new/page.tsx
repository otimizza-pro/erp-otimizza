"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import {
  Users,
  ArrowLeft,
  Building,
  User,
  Save,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { formatDocument } from "@/shared/cpf-cnpj";

export default function NewLeadPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

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
  });

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
      const res = await fetch("/api/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao salvar lead.");
      }

      router.push(`/crm/leads/${data.id}`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Erro inesperado.");
      setLoading(false);
    }
  };

  return (
    <AppShell activeSection="crm_leads">
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
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-xs font-bold cursor-pointer transition ${
                  form.personType === "PJ"
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
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-xs font-bold cursor-pointer transition ${
                  form.personType === "PF"
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
                <label className="text-xs font-semibold text-zinc-700 block mb-1">Telefone</label>
                <input
                  type="text"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="(00) 0000-0000"
                  className="w-full px-3.5 py-2 text-xs bg-zinc-50/50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">WhatsApp</label>
                <input
                  type="text"
                  name="whatsapp"
                  value={form.whatsapp}
                  onChange={handleChange}
                  placeholder="(00) 90000-0000"
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
    </AppShell>
  );
}
