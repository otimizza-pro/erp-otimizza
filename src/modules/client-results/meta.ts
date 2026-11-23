export type MetricRow = {
  start: string; end: string; campaign: string; group: string; ad: string;
  campaignId: string; groupId: string; adId: string; status: string; indicator: string;
  spend: number; impressions: number; reach: number | null; results: number | null; clicks: number | null;
};
export const level = (r: MetricRow) => r.ad ? "Anúncios" : r.group ? "Conjuntos" : "Campanhas";
export const money = (n: number) => n.toLocaleString("pt-BR", {style:"currency",currency:"BRL"});
export const number = (n: number | null) => n === null ? "Sem dados" : n.toLocaleString("pt-BR",{maximumFractionDigits:2});
export const date = (s: string) => s.split("-").reverse().join("/");
export function resultName(s: string) {
  if (s.includes("messaging_conversation_started")) return "Conversas iniciadas";
  return s || "Resultados";
}
export function mergeRows(previous: MetricRow[], incoming: MetricRow[]) {
  // Older exports may omit IDs. Resolve them only when the full name path is unambiguous.
  const ids = new Map<string, Set<string>>();
  const path = (r: MetricRow) => JSON.stringify([r.campaign, r.group, r.ad]);
  const entityId = (r: MetricRow) => r.ad ? r.adId : r.group ? r.groupId : r.campaignId;
  for (const r of [...previous, ...incoming]) {
    const id = entityId(r);
    if (!id) continue;
    const key = path(r);
    if (!ids.has(key)) ids.set(key, new Set());
    ids.get(key)!.add(id);
  }
  function identity(r: MetricRow) {
    const key = path(r), known = ids.get(key);
    if (!entityId(r) && known && known.size > 1)
      throw new Error("Há nomes iguais com IDs diferentes. Exporte incluindo os IDs da Meta.");
    return JSON.stringify([level(r), entityId(r) || (known && [...known][0]) || key]);
  }
  const byEntity = new Map<string, Map<string, MetricRow>>();
  function insert(r: MetricRow) {
    const key = identity(r), period = r.start + "/" + r.end;
    let periods = byEntity.get(key);
    if (!periods) { periods = new Map(); byEntity.set(key, periods); }
    const previousRow = periods.get(period);
    periods.set(period,previousRow ? {...r,campaignId:r.campaignId || previousRow.campaignId,
      groupId:r.groupId || previousRow.groupId, adId:r.adId || previousRow.adId} : r);
  }
  previous.forEach(insert);
  incoming.forEach(insert);
  const rows: MetricRow[] = [];
  for (const periods of byEntity.values()) {
    const sorted = [...periods.values()].sort((a,b) => a.start.localeCompare(b.start));
    sorted.forEach((r,i) => {
      if (i && sorted[i-1].end >= r.start) throw new Error("Há períodos sobrepostos para " + (r.ad || r.group || r.campaign) + ". Exporte datas separadas por dia ou use o período exato já importado.");
      rows.push(r);
    });
  }
  return rows;
}
export function summary(rows: MetricRow[]) {
  function total(key: "results" | "clicks") {
    return rows.length && rows.every(r => r[key] !== null) ? rows.reduce((n,r) => n + (r[key] ?? 0),0) : null;
  }
  const spend = rows.reduce((n,r) => n+r.spend,0), impressions = rows.reduce((n,r) => n+r.impressions,0);
  const indicators = new Set(rows.map(r=>r.indicator));
  const results = indicators.size === 1 ? total("results") : null, clicks = total("clicks");
  return { spend, impressions, results, clicks, resultLabel: indicators.size===1 ? resultName(rows[0].indicator) : "Resultados",
    cost:results ? spend/results : null, cpm:impressions ? spend*1000/impressions : null,
    ctr:clicks!==null && impressions ? clicks*100/impressions : null, reach:rows.length===1 ? rows[0].reach : null };
}
