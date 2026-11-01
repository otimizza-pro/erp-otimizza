import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth/require-auth";
import { getPageVersions } from "@/modules/knowledge/service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  try {
    const { versions, total } = await getPageVersions(id, page, limit);
    return NextResponse.json({ versions, total, page, limit });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao buscar histórico de versões.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
