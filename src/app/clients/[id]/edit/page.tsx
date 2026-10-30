"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { ArrowLeft, Save, Plus, Trash2, AlertCircle } from "lucide-react";
import { ClientContact } from "@/modules/clients/types";

export default function EditClientPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const [contacts, setContacts] = useState<Omit<ClientContact, "id" | "clientId">[]>([]);

  useEffect(() => {
    fetch(`/api/clients/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Erro ao carregar dados do cliente");
        return res.json();
      })
      .then((data) => {
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
        setContacts(
          data.contacts && data.contacts.length > 0
            ? data.contacts.map((c: ClientContact) => ({
                name: c.name,
                role: c.role || "",
                email: c.email || "",
                phone: c.phone || "",
                whatsapp: c.whatsapp || "",
                isPrimary: c.isPrimary,
              }))
            : [{ name: "", role: "", email: "", phone: "", whatsapp: "", isPrimary: true }]
        );
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
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
    field: keyof Omit<ClientContact, "id" | "clientId">,
    value: string | boolean
  ) => {
    const updated = [...contacts];
    if (field === "isPrimary" && value === true) {
      updated.forEach((c, i) => (c.isPrimary = i === index));
    } else {
      // @ts-expect-error dynamic assign
      updated[index][field] = value;
    }
    setContacts(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const validContacts = contacts.filter((c) => c.name.trim() !== "");

      const res = await fetch(`/api/clients/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          name,
          tradeName: type === "PJ" ? tradeName : null,
          document,
          email,
          phone,
          whatsapp,
          postalCode,
          street,
          number,
          complement,
          neighborhood,
          city,
          state,
          notes,
          contacts: validContacts,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Falha ao atualizar cliente.");
      }

      router.push(`/clients/${id}`);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppShell activeSection="clients">
        <div className="p-12 text-center text-xs text-zinc-400">Carregando formulário...</div>
      </AppShell>
    );
  }

  return (
    <AppShell activeSection="clients">
      <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/clients/${id}`}
              className="p-2 rounded-full bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100 transition shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-950">
                Editar Cadastro de Cliente
              </h1>
              <p className="text-xs text-zinc-500">
                Atualize os dados e contatos mantendo histórico inalterado
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Tipo de Pessoa */}
        <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-hourline space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900">Tipo de Inscrição</h2>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs font-medium text-zinc-700 cursor-pointer">
              <input
                type="radio"
                name="clientType"
                value="PJ"
                checked={type === "PJ"}
                onChange={() => setType("PJ")}
                className="w-4 h-4 text-zinc-950 focus:ring-0"
              />
              Pessoa Jurídica (Empresa / PJ)
            </label>
            <label className="flex items-center gap-2 text-xs font-medium text-zinc-700 cursor-pointer">
              <input
                type="radio"
                name="clientType"
                value="PF"
                checked={type === "PF"}
                onChange={() => setType("PF")}
                className="w-4 h-4 text-zinc-950 focus:ring-0"
              />
              Pessoa Física (Individual / PF)
            </label>
          </div>
        </div>

        {/* Dados Principais */}
        <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-hourline space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900">Identificação</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-medium text-zinc-700">
                {type === "PJ" ? "Razão Social *" : "Nome Completo *"}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
              />
            </div>

            {type === "PJ" && (
              <div>
                <label className="block font-medium text-zinc-700">Nome Fantasia</label>
                <input
                  type="text"
                  value={tradeName}
                  onChange={(e) => setTradeName(e.target.value)}
                  className="mt-1 w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
                />
              </div>
            )}

            <div>
              <label className="block font-medium text-zinc-700">
                {type === "PJ" ? "CNPJ" : "CPF"}
              </label>
              <input
                type="text"
                value={document}
                onChange={(e) => setDocument(e.target.value)}
                className="mt-1 w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900 font-mono"
              />
            </div>

            <div>
              <label className="block font-medium text-zinc-700">E-mail Principal</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
              />
            </div>

            <div>
              <label className="block font-medium text-zinc-700">Telefone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
              />
            </div>

            <div>
              <label className="block font-medium text-zinc-700">WhatsApp</label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="mt-1 w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
              />
            </div>
          </div>
        </div>

        {/* Endereço */}
        <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-hourline space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900">Endereço</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-medium text-zinc-700">CEP</label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="mt-1 w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
              />
            </div>

            <div className="sm:col-span-2 md:col-span-2">
              <label className="block font-medium text-zinc-700">Logradouro / Rua</label>
              <input
                type="text"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                className="mt-1 w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
              />
            </div>

            <div>
              <label className="block font-medium text-zinc-700">Número</label>
              <input
                type="text"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                className="mt-1 w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
              />
            </div>

            <div>
              <label className="block font-medium text-zinc-700">Complemento</label>
              <input
                type="text"
                value={complement}
                onChange={(e) => setComplement(e.target.value)}
                className="mt-1 w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
              />
            </div>

            <div>
              <label className="block font-medium text-zinc-700">Bairro</label>
              <input
                type="text"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className="mt-1 w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
              />
            </div>

            <div>
              <label className="block font-medium text-zinc-700">Cidade</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1 w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
              />
            </div>

            <div>
              <label className="block font-medium text-zinc-700">Estado (UF)</label>
              <input
                type="text"
                maxLength={2}
                value={state}
                onChange={(e) => setState(e.target.value.toUpperCase())}
                className="mt-1 w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900 uppercase"
              />
            </div>
          </div>
        </div>

        {/* Contatos */}
        <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-hourline space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Contatos Vinculados</h2>
              <p className="text-xs text-zinc-500">
                Edite os interlocutores ou adicione novos contatos
              </p>
            </div>
            <button
              type="button"
              onClick={addContact}
              className="px-3.5 py-1.5 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar Contato
            </button>
          </div>

          <div className="space-y-3">
            {contacts.map((contact, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3 text-xs items-end"
              >
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-medium text-zinc-600">Nome</label>
                  <input
                    type="text"
                    value={contact.name}
                    onChange={(e) => updateContact(idx, "name", e.target.value)}
                    placeholder="Nome da pessoa"
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600">Função / Cargo</label>
                  <input
                    type="text"
                    value={contact.role || ""}
                    onChange={(e) => updateContact(idx, "role", e.target.value)}
                    placeholder="Diretor / Financeiro"
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600">E-mail</label>
                  <input
                    type="email"
                    value={contact.email || ""}
                    onChange={(e) => updateContact(idx, "email", e.target.value)}
                    placeholder="nome@empresa.com"
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600">WhatsApp / Tel</label>
                  <input
                    type="text"
                    value={contact.whatsapp || contact.phone || ""}
                    onChange={(e) => {
                      updateContact(idx, "whatsapp", e.target.value);
                      updateContact(idx, "phone", e.target.value);
                    }}
                    placeholder="(11) 98765-4321"
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-900"
                  />
                </div>
                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={contact.isPrimary}
                      onChange={(e) => updateContact(idx, "isPrimary", e.target.checked)}
                      className="w-3.5 h-3.5 text-zinc-950 rounded"
                    />
                    Principal
                  </label>
                  {contacts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeContact(idx)}
                      className="text-rose-500 hover:text-rose-700 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Observações */}
        <div className="p-6 rounded-2xl bg-white border border-zinc-200/80 shadow-hourline space-y-3">
          <h2 className="text-sm font-semibold text-zinc-900">Observações Internas</h2>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
          />
        </div>

        {/* Ações no Final da Página */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200">
          <Link
            href={`/clients/${id}`}
            className="px-5 py-2.5 rounded-full border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition shadow-2xs"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-zinc-950 text-white text-xs font-semibold hover:bg-zinc-800 transition shadow-xs disabled:opacity-50 active:scale-[0.98]"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Salvando..." : "Salvar Alterações"}</span>
          </button>
        </div>
      </form>
    </AppShell>
  );
}
