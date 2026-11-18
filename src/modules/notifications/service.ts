import { getDbPool } from "@/lib/db/pool";

export interface NotificationRecord {
  id: string;
  title: string;
  message: string;
  type: string;
  linkUrl: string;
  read: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export class NotificationService {
  static async createNotification(input: {
    title: string;
    message: string;
    type: string;
    linkUrl: string;
    metadata?: Record<string, unknown>;
  }): Promise<NotificationRecord> {
    const pool = getDbPool();
    const res = await pool.query<{
      id: string;
      title: string;
      message: string;
      type: string;
      link_url: string;
      read: boolean;
      metadata: Record<string, unknown>;
      created_at: Date;
    }>(
      `INSERT INTO system_notifications (title, message, type, link_url, metadata)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, title, message, type, link_url, read, metadata, created_at`,
      [
        input.title,
        input.message,
        input.type,
        input.linkUrl,
        JSON.stringify(input.metadata || {}),
      ]
    );
    const r = res.rows[0];
    return {
      id: r.id,
      title: r.title,
      message: r.message,
      type: r.type,
      linkUrl: r.link_url,
      read: r.read,
      metadata: r.metadata,
      createdAt: r.created_at.toISOString(),
    };
  }

  static async listNotifications(unreadOnly = false, limit = 30): Promise<NotificationRecord[]> {
    const pool = getDbPool();
    const where = unreadOnly ? "WHERE read = false" : "";
    const res = await pool.query<{
      id: string;
      title: string;
      message: string;
      type: string;
      link_url: string;
      read: boolean;
      metadata: Record<string, unknown>;
      created_at: Date;
    }>(
      `SELECT id, title, message, type, link_url, read, metadata, created_at
       FROM system_notifications
       ${where}
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
    return res.rows.map((r) => ({
      id: r.id,
      title: r.title,
      message: r.message,
      type: r.type,
      linkUrl: r.link_url,
      read: r.read,
      metadata: r.metadata,
      createdAt: r.created_at.toISOString(),
    }));
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

  static async getUnreadCount(): Promise<number> {
    const pool = getDbPool();
    const res = await pool.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM system_notifications WHERE read = false`
    );
    return parseInt(res.rows[0]?.count || "0", 10);
  }
}
