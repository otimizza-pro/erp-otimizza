"use client";
import { useEffect, useState } from "react";
import { operationAreas, OperationArea, OperationTask, OperationStatus } from "@/modules/operations/catalog";
const labels: Record<OperationStatus,string> = {NOT_CONFIGURED:"Não configurado", IN_PROGRESS:"Em configuração", CONFIGURED:"Configurado", RUNNING:"Em execução", NOT_APPLICABLE:"Não se aplica"};
export function OperationalChecklist({area, scope}: {area:OperationArea; scope:string}) {
 const [tasks,setTasks] = useState<Record<string,OperationTask>>({});
 const [loaded,setLoaded] = useState(""); const [saving,setSaving] = useState(false); const [message,setMessage] = useState("");
 const key = scope + ":" + area;
 useEffect(() => { const controller = new AbortController(); setLoaded(""); setMessage(""); setTasks({});
 fetch("/api/operations/checklists?scope="+scope+"&area="+area,{signal:controller.signal}).then(async r => {const data = await r.json(); if(!r.ok) throw new Error(data.error);setTasks(data.tasks);setLoaded(key);}).catch(e=>{if(e.name!=="AbortError") setMessage(e.message);});
 return ()=>controller.abort(); },[scope,area,key]);
 async function save() {setSaving(true); setMessage(""); try {const r=await fetch("/api/operations/checklists",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({scope,area,tasks})});const data=await r.json();if(!r.ok)throw new Error(data.error);setMessage("Acompanhamento salvo.");}catch(e){setMessage(e instanceof Error?e.message:"Erro ao salvar");}finally{setSaving(false);}}
 const ready = loaded === key;
 return <section className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-4">
 <div><h2 className="font-bold">O que precisa estar funcionando</h2><p className="text-sm text-zinc-500">Marque a configuração e a execução de cada rotina. Configurado indica preparação; em execução indica que a rotina está rodando.</p></div>
 {message && <p role="status" className="text-sm p-3 bg-amber-50 rounded-lg">{message}</p>}
 {!ready && !message && <p>Carregando acompanhamento...</p>}
 {operationAreas[area].tasks.map(title=><div key={title} className="grid gap-3 md:grid-cols-[1fr_190px] border-t border-zinc-100 pt-4"><label className="text-sm font-semibold">{title}<textarea aria-label={"Observações: "+title} disabled={!ready || saving} className="block w-full border rounded-lg mt-2 p-2 font-normal" placeholder="Responsável, prazo, links e observações" value={tasks[title]?.notes||""} onChange={e=>setTasks({...tasks,[title]:{status:tasks[title]?.status||"NOT_CONFIGURED",notes:e.target.value}})} /></label><select aria-label={"Status: "+title} disabled={!ready || saving} className="border rounded-lg p-2 text-sm self-start" value={tasks[title]?.status||"NOT_CONFIGURED"} onChange={e=>setTasks({...tasks,[title]:{notes:tasks[title]?.notes||"",status:e.target.value as OperationStatus}})}>{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div>)}
 <button disabled={!ready||saving} onClick={save} className="bg-zinc-950 text-white rounded-lg px-4 py-2 disabled:opacity-40">{saving?"Salvando...":"Salvar acompanhamento"}</button>
 </section>;
}
