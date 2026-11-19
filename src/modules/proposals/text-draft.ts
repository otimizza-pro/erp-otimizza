import { z } from "zod";
import { query, withTransaction } from "@/lib/db/pool";
import { resolveDnaRecipient, type DnaRecipient } from "@/modules/crm/commercial-dna";

export const proposalTextDraftSchema = z.object({
  currentScenario: z.string().max(12000),
  partnershipFocus: z.string().max(12000),
  trackingMetrics: z.string().max(12000),
});

// A working document, not an extra copy of the recipient's registration fields.
// The same identity owns it before and after conversion. Issued versions stay frozen.
export async function getProposalTextDraft(recipient: DnaRecipient) {
  const owner = await resolveDnaRecipient(recipient);
  const result = await query(`SELECT commercial_profile->'proposalTextDraft' AS draft FROM client_identities WHERE ${owner.column}=$1`, [owner.id]);
  const stored = result.rows[0]?.draft;
  return stored ? proposalTextDraftSchema.parse(stored) : null;
}

export async function saveProposalTextDraft(recipient: DnaRecipient, raw: unknown) {
  const draft = proposalTextDraftSchema.parse(raw);
  return withTransaction(async db => {
    const owner = await resolveDnaRecipient(recipient, db);
    await db.query(`INSERT INTO client_identities(${owner.column},commercial_profile)
      VALUES($1,jsonb_build_object('proposalTextDraft',$2::jsonb))
      ON CONFLICT(${owner.column}) DO UPDATE SET commercial_profile=
        jsonb_set(client_identities.commercial_profile,'{proposalTextDraft}',$2::jsonb,true),updated_at=NOW()`,
    [owner.id, JSON.stringify(draft)]);
    // The scenario matures the lead's existing need field. The remaining two
    // texts belong to the working proposal document, not registration facts.
    if (recipient.leadId && owner.column === "lead_id") {
      await db.query("UPDATE crm_leads SET need_summary=$2,updated_at=NOW() WHERE id=$1 AND converted_client_id IS NULL", [recipient.leadId,draft.currentScenario.trim()]);
    }
    return draft;
  });
}
