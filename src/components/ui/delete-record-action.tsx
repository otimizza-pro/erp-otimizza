"use client";
import {useState} from "react";
import {readJsonResponse} from "@/lib/http/read-json-response";
export function DeleteRecordAction({url,label,onDeleted}:{url:string;label:string;onDeleted:()=>void|Promise<void>}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[deleted,setDeleted]=useState(false);
 async function remove(){
  if(!window.confirm("Excluir permanentemente "+label+"? Esta ação não pode ser desfeita."))return;
  setBusy(true);setError("");try{const response=await fetch(url,{method:"DELETE"});const data=await readJsonResponse<{error?:string}>(response);if(!response.ok)throw new Error(data.error||"A exclusão não foi confirmada.");setDeleted(true);try{await onDeleted();}catch{setError("Registro excluído. Recarregue a lista para atualizar a tela.");}}catch(e){setError(e instanceof Error?e.message:"Não foi possível excluir.");}finally{setBusy(false);}
 }
 return <span className="inline-flex max-w-sm flex-col gap-1"><button type="button" disabled={busy||deleted} onClick={remove} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 disabled:opacity-50">{busy?"Excluindo...":deleted?"Excluído":"Excluir"}</button>{error&&<span role="alert" className="whitespace-normal text-xs text-rose-700">{error}</span>}</span>;
}
