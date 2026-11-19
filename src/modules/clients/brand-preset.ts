import { query, withTransaction } from "@/lib/db/pool";
import { z } from "zod";
const values = z.array(z.string().trim().min(1).max(1000)).max(100).optional();
const schema = z.object({
  clientId: z.string().uuid(), brandContext: z.string().trim().max(12000).nullable().optional(),
  defaultTones: values, defaultCtas: values, forbiddenWords: values,
  customGuidelines: z.string().trim().max(12000).nullable().optional(),
});
const selectPreset = `SELECT p.id,c.id AS client_id,i.brand_context,
 i.tone_of_voice AS default_tones,i.default_ctas,i.forbidden_words,
 p.custom_guidelines,p.created_at,GREATEST(p.updated_at,i.updated_at) AS updated_at
 FROM clients c LEFT JOIN client_identities i ON i.client_id=c.id
 LEFT JOIN client_brand_voice_presets p ON p.client_id=c.id
 WHERE c.id=$1 AND (i.id IS NOT NULL OR p.id IS NOT NULL)`;
export async function getBrandPreset(clientId: string) {
  const result = await query(selectPreset,[z.string().uuid().parse(clientId)]);
  return result.rows[0] || null;
}
export async function saveBrandPreset(raw: unknown) {
  const data = schema.parse(raw);
  return withTransaction(async db => {
    const exists = await db.query("SELECT id FROM clients WHERE id=$1 FOR UPDATE",[data.clientId]);
    if (!exists.rowCount) throw new Error("Cliente não encontrado.");
    await db.query(`INSERT INTO client_identities(client_id,brand_context,tone_of_voice,default_ctas,forbidden_words)
      VALUES($1,$2,$3,$4,$5) ON CONFLICT(client_id) DO UPDATE SET
       brand_context=CASE WHEN $6::jsonb ? 'brandContext' THEN EXCLUDED.brand_context ELSE client_identities.brand_context END,
       tone_of_voice=CASE WHEN $6::jsonb ? 'defaultTones' THEN EXCLUDED.tone_of_voice ELSE client_identities.tone_of_voice END,
       default_ctas=CASE WHEN $6::jsonb ? 'defaultCtas' THEN EXCLUDED.default_ctas ELSE client_identities.default_ctas END,
       forbidden_words=CASE WHEN $6::jsonb ? 'forbiddenWords' THEN EXCLUDED.forbidden_words ELSE client_identities.forbidden_words END,updated_at=NOW()`,
    [data.clientId,data.brandContext || null,data.defaultTones || [],data.defaultCtas || [],data.forbiddenWords || [],JSON.stringify(Object.keys(data))]);
    await db.query(`INSERT INTO client_brand_voice_presets(client_id,custom_guidelines)
      VALUES($1,$2) ON CONFLICT(client_id) DO UPDATE SET
      custom_guidelines=CASE WHEN $3::boolean THEN EXCLUDED.custom_guidelines ELSE client_brand_voice_presets.custom_guidelines END,updated_at=NOW()`,
    [data.clientId,data.customGuidelines || null,data.customGuidelines !== undefined]);
    return (await db.query(selectPreset,[data.clientId])).rows[0];
  });
}
