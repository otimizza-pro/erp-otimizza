"use client";
import {useState} from "react";
import {readJsonResponse} from "@/lib/http/read-json-response";
export function ArchiveRecordAction({url,archived=false,onChanged,payload={}}:{url:string;archived?:boolean;onChanged:()=>void|Promise<void>;payload?:Record<string,unknown>}){
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 async function change(){setBusy(true);setError("");try{const response=await fetch(url,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({...payload,archived:!archived})});const data=await readJsonResponse<{error?:string}>(response);if(!response.ok)throw new Error(data.error||"A alteração não foi confirmada.");try{await onChanged();}catch{setError("Alteração salva. Recarregue a lista.");}}catch(e){setError(e instanceof Error?e.message:"Falha ao alterar arquivo.");}finally{setBusy(false);}}
 return <span className="inline-flex max-w-sm flex-col gap-1"><button type="button" disabled={busy} className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-600 disabled:opacity-50" onClick={change}>{busy?"Salvando...":archived?"Restaurar":"Arquivar"}</button>{error&&<span role="alert" className="whitespace-normal text-xs text-rose-700">{error}</span>}</span>;
}
