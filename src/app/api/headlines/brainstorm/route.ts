import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth/require-auth";
import { z } from "zod";
import * as brainstormService from "@/modules/headlines/brainstorm-service";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

const uuidSchema = z.string().uuid();

export async function GET(request: NextRequest) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");

  if (!clientId) {
    return NextResponse.json({ error: "clientId é obrigatório." }, { status: 400 });
  }

  try {
    const validClientId = uuidSchema.parse(clientId);
    const pillarId = searchParams.get("pillarId") || undefined;
    const format = searchParams.get("format") || undefined;
    const status = searchParams.get("status") || undefined;

    const [pillarsAndLines, ideas] = await Promise.all([
      brainstormService.listPillarsAndLines(validClientId),
      brainstormService.listBrainstormIdeas(validClientId, { pillarId, format, status }),
    ]);

    return NextResponse.json({
      pillars: pillarsAndLines.pillars,
      lines: pillarsAndLines.lines,
      ideas,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao carregar dados do brainstorm.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let user;
  try {
    user = await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const action = body.action;

    if (action === "GENERATE") {
      const clientId = uuidSchema.parse(body.clientId);
      const ideas = await brainstormService.generateBrainstormIdeas({
        clientId,
        userId: user.id,
        pillarId: body.pillarId || undefined,
        editorialLineId: body.editorialLineId || undefined,
        direction: body.direction || undefined,
        count: body.count || 5,
      });
      return NextResponse.json({ success: true, ideas });
    }

    if (action === "SAVE_MANUAL") {
      const clientId = uuidSchema.parse(body.clientId);
      if (!body.title || !body.title.trim()) {
        return NextResponse.json({ error: "O título/tema do conteúdo é obrigatório." }, { status: 400 });
      }

      const idea = await brainstormService.saveBrainstormIdea({
        clientId,
        userId: user.id,
        title: body.title,
        pillarId: body.pillarId || null,
        editorialLineId: body.editorialLineId || null,
        pillarName: body.pillarName || "",
        themeName: body.themeName || "",
        angle: body.angle || "",
        format: body.format || "Carrossel",
        targetAudience: body.targetAudience || "",
        painOrDesire: body.painOrDesire || "",
        goal: body.goal || "",
        rationale: body.rationale || "",
      });
      return NextResponse.json({ success: true, idea });
    }

    if (action === "SAVE_MULTIPLE") {
      const clientId = uuidSchema.parse(body.clientId);
      const ideasList = Array.isArray(body.ideas) ? body.ideas : [];
      if (!ideasList.length) {
        return NextResponse.json({ error: "Nenhuma ideia para salvar." }, { status: 400 });
      }

      const saved = await brainstormService.saveMultipleBrainstormIdeas(clientId, user.id, ideasList);
      return NextResponse.json({ success: true, saved });
    }

    if (action === "DELETE") {
      const ideaId = uuidSchema.parse(body.ideaId);
      await brainstormService.deleteBrainstormIdea(ideaId);
      return NextResponse.json({ success: true });
    }

    if (action === "CONVERT_TO_HEADLINES") {
      const ideaId = uuidSchema.parse(body.ideaId);
      const result = await brainstormService.convertIdeaToHeadlines(ideaId, user.id);
      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json({ error: "Ação não reconhecida." }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao processar solicitação de brainstorm.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
