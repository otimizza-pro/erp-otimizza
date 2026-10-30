"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import {
  Truck,
  ArrowLeft,
  Save,
  Building2,
  User,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { validateDocument } from "@/shared/cpf-cnpj";

const SUPPLIER_CATEGORIES = [
  "Infraestrutura & Cloud",
  "SaaS & Softwares",
  "Consultoria & Assessoria",
  "Terceirização & Mão de Obra",
  "Jurídico & Contábil",
  "Marketing & Tráfego",
  "Equipamentos & Hardware",
  "Telecomunicação & Internet",
  "Geral / Outros",
];

export default function NewSupplierPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [personType, setPersonType] = useState<"PF" | "PJ">("PJ");
  const [name, setName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [document, setDocument] = useState("");
  const [category, setCategory] = useState("SaaS & Softwares");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Razão Social ou Nome Completo é obrigatório.");
      return;
    }

    if (document.trim() && !validateDocument(document.trim())) {
      setError(
        personType === "PJ"
          ? "CNPJ informado é inválido."
          : "CPF informado é inválido."
      );
      return;
    }

    setLoading(true);
    try {
      const payload = {
        personType,
        name: name.trim(),
        tradeName: tradeName.trim() || null,
        document: document.trim() || null,
        category: category || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        whatsapp: whatsapp.trim() || null,
        postalCode: postalCode.trim() || null,
        street: street.trim() || null,
        number: number.trim() || null,
        complement: complement.trim() || null,
        neighborhood: neighborhood.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        notes: notes.trim() || null,
      };

      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao salvar fornecedor.");
      }

      const created = await res.json();
      router.push(`/suppliers/${created.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell activeSection="suppliers">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between pb-2">
          <Link
            href="/suppliers"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar para Fornecedores</span>
          </Link>
          <span className="text-[11px] font-mono text-zinc-400">Novo Cadastro</span>
        </div>

        {/* Page Title */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 flex items-center gap-2.5">
            <Truck className="w-6 h-6 text-zinc-700" />
            Cadastrar Novo Fornecedor
          </h1>
          <p className="text-xs text-zinc-500">
            Preencha os dados do fornecedor ou parceiro para vinculação a serviços e lançamentos de despesas.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tipo de Pessoa */}
          <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-xs space-y-4">
            <h2 className="text-sm font-semibold text-zinc-900">Tipo de Fornecedor</h2>
            <div className="grid grid-cols-2 gap-3 max-w-md">
              <button
                type="button"
                onClick={() => setPersonType("PJ")}
                className={`p-3.5 rounded-xl border text-left transition flex items-center gap-3 ${
                  personType === "PJ"
                    ? "bg-zinc-900 text-white border-zinc-900 shadow-xs"
                    : "bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100"
                }`}
              >
                <Building2 className={`w-5 h-5 ${personType === "PJ" ? "text-white" : "text-zinc-500"}`} />
                <div>
                  <div className="text-xs font-semibold">Pessoa Jurídica (PJ)</div>
                  <div className={`text-[10px] ${personType === "PJ" ? "text-zinc-300" : "text-zinc-400"}`}>
                    Empresas com CNPJ
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPersonType("PF")}
                className={`p-3.5 rounded-xl border text-left transition flex items-center gap-3 ${
                  personType === "PF"
                    ? "bg-zinc-900 text-white border-zinc-900 shadow-xs"
                    : "bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100"
                }`}
              >
                <User className={`w-5 h-5 ${personType === "PF" ? "text-white" : "text-zinc-500"}`} />
                <div>
                  <div className="text-xs font-semibold">Pessoa Física (PF)</div>
                  <div className={`text-[10px] ${personType === "PF" ? "text-zinc-300" : "text-zinc-400"}`}>
                    Autônomos com CPF
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Dados Principais */}
          <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-xs space-y-4">
            <h2 className="text-sm font-semibold text-zinc-900">Identificação & Categoria</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5 md:col-span-2">
                <label className="font-medium text-zinc-700">
                  {personType === "PJ" ? "Razão Social *" : "Nome Completo *"}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={personType === "PJ" ? "Ex: Amazon Web Services Brasil LTDA" : "Ex: Carlos Eduardo de Oliveira"}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 focus:bg-white focus:border-zinc-400 focus:outline-none text-zinc-900 placeholder-zinc-400 transition"
                />
              </div>

              {personType === "PJ" && (
                <div className="space-y-1.5">
                  <label className="font-medium text-zinc-700">Nome Fantasia</label>
                  <input
                    type="text"
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                    placeholder="Ex: AWS Cloud"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 focus:bg-white focus:border-zinc-400 focus:outline-none text-zinc-900 placeholder-zinc-400 transition"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-medium text-zinc-700">
                  {personType === "PJ" ? "CNPJ (opcional)" : "CPF (opcional)"}
                </label>
                <input
                  type="text"
                  value={document}
                  onChange={(e) => setDocument(e.target.value)}
                  placeholder={personType === "PJ" ? "00.000.000/0000-00" : "000.000.000-00"}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 focus:bg-white focus:border-zinc-400 focus:outline-none text-zinc-900 placeholder-zinc-400 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-zinc-700">Categoria do Fornecedor</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 focus:bg-white focus:border-zinc-400 focus:outline-none text-zinc-900 transition"
                >
                  {SUPPLIER_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Contatos */}
          <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-xs space-y-4">
            <h2 className="text-sm font-semibold text-zinc-900">Canais de Contato</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-medium text-zinc-700">E-mail Comercial</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="financeiro@fornecedor.com.br"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 focus:bg-white focus:border-zinc-400 focus:outline-none text-zinc-900 placeholder-zinc-400 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-zinc-700">Telefone Principal</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 3456-7890"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 focus:bg-white focus:border-zinc-400 focus:outline-none text-zinc-900 placeholder-zinc-400 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-zinc-700">WhatsApp / Celular</label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="(11) 98765-4321"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 focus:bg-white focus:border-zinc-400 focus:outline-none text-zinc-900 placeholder-zinc-400 transition"
                />
              </div>
            </div>
          </div>

          {/* Endereço */}
          <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-xs space-y-4">
            <h2 className="text-sm font-semibold text-zinc-900">Localização & Endereço</h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-medium text-zinc-700">CEP</label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="00000-000"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 focus:bg-white focus:border-zinc-400 focus:outline-none text-zinc-900 placeholder-zinc-400 transition"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="font-medium text-zinc-700">Logradouro / Rua</label>
                <input
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="Av. Paulista"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 focus:bg-white focus:border-zinc-400 focus:outline-none text-zinc-900 placeholder-zinc-400 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-zinc-700">Número</label>
                <input
                  type="text"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="1000"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 focus:bg-white focus:border-zinc-400 focus:outline-none text-zinc-900 placeholder-zinc-400 transition"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="font-medium text-zinc-700">Complemento / Sala</label>
                <input
                  type="text"
                  value={complement}
                  onChange={(e) => setComplement(e.target.value)}
                  placeholder="Conjunto 402 - Bloco B"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 focus:bg-white focus:border-zinc-400 focus:outline-none text-zinc-900 placeholder-zinc-400 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-zinc-700">Bairro</label>
                <input
                  type="text"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="Bela Vista"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 focus:bg-white focus:border-zinc-400 focus:outline-none text-zinc-900 placeholder-zinc-400 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-zinc-700">Cidade</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="São Paulo"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 focus:bg-white focus:border-zinc-400 focus:outline-none text-zinc-900 placeholder-zinc-400 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-zinc-700">UF / Estado</label>
                <input
                  type="text"
                  maxLength={2}
                  value={state}
                  onChange={(e) => setState(e.target.value.toUpperCase())}
                  placeholder="SP"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 focus:bg-white focus:border-zinc-400 focus:outline-none text-zinc-900 placeholder-zinc-400 transition uppercase"
                />
              </div>
            </div>
          </div>

          {/* Observações */}
          <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-xs space-y-4">
            <h2 className="text-sm font-semibold text-zinc-900">Observações Comerciais</h2>
            <div className="space-y-1.5 text-xs">
              <label className="font-medium text-zinc-700">Notas Internas</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Condições de pagamento negociadas, SLAs, dados de contato de emergência, etc."
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 focus:bg-white focus:border-zinc-400 focus:outline-none text-zinc-900 placeholder-zinc-400 transition"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/suppliers"
              className="px-5 py-2.5 rounded-full border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition shadow-2xs"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 transition shadow-xs disabled:opacity-50 active:scale-[0.98]"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? "Cadastrando..." : "Salvar Fornecedor"}</span>
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
