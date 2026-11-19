"use client";

import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import {Sparkles,Save,Copy,Download,History,FileText,Code2,Eye,RefreshCw,ArrowUpRight} from "lucide-react";

import {readJsonResponse} from "@/lib/http/read-json-response";
import {useCompany} from "@/lib/context/company-context";
import {contentCompanyId} from "@/modules/clients/internal-company";
import {creationAreas} from "@/modules/digital-presence/catalog";
import type {CreationInput,CreationMaterial} from "@/modules/digital-presence/schemas";

interface SavedMaterial {
  id:string;title:string;output_label:string;inputs:Record<string,string>;audience:string;
  guidance:string;material:CreationMaterial;model_used:string|null;created_at:string;archived_at?:string|null;
}
interface PresenceResponse {
  success: boolean; error?: string; source?: string; model: string;
  context: {audiences:string[];missing:string[];sources:string[];summary:string};
  materials: SavedMaterial[]; historyError?: string;
  material: CreationMaterial; document: SavedMaterial;
}
const control="mt-1.5 block w-full min-w-0 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-xs text-zinc-900 outline-none transition focus:border-zinc-500 focus:bg-white focus:ring-2 focus:ring-zinc-100 disabled:opacity-50";
const secondary="inline-flex items-center justify-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50";

export function DigitalPresenceWorkspace({area}:{area:string}){
  const {selectedCompany}=useCompany();
  const clientId=contentCompanyId(selectedCompany);
  return <><CreationEditor key={clientId+area} clientId={clientId} companyName={selectedCompany.name} area={area}/></>;
}

function CreationEditor({clientId,companyName,area}:{clientId:string;companyName:string;area:string}){
  const definition=creationAreas[area];
  const [inputs,setInputs]=useState<Record<string,string>>({});
  const [outputIndex,setOutputIndex]=useState(0);
  const [audience,setAudience]=useState("");const [guidance,setGuidance]=useState("");
  const [context,setContext]=useState<{audiences:string[];missing:string[];sources:string[];summary:string}|null>(null);
  const [materials,setMaterials]=useState<SavedMaterial[]>([]);
  const [material,setMaterial]=useState<CreationMaterial|null>(null);
  const [requestSnapshot,setRequestSnapshot]=useState<CreationInput|null>(null);
  const [model,setModel]=useState<string|null>(null);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[saving,setSaving]=useState(false);
  const [error,setError]=useState(""),[historyError,setHistoryError]=useState(""),[message,setMessage]=useState("");
  const [resultTab,setResultTab]=useState<"text"|"preview"|"html">("text");
  const [archived,setArchived]=useState(false);
  const [revision,setRevision]=useState(0);
  const pendingRequest=useRef<AbortController|null>(null);
  const live=useRef(true);
  useEffect(()=>{live.current=true;return()=>{live.current=false;pendingRequest.current?.abort();};},[]);
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setHistoryError("");setError("");
    fetch("/api/digital-presence?"+new URLSearchParams({clientId,area,archived:String(archived)}),{signal:controller.signal}).then(async response=>{
      const data=await readJsonResponse<PresenceResponse>(response);if(!response.ok||!data.success)throw new Error(data.error||"Não foi possível carregar esta área.");
      setContext(data.context);setMaterials(data.materials);setHistoryError(data.historyError||"");
      if(data.context.audiences.length===1)setAudience(current=>current||data.context.audiences[0]);
    }).catch(error=>{if(error.name!=="AbortError")setError(error.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[clientId,area,revision,archived]);

  async function generate(){
    const snapshot={clientId,area,outputIndex,audience,guidance,inputs};
    const controller=new AbortController();pendingRequest.current=controller;
    setBusy(true);setError("");setMessage("");
    try{
      const response=await fetch("/api/digital-presence",{method:"POST",signal:controller.signal,headers:{"Content-Type":"application/json"},body:JSON.stringify({...snapshot,action:"GENERATE"})});
      const data=await readJsonResponse<PresenceResponse>(response);if(!live.current)return;
      if(!response.ok||!data.success||data.source!=="OPENROUTER")throw new Error(data.error||"A IA não confirmou a geração. Nenhum material novo foi aceito.");
      setMaterial(data.material);setModel(data.model);setRequestSnapshot(snapshot);setResultTab(data.material.html?"preview":"text");
      setMessage("Material gerado. Revise os textos e as pendências antes de salvar uma versão.");
    }catch(error){if(live.current&&!(error instanceof Error&&error.name==="AbortError"))setError(error instanceof Error?error.message:"Erro na geração.");}
    finally{if(live.current)setBusy(false);}
  }
  async function save(){
    if(!material||!requestSnapshot)return;
    setSaving(true);setError("");setMessage("");
    try{
      const response=await fetch("/api/digital-presence",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...requestSnapshot,action:"SAVE",material,model})});
      const data=await readJsonResponse<PresenceResponse>(response);if(!live.current)return;
      if(!response.ok||!data.success)throw new Error(data.error||"Não foi possível salvar. O texto continua disponível para copiar.");
      setMaterial(data.document.material);setMaterials(current=>[data.document,...current]);setMessage("Nova versão salva para "+companyName+". Versões anteriores foram preservadas.");
    }catch(error){if(live.current)setError(error instanceof Error?error.message:"Erro ao salvar.");}
    finally{if(live.current)setSaving(false);}
  }
  async function changeSaved(document:SavedMaterial,action:"ARCHIVE"|"RESTORE"|"DELETE"){
    if(action==="DELETE"&&!window.confirm("Excluir permanentemente esta versão de "+document.title+"?"))return;
    setSaving(true);setError("");setMessage("");try{const response=await fetch("/api/digital-presence",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({clientId,area,id:document.id,action})});const data=await readJsonResponse<{success:boolean;error?:string}>(response);if(!response.ok||!data.success)throw new Error(data.error||"A alteração não foi confirmada.");setMaterials(current=>current.filter(m=>m.id!==document.id));setMessage(action==="DELETE"?"Versão excluída.":action==="ARCHIVE"?"Versão arquivada.":"Versão restaurada.");}catch(error){setError(error instanceof Error?error.message:"Falha na alteração.");}finally{setSaving(false);}
  }
  function open(document:SavedMaterial){
    const index=definition.outputs.indexOf(document.output_label);
    const snapshot={clientId,area,outputIndex:Math.max(0,index),audience:document.audience,guidance:document.guidance,inputs:document.inputs};
    setInputs(document.inputs);setOutputIndex(snapshot.outputIndex);setAudience(document.audience);setGuidance(document.guidance);
    setMaterial(document.material);setModel(document.model_used);setRequestSnapshot(snapshot);setResultTab("text");setMessage("Versão carregada. Salvar criará uma nova versão.");setError("");
  }
  async function copy(){try{await navigator.clipboard.writeText(material?.content||"");setMessage("Texto copiado.");}catch{setError("Não foi possível copiar automaticamente. Selecione o texto e copie manualmente.");}}
  function download(html:boolean){
    const content=html?material?.html:material?.content;if(!content)return;
    const url=URL.createObjectURL(new Blob([content],{type:html?"text/html;charset=utf-8":"text/markdown;charset=utf-8"}));
    const anchor=document.createElement("a");anchor.href=url;anchor.download=area+"-"+clientId.slice(0,8)+(html?".html":".md");anchor.click();URL.revokeObjectURL(url);
  }
  const missing=definition.fields.filter(field=>field.required&&!inputs[field.key]?.trim());
  const ready=!!context&&!context.missing.length&&!!audience&&!missing.length;
  return <div className="space-y-6 pb-12">
    <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-hourline sm:p-6">
      <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-950 text-white"><Sparkles className="h-5 w-5"/></span><div><p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Criação com IA · {companyName}</p><h1 className="mt-1 text-xl font-bold tracking-tight text-zinc-950">{definition.title}</h1><p className="mt-1 text-xs leading-relaxed text-zinc-500">{definition.description}</p></div></div>
      <Link href={"/clients/"+clientId+"/identity"} className={secondary}><FileText className="h-3.5 w-3.5"/>Identidade & DNA<ArrowUpRight className="h-3 w-3"/></Link>
    </header>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_290px]">
      <div className="min-w-0 space-y-5">
        <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-hourline space-y-4">
          <div><h2 className="text-sm font-semibold text-zinc-950">O que vamos criar?</h2><p className="mt-1 text-xs text-zinc-500">A empresa é a selecionada no cabeçalho. A IA recebe sua identidade, públicos e diretrizes.</p></div>
          {loading?<p role="status" className="text-xs text-zinc-500">Carregando contexto...</p>:context&&<>
            {context.missing.length>0&&<p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">Complete na Identidade & DNA: {context.missing.join("; ")}.</p>}
            <div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold text-zinc-600">Material<select className={control} disabled={busy} value={outputIndex} onChange={event=>setOutputIndex(Number(event.target.value))}>{definition.outputs.map((output,index)=><option key={output} value={index}>{output}</option>)}</select></label><label className="text-xs font-semibold text-zinc-600">Público desta solicitação<select className={control} disabled={busy} value={audience} onChange={event=>setAudience(event.target.value)}><option value="">Selecione o público...</option>{context.audiences.map(value=><option key={value}>{value}</option>)}</select></label></div>
            <details className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2"><summary className="cursor-pointer text-xs font-semibold text-zinc-600">Contexto usado pela IA</summary><p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-zinc-500">{context.summary||"Preencha o contexto da empresa."}</p><p className="mt-2 text-[10px] text-zinc-400">Fontes: {context.sources.join(" · ")}</p></details>
          </>}
          <div className="grid gap-4 sm:grid-cols-2">{definition.fields.map(field=><label key={field.key} className={"text-xs font-semibold text-zinc-600 "+(field.multiline?"sm:col-span-2":"")}>{field.label}{field.required?" *":""}{field.multiline?<textarea disabled={busy} rows={3} className={control} value={inputs[field.key]||""} placeholder={field.placeholder} onChange={event=>setInputs({...inputs,[field.key]:event.target.value})}/>:<input disabled={busy} className={control} value={inputs[field.key]||""} placeholder={field.placeholder} onChange={event=>setInputs({...inputs,[field.key]:event.target.value})}/>}</label>)}</div>
          <label className="block text-xs font-semibold text-zinc-600">Orientações para esta criação<textarea disabled={busy} rows={3} className={control} value={guidance} onChange={event=>setGuidance(event.target.value)} placeholder="Prioridades, restrições e detalhes confirmados. Não informe senhas ou chaves de acesso."/></label>
          {!ready&&!loading&&<p className="text-xs leading-relaxed text-zinc-500">Falta preencher: {[...(!audience?["público"]:[]),...missing.map(field=>field.label),...(context?.missing||[])].join(", ")||"carregar contexto"}.</p>}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-4"><p className="max-w-lg text-[11px] leading-relaxed text-zinc-500">Gera um material para revisão. Publicação e configuração nas plataformas são etapas posteriores.</p><button type="button" disabled={!ready||busy||saving} onClick={generate} className="inline-flex items-center gap-2 rounded-full bg-zinc-950 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-zinc-800 disabled:opacity-50">{busy?<RefreshCw className="h-3.5 w-3.5 animate-spin"/>:<Sparkles className="h-3.5 w-3.5"/>}{busy?"Criando com IA...":"Criar com IA"}</button></div>
        </section>
        {error&&<div role="alert" className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700"><p>{error}</p><button type="button" disabled={busy||saving||loading} className={secondary} onClick={()=>setRevision(value=>value+1)}>Recarregar contexto e materiais</button></div>}
        {message&&<p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-700">{message}</p>}
        {material&&<section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-hourline space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-sm font-semibold text-zinc-950">Material para revisão</h2><div className="flex flex-wrap gap-2"><button className={secondary} type="button" onClick={copy}><Copy className="h-3 w-3"/>Copiar texto</button><button className={secondary} type="button" onClick={()=>download(false)}><Download className="h-3 w-3"/>Baixar texto</button>{material.html&&<button className={secondary} type="button" onClick={()=>download(true)}><Download className="h-3 w-3"/>Baixar HTML</button>}</div></div>
          <label className="block text-xs font-semibold text-zinc-600">Título<input className={control} value={material.title} onChange={event=>setMaterial({...material,title:event.target.value})}/></label>
          {material.html&&<nav aria-label="Visualização do material" className="flex flex-wrap gap-1 rounded-xl bg-zinc-100 p-1">{([{key:"text",label:"Texto",icon:FileText},{key:"preview",label:"Prévia HTML",icon:Eye},{key:"html",label:"Código HTML",icon:Code2}] as const).map(tab=><button key={tab.key} type="button" onClick={()=>setResultTab(tab.key)} aria-pressed={resultTab===tab.key} className={"inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold "+(resultTab===tab.key?"bg-white text-zinc-950 shadow-2xs":"text-zinc-500")}><tab.icon className="h-3 w-3"/>{tab.label}</button>)}</nav>}
          {resultTab==="preview"&&material.html?<iframe title="Prévia isolada do protótipo HTML" sandbox="" referrerPolicy="no-referrer" srcDoc={material.html} className="h-[650px] w-full rounded-xl border border-zinc-200 bg-white"/>:resultTab==="html"&&material.html?<textarea aria-label="Código HTML" rows={25} className={control+" font-mono leading-relaxed"} value={material.html} onChange={event=>setMaterial({...material,html:event.target.value})}/>:<textarea aria-label="Texto do material" rows={25} className={control+" leading-relaxed resize-y"} value={material.content} onChange={event=>setMaterial({...material,content:event.target.value})}/>}
          {material.pending.length>0&&<div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><h3 className="text-xs font-semibold text-amber-900">Informações e validações pendentes</h3><ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-relaxed text-amber-800">{material.pending.map((item,index)=><li key={index}>{item}</li>)}</ul></div>}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-4"><span className="text-[10px] text-zinc-400">Modelo de origem: {model||"Não informado"}. As alterações de revisão são manuais.</span><button type="button" disabled={saving||busy} onClick={save} className="inline-flex items-center gap-2 rounded-full bg-zinc-950 px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50"><Save className="h-3.5 w-3.5"/>{saving?"Salvando...":"Salvar nova versão"}</button></div>
        </section>}
      </div>
      <aside className="min-w-0"><section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-hourline space-y-4"><div className="flex items-center gap-2"><History className="h-4 w-4 text-zinc-500"/><h2 className="text-sm font-semibold text-zinc-950">Materiais salvos</h2></div><p className="text-xs text-zinc-500">{companyName} · {definition.title}</p><label className="flex items-center gap-2 text-xs text-zinc-600"><input type="checkbox" checked={archived} onChange={event=>setArchived(event.target.checked)}/>Ver arquivados</label>{historyError?<div role="alert" className="space-y-2 text-xs text-rose-700"><p>{historyError}</p><button type="button" className={secondary} onClick={()=>setRevision(value=>value+1)}>Tentar novamente</button></div>:!materials.length?<p className="rounded-xl border border-dashed border-zinc-200 p-4 text-xs text-zinc-400">{loading?"Carregando versões...":"Nenhuma versão salva nesta área."}</p>:<div className="space-y-2">{materials.map(document=><article key={document.id} className="space-y-2 rounded-xl border border-zinc-200 p-2"><button type="button" disabled={busy||saving} key={document.id} onClick={()=>open(document)} className="block w-full rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-left hover:border-zinc-300 disabled:opacity-50"><span className="block break-words text-xs font-semibold text-zinc-800">{document.title}</span><span className="mt-1 block text-[10px] text-zinc-400">{document.output_label} · {new Date(document.created_at).toLocaleString("pt-BR")}</span></button><div className="flex flex-wrap gap-2 px-1 text-[10px]"><button disabled={busy||saving} type="button" className="font-semibold text-zinc-700" onClick={()=>open(document)}>Editar / criar versão</button><button disabled={busy||saving} type="button" className="font-semibold text-zinc-600" onClick={()=>changeSaved(document,archived?"RESTORE":"ARCHIVE")}>{archived?"Restaurar":"Arquivar"}</button><button disabled={busy||saving} type="button" className="font-semibold text-rose-600" onClick={()=>changeSaved(document,"DELETE")}>Excluir</button></div></article>)}</div>}</section></aside>
    </div>
  </div>;
}
