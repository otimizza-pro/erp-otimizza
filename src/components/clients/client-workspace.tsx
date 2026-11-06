"use client";
import { useCallback, useEffect, useState } from "react";
interface Folder { id: string; name: string }
interface FileItem { id: string; title: string; folder: string; href: string; document_id: string | null }
interface Event { id: string; category: string; action: string; title: string; date: string; href: string }
export function ClientHistory({ clientId }: { clientId: string }) {
  const [category, setCategory] = useState(""), [events, setEvents] = useState<Event[]>([]), [error, setError] = useState("");
  useEffect(() => { fetch(`/api/clients/${clientId}/workspace?view=history&category=${encodeURIComponent(category)}`).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error); setEvents(d); setError(""); }).catch(e => setError(e.message)); }, [clientId, category]);
  return <section className="space-y-3"><h2 className="font-semibold">Histórico do cliente</h2><select aria-label="Filtrar histórico" value={category} onChange={e => setCategory(e.target.value)} className="border p-2 rounded"><option value="">Todas as atividades</option>{["Propostas", "Contratos", "Financeiro", "Projetos", "Documentos", "CRM"].map(c => <option key={c}>{c}</option>)}</select>{error && <p role="alert">{error}</p>}{events.map(e => <a key={`${e.category}-${e.id}`} href={e.href} className="block border-b py-3"><strong>{e.title}</strong><p className="text-sm">{e.category} · {e.action} · {new Date(e.date).toLocaleString("pt-BR")}</p></a>)}{!error && !events.length && <p>Nenhuma atividade nesta categoria.</p>}</section>;
}
export function ClientFiles({ clientId }: { clientId: string }) {
  const [folders, setFolders] = useState<Folder[]>([]), [files, setFiles] = useState<FileItem[]>([]), [folder, setFolder] = useState("Documentos"), [name, setName] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const [showWriteModal, setShowWriteModal] = useState(false), [docTitle, setDocTitle] = useState(""), [docContent, setDocContent] = useState("");
  const reload = useCallback(async () => { const r = await fetch(`/api/clients/${clientId}/workspace`); const d = await r.json(); if (!r.ok) throw new Error(d.error); setFolders(d.folders); setFiles(d.files); }, [clientId]);
  useEffect(() => { reload().catch(e => setError(e.message)); }, [reload]);
  async function action(body: unknown) { const r = await fetch(`/api/clients/${clientId}/workspace`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const d = await r.json(); if (!r.ok) throw new Error(d.error); await reload(); return d; }
  async function create() { setError(""); try { await action({ action: "createFolder", name }); setFolder(name.trim()); setName(""); } catch (e) { setError(e instanceof Error ? e.message : "Erro"); } }
  async function upload(file: File) { setBusy(true); setError(""); try { const form = new FormData(); form.set("file", file); form.set("title", file.name); form.set("categoryId", "OTHER"); form.set("links", JSON.stringify([{ entityType: "CLIENT", entityId: clientId }])); const r = await fetch("/api/documents", { method: "POST", body: form }); const d = await r.json(); if (!r.ok) throw new Error(d.error); const target = folders.find(f => f.name === folder); if (target) await action({ action: "move", folderId: target.id, documentId: d.id }); await reload(); } catch (e) { setError(e instanceof Error ? e.message : "Erro no upload"); } finally { setBusy(false); } }
  async function saveWrittenDoc(e: React.FormEvent) {
    e.preventDefault();
    if (!docTitle.trim() || !docContent.trim()) { setError("Título e conteúdo são obrigatórios."); return; }
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: docTitle.trim(),
          categoryId: "OTHER",
          textContent: docContent.trim(),
          links: [{ entityType: "CLIENT", entityId: clientId }],
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      const target = folders.find(f => f.name === folder);
      if (target) await action({ action: "move", folderId: target.id, documentId: d.id });
      setDocTitle(""); setDocContent(""); setShowWriteModal(false);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar documento");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-4">
      <h2 className="font-semibold">Documentos e pastas do cliente</h2>
      <div className="flex flex-wrap gap-2">
        {["Propostas", "Contratos", "Financeiro", "Documentos", ...folders.map(f => f.name)].map(f => (
          <button className={`rounded px-3 py-2 ${folder === f ? "bg-indigo-600 text-white" : "bg-slate-100"}`} key={f} onClick={() => setFolder(f)}>
            📁 {f}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input aria-label="Nome da pasta" placeholder="Nome da nova pasta" className="border rounded p-2 text-sm" value={name} onChange={e => setName(e.target.value)} />
        <button className="border rounded px-3 py-2 text-sm hover:bg-slate-50" disabled={!name.trim()} onClick={create}>Criar pasta</button>
      </div>

      {!["Propostas", "Contratos", "Financeiro"].includes(folder) && (
        <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <label className="text-xs font-medium text-slate-700 cursor-pointer">
            {busy ? "Enviando…" : "📁 Fazer upload de arquivo"}
            <input disabled={busy} type="file" className="block text-xs mt-1" onChange={e => { const file = e.target.files?.[0]; if (file) void upload(file); e.target.value = ""; }} />
          </label>
          <span className="text-xs text-slate-400">ou</span>
          <button
            type="button"
            disabled={busy}
            onClick={() => setShowWriteModal(true)}
            className="text-xs font-medium px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded border border-indigo-200 transition-colors"
          >
            ✍️ Escrever documento nesta pasta
          </button>
        </div>
      )}

      {showWriteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-5 border border-slate-200">
            <h3 className="font-bold text-slate-900 mb-2">Escrever Documento na pasta &quot;{folder}&quot;</h3>
            <form onSubmit={saveWrittenDoc} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Título do Documento *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Anotações da Reunião de Estratégia"
                  value={docTitle}
                  onChange={e => setDocTitle(e.target.value)}
                  className="w-full text-xs p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Conteúdo (Markdown) *</label>
                <textarea
                  rows={6}
                  required
                  placeholder="# Reunião de Estratégia&#10;&#10;Pontos acordados com o cliente..."
                  value={docContent}
                  onChange={e => setDocContent(e.target.value)}
                  className="w-full text-xs font-mono p-2 border rounded"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowWriteModal(false)} className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800">
                  Cancelar
                </button>
                <button type="submit" disabled={busy} className="px-3 py-1.5 text-xs text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50">
                  {busy ? "Salvando…" : "Salvar Documento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-500">Propostas enviadas, contratos e recibos entram automaticamente nas respectivas pastas.</p>
      {error && <p role="alert" className="text-red-700 text-xs">{error}</p>}
      {files.filter(f => f.folder === folder).map(f => (
        <div key={f.id} className="flex justify-between items-center gap-4 border-b py-3 text-sm">
          <a href={f.href} className="text-indigo-700 hover:underline">{f.title}</a>
          {f.document_id && (
            <select aria-label={`Mover ${f.title}`} value="" onChange={e => action({ action: "move", documentId: f.document_id, folderId: e.target.value }).catch(e => setError(e.message))} className="text-xs border rounded p-1">
              <option value="">Mover para…</option>
              {folders.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          )}
        </div>
      ))}
      {!files.some(f => f.folder === folder) && <p className="text-sm text-slate-500">Esta pasta está vazia.</p>}
    </section>
  );
}
