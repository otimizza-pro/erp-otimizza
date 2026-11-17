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

    // Busca dados do cliente e identidade para contextualizar os pilares
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

    // Pilares base de alta conversão adaptados ao contexto
    const defaultPillars = [
      {
        pillar_name: "Autoridade & Bastidores",
        theme: `Metodologia e bastidores de como a ${brandName} entrega resultados consistentes em ${niche}`,
        objective: "Construir credibilidade técnica inquestionável e conexão humana",
        preferred_formats: ["REELS", "CAROUSEL"],
        frequency_per_month: 4,
        notes: diffs[0] ? `Diferencial chave: ${diffs[0]}` : "Foco em excelência operacional",
      },
      {
        pillar_name: "Educativo & Solução de Dores",
        theme: pains[0] 
          ? `Como superar o desafio: "${pains[0]}" de forma prática e estratégica` 
          : `Erros mais comuns que custam caro aos clientes de ${niche} e como evitar`,
        objective: "Qualificar o público e demonstrar que a empresa tem a cura para a dor",
        preferred_formats: ["CAROUSEL", "CAPTION"],
        frequency_per_month: 6,
        notes: "Conteúdo focado em ensinar antes de vender",
      },
      {
        pillar_name: "Prova Social & Resultados",
        theme: `Transformações, conquistas e antes/depois reais alcançados por clientes da ${brandName}`,
        objective: "Eliminar objeções e quebrar o ceticismo do comprador",
        preferred_formats: ["CAROUSEL", "REELS"],
        frequency_per_month: 3,
        notes: "Depoimentos, métricas alcançadas ou estudos de caso",
      },
      {
        pillar_name: "Oferta Direta & Conversão",
        theme: `Convite exclusivo para diagnóstico estratégico / proposta personalizada com a ${brandName}`,
        objective: "Geração imediata de conversas qualificadas no WhatsApp e Direct",
        preferred_formats: ["CAPTION", "REELS"],
        frequency_per_month: 3,
        notes: "Chamada direta com CTA claro para a próxima etapa comercial",
      },
    ];

    // Se houver chave OpenRouter no .env, tenta enriquecer ainda mais com IA
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (openRouterApiKey && (pains.length > 0 || identity.value_proposition)) {
      try {
        const prompt = `Você é um Estrategista Chefe de Conteúdo da Otimizza. 
Crie 4 pilares editoriais altamente estratégicos e magnéticos para o cliente "${brandName}" (Nicho: ${niche}).
Proposta de valor: ${identity.value_proposition || "Alta qualidade e resultados"}
Dores conhecidas: ${pains.join(", ") || "Falta de tempo e previsibilidade"}
Diferenciais: ${diffs.join(", ") || "Atendimento próximo e processos consolidados"}

Retorne APENAS um JSON válido no formato:
[
  {
    "pillar_name": "Autoridade & Bastidores",
    "theme": "...",
    "objective": "...",
    "preferred_formats": ["REELS", "CAROUSEL"],
    "frequency_per_month": 4,
    "notes": "..."
  },
  ... (4 itens: Autoridade & Bastidores, Educativo & Solução de Dores, Prova Social & Resultados, Oferta Direta & Conversão)
]`;

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
            max_tokens: 1000,
          }),
        });

        if (aiResponse.ok) {
          const aiJson = await aiResponse.json();
          const rawText = aiJson.choices?.[0]?.message?.content || "";
          const cleanedText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
          const parsed = JSON.parse(cleanedText);
          if (Array.isArray(parsed) && parsed.length >= 4) {
            defaultPillars.splice(0, 4, ...parsed.slice(0, 4));
          }
        }
      } catch (aiErr) {
        console.warn("Fallback para pilares padrão Otimizza:", aiErr);
      }
    }

    // Insere os 4 pilares no banco de dados
    const insertedRows = [];
    for (const p of defaultPillars) {
      const res = await query(
        `INSERT INTO client_editorial_lines (
          client_id, pillar_name, theme, objective, preferred_formats, frequency_per_month, notes, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)
        RETURNING *`,
        [
          clientId,
          p.pillar_name,
          p.theme,
          p.objective,
          p.preferred_formats || ["CAROUSEL", "CAPTION"],
          p.frequency_per_month || 4,
          p.notes || "",
        ]
      );
      insertedRows.push(res.rows[0]);
    }

    return NextResponse.json({
      success: true,
      editorialLines: insertedRows,
      message: "4 linhas editoriais estratégicas criadas com sucesso!",
    });
  } catch (err: unknown) {
    console.error("Erro ao gerar linhas editoriais:", err);
    const message = err instanceof Error ? err.message : "Erro ao gerar linhas editoriais.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
