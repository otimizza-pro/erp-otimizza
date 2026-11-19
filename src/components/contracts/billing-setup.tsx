"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, Loader2 } from "lucide-react";
import { periodLabels, type ServicePeriod, installmentAmounts } from "@/modules/contracts/billing-plan";
interface Item { id: string; serviceName: string; periodicity: ServicePeriod; totalPrice: string; firstDueDate: string; installments: number }
export function BillingSetup({ contractId, clientId }: { contractId: string; clientId: string }) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]), [group, setGroup] = useState(true), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  useEffect(() => { fetch(`/api/contracts/${contractId}/billing-plan`).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error); setItems(d.map((i: Item) => ({ ...i, firstDueDate: i.firstDueDate || new Date().toLocaleDateString("en-CA"), installments: i.installments || 1 }))); }).catch(e => setError(e.message)); }, [contractId]);
  const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  async function save() { setBusy(true); setError(""); try { const r = await fetch(`/api/contracts/${contractId}/billing-plan`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ groupSamePeriod: group, items: items.map(i => ({ itemId: i.id, firstDueDate: i.firstDueDate, installments: i.installments })) }) }); const d = await r.json(); if (!r.ok) throw new Error(d.error); router.push(`/projects/new?clientId=${clientId}&contractId=${contractId}&onboarding=1`); } catch (e) { setError(e instanceof Error ? e.message : "Falha ao salvar"); } finally { setBusy(false); } }
  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white shadow-hourline overflow-hidden">
      <header className="flex items-start gap-3 p-5 sm:p-6 border-b border-zinc-100">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700"><CalendarDays className="h-5 w-5" /></span>
        <div><h2 className="text-sm font-semibold text-zinc-950">Aprovação e datas de pagamento</h2><p className="mt-1 max-w-3xl text-xs leading-relaxed text-zinc-500">Defina o primeiro vencimento por serviço. Mensalidades e anuidades se repetem a partir dessa data; serviços avulsos podem ser parcelados em até 3x.</p></div>
      </header>
      <div className="p-5 sm:p-6 space-y-5">
        <div className="space-y-3">{items.map((item,index)=>(
          <div key={item.id} className="grid gap-4 rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_100px_minmax(0,1fr)] lg:items-center">
            <div className="min-w-0"><p className="text-xs font-semibold leading-relaxed text-zinc-900">{item.serviceName}</p><p className="mt-1 text-xs text-zinc-500">{periodLabels[item.periodicity]} · {money(Number(item.totalPrice))}</p></div>
            <label className="block text-xs font-medium text-zinc-600">Primeiro vencimento<input disabled={busy} aria-label={"Vencimento de "+item.serviceName} type="date" className="mt-1.5 block w-full min-w-0 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-xs text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-100 disabled:opacity-50" value={item.firstDueDate} onChange={e=>setItems(items.map((v,i)=>i===index?{...v,firstDueDate:e.target.value}:v))}/></label>
            <label className="block text-xs font-medium text-zinc-600">Parcelas<select aria-label={"Parcelas de "+item.serviceName} disabled={busy||item.periodicity!=="ONE_TIME"} className="mt-1.5 block w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-xs text-zinc-900 outline-none focus:border-zinc-500 disabled:bg-zinc-100 disabled:text-zinc-400" value={item.installments} onChange={e=>setItems(items.map((v,i)=>i===index?{...v,installments:Number(e.target.value)}:v))}>{[1,2,3].map(n=><option key={n} value={n}>{n}x</option>)}</select></label>
            <div><p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Cobrança</p><p className="mt-1 text-xs leading-relaxed text-zinc-600">{item.periodicity==="ONE_TIME"?installmentAmounts(Number(item.totalPrice),item.installments).map(money).join(" + "):"Recorrente"}</p></div>
          </div>
        ))}</div>
        {!items.length&&!error&&<p className="py-4 text-center text-xs text-zinc-500">Carregando serviços do contrato...</p>}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"><label className="flex items-start gap-2.5 text-xs font-medium leading-relaxed text-zinc-700"><input disabled={busy} type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300 accent-zinc-950" checked={group} onChange={e=>setGroup(e.target.checked)}/>Agrupar na mesma fatura os serviços com a mesma periodicidade e vencimento</label><p className="mt-2 pl-6 text-xs leading-relaxed text-zinc-500">Os serviços continuam discriminados no financeiro. Cobranças mensais, anuais e avulsas ficam separadas.</p></div>
        {error&&<p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error}</p>}
      </div>
      <footer className="flex flex-col gap-3 border-t border-zinc-100 bg-zinc-50/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><p className="max-w-lg text-xs leading-relaxed text-zinc-500">Ao aprovar, o sistema gera as cobranças e abre a configuração do projeto.</p><button type="button" disabled={busy||!items.length} onClick={save} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-zinc-950 px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50">{busy?<Loader2 className="h-3.5 w-3.5 animate-spin"/>:<Check className="h-3.5 w-3.5"/>}{busy?"Gerando cobranças...":"Aprovar e continuar"}</button></footer>
    </section>
  );
}
