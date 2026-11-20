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

    const [pillarsAndLines, ideas, rejectedIdeas] = await Promise.all([
      brainstormService.listPillarsAndLines(validClientId),
      brainstormService.listBrainstormIdeas(validClientId, { pillarId, format, status }),
      brainstormService.listRejectedIdeas(validClientId),
    ]);

    return NextResponse.json({
      pillars: pillarsAndLines.pillars,
      lines: pillarsAndLines.lines,
      ideas,
      rejectedIdeas,
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
        team: body.team || "BOTH",
      });
      return NextResponse.json({ success: true, ideas });
    }

    if (action === "SAVE_FOR_LATER" || action === "SAVE_MANUAL") {
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
        team: body.team || "A",
        status: "SAVED_FOR_LATER",
      });
      return NextResponse.json({ success: true, idea });
    }

    if (action === "SAVE_MULTIPLE") {
      const clientId = uuidSchema.parse(body.clientId);
      const ideasList = Array.isArray(body.ideas) ? body.ideas : [];
      if (!ideasList.length) {
        return NextResponse.json({ error: "Nenhuma ideia para salvar." }, { status: 400 });
      }

      const saved = [];
      for (const idea of ideasList) {
        const item = await brainstormService.saveBrainstormIdea({
          clientId,
          userId: user.id,
          title: idea.title,
          pillarId: idea.pillar_id,
          editorialLineId: idea.editorial_line_id,
          pillarName: idea.pillar_name,
          themeName: idea.theme_name,
          angle: idea.angle,
          format: idea.format,
          targetAudience: idea.target_audience,
          painOrDesire: idea.pain_or_desire,
          goal: idea.goal,
          rationale: idea.rationale,
          status: "SAVED_FOR_LATER",
        });
        saved.push(item);
      }
      return NextResponse.json({ success: true, saved });
    }

    if (action === "REJECT") {
      const clientId = uuidSchema.parse(body.clientId);
      const ideaId = body.ideaId ? uuidSchema.parse(body.ideaId) : null;

      // Se a ideia foi rejeitada direto da geração da IA (ainda não salva no banco), cria como rejeitada
      if (!ideaId) {
        const created = await brainstormService.saveBrainstormIdea({
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
          status: "REJECTED",
          rejectionReason: body.reason || "Rejeitado pelo usuário",
        });
        return NextResponse.json({ success: true, idea: created });
      }

      await brainstormService.rejectBrainstormIdea(ideaId, body.reason);
      return NextResponse.json({ success: true });
    }

    if (action === "RESTORE") {
      const ideaId = uuidSchema.parse(body.ideaId);
      await brainstormService.restoreBrainstormIdea(ideaId);
      return NextResponse.json({ success: true });
    }

    if (action === "DELETE") {
      const ideaId = uuidSchema.parse(body.ideaId);
      await brainstormService.deleteBrainstormIdea(ideaId);
      return NextResponse.json({ success: true });
    }

    if (action === "USE_NOW" || action === "CONVERT_TO_HEADLINES") {
      const projectPost = body.projectPostId ? {
        id: uuidSchema.parse(body.projectPostId),
        clientId: uuidSchema.parse(body.clientId),
      } : undefined;
      const selection: Parameters<typeof brainstormService.convertIdeaToHeadlines>[0] =
        body.ideaId ? uuidSchema.parse(body.ideaId) : {
          clientId: uuidSchema.parse(body.clientId),
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
          status: "HEADLINES_IN_PROGRESS",
        };

      const result = await brainstormService.convertIdeaToHeadlines(selection, user.id, projectPost);
      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json({ error: "Ação não reconhecida." }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao processar solicitação de brainstorm.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
