import type { PoolClient } from "pg";

// Briefing and older DNA callers must enrich the same audience catalogue used
// by the studio. Do not maintain a second array in client_identities.
export async function addIdentityAudiences(db: PoolClient, clientId: string, values: unknown) {
  if (!Array.isArray(values)) return;
  const names = [...new Set(values.filter((value): value is string => typeof value === "string").map(value => value.trim()).filter(Boolean))];
  await db.query("SELECT id FROM clients WHERE id=$1 FOR UPDATE", [clientId]);
  for (const description of names) {
    const name = description.slice(0,255);
    await db.query(`INSERT INTO client_audiences(client_id,name,description)
      SELECT $1,$2,$3 WHERE NOT EXISTS (
        SELECT 1 FROM client_audiences WHERE client_id=$1 AND lower(btrim(name))=lower($2)
      )`, [clientId,name,description]);
  }
}
