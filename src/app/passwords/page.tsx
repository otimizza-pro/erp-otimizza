"use client";

import { useEffect, useState, useRef } from "react";
import { AppShell } from "@/components/layout/app-shell";
import {
  KeyRound,
  Eye,
  EyeOff,
  ClipboardPaste,
  Copy,
  Plus,
  Trash2,
  ExternalLink,
  Lock,
  Sparkles,
  Check,
  AlertCircle,
  Pencil,
  Search,
  ShieldCheck,
  Info
} from "lucide-react";

interface Entry {
  id: string;
  title: string;
  username: string;
  website: string;
}

const empty = { id: "", title: "", username: "", website: "", password: "" };

async function api(method = "GET", body?: unknown) {
  const response = await fetch("/api/passwords", {
    method,
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Falha ao acessar o cofre.");
  return data;
}

export default function PasswordsPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(false);
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Load entries on mount
  useEffect(() => {
    api()
      .then((data) => setEntries(data.entries || []))
      .catch((error) =>
        setMessage({
          text: error instanceof Error ? error.message : "Erro ao carregar cofre.",
          type: "error",
        })
      )
      .finally(() => setLoading(false));
  }, []);

  // Auto-hide revealed vault credentials after 60 seconds or when leaving the tab.
  // CRITICAL: NEVER touch `form` or `editing` here! Switching tabs or windows must
  // NEVER erase draft inputs in any form across the system.
  useEffect(() => {
    if (Object.keys(revealed).length === 0) return;

    const hideRevealedPasswords = () => {
      setRevealed({});
    };

    const timer = window.setTimeout(hideRevealedPasswords, 60000);
    const handleVisibility = () => {
      if (document.hidden) {
        hideRevealedPasswords();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [revealed]);

  async function act(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : "Não foi possível concluir a ação.",
        type: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  // Paste from clipboard helper
  const handlePastePassword = async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        throw new Error("Clipboard API indisponível");
      }
      const text = await navigator.clipboard.readText();
      if (!text || text.trim() === "") {
        setMessage({
          text: "A área de transferência está vazia ou não contém texto copiável.",
          type: "info",
        });
        return;
      }
      setForm((prev) => ({ ...prev, password: text }));
      setShowFormPassword(true);
      setMessage({
        text: "Senha colada da área de transferência com sucesso!",
        type: "success",
      });
      passwordInputRef.current?.focus();
    } catch (err) {
      console.warn("Clipboard read fallback:", err);
      setMessage({
        text: "Permissão da área de transferência negada pelo navegador. Use o atalho de teclado Ctrl + V diretamente no campo de senha.",
        type: "info",
      });
      passwordInputRef.current?.focus();
    }
  };

  // Generate strong random password helper
  const generateStrongPassword = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*";
    const password = Array.from(bytes, (v) => chars[v % chars.length]).join("");
    setForm((prev) => ({ ...prev, password }));
    setShowFormPassword(true);
    setMessage({
      text: "Senha forte gerada com sucesso!",
      type: "success",
    });
    passwordInputRef.current?.focus();
  };

  const handleCopyPassword = async (id: string) => {
    await act(async () => {
      const data = await api("POST", { action: "reveal", id });
      await navigator.clipboard.writeText(data.password);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 3000);
      setMessage({
        text: "Senha copiada para a área de transferência com sucesso!",
        type: "success",
      });
    });
  };

  const filteredEntries = entries.filter((entry) =>
    `${entry.title} ${entry.username} ${entry.website}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell activeSection="passwords">
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-7 w-7 text-emerald-600" />
              <h1 className="text-2xl font-bold text-slate-900">Gerenciador de Senhas</h1>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Seu cofre individual criptografado. Somente você pode visualizar e gerenciar estes registros.
            </p>
          </div>
          {!editing && (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
              onClick={() => {
                setForm(empty);
                setShowFormPassword(false);
                setEditing(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Nova senha
            </button>
          )}
        </header>

        {/* Security notice banner */}
        <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50/80 p-4 text-sm text-blue-900">
          <Info className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium">Proteção e Segurança</p>
            <p className="text-xs text-blue-800">
              Senhas protegidas por criptografia militar. Segredos revelados no cofre são automaticamente ocultados após 60 segundos ou ao trocar de aba.
              <span className="font-semibold ml-1">Seus rascunhos em preenchimento nunca são apagados ao mudar de tela.</span>
            </p>
          </div>
        </div>

        {/* Status / feedback message */}
        {message && (
          <div
            role="status"
            className={`flex items-center justify-between rounded-lg p-3 text-sm border ${
              message.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : message.type === "error"
                ? "bg-rose-50 border-rose-200 text-rose-900"
                : "bg-amber-50 border-amber-200 text-amber-900"
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === "success" && <Check className="h-4 w-4 text-emerald-600 shrink-0" />}
              {message.type === "error" && <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />}
              {message.type === "info" && <Info className="h-4 w-4 text-amber-600 shrink-0" />}
              <span>{message.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setMessage(null)}
              className="text-xs text-slate-500 hover:text-slate-800 ml-4 font-medium"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Creation / Editing Form */}
        {editing && (
          <form
            className="space-y-5 rounded-2xl border-2 border-emerald-500/30 bg-white p-6 shadow-md"
            onSubmit={(event) => {
              event.preventDefault();
              void act(async () => {
                await api(form.id ? "PUT" : "POST", form);
                setForm(empty);
                setEditing(false);
                setRevealed({});
                const updated = await api();
                setEntries(updated.entries || []);
                setMessage({
                  text: form.id ? "Acesso atualizado com sucesso!" : "Novo acesso salvo com sucesso no cofre!",
                  type: "success",
                });
              });
            }}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-emerald-600" />
                <h2 className="text-lg font-bold text-slate-900">
                  {form.id ? "Editar Acesso" : "Novo Acesso ao Cofre"}
                </h2>
              </div>
              <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">
                Edição segura (não apaga ao mudar de tela)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block text-sm font-medium text-slate-700">
                Nome do acesso *
                <input
                  autoFocus
                  required
                  maxLength={160}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  placeholder="Ex: Meta Ads, Google Workspace, Banco..."
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Usuário, e-mail ou login
                <input
                  maxLength={320}
                  autoComplete="off"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  placeholder="admin@empresa.com.br"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                />
              </label>
            </div>

            <label className="block text-sm font-medium text-slate-700">
              Site ou Link de Login
              <input
                type="url"
                placeholder="https://exemplo.com/login"
                maxLength={2048}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
              />
            </label>

            {/* Password input with paste button, generate button, and visibility toggle */}
            <div className="space-y-2 rounded-xl bg-slate-50 p-4 border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-800">
                  Senha {form.id ? "(deixe vazia para manter a atual)" : "*"}
                </label>
                <span className="text-xs text-slate-500">
                  {form.password ? `${form.password.length} caracteres` : "Nenhuma senha digitada/colada"}
                </span>
              </div>

              <div className="relative">
                <input
                  ref={passwordInputRef}
                  type={showFormPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required={!form.id}
                  maxLength={4096}
                  placeholder="Digite ou clique em 'Colar Senha' abaixo"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-10 font-mono text-sm text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  onClick={() => setShowFormPassword(!showFormPassword)}
                  title={showFormPassword ? "Ocultar senha" : "Ver senha em texto"}
                >
                  {showFormPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Password utility buttons: Colar Senha, Gerar Senha Forte */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handlePastePassword}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400 transition active:scale-95 shadow-sm"
                  title="Colar texto salvo na sua área de transferência (Ctrl + C)"
                >
                  <ClipboardPaste className="h-3.5 w-3.5 text-emerald-700" />
                  Colar Senha (do Ctrl+C)
                </button>

                <button
                  type="button"
                  onClick={generateStrongPassword}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition active:scale-95 shadow-sm"
                  title="Gerar automaticamente uma senha forte de 24 caracteres"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  Gerar Senha Forte
                </button>

                <button
                  type="button"
                  onClick={() => setShowFormPassword(!showFormPassword)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition shadow-sm"
                >
                  {showFormPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {showFormPassword ? "Ocultar senha" : "Ver senha"}
                </button>
              </div>
            </div>

            {/* Form submit/cancel actions */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition"
                onClick={() => {
                  setForm(empty);
                  setEditing(false);
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition"
              >
                <Lock className="h-4 w-4" />
                {busy ? "Salvando..." : form.id ? "Atualizar Acesso" : "Salvar Acesso"}
              </button>
            </div>
          </form>
        )}

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="search"
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar acessos por nome, usuário, e-mail ou site..."
          />
        </div>

        {/* Entries list */}
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent mb-2"></div>
            <p className="text-sm">Carregando cofre criptografado...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEntries.map((entry) => {
              const isRevealed = Boolean(revealed[entry.id]);
              const secret = revealed[entry.id];
              const isCopied = copiedId === entry.id;

              return (
                <article
                  key={entry.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-300 transition space-y-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <KeyRound className="h-4 w-4 text-emerald-600" />
                        <h2 className="font-semibold text-slate-900 text-base">{entry.title}</h2>
                      </div>
                      {entry.username && (
                        <p className="text-sm text-slate-600 select-all">
                          <span className="text-slate-400 text-xs">Usuário: </span>
                          {entry.username}
                        </p>
                      )}
                      {entry.website && (
                        <a
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                          href={entry.website}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {entry.website}
                        </a>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                          isRevealed
                            ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                        onClick={() => {
                          if (isRevealed) {
                            setRevealed({});
                            return;
                          }
                          void act(async () => {
                            const data = await api("POST", { action: "reveal", id: entry.id });
                            setRevealed({ [entry.id]: data.password });
                          });
                        }}
                      >
                        {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        {isRevealed ? "Ocultar" : "Revelar"}
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                          isCopied
                            ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                        onClick={() => handleCopyPassword(entry.id)}
                      >
                        {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        {isCopied ? "Copiada!" : "Copiar senha"}
                      </button>

                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                        onClick={() => {
                          setForm({ ...entry, password: "" });
                          setShowFormPassword(false);
                          setEditing(true);
                          setRevealed({});
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5 text-slate-500" />
                        Editar
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                        onClick={() => {
                          if (window.confirm(`Tem certeza que deseja excluir o acesso “${entry.title}”?`)) {
                            void act(async () => {
                              await api("DELETE", { id: entry.id });
                              setRevealed({});
                              setEntries(entries.filter((item) => item.id !== entry.id));
                              setMessage({
                                text: `Acesso “${entry.title}” excluído do cofre.`,
                                type: "info",
                              });
                            });
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                        Excluir
                      </button>
                    </div>
                  </div>

                  {/* Secret Display Box */}
                  <div className="rounded-lg bg-slate-50 border border-slate-200 px-3.5 py-2 flex items-center justify-between">
                    <span className="text-xs text-slate-500">Senha:</span>
                    <span className="font-mono text-sm tracking-wider select-all font-medium text-slate-800">
                      {isRevealed ? secret : "••••••••••••••••"}
                    </span>
                    {isRevealed && (
                      <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                        Oculta em 60s
                      </span>
                    )}
                  </div>
                </article>
              );
            })}

            {entries.length === 0 && (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
                <ShieldCheck className="mx-auto h-12 w-12 text-slate-300" />
                <h3 className="mt-3 text-base font-semibold text-slate-900">Seu cofre está vazio</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Cadastre seus logins, senhas de redes sociais, ferramentas e acessos de clientes com segurança.
                </p>
                <button
                  type="button"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
                  onClick={() => {
                    setForm(empty);
                    setShowFormPassword(false);
                    setEditing(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Cadastrar primeiro acesso
                </button>
              </div>
            )}

            {entries.length > 0 && filteredEntries.length === 0 && (
              <div className="rounded-xl border border-slate-200 p-8 text-center text-slate-500">
                Nenhum acesso encontrado para a busca &quot;{search}&quot;.
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
