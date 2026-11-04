"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";

interface Entry { id: string; title: string; username: string; website: string }
const empty = { id: "", title: "", username: "", website: "", password: "" };

async function api(method = "GET", body?: unknown) {
  const response = await fetch("/api/passwords", { method, cache: "no-store", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Falha ao acessar o cofre.");
  return data;
}
export default function PasswordsPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api().then(data => setEntries(data.entries)).catch(error => setMessage(error.message)).finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    const clear = () => { setRevealed({}); setForm(empty); setEditing(false); };
    const timer = window.setTimeout(clear, 60000);
    const visibility = () => { if (document.hidden) clear(); };
    document.addEventListener("visibilitychange", visibility);
    return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", visibility); };
  }, [revealed, editing]);
  async function act(action: () => Promise<void>) {
    setBusy(true); setMessage("");
    try { await action(); } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível concluir."); }
    finally { setBusy(false); }
  }
  const inputClass = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900";
  const buttonClass = "rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-100 disabled:opacity-50";
  return <AppShell activeSection="passwords"><div className="mx-auto max-w-5xl space-y-6 p-6">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-semibold">Gerenciador de senhas</h1><p className="mt-1 text-sm text-slate-500">Seu cofre individual. Somente você pode acessar estes registros.</p></div><button className={buttonClass} onClick={() => { setForm(empty); setEditing(true); }}>Nova senha</button></header>
    <p className="rounded-xl bg-blue-50 p-4 text-sm text-blue-900">Senhas protegidas por criptografia. A tela oculta os segredos após 60 segundos ou ao sair desta aba.</p>
    {message && <p role="status" className="rounded-lg bg-amber-50 p-3 text-amber-900">{message}</p>}
    {editing && <form className="space-y-4 rounded-xl border border-slate-200 bg-white p-5" onSubmit={event => { event.preventDefault(); void act(async () => { await api(form.id ? "PUT" : "POST", form); setForm(empty); setEditing(false); setRevealed({}); setEntries((await api()).entries); setMessage("Senha salva."); }); }}>
      <h2 className="font-semibold">{form.id ? "Editar acesso" : "Novo acesso"}</h2>
      <label className="block text-sm">Nome do acesso<input autoFocus required maxLength={160} className={inputClass} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></label>
      <label className="block text-sm">Usuário ou e-mail<input maxLength={320} autoComplete="off" className={inputClass} value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} /></label>
      <label className="block text-sm">Site<input type="url" placeholder="https://exemplo.com" maxLength={2048} className={inputClass} value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} /></label>
      <label className="block text-sm">Senha{form.id && " (informe a senha para salvar)"}<input type="password" autoComplete="new-password" required maxLength={4096} className={inputClass} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></label>
      <div className="flex flex-wrap gap-2"><button type="button" className={buttonClass} onClick={() => { const bytes = crypto.getRandomValues(new Uint8Array(24)); const password = Array.from(bytes, v => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$"[v % 64]).join(""); setForm({ ...form, password }); }}>Gerar senha forte</button><button disabled={busy} className={buttonClass}>Salvar</button><button type="button" className={buttonClass} onClick={() => { setForm(empty); setEditing(false); }}>Cancelar</button></div>
    </form>}
    <label className="block text-sm">Buscar acessos<input type="search" className={inputClass} value={search} onChange={e => setSearch(e.target.value)} placeholder="Nome, usuário ou site" /></label>
    {loading ? <p>Carregando cofre…</p> : <div className="space-y-3">{entries.filter(entry => `${entry.title} ${entry.username} ${entry.website}`.toLowerCase().includes(search.toLowerCase())).map(entry => <article key={entry.id} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="font-semibold">{entry.title}</h2><p className="break-all text-sm text-slate-600">{entry.username}</p>{entry.website && <a className="block break-all text-sm text-blue-700" href={entry.website} target="_blank" rel="noopener noreferrer">{entry.website}</a>}
      <p className="break-all font-mono">{revealed[entry.id] || "••••••••••••"}</p>
      <div className="flex flex-wrap gap-2"><button disabled={busy} className={buttonClass} onClick={() => { if (revealed[entry.id]) { setRevealed({}); return; } void act(async () => { const data = await api("POST", { action: "reveal", id: entry.id }); setRevealed({ [entry.id]: data.password }); }); }}>{revealed[entry.id] ? "Ocultar" : "Revelar"}</button>
      <button disabled={busy} className={buttonClass} onClick={() => void act(async () => { const data = await api("POST", { action: "reveal", id: entry.id }); await navigator.clipboard.writeText(data.password); setMessage("Senha copiada para a área de transferência."); })}>Copiar senha</button>
      <button className={buttonClass} onClick={() => { setForm({ ...entry, password: "" }); setEditing(true); setRevealed({}); }}>Editar</button>
      <button disabled={busy} className={buttonClass} onClick={() => { if (window.confirm(`Excluir o acesso “${entry.title}”?`)) void act(async () => { await api("DELETE", { id: entry.id }); setRevealed({}); setEntries(entries.filter(item => item.id !== entry.id)); }); }}>Excluir</button></div>
    </article>)}{entries.length === 0 && <p className="p-8 text-center text-slate-500">Seu cofre está vazio. Cadastre seu primeiro acesso.</p>}</div>}
  </div></AppShell>;
}
