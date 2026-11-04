import type { PoolClient } from "pg";
import { query, withTransaction } from "@/lib/db/pool";
import { BillingPlanSchema, type BillingPlanInput, type ServicePeriod, addMonths, installmentAmounts } from "./billing-plan";
import { fromCents, toCents } from "@/shared/money";

interface ScheduledItem {
  id: string; service_name: string; periodicity: ServicePeriod; total_price: string;
  first_due_date: string; end_date: string | null; installments: number; contract_version_id: string;
}
interface Charge { item: ScheduledItem; date: string; amount: number; installment: number; period: string }

async function generate(client: PoolClient, contractId: string, competency?: string) {
  const c = (await client.query<{ client_id: string; status: string; group_same_period: boolean }>(
    "SELECT client_id,status,group_same_period FROM contracts WHERE id=$1 FOR UPDATE", [contractId])).rows[0];
  if (!c || c.status !== "ACTIVE") throw new Error("Contrato não está ativo.");
  const rows = (await client.query<ScheduledItem>(`SELECT ci.*, s.first_due_date::text, cv.end_date::text, s.installments
    FROM contract_items ci JOIN contract_item_schedules s ON s.contract_item_id=ci.id
    JOIN contract_versions cv ON cv.id=ci.contract_version_id
    WHERE cv.contract_id=$1 AND cv.version_number=(SELECT MAX(version_number) FROM contract_versions WHERE contract_id=$1)`, [contractId])).rows;
  const charges: Charge[] = [];
  for (const item of rows) {
    if (item.periodicity === "ONE_TIME") {
      if (competency) continue;
      installmentAmounts(Number(item.total_price), item.installments).forEach((amount, i) => charges.push({ item, amount, date: addMonths(item.first_due_date, i), installment: i + 1, period: "ONE_TIME" }));
    } else {
      const [y, m] = (competency || item.first_due_date.slice(0, 7)).split("-").map(Number);
      const [sy, sm] = item.first_due_date.split("-").map(Number);
      const months = (y - sy) * 12 + m - sm;
      if (months < 0 || (item.periodicity === "YEARLY" && months % 12 !== 0)) continue;
      if (item.end_date && addMonths(item.first_due_date, months) > item.end_date) continue;
      charges.push({ item, amount: Number(item.total_price), date: addMonths(item.first_due_date, months), installment: 1, period: `${y}-${String(m).padStart(2, "0")}` });
    }
  }
  const groups = new Map<string, Charge[]>();
  for (const charge of charges) {
    if (toCents(charge.amount) === 0) continue;
    const existing = await client.query("SELECT id FROM receivable_items WHERE contract_item_id=$1 AND period_key=$2 AND installment_number=$3", [charge.item.id, charge.period, charge.installment]);
    if (existing.rowCount) continue;
    const key = `${charge.item.periodicity}:${charge.date}:${c.group_same_period ? "group" : charge.item.id}`;
    groups.set(key, [...(groups.get(key) || []), charge]);
  }
  let count = 0;
  for (const group of groups.values()) {
    const first = group[0];
    const total = fromCents(group.reduce((sum, ch) => sum + toCents(ch.amount), 0));
    const description = group.map(ch => `${ch.item.service_name}${ch.item.periodicity === "ONE_TIME" ? ` (${ch.installment}/${ch.item.installments})` : ""}`).join(" + ").slice(0, 255);
    const title = await client.query<{ id: string }>(`INSERT INTO receivables(client_id,contract_id,contract_version_id,receivable_number,description,competency,due_date,original_amount,balance_amount,idempotency_key)
      VALUES($1,$2,$3,'REC-'||LPAD(nextval('receivable_number_seq')::text,5,'0'),$4,$5,$6,$7,$7,$8) RETURNING id`,
      [c.client_id, contractId, first.item.contract_version_id, description, first.date.slice(0, 7), first.date, total, `SVC_${first.item.id}_${first.period}_${first.installment}`]);
    for (const ch of group) await client.query(`INSERT INTO receivable_items(receivable_id,contract_item_id,installment_number,period_key,amount) VALUES($1,$2,$3,$4,$5)`, [title.rows[0].id, ch.item.id, ch.installment, ch.period, ch.amount]);
    count++;
  }
  return count;
}

export async function configureBilling(contractId: string, input: BillingPlanInput) {
  const data = BillingPlanSchema.parse(input);
  return withTransaction(async client => {
    const contract = (await client.query<{ status: string; billing_configured_at: Date | null }>("SELECT status,billing_configured_at FROM contracts WHERE id=$1 FOR UPDATE", [contractId])).rows[0];
    if (!contract) throw new Error("Contrato não encontrado.");
    if (contract.billing_configured_at) return { createdCount: 0, alreadyConfigured: true };
    if (contract.status !== "DRAFT") throw new Error("Somente uma minuta pode ser aprovada neste fluxo.");
    const items = (await client.query<{ id: string; periodicity: ServicePeriod; total_price: string }>(`SELECT ci.id,ci.periodicity,ci.total_price FROM contract_items ci JOIN contract_versions cv ON cv.id=ci.contract_version_id WHERE cv.contract_id=$1 AND cv.version_number=(SELECT MAX(version_number) FROM contract_versions WHERE contract_id=$1)`, [contractId])).rows;
    if (data.items.length !== items.length || new Set(data.items.map(i => i.itemId)).size !== items.length) throw new Error("Configure todos os serviços uma única vez.");
    for (const schedule of data.items) {
      const item = items.find(i => i.id === schedule.itemId);
      if (!item) throw new Error("Serviço não pertence ao contrato.");
      if (item.periodicity !== "ONE_TIME" && schedule.installments !== 1) throw new Error("Apenas serviços avulsos podem ser parcelados.");
      if (toCents(Number(item.total_price)) > 0 && toCents(Number(item.total_price)) < schedule.installments) throw new Error("Valor insuficiente para o número de parcelas.");
      await client.query("INSERT INTO contract_item_schedules(contract_item_id,first_due_date,installments) VALUES($1,$2,$3)", [item.id, schedule.firstDueDate, schedule.installments]);
    }
    await client.query("UPDATE contracts SET status='ACTIVE',billing_configured_at=NOW(),group_same_period=$2,updated_at=NOW() WHERE id=$1", [contractId, data.groupSamePeriod]);
    const createdCount = await generate(client, contractId);
    await client.query("INSERT INTO audit_logs(entity_name,entity_id,action,new_data) VALUES('contracts',$1,'UPDATE',$2)", [contractId, JSON.stringify({ event: "APPROVED_AND_BILLED", ...data, createdCount })]);
    return { createdCount, alreadyConfigured: false };
  });
}
export async function generateServiceRecurrence(contractId: string, competency: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(competency)) throw new Error("Competência inválida.");
  return withTransaction(client => generate(client, contractId, competency));
}
export async function getBillingPlan(contractId: string) {
  return (await query(`SELECT ci.id,ci.service_name AS "serviceName",ci.periodicity,ci.total_price AS "totalPrice",s.first_due_date::text AS "firstDueDate",s.installments
    FROM contract_items ci JOIN contract_versions cv ON cv.id=ci.contract_version_id LEFT JOIN contract_item_schedules s ON s.contract_item_id=ci.id
    WHERE cv.contract_id=$1 AND cv.version_number=(SELECT MAX(version_number) FROM contract_versions WHERE contract_id=$1) ORDER BY ci.created_at,ci.id`, [contractId])).rows;
}
