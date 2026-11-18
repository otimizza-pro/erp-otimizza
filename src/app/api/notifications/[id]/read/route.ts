import { NextResponse } from "next/server";
import { NotificationService } from "@/modules/notifications/service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await NotificationService.markAsRead(id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao marcar notificação como lida.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
