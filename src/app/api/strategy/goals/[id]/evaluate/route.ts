import { requireAdminUser } from "@/lib/auth/require-auth";
import { NextResponse } from "next/server";
import { StrategyService } from "@/modules/strategy/service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try { await requireAdminUser(); } catch { return Response.json({error: "Acesso não autorizado."},{status:401}); }

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const start = searchParams.get("start") || undefined;
    const end = searchParams.get("end") || undefined;

    const evaluation = await StrategyService.evaluateGoal(id, start, end);
    return NextResponse.json(evaluation);
  } catch (error: unknown) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : null) || "Erro ao avaliar meta." }, { status: 500 });
  }
}

