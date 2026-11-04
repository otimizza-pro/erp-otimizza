import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth/require-auth";

interface AiAssistPayload {
  clientName?: string;
  segment?: string;
  currentScenario?: string;
  partnershipFocus?: string;
  trackingMetrics?: string;
  services?: string[];
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const body: AiAssistPayload = await req.json();
    const name = body.clientName?.trim() || "sua empresa";
    const segment = body.segment?.trim() ? ` no segmento de ${body.segment.trim()}` : "";
    const rawScenario = body.currentScenario?.trim() || "";
    const rawFocus = body.partnershipFocus?.trim() || "";
    const rawMetrics = body.trackingMetrics?.trim() || "";
    const servicesList = body.services && body.services.length > 0 ? body.services.join(", ") : "ações digitais integradas";

    // Se houver chave Gemini ou OpenAI configurada, poderíamos chamar a API externa.
    // Como padrão robusto, entregamos um refinamento executivo de altíssimo nível no tom oficial da Otimizza.
    const refinedScenario = rawScenario
      ? `A ${name} possui atuação estabelecida${segment}, com potencial imediato de expansão comercial. Identificamos que o momento atual demanda superar desafios como: ${rawScenario.replace(/\.$/, "")}, estabelecendo uma presença digital com autoridade e tração contínua de novos clientes.`
      : `A ${name} possui atuação estabelecida${segment}, com potencial imediato de expansão comercial. O momento atual demanda canais digitais estruturados para converter o interesse do mercado em oportunidades comerciais previsíveis e consistentes.`;

    const refinedFocus = rawFocus
      ? `Construir e consolidar a presença digital da ${name}, estruturar o ecossistema com foco em ${servicesList} e conduzir estratégias que conectem a marca diretamente a tomadores de decisão e clientes com alta intenção de compra.`
      : `Construir a presença digital da ${name}, organizar as ações de marketing através de ${servicesList} e conduzir campanhas que conectem a empresa a pessoas verdadeiramente interessadas nos seus produtos e serviços.`;

    const refinedMetrics = rawMetrics
      ? `Acompanhamento contínuo dos indicadores-chave: ${rawMetrics.replace(/\.$/, "")}. Todas as metas são alinhadas aos objetivos estratégicos, com relatórios periódicos de desempenho.`
      : `A visibilidade da marca, o engajamento com conteúdos estratégicos e o volume de contatos comerciais gerados pelos canais trabalhados. Os indicadores e as metas serão acompanhados periodicamente conforme os primeiros dados da operação.`;

    return NextResponse.json({
      success: true,
      currentScenario: refinedScenario,
      partnershipFocus: refinedFocus,
      trackingMetrics: refinedMetrics,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro ao processar assistência por IA.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

