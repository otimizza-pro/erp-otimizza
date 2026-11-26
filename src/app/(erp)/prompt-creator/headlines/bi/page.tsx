"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCompany } from "@/lib/context/company-context";
import { contentCompanyId } from "@/modules/clients/internal-company";
import {
  BarChart3,
  ArrowLeft,
  Filter,
  Sparkles,
  TrendingUp,
  DollarSign,
  Clock,
  Layers,
  ThumbsUp,
  ThumbsDown,
  Info,
  CheckCircle2,
  Calendar,
} from "lucide-react";

interface Group {
  model: string;
  team: string;
  mode: string;
  runs: number;
  errors: number;
  generated: number;
  presented: number;
  liked: number;
  disliked: number;
  neutral: number;
  winners: number;
  cost: number;
  unknownCost: number;
  totalMs: number;
  timedRuns: number;
}

interface LibraryItem {
  id: string;
  headline: string;
  subheadline: string;
  rating: number;
  reason: string;
  source: string;
  format: string;
}

interface Measurement {
  id: string;
  headline: string;
  source: string;
  author_source: string;
  actual_model: string | null;
  requested_model: string | null;
  team: string | null;
  mode: string | null;
  impressions: number;
  clicks: number;
  leads: number;
  sales: number;
  spend: string;
  date_from: string;
  date_to: string;
}

interface Experiment {
  id: string;
  headline_a: string;
  headline_b: string;
  hypothesis: string;
  variable: string;
  controls: string;
  metric: string;
  status: string;
  conclusion: string;
}

interface Report {
  groups: Group[];
  humanWinners: number;
  events: number;
  performance: Measurement[];
  library: LibraryItem[];
  selectedOptions: { id: string; headline: string }[];
  experiments: Experiment[];
}

const ctl = "rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition";
const button = "inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 shadow-2xs hover:bg-zinc-50 hover:text-zinc-950 transition cursor-pointer";
const buttonPrimary = "inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer";

const ratio = (n: number, d: number) => (d ? `${((100 * n) / d).toFixed(1)}%` : "Sem dados");

function ExperimentCard({ item, onSaved }: { item: Experiment; onSaved: () => void }) {
  const [status, setStatus] = useState(item.status);
  const [conclusion, setConclusion] = useState(item.conclusion);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <article className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-zinc-950 text-sm">{item.hypothesis}</h4>
        <span
          className={
            "rounded-full px-2.5 py-0.5 text-[11px] font-bold " +
            (status === "COMPLETED"
              ? "bg-emerald-100 text-emerald-800"
              : status === "RUNNING"
              ? "bg-amber-100 text-amber-800"
              : "bg-zinc-100 text-zinc-700")
          }
        >
          {status === "COMPLETED" ? "Concluído" : status === "RUNNING" ? "Em andamento" : "Planejado"}
        </span>
      </div>

      <div className="grid gap-2 text-xs text-zinc-600 bg-zinc-50 rounded-xl p-3 border border-zinc-100">
        <p><strong className="text-zinc-800">Opção A:</strong> {item.headline_a}</p>
        <p><strong className="text-zinc-800">Opção B:</strong> {item.headline_b}</p>
        <p><strong className="text-zinc-800">Variável:</strong> {item.variable} · <strong className="text-zinc-800">Métrica:</strong> {item.metric}</p>
        <p><strong className="text-zinc-800">Controles:</strong> {item.controls}</p>
      </div>

      <div className="flex flex-wrap gap-2 items-center pt-1">
        <select className={ctl} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="PLANNED">Planejado</option>
          <option value="RUNNING">Em andamento</option>
          <option value="COMPLETED">Concluído</option>
        </select>

        <textarea
          rows={2}
          className={ctl + " block w-full mt-2"}
          value={conclusion}
          onChange={(e) => setConclusion(e.target.value)}
          placeholder="Conclusão fundamentada nos dados reais; limitações e próximos passos"
        />
      </div>

      {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}

      <div className="pt-1 flex justify-end">
        <button
          className={button}
          disabled={saving}
          onClick={() => {
            setSaving(true);
            setError("");
            fetch("/api/headlines", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "EXPERIMENT_STATUS", id: item.id, status, conclusion }),
            })
              .then(async (r) => {
                const v = await r.json();
                if (!r.ok) throw new Error(v.error);
                onSaved();
              })
              .catch((e) => setError(e.message))
              .finally(() => setSaving(false));
          }}
        >
          {saving ? "Salvando..." : "Salvar acompanhamento"}
        </button>
      </div>
    </article>
  );
}

export default function Page() {
  const { selectedCompany } = useCompany();
  const clientId = contentCompanyId(selectedCompany);

  const [all, setAll] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [team, setTeam] = useState("ALL");
  const [mode, setMode] = useState("ALL");
  const [format, setFormat] = useState("");
  const [data, setData] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [reload, setReload] = useState(0);

  const [form, setForm] = useState({ id: "", from: "", to: "", impressions: 0, clicks: 0, leads: 0, sales: 0, spend: 0, source: "" });
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setError("");
    const p = new URLSearchParams({ action: "analytics" });
    if (!all) p.set("clientId", clientId);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (format) p.set("format", format);

    fetch("/api/headlines?" + p, { signal: abort.signal })
      .then(async (r) => {
        const v = await r.json();
        if (!r.ok) throw new Error(v.error);
        if (!abort.signal.aborted) setData(v);
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [clientId, all, from, to, format, reload]);

  const groups = data?.groups.filter((g) => (team === "ALL" || g.team === team) && (mode === "ALL" || g.mode === mode)) || [];

  async function saveMeasurement() {
    setError("");
    try {
      const { id, ...values } = form;
      const r = await fetch("/api/headlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "MEASURE", id, data: values }),
      });
      const v = await r.json();
      if (!r.ok) throw new Error(v.error);
      setNotice("Métricas reais registradas com fonte e período.");
      setReload((x) => x + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao salvar.");
    }
  }

  return (
    <main className="mx-auto max-w-[1800px] space-y-6 p-4 md:p-8 text-zinc-900">
      {/* HEADER */}
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200 pb-6">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 border border-zinc-200 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
            <BarChart3 size={13} className="text-zinc-500" />
            BI & Análise de IA · {selectedCompany.name}
          </span>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
            BI de Headlines e Modelos
          </h1>
          <p className="mt-1 text-sm text-zinc-500 max-w-3xl">
            Acompanhe a assertividade dos modelos de IA, preferências de estilo editorial, custo operacional e resultados das campanhas publicadas.
          </p>
        </div>

        <div className="flex gap-2">
          <Link className={button} href="/prompt-creator?tab=headlines">
            <ArrowLeft size={16} />
            Voltar ao Estúdio Criativo
          </Link>
        </div>
      </header>

      {/* FILTROS DE ANÁLISE */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700">
          <Filter size={14} className="text-zinc-500" />
          Filtros de Período e Parâmetros
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <label className="text-xs font-semibold text-zinc-700">
            Escopo
            <select className={ctl + " block mt-1"} value={all ? "ALL" : "CLIENT"} onChange={(e) => setAll(e.target.value === "ALL")}>
              <option value="CLIENT">{selectedCompany.name}</option>
              <option value="ALL">Todos os meus clientes</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-zinc-700">
            Data De
            <input type="date" className={ctl + " block mt-1"} value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="text-xs font-semibold text-zinc-700">
            Data Até
            <input type="date" className={ctl + " block mt-1"} value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <label className="text-xs font-semibold text-zinc-700">
            Formato
            <select className={ctl + " block mt-1"} value={format} onChange={(e) => setFormat(e.target.value)}>
              {["", "Estático", "Reels", "Carrossel", "Stories", "Pesquisa", "Landing page"].map((v) => (
                <option key={v} value={v}>{v || "Todos os formatos"}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-zinc-700">
            Time de Modelos
            <select className={ctl + " block mt-1"} value={team} onChange={(e) => setTeam(e.target.value)}>
              <option value="ALL">Ambos (Time A e B)</option>
              <option value="A">Time A</option>
              <option value="B">Time B</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-zinc-700">
            Modalidade
            <select className={ctl + " block mt-1"} value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="ALL">Ambas</option>
              <option value="PROMPT">Pelo prompt</option>
              <option value="STYLE">Com meu estilo</option>
            </select>
          </label>

          <button className={buttonPrimary} onClick={() => setReload((x) => x + 1)}>
            Aplicar Filtros
          </button>
        </div>
      </section>

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
      {loading && <p role="status" className="text-sm text-zinc-500">Carregando análise e métricas...</p>}

      {/* AVISO METODOLÓGICO */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 flex items-start gap-3">
        <Info size={18} className="text-amber-700 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Critérios de Auditoria:</strong> O Time B geralmente é acionado quando o Time A não atinge o resultado desejado, portanto comparações brutas possuem viés de seleção. Avaliações neutras representam opções não avaliadas (não rejeitadas). Custos conhecidos estão em USD; valores não informados pelo provedor aparecem explicitamente como incompletos.
        </p>
      </div>

      {/* TABELA DE DESEMPENHO DOS MODELOS */}
      <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-zinc-950">Desempenho dos Modelos & Preferências Editoriais</h2>
            <p className="text-xs text-zinc-500">
              Taxa de aprovação, cobertura e custo por headline escolhida por cada IA dos times.
            </p>
          </div>
          <span className="rounded-xl bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
            Vitórias de autoria própria: <strong>{data?.humanWinners || 0}</strong>
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-zinc-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                {[
                  "Modelo",
                  "Time",
                  "Modo",
                  "Execuções / Falhas",
                  "Opções / Vistas",
                  "Aprovadas / Rejeitadas / Neutras",
                  "Aprovação¹",
                  "Cobertura²",
                  "Escolhidas³",
                  "Custo (USD)",
                  "Custo/Aprovada",
                  "Custo/Escolhida",
                  "Tempo Médio",
                ].map((t) => (
                  <th className="p-3 text-xs font-medium text-zinc-600" key={t}>
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {groups.map((g) => (
                <tr className="hover:bg-zinc-50/70 transition" key={g.model + g.team + g.mode}>
                  <td className="max-w-56 font-mono text-[11px] break-all p-3 font-semibold text-zinc-900">{g.model}</td>
                  <td className="p-3"><span className="rounded-md bg-zinc-100 px-2 py-0.5 font-bold">{g.team}</span></td>
                  <td className="p-3 text-zinc-600">{g.mode === "PROMPT" ? "Prompt" : "Meu estilo"}</td>
                  <td className="p-3">{g.runs} / {g.errors}</td>
                  <td className="p-3">{g.generated} / {g.presented}</td>
                  <td className="p-3 font-medium">{g.liked} / {g.disliked} / {g.neutral}</td>
                  <td className="p-3 font-bold text-emerald-700">
                    {ratio(g.liked, g.liked + g.disliked)}
                    {g.liked + g.disliked < 10 && <span className="block text-[10px] text-zinc-400 font-normal">amostra pequena</span>}
                  </td>
                  <td className="p-3">{ratio(g.liked + g.disliked, g.presented)}</td>
                  <td className="p-3 font-semibold text-zinc-950">{g.winners}</td>
                  <td className="p-3 font-mono">
                    ${Number(g.cost).toFixed(5)}
                    {g.unknownCost ? ` + ${g.unknownCost} desc.` : ""}
                  </td>
                  <td className="p-3 font-mono">
                    {g.unknownCost ? "Incompleto" : g.liked ? "$" + (g.cost / g.liked).toFixed(5) : "Sem dados"}
                  </td>
                  <td className="p-3 font-mono font-semibold text-emerald-800">
                    {g.unknownCost ? "Incompleto" : g.winners ? "$" + (g.cost / g.winners).toFixed(5) : "Sem dados"}
                  </td>
                  <td className="p-3 text-zinc-600">
                    {g.timedRuns ? (g.totalMs / g.timedRuns / 1000).toFixed(1) + "s" : "Sem dados"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!groups.length && <p className="text-sm text-zinc-500 text-center py-4">Nenhuma execução registrada com estes filtros.</p>}

        <p className="text-[11px] text-zinc-400">
          ¹ Gostei ÷ avaliações explícitas. ² Avaliações ÷ opções apresentadas. ³ Headline atualmente escolhida para a peça; o histórico de escolhas fica auditado.
        </p>
      </section>

      {/* BIBLIOTECA DE ESTILO POSITIVO E NEGATIVO */}
      <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-zinc-950">Biblioteca de Estilo Aprendido</h2>
          <p className="text-xs text-zinc-500">
            Exemplos positivados e rejeitados que orientam dinamicamente a geração personalizada para este cliente.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {[1, -1].map((rating) => (
            <div key={rating} className="space-y-3">
              <h3 className={"font-bold text-sm flex items-center gap-2 " + (rating === 1 ? "text-emerald-800" : "text-rose-800")}>
                {rating === 1 ? <ThumbsUp size={16} /> : <ThumbsDown size={16} />}
                {rating === 1 ? "Meu Estilo Aprovado (Positivo)" : "Não Combina (Rejeitado)"}
              </h3>

              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {data?.library.filter((c) => c.rating === rating).map((c) => (
                  <article
                    key={c.id}
                    className={
                      "rounded-xl border p-3 text-xs space-y-1 " +
                      (rating === 1 ? "border-emerald-200 bg-emerald-50/50" : "border-rose-200 bg-rose-50/50")
                    }
                  >
                    <p className="font-bold text-zinc-900">{c.headline}</p>
                    {c.subheadline && <p className="text-zinc-600">{c.subheadline}</p>}
                    <p className="text-[10px] text-zinc-500 pt-1">
                      {c.format} · {c.source === "HUMAN" ? "Autoria própria" : "Gerada por IA"}
                      {c.reason && ` · Motivo: "${c.reason}"`}
                    </p>
                  </article>
                ))}

                {!data?.library.filter((c) => c.rating === rating).length && (
                  <p className="text-xs text-zinc-400 italic">Nenhum exemplo registrado nesta categoria.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* MÉTRICAS REAIS DAS PEÇAS PUBLICADAS */}
      <section className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-zinc-950">Métricas Reais de Desempenho Publicado</h2>
          <p className="text-xs text-zinc-500">
            Registro manual de métricas consolidadas após veiculação real (sem simulação de integrações).
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-4 bg-zinc-50 p-4 rounded-xl border border-zinc-200">
          <label className="text-xs font-semibold text-zinc-700 md:col-span-2">
            Headline Publicada
            <select className={ctl + " block w-full mt-1"} value={form.id} onChange={(e) => setForm((v) => ({ ...v, id: e.target.value }))}>
              <option value="">Escolher headline do histórico</option>
              {data?.selectedOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.headline}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-zinc-700">
            Data De
            <input className={ctl + " block w-full mt-1"} type="date" value={form.from} onChange={(e) => setForm((v) => ({ ...v, from: e.target.value }))} />
          </label>
          <label className="text-xs font-semibold text-zinc-700">
            Data Até
            <input className={ctl + " block w-full mt-1"} type="date" value={form.to} onChange={(e) => setForm((v) => ({ ...v, to: e.target.value }))} />
          </label>

          {(["impressions", "clicks", "leads", "sales", "spend"] as const).map((key, i) => (
            <label className="text-xs font-semibold text-zinc-700" key={key}>
              {["Impressões", "Cliques", "Leads", "Vendas", "Gasto (BRL)"][i]}
              <input
                className={ctl + " block w-full mt-1"}
                type="number"
                min={0}
                step={key === "spend" ? 0.01 : 1}
                value={form[key]}
                onChange={(e) => setForm((v) => ({ ...v, [key]: Number(e.target.value) }))}
              />
            </label>
          ))}

          <label className="text-xs font-semibold text-zinc-700 md:col-span-3">
            Fonte / Referência da Campanha
            <input
              className={ctl + " block w-full mt-1"}
              value={form.source}
              onChange={(e) => setForm((v) => ({ ...v, source: e.target.value }))}
              placeholder="Ex: Gerenciador de Anúncios Meta, Campanha Black Friday Conversão"
            />
          </label>
        </div>

        <div className="flex items-center justify-between pt-1">
          <button
            className={buttonPrimary}
            onClick={() => void saveMeasurement()}
            disabled={!form.id || !form.from || !form.to || !form.source.trim()}
          >
            Registrar Métricas da Peça
          </button>
          {notice && <p role="status" className="text-xs font-bold text-emerald-800">{notice}</p>}
        </div>

        <div className="overflow-x-auto rounded-xl border border-zinc-200 mt-4">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                {["Headline / Autoria", "Fonte & Período", "Impressões", "Cliques / CTR", "Leads / Conv.", "CPL (BRL)", "Vendas"].map((v) => (
                  <th className="p-3 font-medium text-zinc-600 text-xs" key={v}>{v}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {data?.performance.map((m) => (
                <tr className="hover:bg-zinc-50/70 transition" key={m.id}>
                  <td className="max-w-64 p-3 font-medium">
                    {m.headline}
                    <p className="text-[11px] text-zinc-400 font-normal">
                      {m.author_source === "HUMAN" ? "Autoria própria" : m.actual_model || m.requested_model}
                    </p>
                  </td>
                  <td className="p-3">
                    <span className="font-semibold text-zinc-800">{m.source}</span>
                    <p className="text-[11px] text-zinc-500">
                      {String(m.date_from).slice(0, 10)} a {String(m.date_to).slice(0, 10)}
                    </p>
                  </td>
                  <td className="p-3 font-mono">{m.impressions.toLocaleString("pt-BR")}</td>
                  <td className="p-3 font-mono">{m.clicks.toLocaleString("pt-BR")} / {ratio(m.clicks, m.impressions)}</td>
                  <td className="p-3 font-mono">{m.leads.toLocaleString("pt-BR")} / {ratio(m.leads, m.clicks)}</td>
                  <td className="p-3 font-mono font-semibold text-emerald-800">
                    {m.leads ? `R$ ${(Number(m.spend) / m.leads).toFixed(2)}` : "Sem leads"}
                  </td>
                  <td className="p-3 font-mono font-bold text-zinc-950">{m.sales}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* EXPERIMENTOS A/B */}
      <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-zinc-950">Hipóteses e Experimentos A/B</h2>
          <p className="text-xs text-zinc-500">
            Acompanhe os testes entre variantes criativas com controle de variável única.
          </p>
        </div>

        {data?.experiments.map((item) => (
          <ExperimentCard key={item.id} item={item} onSaved={() => setReload((v) => v + 1)} />
        ))}

        {!data?.experiments.length && (
          <div className="rounded-xl border border-dashed border-zinc-200 p-8 text-center text-xs text-zinc-500">
            Planeje um teste A/B no laboratório de headlines para comparar variantes com a mesma audiência e canal.
          </div>
        )}
      </section>
    </main>
  );
}
