import * as XLSX from "xlsx";
import { type MetricRow } from "./meta";

const clean = (v: unknown) => String(v ?? "").trim();
const normalize = (v: unknown) => clean(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
function numeric(v: unknown): number | null {
  if (v == null || ["","-","—"].includes(clean(v))) return null;
  const str = clean(v).replace(/^R\$\s*/, "");
  const n = typeof v === "number" ? v : Number(str.includes(",") ? str.replace(/\./g,"").replace(",",".") : str);
  if (!Number.isFinite(n) || n < 0) throw new Error("Métrica numérica inválida: " + clean(v));
  return n;
}
function iso(v: unknown) {
  let s = clean(v);
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) s = [d.y,String(d.m).padStart(2,"0"),String(d.d).padStart(2,"0")].join("-");
  }
  s = s.replace(/^(\d{2})\/(\d{2})\/(\d{4})$/, "$3-$2-$1");
  const dt = new Date(s+"T00:00:00Z");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !Number.isFinite(+dt) || dt.toISOString().slice(0,10)!==s) throw new Error("Data de relatório inválida.");
  return s;
}
export function parseMeta(buffer: Buffer) {
  const book = XLSX.read(buffer,{type:"buffer",sheetRows:20003});
  const matches = book.SheetNames.map(name=>book.Sheets[name]).filter(sheet => {
    if (!sheet["!ref"]) return false;
    const firstRow = XLSX.utils.sheet_to_json<unknown[]>(sheet,{header:1,range:{s:{r:0,c:0},e:{r:0,c:Math.min(255,XLSX.utils.decode_range(sheet["!ref"]).e.c)}}})[0];
    return firstRow?.some(value => normalize(value)==="inicio dos relatorios");
  });
  if (matches.length!==1) throw new Error("Selecione uma exportação da Meta em português com uma aba de métricas.");
  const sheet = matches[0];
  if (XLSX.utils.decode_range(sheet["!fullref"] || sheet["!ref"] || "A1").e.r > 20001) throw new Error("Divida o arquivo em até 20 mil linhas.");
  const [header,...data] = XLSX.utils.sheet_to_json<unknown[]>(sheet,{header:1});
  const h = header.map(normalize);
  for (const col of ["encerramento dos relatorios","nome da campanha","valor gasto (brl)","impressoes"]) {
    if (!h.includes(col)) throw new Error("Coluna obrigatória ausente: "+col);
  }
  const rows: MetricRow[] = [];
  const keys = new Map<string,string>();
  for (const line of data) {
    const get = (col: string) => line[h.indexOf(col)];
    const campaign = clean(get("nome da campanha")), group = clean(get("nome do conjunto de anuncios")), ad = clean(get("nome do anuncio"));
    if (!campaign || /^(total|resultados de \d+)/i.test(campaign) && !get("inicio dos relatorios")) continue;
    if (h.includes("nome do anuncio") && !ad || h.includes("nome do conjunto de anuncios") && !group) continue;
    const r: MetricRow = {campaign,group,ad,start:iso(get("inicio dos relatorios")),end:iso(get("encerramento dos relatorios")),
      campaignId:clean(get("id da campanha")), groupId:clean(get("id do conjunto de anuncios")), adId:clean(get("id do anuncio")),
      status:clean(get("veiculacao do anuncio") ?? get("veiculacao do conjunto de anuncios") ?? get("veiculacao da campanha")),
      spend:numeric(get("valor gasto (brl)")) ?? 0, impressions:numeric(get("impressoes")) ?? 0, reach:numeric(get("alcance")),
      results:numeric(get("resultados")), indicator:clean(get("indicador de resultados")),clicks:numeric(get("cliques (todos)"))};
    if (r.end < r.start) throw new Error("O encerramento antecede o início do relatório.");
    const key = JSON.stringify([r.start,r.end,r.campaignId||campaign,r.groupId||group,r.adId||ad]);
    if (keys.has(key)) {
      if (keys.get(key)!==JSON.stringify(r)) throw new Error("Há linhas conflitantes no mesmo período. Exporte sem detalhamentos adicionais, como idade ou posicionamento.");
      continue;
    }
    keys.set(key,JSON.stringify(r)); rows.push(r);
  }
  if (!rows.length) throw new Error("Nenhuma linha de campanha, conjunto ou anúncio encontrada.");
  return rows;
}
