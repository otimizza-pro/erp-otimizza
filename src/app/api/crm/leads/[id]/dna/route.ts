import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth/require-auth";
import { getCommercialDna, saveCommercialDna } from "@/modules/crm/commercial-dna";
import { z } from "zod";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, { params }: Context) {
  try { await requireAdminUser(); } catch { return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 }); }
  try { const { id } = await params; return NextResponse.json(await getCommercialDna({ leadId: z.string().uuid().parse(id) })); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao carregar DNA." }, { status: 400 }); }
}
export async function PUT(request: Request, { params }: Context) {
  try { await requireAdminUser(); } catch { return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 }); }
  try { const { id } = await params; return NextResponse.json(await saveCommercialDna({ leadId: z.string().uuid().parse(id) }, await request.json())); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao salvar DNA." }, { status: 400 }); }
}
