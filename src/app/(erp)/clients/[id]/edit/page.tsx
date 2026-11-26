"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  AlertCircle,
  Building2,
  User,
  Phone,
  Mail,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/whatsapp";
import { Client, ClientContact } from "@/modules/clients/types";

export default function EditClientPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [type, setType] = useState<"PF" | "PJ">("PJ");
  const [name, setName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [document, setDocument] = useState("");
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

  const [contacts, setContacts] = useState<Array<{
    name: string;
    role?: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
    isPrimary?: boolean;
  }>>([]);

  useEffect(() => {
    async function loadClient() {
      setInitialLoading(true);
      try {
        const res = await fetch(`/api/clients/${id}`);
        if (!res.ok) throw new Error("Cliente não encontrado.");
        const data: Client = await res.json();

        setType(data.type);
        setName(data.name || "");
        setTradeName(data.tradeName || "");
        setDocument(data.document || "");
        setEmail(data.email || "");
        setPhone(data.phone || "");
        setWhatsapp(data.whatsapp || "");
        setPostalCode(data.postalCode || "");
        setStreet(data.street || "");
        setNumber(data.number || "");
        setComplement(data.complement || "");
        setNeighborhood(data.neighborhood || "");
        setCity(data.city || "");
        setState(data.state || "");
        setNotes(data.notes || "");

        if (data.contacts && data.contacts.length > 0) {
          setContacts(
            data.contacts.map((c) => ({
              name: c.name,
              role: c.role || "",
              email: c.email || "",
              phone: c.phone || "",
              whatsapp: c.whatsapp || "",
              isPrimary: !!c.isPrimary,
            }))
          );
        } else {
          setContacts([{ name: "", role: "", email: "", phone: "", whatsapp: "", isPrimary: true }]);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Erro ao carregar dados do cliente.");
      } finally {
        setInitialLoading(false);
      }
    }

    if (id) {
      loadClient();
    }
  }, [id]);

  const addContact = () => {
    setContacts([
      ...contacts,
      { name: "", role: "", email: "", phone: "", whatsapp: "", isPrimary: false },
    ]);
  };

  const removeContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index));
  };

  const updateContact = (
    index: number,
    field: "name" | "role" | "email" | "phone" | "whatsapp" | "isPrimary",
    value: string | boolean
  ) => {
    const updated = [...contacts];
    if (field === "isPrimary" && value === true) {
      updated.forEach((c, i) => (c.isPrimary = i === index));
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setContacts(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const validContacts = contacts.filter((c) => c.name.trim() !== "");

      const payload = {
        name,
        tradeName: tradeName || null,
        document: document || null,
        email: email || null,
        phone: phone || null,
        whatsapp: whatsapp || null,
        postalCode: postalCode || null,
        street: street || null,
        number: number || null,
        complement: complement || null,
        neighborhood: neighborhood || null,
        city: city || null,
        state: state || null,
        notes: notes || null,
        contacts: validContacts,
      };

      const res = await fetch(`/api/clients/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao atualizar cliente.");
      }

      setSuccess(true);
      router.refresh();
      setTimeout(() => {
        router.push(`/clients/${id}`);
      }, 800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <>
        <div className="p-16 text-center text-zinc-400 text-xs">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-zinc-600" />
          Carregando dados do cliente...
        </div>
      </>
    );
  }

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-6 pb-16">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/clients/${id}`}
              className="p-2 rounded-full border border-zinc-200 hover:bg-zinc-100 text-zinc-600 transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Edição de Cadastro
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-zinc-100 text-zinc-700">
                  {type}
                </span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-950">
                Editar Cliente: {name}
              </h1>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Cliente atualizado com sucesso! Redirecionando...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados Principais */}
          <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-hourline space-y-4">
            <h2 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2">
              Informações Gerais
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  {type === "PJ" ? "Razão Social *" : "Nome Completo *"}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-zinc-50 focus:bg-white focus:outline-none focus:border-zinc-900 transition"
                />
              </div>

              {type === "PJ" && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Nome Fantasia
                  </label>
                  <input
                    type="text"
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-zinc-50 focus:bg-white focus:outline-none focus:border-zinc-900 transition"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  {type === "PJ" ? "CNPJ" : "CPF"}
                </label>
                <input
                  type="text"
                  value={document}
                  onChange={(e) => setDocument(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-zinc-50 focus:bg-white focus:outline-none focus:border-zinc-900 transition font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-zinc-50 focus:bg-white focus:outline-none focus:border-zinc-900 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Telefone Principal</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-zinc-50 focus:bg-white focus:outline-none focus:border-zinc-900 transition font-mono"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 mb-1">
                  <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600" />
                  WhatsApp
                </label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-zinc-50 focus:bg-white focus:outline-none focus:border-zinc-900 transition font-mono"
                />
              </div>
            </div>
          </div>

          {/* Endereço */}
          <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-hourline space-y-4">
            <h2 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2">
              Endereço Comercial / Localização
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">CEP</label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-zinc-50 focus:bg-white focus:outline-none focus:border-zinc-900 transition font-mono"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Logradouro / Rua</label>
                <input
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-zinc-50 focus:bg-white focus:outline-none focus:border-zinc-900 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Número</label>
                <input
                  type="text"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-zinc-50 focus:bg-white focus:outline-none focus:border-zinc-900 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Complemento</label>
                <input
                  type="text"
                  value={complement}
                  onChange={(e) => setComplement(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-zinc-50 focus:bg-white focus:outline-none focus:border-zinc-900 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Bairro</label>
                <input
                  type="text"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-zinc-50 focus:bg-white focus:outline-none focus:border-zinc-900 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Cidade</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-zinc-50 focus:bg-white focus:outline-none focus:border-zinc-900 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Estado (UF)</label>
                <input
                  type="text"
                  maxLength={2}
                  value={state}
                  onChange={(e) => setState(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-zinc-50 focus:bg-white focus:outline-none focus:border-zinc-900 transition uppercase"
                />
              </div>
            </div>
          </div>

          {/* Contatos / Pessoas de Referência */}
          <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-hourline space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <h2 className="text-sm font-bold text-zinc-900">
                Pessoas de Contato & Interlocutores
              </h2>
              <button
                type="button"
                onClick={addContact}
                className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-900 hover:text-zinc-700"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar Contato
              </button>
            </div>

            <div className="space-y-3">
              {contacts.map((c, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-zinc-600">
                      Contato #{idx + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 text-xs text-zinc-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={c.isPrimary}
                          onChange={(e) => updateContact(idx, "isPrimary", e.target.checked)}
                          className="rounded text-zinc-900 border-zinc-300 focus:ring-zinc-900"
                        />
                        <span>Principal</span>
                      </label>
                      {contacts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeContact(idx)}
                          className="text-zinc-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <div>
                      <input
                        type="text"
                        placeholder="Nome *"
                        value={c.name}
                        onChange={(e) => updateContact(idx, "name", e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Cargo / Função"
                        value={c.role || ""}
                        onChange={(e) => updateContact(idx, "role", e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs"
                      />
                    </div>
                    <div>
                      <input
                        type="email"
                        placeholder="E-mail"
                        value={c.email || ""}
                        onChange={(e) => updateContact(idx, "email", e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Telefone fixo / recado"
                        value={c.phone || ""}
                        onChange={(e) => updateContact(idx, "phone", e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs font-mono"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="WhatsApp"
                        value={c.whatsapp || ""}
                        onChange={(e) => updateContact(idx, "whatsapp", e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Observações Internas */}
          <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-hourline space-y-4">
            <h2 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2">
              Observações & Notas Internas
            </h2>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Histórico, restrições ou contexto importante sobre o cliente..."
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-zinc-50 focus:bg-white focus:outline-none focus:border-zinc-900 transition"
            />
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-3">
            <Link
              href={`/clients/${id}`}
              className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-100 text-xs font-semibold transition"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
