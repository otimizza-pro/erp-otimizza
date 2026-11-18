"use client";
import { useEffect,useId,useState } from "react";
export function LeadSourceInput({value,onChange}:{value:string;onChange:(value:string)=>void}) {
 const id=useId(); const [sources,setSources]=useState<string[]>([]); const [message,setMessage]=useState("");
 useEffect(()=>{fetch("/api/crm/sources").then(async r=>{if(r.ok)setSources((await r.json()).sources);}).catch(()=>{});},[]);
 async function add(){setMessage("");try{const r=await fetch("/api/crm/sources",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:value})});const data=await r.json();if(!r.ok)throw new Error(data.error);onChange(data.name);setSources(list=>Array.from(new Set([...list,data.name])));setMessage("Origem disponível para reutilização.");}catch(e){setMessage(e instanceof Error?e.message:"Erro ao adicionar origem");}}
 return <div><div className="flex gap-2"><input aria-label="Origem do lead" list={id} value={value} onChange={e=>onChange(e.target.value)} className="w-full border rounded-xl p-2 text-xs" placeholder="Não informado"/><datalist id={id}>{sources.map(name=><option key={name} value={name}/>)}</datalist><button type="button" disabled={!value.trim()} onClick={add} className="border rounded-xl p-2 text-xs">Salvar origem</button></div>{message&&<p role="status" className="text-xs mt-1">{message}</p>}</div>;
}