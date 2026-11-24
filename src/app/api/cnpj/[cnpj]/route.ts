import { NextRequest, NextResponse } from "next/server";
import { generateWithOpenRouter, strategyModel } from "@/lib/ai/openrouter";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ cnpj: string }> }
) {
  try {
    const { cnpj: rawCnpj } = await params;
    const cleanCnpj = (rawCnpj || "").replace(/\D/g, "");

    if (cleanCnpj.length !== 14) {
      return NextResponse.json(
        { success: false, error: "CNPJ deve conter exatamente 14 dígitos." },
        { status: 400 }
      );
    }

    let companyData: {
      companyName: string;
      tradeName: string;
      cnaeCode: string;
      cnaeDescription: string;
      email?: string;
      phone?: string;
      city?: string;
      state?: string;
    } | null = null;

    // 1. Tentar BrasilAPI com User-Agent
    try {
      const bRes = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        next: { revalidate: 3600 },
      });

      if (bRes.ok) {
        const json = await bRes.json();
        companyData = {
          companyName: json.razao_social || "",
          tradeName: json.nome_fantasia || json.razao_social || "",
          cnaeCode: String(json.cnae_fiscal || ""),
          cnaeDescription: json.cnae_fiscal_descricao || "",
          email: json.email || undefined,
          phone: json.ddd_telefone_1 || undefined,
          city: json.municipio || undefined,
          state: json.uf || undefined,
        };
      }
    } catch (err) {
      console.warn("BrasilAPI falhou para CNPJ, tentando ReceitaWS:", err);
    }

    // 2. Fallback para ReceitaWS se BrasilAPI falhar
    if (!companyData) {
      try {
        const rRes = await fetch(`https://receitaws.com.br/v1/cnpj/${cleanCnpj}`, {
          headers: { "User-Agent": "Mozilla/5.0" },
        });

        if (rRes.ok) {
          const json = await rRes.json();
          if (json.status !== "ERROR") {
            const mainActivity = Array.isArray(json.atividade_principal) && json.atividade_principal[0];
            companyData = {
              companyName: json.nome || "",
              tradeName: json.fantasia || json.nome || "",
              cnaeCode: mainActivity ? String(mainActivity.code || "") : "",
              cnaeDescription: mainActivity ? String(mainActivity.text || "") : "",
              email: json.email || undefined,
              phone: json.telefone || undefined,
              city: json.municipio || undefined,
              state: json.uf || undefined,
            };
          }
        }
      } catch (err) {
        console.warn("ReceitaWS falhou para CNPJ:", err);
      }
    }

    if (!companyData) {
      return NextResponse.json(
        { success: false, error: "CNPJ não encontrado ou indisponível para consulta." },
        { status: 404 }
      );
    }

    // 3. Gerar sugestão de Categoria / Nicho amigável via IA
    let suggestedCategory = companyData.cnaeDescription || "Prestador de Serviços";
    try {
      if (companyData.cnaeDescription) {
        const aiPrompt = `Você é um especialista em posicionamento de empresas e marketing de crescimento.
A empresa possui a seguinte atividade econômica registrada:
- CNAE: ${companyData.cnaeCode}
- Descrição da Atividade: ${companyData.cnaeDescription}
- Nome da Empresa: ${companyData.tradeName || companyData.companyName}

Traduza essa atividade formal e burocrática em uma Categoria / Nicho de mercado comercial, moderno e amigável para redes sociais e estratégias de marketing.
Exemplo: Se o CNAE for "Atividades de fisioterapia e afins", a categoria sugerida pode ser "Studio de Fisioterapia, Pilates & Reabilitação".
Retorne EXCLUSIVAMENTE o nome da categoria sugerida em uma linha (máximo 4 a 6 palavras), sem aspas ou explicações.`;

        const aiRes = await generateWithOpenRouter({
          model: strategyModel(),
          temperature: 0.3,
          messages: [{ role: "user", content: aiPrompt }],
        });

        const reply = (aiRes.text || "").trim().replace(/^["']|["']$/g, "");
        if (reply && reply.length > 3 && reply.length < 80) {
          suggestedCategory = reply;
        }
      }
    } catch (aiErr) {
      console.warn("IA suggestion fallback to raw description:", aiErr);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...companyData,
        suggestedCategory,
      },
    });
  } catch (error: unknown) {
    console.error("Erro na consulta de CNPJ:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro interno na consulta." },
      { status: 500 }
    );
  }
}
