import { NextRequest, NextResponse } from "next/server";
import { generateRecurringProjectForContract } from "@/modules/projects/service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const competency = body.competency || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
    const forceManual = Boolean(body.forceManual);

    const result = await generateRecurringProjectForContract({
      contractId: id,
      competency,
      forceManual,
    });

    return NextResponse.json({
      success: true,
      data: result.project,
      status: result.status,
      message:
        result.status === "ALREADY_EXISTS"
          ? "Projeto já existente para esta competência (idempotência preservada)."
          : "Projeto recorrente gerado com sucesso.",
    });
  } catch (error: unknown) {
    console.error("Erro ao gerar projeto recorrente:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao gerar projeto." },
      { status: 400 }
    );
  }
}
