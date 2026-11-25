"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export type PlannedProjectPost = {
  id: string;
  clientId: string;
  title: string;
  companyName: string;
  projectId: string;
  projectName: string;
  scheduledDate: string | null;
  workspaceId: string | null;
  format?: string;
  editorialLineId?: string | null;
  pillarId?: string | null;
  offerName?: string | null;
  availableForIdea?: boolean;
  hasIdea?: boolean;
};

export function ProjectPostPicker({ clientId, selected, onPostsLoaded }: {
  clientId: string;
  selected?: PlannedProjectPost;
  onPostsLoaded?: (posts: PlannedProjectPost[]) => void;
}) {
  const router = useRouter();
  const [result, setResult] = useState<{ clientId: string; posts: PlannedProjectPost[]; error?: string } | null>(null);

  useEffect(() => {
    if (!clientId) return;
    const controller = new AbortController();
    fetch("/api/content-studio/project-posts?" + new URLSearchParams({ clientId }), { signal: controller.signal })
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        if (!controller.signal.aborted) {
          setResult({ clientId, posts: body.posts });
          onPostsLoaded?.(body.posts);
        }
      })
      .catch(reason => {
        if (!controller.signal.aborted) setResult({ clientId, posts: [], error: reason.message });
      });
    return () => controller.abort();
  }, [clientId, onPostsLoaded]);

  if (!clientId) return null;
  const current = result?.clientId === clientId ? result : null;
  const posts = current?.posts ?? [];
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold">Post de projeto
        <select className="ml-2 max-w-full rounded-lg border border-zinc-200 p-2 text-sm"
          value={selected?.id || ""} onChange={event => {
            const id = event.target.value;
            router.push(id ? `/prompt-creator/brainstorm?projectPostId=${id}` : "/prompt-creator/brainstorm");
          }}>
          <option value="">{!current ? "Carregando posts…" : posts.length ? "Selecionar um post planejado" : "Nenhum post de projeto disponível"}</option>
          {selected && !posts.some(post => post.id === selected.id) &&
            <option value={selected.id}>{selected.title}</option>}
          {posts.map(post => <option key={post.id} value={post.id}>
            {post.projectName} · {post.title} · {post.scheduledDate?.split("-").reverse().join("/") || "Sem data"}
          </option>)}
        </select>
      </label>
      {current?.error && <p role="alert" className="text-xs text-rose-700">{current.error}</p>}
    </div>
  );
}
