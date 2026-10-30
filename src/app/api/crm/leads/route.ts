import { NextResponse } from "next/server";
import { CrmService } from "@/modules/crm/service";
import { LeadStatus } from "@/modules/crm/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const status = (searchParams.get("status") as LeadStatus | "ALL") || undefined;
    const source = searchParams.get("source") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!, 10) : undefined;

    const result = await CrmService.listLeads({ search, status, source, limit, offset });
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao listar leads.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const lead = await CrmService.createLead(body);
    return NextResponse.json(lead, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao cadastrar lead.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
