import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { getDbPool } from "@/lib/db/pool";

describe("Persistência de tarefas avulsas", () => {
  it("permite tarefa sem vínculo e protege os vínculos das atividades comerciais", async () => {
    const db = await getDbPool().connect();
    await db.query("BEGIN");
    try {
      await db.query(await readFile("database/migrations/037_standalone_tasks.sql", "utf8"));
      const task = (await db.query("INSERT INTO crm_activities(record_kind,activity_type,title) VALUES('TASK','OTHER','[TEST] Organizar documentos') RETURNING *")).rows[0];
      expect(task.lead_id).toBeNull();
      expect(task.client_id).toBeNull();
      expect(task.opportunity_id).toBeNull();
      expect(task.status).toBe("PENDING");
      await db.query("SAVEPOINT invalid_activity");
      await expect(db.query("INSERT INTO crm_activities(activity_type,title) VALUES('CALL','[TEST] Sem vínculo')")).rejects.toThrow();
      await db.query("ROLLBACK TO SAVEPOINT invalid_activity");
      await db.query("UPDATE crm_activities SET status='COMPLETED',completed_at=NOW() WHERE id=$1", [task.id]);
      expect((await db.query("SELECT status FROM crm_activities WHERE id=$1", [task.id])).rows[0].status).toBe("COMPLETED");
    } finally {
      await db.query("ROLLBACK"); db.release();
    }
  });
});
