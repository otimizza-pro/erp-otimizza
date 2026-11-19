import { withTransaction } from "@/lib/db/pool";
import { DocumentStorage } from "./storage";

/** Retryable and idempotent. A referenced file is never removed. */
export async function processStorageCleanup(): Promise<{ deleted: number; failed: number }> {
  return withTransaction(async client => {
    const jobs = await client.query<{storage_path: string}>(
      "SELECT storage_path FROM storage_cleanup_queue ORDER BY created_at LIMIT 50 FOR UPDATE SKIP LOCKED"
    );
    let deleted = 0, failed = 0;
    for (const job of jobs.rows) {
      const references = await client.query("SELECT 1 FROM document_versions WHERE storage_path=$1 LIMIT 1", [job.storage_path]);
      if (references.rows.length) continue;
      try { await DocumentStorage.deleteFile(job.storage_path); }
      catch (error) {
        failed++;
        await client.query("UPDATE storage_cleanup_queue SET attempts=attempts+1,last_error=$2 WHERE storage_path=$1", [job.storage_path, error instanceof Error ? error.message.slice(0,1000) : "Falha no Storage"]);
        continue;
      }
      await client.query("DELETE FROM storage_cleanup_queue WHERE storage_path=$1", [job.storage_path]);
      deleted++;
    }
    return { deleted, failed };
  });
}
