import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/pool";
import { requireAdminUser } from "@/lib/auth/require-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { clientId } = body;

    if (!clientId) {
      return NextResponse.json({ error: "clientId é obrigatório." }, { status: 400 });
    }

    const [clientRes, identityRes] = await Promise.all([
      query(`SELECT id, name, trade_name FROM clients WHERE id = $1`, [clientId]),
      query(`SELECT * FROM client_identities WHERE client_id = $1`, [clientId]),
    ]);

    const client = clientRes.rows[0];
    const identity = identityRes.rows[0] || {};
    const brandName = client?.trade_name || client?.name || "Empresa";
    const niche = identity.market_niche || "Serviços Especializados";
    const pains = Array.isArray(identity.pain_points) ? identity.pain_points : [];
    const diffs = Array.isArray(identity.differentials) ? identity.differentials : [];

    const openRouterApiKey = process.env.OPENROUTER_API_KEY;

    let suggestedIdeas: string[] = [];

    if (openRouterApiKey) {
      try {
        const prompt = `Você é um Redator e Estrategista Criativo Sênior da Otimizza.
Gere exatamente 5 ideias de conteúdos magnéticas, diretas e altamente persuasivas para o cliente "${brandName}" (Nicho: ${niche}).
Proposta de valor: ${identity.value_proposition || "Excelência e resultados comprovados"}
Dores dos clientes: ${pains.join("; ") || "Pouco tempo, medo de errar, processos manuais"}
Diferenciais da marca: ${diffs.join("; ") || "Atendimento próximo e metodologia validada"}

Formato de saída:
Retorne APENAS um array JSON com as 5 ideias (frases curtas de 1 a 2 linhas cada, abordando uma dor ou dúvida real do tomador de decisão).
Exemplo:
["O erro invisível que faz você perder 30% das vendas no WhatsApp", "Por que tentar fazer tudo sozinho está travando o crescimento da sua empresa", "Os bastidores do método que usamos para entregar antes do prazo", "3 sinais claros de que você precisa terceirizar este processo urgente", "O teste rápido de 2 minutos para avaliar a eficiência da sua operação"]`;

        const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openRouterApiKey}`,
            "HTTP-Referer": "https://otimizza.com.br",
            "X-Title": "Otimizza ERP",
          },
          body: JSON.stringify({
            model: "google/gemini-2.0-flash-001",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: 600,
          }),
        });

        if (aiResponse.ok) {
          const aiJson = await aiResponse.json();
          const rawText = aiJson.choices?.[0]?.message?.content || "";
          const cleanedText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
          const parsed = JSON.parse(cleanedText);
          if (Array.isArray(parsed) && parsed.length > 0) {
            suggestedIdeas = parsed.map((s) => String(s).trim());
          }
        }
      } catch (aiErr) {
        console.warn("Falha ao chamar OpenRouter para sugerir ideias, usando heurística:", aiErr);
      }
    }

    // Fallback heurístico caso a IA externa falhe ou não tenha chave
    if (suggestedIdeas.length === 0) {
      suggestedIdeas = [
        pains[0] ? `Como solucionar o maior gargalo: ${pains[0]}` : `O erro mais comum cometido por empresários de ${niche}`,
        diffs[0] ? `Por que ${diffs[0]} faz toda a diferença nos seus resultados` : `Como escolher o parceiro ideal em ${niche} sem cair em armadilhas`,
        pains[1] ? `Por que você ainda sofre com ${pains[1]} e o que fazer agora` : `3 coisas que você precisa parar de fazer hoje mesmo se quiser lucrar mais`,
        `Bastidores da nossa entrega: como garantimos padrão de qualidade sem atrasos`,
        `Diagnóstico rápido: 4 perguntas para descobrir onde sua empresa está perdendo dinheiro`,
      ];
    }

    return NextResponse.json({
      success: true,
      ideas: suggestedIdeas,
    });
  } catch (err: unknown) {
    console.error("Erro ao sugerir ideias:", err);
    return NextResponse.json({ error: "Erro ao sugerir ideias." }, { status: 500 });
  }
}
