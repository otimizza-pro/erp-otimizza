"use client";

import { useState, useEffect } from "react";
import { Upload, History, Send, Copy } from "lucide-react";
import { useCompany } from "@/lib/context/company-context";
import { level, summary, date, money, number, resultName, type MetricRow } from "@/modules/client-results/meta";

type Report = { active:string|null; rows:MetricRow[]; history:{id:string;date:string;name:string}[] };
const box="rounded-xl border border-zinc-200 bg-white p-5";
const control="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm";
const timestamp=(s:string)=>new Date(s).toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"});
function Channels() {
  const logos=[
    <svg key="meta" width="29" height="24" viewBox="0 0 30 24" aria-hidden><path d="M15 9C12 4 10 3 8 4C4 5 1 12 2 17C3 22 7 22 10 17L17 6C20 2 23 3 26 8C29 13 30 20 26 21C23 22 20 17 15 9Z" fill="none" stroke="#0866ff" strokeWidth="2.8" strokeLinejoin="round"/></svg>,
    <svg key="ads" width="27" height="27" viewBox="0 0 30 30" aria-hidden><path d="M15 6L5 24" stroke="#FBBC04" strokeWidth="9" strokeLinecap="round"/><circle cx="5" cy="24" r="4.5" fill="#34A853"/><path d="M15 6l10 18" stroke="#4285F4" strokeWidth="9" strokeLinecap="round"/></svg>,
    <svg key="ig" width="25" height="25" viewBox="0 0 24 24" aria-hidden fill="none" stroke="#c13584" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="6"/><circle cx="12" cy="12" r="4.5"/><circle cx="18" cy="6" r="1" fill="#c13584"/></svg>,
    <svg key="ga" width="26" height="26" viewBox="0 0 28 28" aria-hidden><rect x="18" y="1" width="8" height="26" rx="4" fill="#f9ab00"/><rect x="9" y="10" width="8" height="17" rx="4" fill="#e37400"/><circle cx="4" cy="23" r="4" fill="#e37400"/></svg>
  ];
  return <nav aria-label="Plataformas" className="flex flex-wrap gap-2">{["Meta Ads","Google Ads","Instagram","Google Analytics"].map((s,i)=><button key={s} disabled={i!==0} aria-current={i===0?"page":undefined} title={i?"Em breve":s} className={control+" flex items-center gap-2 "+(i?"opacity-55":"border-blue-500 bg-blue-50 font-semibold")}>{logos[i]}{s}</button>)}</nav>;
}
export default function Page(){
  const {selectedCompany}=useCompany();
  return <main className="space-y-5 p-4 md:p-7"><div><p className="text-sm text-zinc-500">Relatórios e BI</p><h1 className="text-2xl font-semibold">Resultado dos Clientes</h1><p>{selectedCompany.name}</p></div><Channels/>{selectedCompany.isOtimizza?<p className={box}>Selecione um cliente no topo do ERP para abrir os resultados.</p>:<Dashboard key={selectedCompany.id} id={selectedCompany.id} name={selectedCompany.name}/>}</main>;
}
function Dashboard({id,name}:{id:string;name:string}) {
  const [report,setReport]=useState<Report|null>(null),[busy,setBusy]=useState(false),[msg,setMsg]=useState("");
  const [grain,setGrain]=useState(""),[campaign,setCampaign]=useState(""),[group,setGroup]=useState(""),[ad,setAd]=useState("");
  const [start,setStart]=useState(""),[end,setEnd]=useState(""),[status,setStatus]=useState(""),[indicator,setIndicator]=useState("");
  const [panel,setPanel]=useState(""),[page,setPage]=useState(0),[order,setOrder]=useState<"spend"|"impressions"|"results">("spend");
  const api="/api/reports/client-results/"+id;
  async function load(signal?:AbortSignal){
    const res=await fetch(api,{signal,cache:"no-store"});
    if(!res.ok) throw new Error("Falha ao carregar as métricas.");
    setReport(await res.json());
  }
  useEffect(()=>{const c=new AbortController();load(c.signal).catch(e=>{if(!c.signal.aborted)setMsg(e.message);});return ()=>c.abort();},[api]);
  async function submit(form:FormData){
    setBusy(true);setMsg("");form.set("active",report?.active??"");
    try{const res=await fetch(api,{method:"POST",body:form});const data=await res.json();if(!res.ok)throw new Error(data.error);
      await load();setMsg(data.message);setPanel("");setPage(0);
      if(form.has("restore")){setGrain("");setCampaign("");setGroup("");setAd("");setStart("");setEnd("");setStatus("");setIndicator("");}
    }catch(e){setMsg(e instanceof Error?e.message:"Falha ao atualizar.");}finally{setBusy(false);}
  }
  const all=report?.rows??[], levels=["Campanhas","Conjuntos","Anúncios"].filter(l=>all.some(r=>level(r)===l));
  const selected=levels.includes(grain)?grain:levels[0];
  const scope=all.filter(r=>level(r)===selected);
  const byCampaign=scope.filter(r=>!campaign||r.campaign===campaign);
  const byGroup=byCampaign.filter(r=>!group||r.group===group);
  const rows=byGroup.filter(r=>(!ad||r.ad===ad)&&(!start||r.start>=start)&&(!end||r.end<=end)&&(!status||r.status===status)&&(!indicator||r.indicator===indicator)).sort((a,b)=>(b[order]??0)-(a[order]??0));
  const s=summary(rows), period=rows.length?date(rows.reduce((v,r)=>r.start<v?r.start:v,rows[0].start))+" a "+date(rows.reduce((v,r)=>r.end>v?r.end:v,rows[0].end)):"";
  const ranking=new Map<string,number>();for(const r of rows)ranking.set(r.campaign,(ranking.get(r.campaign)??0)+r.spend);
  const top=[...ranking].sort((a,b)=>b[1]-a[1]).slice(0,5);
  const text=["📊 *Resultado de Meta Ads | "+name+"*","📅 "+period,[selected,campaign,group,ad,status,indicator&&resultName(indicator)].filter(Boolean).join(" · "),"","💰 Investimento: "+money(s.spend),"👁️ Impressões: "+number(s.impressions),s.results!==null?"🎯 "+s.resultLabel+": "+number(s.results):"",s.cost!==null?"📌 Custo por resultado: "+money(s.cost):"",s.reach!==null?"👥 Alcance: "+number(s.reach):"",s.clicks!==null?"🖱️ Cliques: "+number(s.clicks):"","📣 *Campanhas por investimento*",...top.map(([k,v])=>"• "+k+" | "+money(v))].filter(Boolean).join("\n");
  function filter(label:string,value:string,values:string[],change:(v:string)=>void,required=false){
    return <label className="grid gap-1 text-xs font-medium">{label}<select className={control} value={value} onChange={e=>{change(e.target.value);setPage(0);}}>{!required&&<option value="">Todos</option>}{[...new Set(values.filter(Boolean))].sort().map(v=><option key={v} value={v}>{label==="Indicador"?resultName(v):v}</option>)}</select></label>;
  }
  const current=Math.min(page,Math.max(0,Math.ceil(rows.length/25)-1));
  return <><div className="flex flex-wrap gap-2">
    <button disabled={!report||busy} className={control} onClick={()=>setPanel(panel==="upload"?"":"upload")}><Upload size={15} className="inline"/> Atualizar Métricas</button>
    <button disabled={!report?.history.length||busy} className={control} onClick={()=>setPanel(panel==="history"?"":"history")}><History size={15} className="inline"/> Backup e restauração</button>
    <button disabled={!rows.length||busy} className={control} onClick={()=>setPanel(panel==="share"?"":"share")}><Send size={15} className="inline"/> Enviar Relatório</button></div>
    {msg&&<p role="status" className={box}>{msg}</p>}
    {panel==="upload"&&<form className={box+" space-y-3"} onSubmit={e=>{e.preventDefault();void submit(new FormData(e.currentTarget));}}><strong>Importar Meta Ads para {name}</strong><p className="text-sm">Escolha a exportação em português e em reais, no nível de campanha, conjunto ou anúncio.</p><input required type="file" name="file" accept=".xlsx,.xls" className={control}/><button disabled={busy} className={control}>{busy?"Importando…":"Importar métricas"}</button></form>}
    {panel==="history"&&<section className={box}><h2 className="font-semibold">Restaurar versão de {name}</h2><p className="mb-2 text-xs">Horário de Brasília. Escolha a posição do relatório após uma importação.</p>{[...(report?.history??[]),{id:"empty",date:"",name:"Antes da primeira importação"}].map(v=><button key={v.id} disabled={busy||(report?.active??"empty")===v.id} className="block w-full border-t py-2 text-left disabled:text-zinc-400" onClick={()=>{if(window.confirm("Restaurar o relatório de "+name+" para "+(v.date?timestamp(v.date):v.name)+"?")){const form=new FormData();form.set("restore",v.id);void submit(form);}}}>{v.date&&timestamp(v.date)+" · "}{v.name} {(report?.active??"empty")===v.id?"(atual)":""}</button>)}</section>}
    {panel==="share"&&rows.length>0&&<section className={box+" space-y-3"}><h2 className="font-semibold">Mensagem para WhatsApp</h2><pre className="whitespace-pre-wrap font-sans text-sm">{text}</pre><button className={control} onClick={()=>navigator.clipboard.writeText(text).then(()=>setMsg("Mensagem copiada.")).catch(()=>setMsg("Selecione e copie o texto acima."))}><Copy size={14} className="inline"/> Copiar mensagem</button> <a className={control} target="_blank" rel="noreferrer" href={"https://wa.me/?text="+encodeURIComponent(text)}>Abrir WhatsApp</a></section>}
    {!all.length?<p className={box}>{report?"Nenhuma métrica importada para este cliente.":msg?"Relatório indisponível.":"Carregando métricas…"}</p>:<>
    <section className={box+" grid gap-3 sm:grid-cols-3 xl:grid-cols-4"}>
      {filter("Nível do relatório",selected,levels,v=>{setGrain(v);setCampaign("");setGroup("");setAd("");setStatus("");setIndicator("");},true)}
      {filter("Campanha",campaign,scope.map(r=>r.campaign),v=>{setCampaign(v);setGroup("");setAd("");})}
      {scope.some(r=>r.group)&&filter("Conjunto",group,byCampaign.map(r=>r.group),v=>{setGroup(v);setAd("");})}
      {scope.some(r=>r.ad)&&filter("Anúncio / criativo",ad,byGroup.map(r=>r.ad),setAd)}
      {filter("Veiculação",status,scope.map(r=>r.status),setStatus)}
      {filter("Indicador",indicator,scope.map(r=>r.indicator),setIndicator)}
      <label className="grid gap-1 text-xs">De<input className={control} type="date" value={start} max={end||undefined} onChange={e=>{setStart(e.target.value);setPage(0);}}/></label>
      <label className="grid gap-1 text-xs">Até<input className={control} type="date" value={end} min={start||undefined} onChange={e=>{setEnd(e.target.value);setPage(0);}}/></label>
      <p className="col-span-full text-xs text-zinc-500">O período inclui somente linhas inteiras da exportação. Para filtrar por dia, exporte com divisão diária.</p></section>
    {!rows.length?<p className={box}>Nenhum resultado para os filtros selecionados.</p>:<>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[["Investimento",money(s.spend)],["Impressões",number(s.impressions)],[s.resultLabel,number(s.results)],["Custo por resultado",s.cost===null?"Sem dados":money(s.cost)],["CPM",s.cpm===null?"Sem dados":money(s.cpm)],["Cliques (todos)",number(s.clicks)],["CTR",s.ctr===null?"Sem dados":number(s.ctr)+"%"],["Alcance",s.reach===null&&rows.length>1?"Ver por linha":number(s.reach)]].map(([k,v])=><div key={k} className={box}><p className="text-xs text-zinc-500">{k}</p><strong className="text-xl">{v}</strong></div>)}</div>
    <section className={box}><h2 className="mb-3 font-semibold">Campanhas por investimento</h2>{top.map(([k,v])=><div key={k} className="my-2"><div className="flex justify-between gap-2 text-sm"><span>{k}</span><span>{money(v)}</span></div><progress aria-label={k} className="h-2 w-full accent-blue-600" value={v} max={top[0][1]||1}/></div>)}</section>
    <section className={box+" overflow-x-auto"}><header className="mb-3 flex items-center justify-between gap-2"><h2 className="font-semibold">Detalhamento · {rows.length} registros</h2><select aria-label="Ordenar por" className={control} value={order} onChange={e=>setOrder(e.target.value as typeof order)}><option value="spend">Maior investimento</option><option value="impressions">Mais impressões</option><option value="results">Mais resultados</option></select></header>
    <table className="w-full text-left text-sm"><thead><tr>{["Período","Campanha / conjunto / anúncio","Veiculação","Investimento","Impressões","Alcance","Indicador","Resultados","Custo/resultado"].map(h=><th key={h} className="p-2">{h}</th>)}</tr></thead><tbody>{rows.slice(current*25,current*25+25).map(r=><tr className="border-t" key={JSON.stringify(r)}>{[date(r.start)+" a "+date(r.end),[r.campaign,r.group,r.ad].filter(Boolean).join(" / "),r.status,money(r.spend),number(r.impressions),number(r.reach),resultName(r.indicator),number(r.results),r.results?money(r.spend/r.results):"Sem dados"].map((v,i)=><td className="p-2" key={i}>{v}</td>)}</tr>)}</tbody></table>{rows.length>25&&<div className="flex gap-3"><button disabled={!current} onClick={()=>setPage(current-1)}>Anterior</button>{current+1} / {Math.ceil(rows.length/25)}<button disabled={(current+1)*25>=rows.length} onClick={()=>setPage(current+1)}>Próxima</button></div>}</section></>}</>}</>;
}
