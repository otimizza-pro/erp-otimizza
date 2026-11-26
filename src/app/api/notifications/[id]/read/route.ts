import { z } from "zod";
import { requireAdminUser } from "@/lib/auth/require-auth";
import { NextResponse } from "next/server";
import { NotificationService } from "@/modules/notifications/service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try { await requireAdminUser(); } catch { return Response.json({ error: "Acesso não autorizado." }, { status: 401 }); }

  try {
    const { id } = await params;
    const validId = z.string().uuid().parse(id);
    await NotificationService.markAsRead(validId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao marcar notificação como lida.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
