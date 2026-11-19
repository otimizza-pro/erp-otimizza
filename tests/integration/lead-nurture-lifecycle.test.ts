import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { getDbPool } from "@/lib/db/pool";

describe("Ciclo automático das atividades de nutrição", () => {
  it("conclui a retomada ao qualificar, preserva tarefas manuais e permite Stand-by e novos ciclos", async () => {
    const db = await getDbPool().connect();
    await db.query("BEGIN");
    try {
      await db.query(await readFile("database/migrations/036_lead_standby_and_nurture_lifecycle.sql", "utf8"));
      const leadId = (await db.query("INSERT INTO crm_leads(person_type,name) VALUES('PJ','[TEST] Ciclo nutrição') RETURNING id")).rows[0].id;
      await db.query("UPDATE crm_leads SET status='NUTRICAO',nurture_reason='Aguardando orçamento',nurture_next_action_date=CURRENT_DATE+1 WHERE id=$1", [leadId]);
      const first = (await db.query("SELECT * FROM crm_activities WHERE lead_id=$1 AND automation_key='LEAD_NURTURE'", [leadId])).rows[0];
      expect(first.status).toBe("PENDING");
      const manualId = (await db.query("INSERT INTO crm_activities(lead_id,activity_type,title) VALUES($1,'FOLLOW_UP','Contato manual importante') RETURNING id", [leadId])).rows[0].id;
      await db.query("UPDATE crm_leads SET status='QUALIFICADO' WHERE id=$1", [leadId]);
      const completed = (await db.query("SELECT * FROM crm_activities WHERE id=$1", [first.id])).rows[0];
      expect(completed.status).toBe("COMPLETED");
      expect(completed.completed_at).toBeTruthy();
      expect(completed.outcome_reason).toContain("QUALIFICADO");
      expect((await db.query("SELECT status FROM crm_activities WHERE id=$1", [manualId])).rows[0].status).toBe("PENDING");
      // Simulate the legacy orphan reported by the user and verify migration repair.
      await db.query("UPDATE crm_activities SET automation_key=NULL,status='PENDING',completed_at=NULL WHERE id=$1", [first.id]);
      await db.query(await readFile("database/migrations/036_lead_standby_and_nurture_lifecycle.sql", "utf8"));
      expect((await db.query("SELECT status,automation_key FROM crm_activities WHERE id=$1", [first.id])).rows[0]).toMatchObject({ status: "COMPLETED", automation_key: "LEAD_NURTURE" });
      await db.query("UPDATE crm_leads SET status='STAND_BY' WHERE id=$1", [leadId]);
      expect((await db.query("SELECT status FROM crm_leads WHERE id=$1", [leadId])).rows[0].status).toBe("STAND_BY");
      expect((await db.query("SELECT count(*)::int AS n FROM crm_lead_status_history WHERE lead_id=$1 AND to_status='STAND_BY'", [leadId])).rows[0].n).toBe(1);
      await db.query("UPDATE crm_leads SET status='NUTRICAO',nurture_next_action_date=CURRENT_DATE+2 WHERE id=$1", [leadId]);
      await db.query("UPDATE crm_leads SET nurture_next_action_date=CURRENT_DATE+3,nurture_reason='Nova data' WHERE id=$1", [leadId]);
      const tasks = (await db.query("SELECT * FROM crm_activities WHERE lead_id=$1 AND automation_key='LEAD_NURTURE' ORDER BY created_at,id", [leadId])).rows;
      expect(tasks).toHaveLength(2);
      expect(tasks.filter(task => task.status === "PENDING")).toHaveLength(1);
      expect(tasks.find(task => task.status === "PENDING").description).toBe("Nova data");
      await db.query("UPDATE crm_activities SET status='RESCHEDULED' WHERE lead_id=$1 AND automation_key='LEAD_NURTURE' AND status='PENDING'", [leadId]);
      await db.query("UPDATE crm_leads SET status='STAND_BY' WHERE id=$1", [leadId]);
      expect((await db.query("SELECT count(*)::int AS n FROM crm_activities WHERE lead_id=$1 AND automation_key='LEAD_NURTURE' AND status IN ('PENDING','RESCHEDULED')", [leadId])).rows[0].n).toBe(0);
    } finally {
      await db.query("ROLLBACK");
      db.release();
    }
  });
});
