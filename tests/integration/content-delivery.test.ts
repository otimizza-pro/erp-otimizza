import { describe, expect, it } from "vitest";
import { getDbPool } from "@/lib/db/pool";

describe("registro da entrega em PostgreSQL", () => {
  it("protege a programação e preserva o registro de publicação e o desempenho", async () => {
    const db = await getDbPool().connect();
    await db.query("BEGIN");
    try {
      const clientId = (await db.query("INSERT INTO clients(type,name) VALUES('PJ','[TEST] Entrega') RETURNING id")).rows[0].id;
      const id = (await db.query(
        "INSERT INTO content_calendar_items(client_id,title,central_idea,format,selected_caption) VALUES($1,'Pauta','Ideia','Stories','Legenda') RETURNING id", [clientId],
      )).rows[0].id;
      await db.query("SAVEPOINT pending_review");
      await expect(db.query("UPDATE content_calendar_items SET status='SCHEDULED' WHERE id=$1", [id])).rejects.toThrow("Aprove as versões atuais");
      await db.query("ROLLBACK TO SAVEPOINT pending_review");
      const review = (await db.query(
        `INSERT INTO content_material_reviews(content_id,material,version,snapshot,submitted_by,decision)
         VALUES($1,'selected_caption',1,'{"text":"Legenda"}','admin','APPROVED') RETURNING id`, [id],
      )).rows[0].id;
      await db.query("UPDATE content_calendar_items SET status='SCHEDULED',scheduled_date='2026-11-19' WHERE id=$1", [id]);
      await db.query("SAVEPOINT pending_publication");
      await expect(db.query("UPDATE content_calendar_items SET status='PUBLISHED' WHERE id=$1", [id])).rejects.toThrow("Registrar publicação");
      await db.query("ROLLBACK TO SAVEPOINT pending_publication");
      await db.query(
        `INSERT INTO content_publications(content_id,platform,url,published_at,recorded_by,approved_versions,primary_metric)
         VALUES($1,'Instagram','https://www.instagram.com/p/test','2026-11-20T12:00:00Z','admin',$2,'clicks')`,
        [id, JSON.stringify([{ reviewId: review, version: 1 }])],
      );
      await db.query("UPDATE content_calendar_items SET status='PUBLISHED' WHERE id=$1", [id]);
      await db.query(
        `INSERT INTO content_publication_metrics(content_id,date_from,date_to,impressions,clicks,leads,sales,source,recorded_by)
         VALUES($1,'2026-11-20','2026-11-20',100,15,2,0,'Instagram','admin')`, [id],
      );
      const result = await db.query(
        `SELECT c.status, c.scheduled_date::text, p.approved_versions, m.clicks
         FROM content_calendar_items c JOIN content_publications p ON p.content_id=c.id
         JOIN content_delivery_measurements m ON m.content_id=c.id WHERE c.id=$1`, [id],
      );
      expect(result.rows[0]).toMatchObject({ status: "PUBLISHED", scheduled_date: "2026-11-19", approved_versions: [{ reviewId: review, version: 1 }], clicks: 15 });
    } finally {
      await db.query("ROLLBACK");
      db.release();
    }
  });
});
