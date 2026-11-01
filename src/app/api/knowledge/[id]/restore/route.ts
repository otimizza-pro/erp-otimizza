import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth/require-auth";
import { restorePage } from "@/modules/knowledge/service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  const { id } = await params;
  try {
    const page = await restorePage(id);
    return NextResponse.json({ page });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao restaurar página.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
