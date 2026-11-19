import { requireAdminUser } from "@/lib/auth/require-auth";
import { NextRequest, NextResponse } from "next/server";
import {
  getContractRecurrenceSettings,
  saveContractRecurrenceSettings,
} from "@/modules/projects/service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try { await requireAdminUser(); } catch { return Response.json({error: "Acesso não autorizado."},{status:401}); }

  try {
    const { id } = await params;
    const settings = await getContractRecurrenceSettings(id);
    return NextResponse.json({ success: true, data: settings });
  } catch (error: unknown) {
    console.error("Erro ao obter configurações de recorrência:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao obter configurações." },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try { await requireAdminUser(); } catch { return Response.json({error: "Acesso não autorizado."},{status:401}); }

  try {
    const { id } = await params;
    const body = await req.json();
    const settings = await saveContractRecurrenceSettings({
      ...body,
      contractId: id,
    });
    return NextResponse.json({ success: true, data: settings });
  } catch (error: unknown) {
    console.error("Erro ao salvar configuração de recorrência:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao configurar recorrência." },
      { status: 400 }
    );
  }
}
