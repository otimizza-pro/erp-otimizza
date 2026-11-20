import { parseFragment } from "parse5";
import { seasonalDates } from "@/modules/clients/seasonal-calendar";
import { loadSeasonalMonth } from "@/modules/clients/seasonal-source";
import { query } from "@/lib/db/pool";
import type { AiClientContext } from "@/lib/ai/client-context";
import type { BrainstormMode } from "./brainstorm-modes";

export interface BrainstormSource {
  key: string;
  title: string;
  date: string;
  url?: string;
}

export function normalizeBrainstormText(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function brainstormDay(now = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(now);
}

export function shiftBrainstormDay(day: string, days: number) {
  const date = new Date(day + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function seasonalKey(date: string, title: string) {
  return date + ":" + normalizeBrainstormText(title);
}

export function seasonalSources(today: string): BrainstormSource[] {
  const end = shiftBrainstormDay(today, 59);
  const years = new Set([Number(today.slice(0, 4)), Number(end.slice(0, 4))]);
  return [...years].flatMap(seasonalDates).filter(event => event.date >= today && event.date <= end)
    .map(({ date, name }) => ({ date, title: name, key: seasonalKey(date, name) }));
}

async function clientSeasonalSources(today: string, clientId: string) {
  const end = shiftBrainstormDay(today, 59);
  const months = [...new Set(Array.from({ length: 60 }, (_, offset) => shiftBrainstormDay(today, offset).slice(0, 7)))];
  const [custom, ...reference] = await Promise.all([
    query<{ date: string; name: string }>(
      "SELECT event_date::text AS date, name FROM content_seasonal_dates WHERE client_id = $1 AND archived_at IS NULL AND event_date BETWEEN $2 AND $3 ORDER BY event_date",
      [clientId, today, end],
    ),
    ...months.map(month => {
      const [year, number] = month.split("-").map(Number);
      return loadSeasonalMonth(year, number);
    }),
  ]);
  const own = custom.rows.map(({ date, name }) => ({ date, title: name, key: seasonalKey(date, name) }));
  const external = reference.flatMap(({ events, sourceUrl, sourceAvailable }) => events
    .filter(event => event.date >= today && event.date <= end)
    .map(({ date, name }) => ({ date, title: name, key: seasonalKey(date, name), url: sourceAvailable ? sourceUrl : undefined })));
  return [...new Map([...external, ...own].map(source => [source.key, source])).values()];
}

function rssField(item: string, name: string) {
  const raw = item.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"))?.[1].trim() || "";
  const value = raw.replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, "$1");
  return parseFragment(value).childNodes.map(node => node.nodeName === "#text" && "value" in node ? node.value : "").join("").trim();
}

export async function discoverBrainstormSources(
  mode: Exclude<BrainstormMode, "PILLARS">,
  today: string,
  context: AiClientContext,
): Promise<BrainstormSource[]> {
  if (mode === "SEASONAL") return clientSeasonalSources(today, context.companyId);
  const trends = mode === "TRENDS";
  const niche = String(context.identity.market_niche || "").trim();
  const topic = niche || String(context.company.trade_name || context.company.name || "");
  const feed = trends ? new URL("https://trends.google.com/trending/rss?geo=BR") :
    new URL("https://news.google.com/rss/search?hl=pt-BR&gl=BR&ceid=BR%3Apt-419");
  if (!trends) feed.searchParams.set("q", `${topic.slice(0, 120)} when:7d`);

  const response = await fetch(feed.toString(), { signal: AbortSignal.timeout(8000), next: { revalidate: 900 } });
  if (!response.ok) throw new Error("A fonte de pesquisa do Brainstorm está indisponível.");
  const xml = await response.text();
  if (!/<rss[\s>]/i.test(xml)) throw new Error("A fonte de pesquisa retornou um formato inválido.");
  const cutoff = shiftBrainstormDay(today, trends ? -2 : -6);
  const sources = new Map<string, BrainstormSource>();
  for (const [item] of xml.matchAll(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi)) {
    const title = rssField(item, "title").slice(0, 250);
    const published = new Date(rssField(item, "pubDate"));
    const url = URL.parse(rssField(item, trends ? "ht:news_item_url" : "link"));
    if (!title || !Number.isFinite(published.getTime()) || (!trends && url?.protocol !== "https:")) continue;
    const date = brainstormDay(published);
    if (date < cutoff || date > today) continue;
    const key = normalizeBrainstormText(title.replace(/\s+-\s+[^-]+$/, ""));
    if (key && !sources.has(key)) sources.set(key, {
      key, title, date,
      url: url?.protocol === "https:" ? url.href : "https://trends.google.com/trending?geo=BR",
    });
  }
  return [...sources.values()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);
}
