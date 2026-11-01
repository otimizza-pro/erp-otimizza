import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth/require-auth";
import { duplicatePage } from "@/modules/knowledge/service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try {
    user = await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  const { id } = await params;
  try {
    const page = await duplicatePage(id, user.id);
    return NextResponse.json({ page });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao duplicar página.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
