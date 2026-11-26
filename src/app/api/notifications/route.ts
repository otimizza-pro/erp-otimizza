import { z } from "zod";
import { requireAdminUser } from "@/lib/auth/require-auth";
import { NextResponse } from "next/server";
import { NotificationService } from "@/modules/notifications/service";
import { syncOperationalAlerts } from "@/modules/notifications/alerts-sync";

const createNotificationSchema = z.object({
  title: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(4000),
  type: z.string().trim().min(1).max(50),
  linkUrl: z.string().trim().min(1).max(500).default("/"),
  severity: z.enum(["info", "success", "warning", "critical"]).optional(),
  category: z.enum(["FINANCIAL", "PROJECTS", "CRM", "COMMERCIAL", "CONTENT", "BRIEFING", "SYSTEM"]).optional(),
  dedupKey: z.string().trim().max(255).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(request: Request) {
  try { await requireAdminUser(); } catch { return Response.json({ error: "Acesso não autorizado." }, { status: 401 }); }

  try {
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const category = searchParams.get("category") || "ALL";
    const shouldSync = searchParams.get("sync") === "1" || searchParams.get("sync") === "true";
    const forceSync = searchParams.get("forceSync") === "1";
    const rawLimit = Number(searchParams.get("limit") || 30);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.trunc(rawLimit), 1), 100) : 30;

    if (shouldSync) {
      await syncOperationalAlerts(forceSync);
    }

    const [notifications, unreadCount] = await Promise.all([
      NotificationService.listNotifications({ unreadOnly, category, limit }),
      NotificationService.getUnreadCount(),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao buscar notificações.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try { await requireAdminUser(); } catch { return Response.json({ error: "Acesso não autorizado." }, { status: 401 }); }

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
    }
    if ((body as { action?: string }).action === "MARK_ALL_READ") {
      await NotificationService.markAllAsRead();
      return NextResponse.json({ success: true });
    }
    if ((body as { action?: string }).action === "SYNC_ALERTS") {
      const result = await syncOperationalAlerts(true);
      const unreadCount = await NotificationService.getUnreadCount();
      return NextResponse.json({ success: true, ...result, unreadCount });
    }
    if ((body as { action?: string }).action === "CLEAR_READ") {
      const removed = await NotificationService.clearReadNotifications();
      return NextResponse.json({ success: true, removed });
    }
    const parsed = createNotificationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos para notificação." }, { status: 400 });
    }
    const created = await NotificationService.createNotification(parsed.data);
    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao processar notificação.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try { await requireAdminUser(); } catch { return Response.json({ error: "Acesso não autorizado." }, { status: 401 }); }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (id) {
      const validId = z.string().uuid().parse(id);
      await NotificationService.deleteNotification(validId);
      return NextResponse.json({ success: true });
    }
    const removed = await NotificationService.clearReadNotifications();
    return NextResponse.json({ success: true, removed });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao excluir notificações.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
