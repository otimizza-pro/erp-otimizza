import { getDbPool } from "@/lib/db/pool";
import type { PoolClient } from "pg";

export type NotificationSeverity = "info" | "success" | "warning" | "critical";
export type NotificationCategory =
  | "FINANCIAL"
  | "PROJECTS"
  | "CRM"
  | "COMMERCIAL"
  | "CONTENT"
  | "BRIEFING"
  | "SYSTEM";

export interface NotificationRecord {
  id: string;
  title: string;
  message: string;
  type: string;
  severity: NotificationSeverity;
  category: NotificationCategory;
  linkUrl: string;
  read: boolean;
  dedupKey: string | null;
  entityType: string | null;
  entityId: string | null;
  resolvedAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface CreateNotificationInput {
  title: string;
  message: string;
  type: string;
  linkUrl: string;
  severity?: NotificationSeverity;
  category?: NotificationCategory;
  dedupKey?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}

type DbNotificationRow = {
  id: string;
  title: string;
  message: string;
  type: string;
  severity: string | null;
  category: string | null;
  link_url: string;
  read: boolean;
  dedup_key: string | null;
  entity_type: string | null;
  entity_id: string | null;
  resolved_at: Date | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
};

function mapNotificationRow(r: DbNotificationRow): NotificationRecord {
  return {
    id: r.id,
    title: r.title,
    message: r.message,
    type: r.type,
    severity: (r.severity as NotificationSeverity) || "info",
    category: (r.category as NotificationCategory) || "SYSTEM",
    linkUrl: r.link_url,
    read: r.read,
    dedupKey: r.dedup_key,
    entityType: r.entity_type,
    entityId: r.entity_id,
    resolvedAt: r.resolved_at ? r.resolved_at.toISOString() : null,
    metadata: r.metadata || {},
    createdAt: r.created_at.toISOString(),
  };
}

export class NotificationService {
  static async createNotification(
    input: CreateNotificationInput,
    db?: PoolClient
  ): Promise<NotificationRecord> {
    const runner = db ?? getDbPool();
    const cleanTitle = input.title.trim().slice(0, 200);
    const cleanMessage = input.message.trim();
    const cleanType = input.type.trim().slice(0, 50) || "INFO";
    const cleanLink = input.linkUrl.trim().slice(0, 500) || "/";
    const severity = input.severity || "info";
    const category = input.category || "SYSTEM";
    const dedupKey = input.dedupKey ? input.dedupKey.trim().slice(0, 255) : null;

    if (dedupKey) {
      const res = await runner.query<DbNotificationRow>(
        `INSERT INTO system_notifications (
           title, message, type, severity, category, link_url,
           dedup_key, entity_type, entity_id, metadata
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (dedup_key) WHERE dedup_key IS NOT NULL DO UPDATE SET
           title = EXCLUDED.title,
           message = EXCLUDED.message,
           severity = EXCLUDED.severity,
           link_url = EXCLUDED.link_url,
           metadata = EXCLUDED.metadata,
           resolved_at = NULL
         RETURNING id, title, message, type, severity, category, link_url, read,
                   dedup_key, entity_type, entity_id, resolved_at, metadata, created_at`,
        [
          cleanTitle,
          cleanMessage,
          cleanType,
          severity,
          category,
          cleanLink,
          dedupKey,
          input.entityType || null,
          input.entityId || null,
          JSON.stringify(input.metadata || {}),
        ]
      );
      return mapNotificationRow(res.rows[0]);
    }

    const res = await runner.query<DbNotificationRow>(
      `INSERT INTO system_notifications (
         title, message, type, severity, category, link_url,
         entity_type, entity_id, metadata
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, title, message, type, severity, category, link_url, read,
                 dedup_key, entity_type, entity_id, resolved_at, metadata, created_at`,
      [
        cleanTitle,
        cleanMessage,
        cleanType,
        severity,
        category,
        cleanLink,
        input.entityType || null,
        input.entityId || null,
        JSON.stringify(input.metadata || {}),
      ]
    );
    return mapNotificationRow(res.rows[0]);
  }

  /**
   * Emits a notification cleanly without allowing notification telemetry failures to abort domain actions.
   */
  static async createSafeNotification(
    input: CreateNotificationInput,
    db?: PoolClient
  ): Promise<void> {
    if (db) {
      try {
        await db.query("SAVEPOINT notif_safe_sp");
        await this.createNotification(input, db);
        await db.query("RELEASE SAVEPOINT notif_safe_sp");
      } catch (err) {
        await db.query("ROLLBACK TO SAVEPOINT notif_safe_sp").catch(() => {});
        console.warn("[NotificationService] Falha não bloqueante ao emitir notificação:", err);
      }
      return;
    }
    try {
      await this.createNotification(input);
    } catch (err) {
      console.warn("[NotificationService] Falha não bloqueante ao emitir notificação:", err);
    }
  }

  static async listNotifications(options?: {
    unreadOnly?: boolean;
    category?: string;
    limit?: number;
  }): Promise<NotificationRecord[]> {
    const pool = getDbPool();
    const limit = Math.min(Math.max(Number(options?.limit || 30), 1), 100);
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (options?.unreadOnly) {
      conditions.push("read = false");
    }
    if (options?.category && options.category !== "ALL") {
      params.push(options.category);
      conditions.push(`category = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    params.push(limit);

    const res = await pool.query<DbNotificationRow>(
      `SELECT id, title, message, type, severity, category, link_url, read,
              dedup_key, entity_type, entity_id, resolved_at, metadata, created_at
       FROM system_notifications
       ${where}
       ORDER BY read ASC, created_at DESC
       LIMIT $${params.length}`,
      params
    );
    return res.rows.map(mapNotificationRow);
  }

  static async markAsRead(id: string): Promise<boolean> {
    const pool = getDbPool();
    const res = await pool.query(
      `UPDATE system_notifications SET read = true WHERE id = $1`,
      [id]
    );
    return (res.rowCount ?? 0) > 0;
  }

  static async markAllAsRead(): Promise<boolean> {
    const pool = getDbPool();
    const res = await pool.query(
      `UPDATE system_notifications SET read = true WHERE read = false`
    );
    return (res.rowCount ?? 0) > 0;
  }

  static async clearReadNotifications(): Promise<number> {
    const pool = getDbPool();
    const res = await pool.query(
      `DELETE FROM system_notifications WHERE read = true`
    );
    return res.rowCount ?? 0;
  }

  static async deleteNotification(id: string): Promise<boolean> {
    const pool = getDbPool();
    const res = await pool.query(`DELETE FROM system_notifications WHERE id = $1`, [id]);
    return (res.rowCount ?? 0) > 0;
  }

  static async getUnreadCount(): Promise<number> {
    const pool = getDbPool();
    const res = await pool.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM system_notifications WHERE read = false`
    );
    return parseInt(res.rows[0]?.count || "0", 10);
  }
}
