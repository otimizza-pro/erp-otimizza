"use client";
import { useEffect, useState } from "react";
import { periodLabels, type ServicePeriod } from "@/modules/contracts/billing-plan";
export function ReceivableBreakdown({ id, refreshKey }: { id: string; refreshKey?: string | number }) {
  const [data, setData] = useState<{ items: Array<{ name: string; periodicity: ServicePeriod; amount: string; installment: number }>; receipts: Array<{ id: string; amount: string; is_reversed: boolean }> }>({ items: [], receipts: [] });
  const [error, setError] = useState("");
  useEffect(() => { fetch(`/api/financial/receivables/${id}/breakdown`).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error); setData(d); }).catch(e => setError(e.message)); }, [id, refreshKey]);
  return <section className="rounded-xl border p-5 bg-white space-y-2"><h2 className="font-semibold">Serviços e recibos</h2>{error && <p role="alert">{error}</p>}{data.items.map((i, n) => <p key={n}>{i.name} · {periodLabels[i.periodicity]}{i.periodicity === "ONE_TIME" ? ` · Parcela ${i.installment}` : ""} · {Number(i.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>)}{data.receipts.map(r => <a className="block text-indigo-700" key={r.id} href={`/api/financial/settlements/${r.id}/receipt`}>Recibo de {Number(r.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}{r.is_reversed ? " (estornado)" : ""}</a>)}{!data.receipts.length && <p className="text-sm text-slate-500">Os recibos estarão disponíveis após registrar um recebimento.</p>}</section>;
}
