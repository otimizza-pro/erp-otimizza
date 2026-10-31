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

import { z } from "zod";

function formatErrorMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.errors.map((e) => e.message).join(" ");
  }
  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message);
      if (Array.isArray(parsed) && parsed[0]?.message) {
        return parsed.map((e: { message: string }) => e.message).join(" ");
      }
    } catch {
      // Not JSON
    }
    return error.message;
  }
  return "Erro ao registrar atividade.";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const activity = await CrmService.createActivity(body);
    return NextResponse.json(activity, { status: 201 });
  } catch (error: unknown) {
    const message = formatErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
