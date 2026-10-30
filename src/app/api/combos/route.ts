import { NextResponse } from "next/server";
import { listCombos, createCombo } from "@/modules/catalog/service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const status = (searchParams.get("status") as "ACTIVE" | "ARCHIVED") || undefined;

    const combos = await listCombos({ search, status });
    return NextResponse.json(combos);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao listar combos.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.name || !body.items || !Array.isArray(body.items)) {
      return NextResponse.json(
        { error: "Nome e lista de serviços componentes são obrigatórios." },
        { status: 400 }
      );
    }

    const combo = await createCombo({
      name: body.name,
      description: body.description,
      items: body.items.map((i: { serviceId: string; componentPrice: string | number }) => ({
        serviceId: i.serviceId,
        componentPrice: parseFloat(String(i.componentPrice)),
      })),
    });

    return NextResponse.json(combo, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao criar combo.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
