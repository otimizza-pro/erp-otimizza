import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { getDbPool } from "@/lib/db/pool";

describe("Identidade compartilhada entre lead e cliente", () => {
  it("sincroniza nos dois sentidos, preserva aquisição e mantém todos os leads vinculados iguais", async () => {
    const db = await getDbPool().connect();
    await db.query("BEGIN");
    try {
      // Apply in this transaction only; never mutate the application's database.
      const installed = await db.query("SELECT 1 FROM pg_trigger WHERE tgname = 'crm_converted_identity_prepare'");
      if (!installed.rowCount) await db.query(await readFile("database/migrations/035_converted_lead_identity.sql", "utf8"));
      const clientId = (await db.query("INSERT INTO clients(type,name,email) VALUES('PJ','[TEST-SYNC] Cliente','original@test.local') RETURNING id")).rows[0].id;
      const leadId = (await db.query("INSERT INTO crm_leads(person_type,name,source,notes) VALUES('PJ','[TEST-SYNC] Lead','OUTROS','Histórico preservado') RETURNING id")).rows[0].id;
      await db.query("UPDATE crm_leads SET converted_client_id=$1 WHERE id=$2", [clientId, leadId]);
      let lead = (await db.query("SELECT * FROM crm_leads WHERE id=$1", [leadId])).rows[0];
      expect(lead.status).toBe("CONVERTED");
      expect(lead.name).toBe("[TEST-SYNC] Cliente");
      const sibling = (await db.query("INSERT INTO crm_leads(person_type,name,converted_client_id) VALUES('PJ','Outro',$1) RETURNING id", [clientId])).rows[0].id;
      await db.query("UPDATE clients SET name='[TEST-SYNC] Renomeado',email=NULL,phone='27999999999',document='12345678000190' WHERE id=$1", [clientId]);
      lead = (await db.query("SELECT * FROM crm_leads WHERE id=$1", [leadId])).rows[0];
      expect(lead.name).toBe("[TEST-SYNC] Renomeado");
      expect(lead.email).toBeNull();
      expect(lead.phone).toBe("27999999999");
      expect(lead.document).toBe("12345678000190");
      expect(lead.source).toBe("OUTROS");
      expect(lead.notes).toBe("Histórico preservado");
      await db.query("UPDATE crm_leads SET name='[TEST-SYNC] Pelo lead',whatsapp='27988888888' WHERE id=$1", [leadId]);
      const client = (await db.query("SELECT * FROM clients WHERE id=$1", [clientId])).rows[0];
      expect(client.name).toBe("[TEST-SYNC] Pelo lead");
      expect(client.whatsapp).toBe("27988888888");
      expect((await db.query("SELECT name FROM crm_leads WHERE id=$1", [sibling])).rows[0].name).toBe(client.name);
      await db.query("UPDATE crm_leads SET status='NEW' WHERE id=$1", [leadId]);
      expect((await db.query("SELECT status FROM crm_leads WHERE id=$1", [leadId])).rows[0].status).toBe("CONVERTED");
    } finally {
      await db.query("ROLLBACK");
      db.release();
    }
  });
});
