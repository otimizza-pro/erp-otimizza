import type { PoolClient } from "pg";
import { query, withTransaction } from "@/lib/db/pool";

import { commercialDnaSchema, missingCommercialDna } from "./commercial-dna-schema";

export type DnaRecipient = { leadId: string; clientId?: never } | { clientId: string; leadId?: never };

export async function resolveDnaRecipient(recipient: DnaRecipient, db?: PoolClient) {
  const execute = db ? db.query.bind(db) : query;
  if (recipient.leadId) {
    const result = await execute("SELECT id,converted_client_id FROM crm_leads WHERE id=$1" + (db ? " FOR UPDATE" : ""), [recipient.leadId]);
    if (!result.rows[0]) throw new Error("Lead não encontrado.");
    return result.rows[0].converted_client_id ? { column: "client_id", id: String(result.rows[0].converted_client_id) } : { column: "lead_id", id: recipient.leadId };
  }
  const exists = await execute("SELECT id FROM clients WHERE id=$1", [recipient.clientId]);
  if (!exists.rows[0]) throw new Error("Cliente não encontrado.");
  return { column: "client_id", id: recipient.clientId };
}

export async function getCommercialDna(recipient: DnaRecipient) {
  const owner = await resolveDnaRecipient(recipient);
  const result = await query(`SELECT brand_context,commercial_profile FROM client_identities WHERE ${owner.column}=$1`, [owner.id]);
  const row = result.rows[0];
  const dna = commercialDnaSchema.parse({ ...(row?.commercial_profile || {}), businessDescription: row?.brand_context || "" });
  return { dna, missing: missingCommercialDna(dna), proposalTextDraft: row?.commercial_profile?.proposalTextDraft || null };
}

export async function saveCommercialDnaInTransaction(db: PoolClient, recipient: DnaRecipient, raw: unknown) {
  const dna = commercialDnaSchema.parse(raw);
  const { businessDescription, ...profile } = dna;
  const providedProfile = Object.fromEntries(Object.entries(profile).filter(([key]) => typeof raw === "object" && raw !== null && Object.prototype.hasOwnProperty.call(raw, key)));
  const owner = await resolveDnaRecipient(recipient, db);
  const providedDescription = typeof raw === "object" && raw !== null && Object.prototype.hasOwnProperty.call(raw, "businessDescription");
  const result = await db.query(`INSERT INTO client_identities(${owner.column},brand_context,commercial_profile)
    VALUES($1,$2,$3::jsonb) ON CONFLICT(${owner.column}) DO UPDATE SET
    brand_context=CASE WHEN $4::boolean THEN EXCLUDED.brand_context ELSE client_identities.brand_context END,
    commercial_profile=client_identities.commercial_profile || EXCLUDED.commercial_profile, updated_at=NOW()
    RETURNING brand_context,commercial_profile`, [owner.id, businessDescription, JSON.stringify(providedProfile), providedDescription]);
  const saved = commercialDnaSchema.parse({ ...result.rows[0].commercial_profile, businessDescription: result.rows[0].brand_context || "" });
  return { dna: saved, missing: missingCommercialDna(saved) };
}
export async function saveCommercialDna(recipient: DnaRecipient, raw: unknown) {
  return withTransaction(db => saveCommercialDnaInTransaction(db, recipient, raw));
}
