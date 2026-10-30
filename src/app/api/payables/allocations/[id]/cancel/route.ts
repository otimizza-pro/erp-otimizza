import { NextResponse } from "next/server";
import { SupplierService } from "@/modules/suppliers/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const reason = body.reason?.trim();
    if (!reason || reason.length < 3) {
      return NextResponse.json(
        { error: "Justificativa de cancelamento é obrigatória (mínimo 3 caracteres)." },
        { status: 400 }
      );
    }

    const canceled = await SupplierService.cancelAllocation(id, reason);
    return NextResponse.json(canceled);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao cancelar rateio.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
