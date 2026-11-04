import { NextResponse } from "next/server";
import { configureBilling, getBillingPlan } from "@/modules/contracts/journey-service";
import { requireAdminUser } from "@/lib/auth/require-auth";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try { await requireAdminUser(); const { id } = await context.params; return NextResponse.json(await getBillingPlan(id)); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao carregar cobrança" }, { status: 400 }); }
}
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try { await requireAdminUser(); const { id } = await context.params; return NextResponse.json(await configureBilling(id, await request.json())); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao configurar cobrança" }, { status: 400 }); }
}
