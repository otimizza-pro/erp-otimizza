import { NextResponse } from "next/server";
import { reverseSettlement } from "@/modules/financial/service";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const body = await request.json();

    if (!body.reason) {
      return NextResponse.json({ error: "Motivo do estorno é obrigatório." }, { status: 400 });
    }

    await reverseSettlement(id, body.reason);
    return NextResponse.json({ success: true, message: "Baixa estornada com sucesso." });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro ao estornar baixa.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
