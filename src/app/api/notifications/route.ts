import { requireAdminUser } from "@/lib/auth/require-auth";
import { NextResponse } from "next/server";
import { NotificationService } from "@/modules/notifications/service";

export async function GET(request: Request) {
  try { await requireAdminUser(); } catch { return Response.json({error: "Acesso não autorizado."},{status:401}); }

  try {
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 30;

    const [notifications, unreadCount] = await Promise.all([
      NotificationService.listNotifications(unreadOnly, limit),
      NotificationService.getUnreadCount(),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao buscar notificações.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try { await requireAdminUser(); } catch { return Response.json({error: "Acesso não autorizado."},{status:401}); }

  try {
    const body = await request.json();
    if (body.action === "MARK_ALL_READ") {
      await NotificationService.markAllAsRead();
      return NextResponse.json({ success: true });
    }
    const created = await NotificationService.createNotification(body);
    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao processar notificação.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
