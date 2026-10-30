import { NextResponse } from "next/server";
import { listContracts } from "@/modules/contracts/service";
import { ContractStatus } from "@/modules/contracts/types";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await props.params;
    const { searchParams } = new URL(request.url);
    const status = (searchParams.get("status") as ContractStatus) || undefined;

    const result = await listContracts({
      clientId,
      status,
      limit: 50,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao buscar contratações do cliente.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
