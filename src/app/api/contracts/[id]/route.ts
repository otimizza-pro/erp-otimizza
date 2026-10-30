import { NextResponse } from "next/server";
import {
  getContractById,
  createContractVersion,
  cancelContract,
  getContractProjections,
} from "@/modules/contracts/service";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const contract = await getContractById(id);
    if (!contract) {
      return NextResponse.json({ error: "Contratação não encontrada." }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const includeProjections = searchParams.get("projections") === "true";
    let projections = undefined;

    if (includeProjections) {
      const now = new Date();
      projections = getContractProjections(
        contract,
        { year: now.getFullYear(), month: now.getMonth() + 1 },
        12
      );
    }

    return NextResponse.json({ contract, projections });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro interno ao buscar contratação.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const body = await request.json();

    // Se a requisição for para cancelamento
    if (body.action === "cancel") {
      if (!body.reason) {
        return NextResponse.json(
          { error: "Motivo do cancelamento é obrigatório." },
          { status: 400 }
        );
      }
      const updated = await cancelContract({
        contractId: id,
        cancellationReason: body.reason,
        canceledAt: body.canceledAt,
      });
      return NextResponse.json(updated);
    }

    // Caso contrário, trata-se de uma nova versão de vigência
    const newVersion = await createContractVersion({
      ...body,
      contractId: id,
    });
    return NextResponse.json(newVersion, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar contratação.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
