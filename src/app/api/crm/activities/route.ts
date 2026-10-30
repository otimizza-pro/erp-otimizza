import { NextResponse } from "next/server";
import { CrmService } from "@/modules/crm/service";
import { ActivityStatus } from "@/modules/crm/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("leadId") || undefined;
    const clientId = searchParams.get("clientId") || undefined;
    const opportunityId = searchParams.get("opportunityId") || undefined;
    const status = (searchParams.get("status") as ActivityStatus) || undefined;
    const overdueOnly = searchParams.get("overdueOnly") === "true";
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined;

    const activities = await CrmService.listActivities({
      leadId,
      clientId,
      opportunityId,
      status,
      overdueOnly,
      limit,
    });
    return NextResponse.json(activities);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao listar atividades.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const activity = await CrmService.createActivity(body);
    return NextResponse.json(activity, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao registrar atividade.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
