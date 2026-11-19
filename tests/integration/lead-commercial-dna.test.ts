import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { getDbPool } from "@/lib/db/pool";

describe("DNA do lead e conversão em cliente", () => {
  it("transfere o mesmo DNA ao cliente sem duplicar e preserva a identidade após excluir o histórico do lead", async () => {
    const db = await getDbPool().connect(); await db.query("BEGIN");
    try {
      const installed = await db.query("SELECT 1 FROM information_schema.columns WHERE table_name='client_identities' AND column_name='lead_id'");
      if (!installed.rowCount) await db.query(await readFile("database/migrations/038_lead_commercial_dna.sql", "utf8"));
      const lead = (await db.query("INSERT INTO crm_leads(person_type,name) VALUES('PJ','[TEST] DNA inicial') RETURNING id")).rows[0].id;
      const profile = { idealCustomer: "Pacientes", commercialObjective: "Explicar serviços", requestedScope: "Somente edição de vídeos" };
      const identity = (await db.query("INSERT INTO client_identities(lead_id,commercial_profile) VALUES($1,$2::jsonb) RETURNING id", [lead, JSON.stringify(profile)])).rows[0].id;
      const client = (await db.query("INSERT INTO clients(type,name) VALUES('PJ','[TEST] DNA cliente') RETURNING id")).rows[0].id;
      await db.query("UPDATE crm_leads SET converted_client_id=$1,status='CONVERTED' WHERE id=$2", [client, lead]);
      const row = (await db.query("SELECT * FROM client_identities WHERE client_id=$1", [client])).rows[0];
      expect(row.id).toBe(identity); expect(row.lead_id).toBeNull(); expect(row.commercial_profile).toMatchObject(profile);
      await db.query("DELETE FROM crm_leads WHERE id=$1", [lead]);
      expect((await db.query("SELECT count(*)::int AS n FROM client_identities WHERE client_id=$1", [client])).rows[0].n).toBe(1);
    } finally { await db.query("ROLLBACK"); db.release(); }
  });
});
