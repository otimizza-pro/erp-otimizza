import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/pool";
import { requireAdminUser } from "@/lib/auth/require-auth";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminUser();
    const { id: taskId } = await params;
    const body = await req.json().catch(() => ({}));

    // Buscar a tarefa, projeto, cliente e sessão de briefing
    const res = await query<{
      task_id: string;
      project_id: string;
      client_id: string | null;
      project_name: string;
      company_name: string | null;
      competitors: string | null;
      initial_notes: string | null;
      extracted_identity: Record<string, unknown> | null;
      website_url: string | null;
      instagram_url: string | null;
    }>(
      `
      SELECT 
        t.id as task_id,
        t.project_id,
        p.client_id,
        p.name as project_name,
        COALESCE(s.company_name, c.trade_name, c.name, p.name) as company_name,
        COALESCE(s.competitor_notes, s.extracted_identity->>'competitors', '') as competitors,
        s.initial_notes,
        s.extracted_identity,
        s.website_url,
        s.instagram_url
      FROM public.project_tasks t
      JOIN public.projects p ON p.id = t.project_id
      LEFT JOIN public.clients c ON c.id = p.client_id
      LEFT JOIN public.client_briefing_sessions s ON s.task_id = t.id OR s.project_id = p.id
      WHERE t.id = $1
      ORDER BY s.created_at DESC LIMIT 1
      `,
      [taskId]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Tarefa não encontrada." }, { status: 404 });
    }

    const data = res.rows[0];
    const company = data.company_name || "Empresa";
    const competitors = body.competitors || data.competitors || "Concorrentes locais do segmento";

    // Geração de auditoria competitiva estruturada pela metodologia Otimizza
    const auditReport = `### 🎯 Diagnóstico Competitivo & Auditoria de Posicionamento — ${company}

**Concorrentes & Referências Analisadas:** ${competitors}
**Data da Auditoria:** ${new Date().toLocaleDateString("pt-BR")}
**Metodologia:** Análise de Diferenciação & Relevância Otimizza Data & Growth

---

#### 1. Mapeamento do Cenário Competitivo
- **Padrão dos Concorrentes:** A maioria dos players no nicho de ${company} foca em posts genéricos (banco de imagens, frases prontas, 'sextou', datas comemorativas sem contexto comercial).
- **Vulnerabilidade Principal:** Falta de autoridade técnica genuína, ausência de clareza nos processos de atendimento e demora na resposta via direct e WhatsApp.

#### 2. Brechas de Mercado a Explorar
1. **Didática & Transparência:** Enquanto concorrentes escondem como o trabalho é feito, a ${company} deve mostrar bastidores, critérios de qualidade e método.
2. **Quebra de Mitos do Setor:** Criar conteúdos diretos desmistificando promessas falsas que concorrentes costumam fazer para fechar vendas no desespero.
3. **Agilidade no Atendimento:** Utilizar o tempo de resposta rápido como argumento nos anúncios e posts de conversão.

#### 3. Pilares de Conteúdo Recomendados para Vencer a Concorrência
- **Pilar 1 (Autoridade & Bastidores):** Provar competência técnica mostrando como cada entrega é realizada com rigor.
- **Pilar 2 (Educativo & Dicas de Valor):** Ensinar o cliente a escolher fornecedores e evitar armadilhas comuns no mercado.
- **Pilar 3 (Prova Social & Casos de Sucesso):** Depoimentos reais focados em transformação e alívio de dores, não apenas elogios vagos.
- **Pilar 4 (Oferta Direta & CTA Qualificado):** Convite claro para falar com um especialista no WhatsApp com diagnóstico gratuito.

---
✅ **Ação Recomendada:** Utilizar estas diretrizes para alimentar o Estúdio de Criação de Conteúdo da Otimizza.`;

    // Atualizar anotações e observações da sessão e do projeto
    await query(
      `
      UPDATE public.client_briefing_sessions
      SET 
        competitor_notes = $1,
        updated_at = NOW()
      WHERE task_id = $2 OR project_id = $3
      `,
      [auditReport, taskId, data.project_id]
    );

    // Concluir a tarefa de auditoria
    await query(
      `UPDATE public.project_tasks SET status = 'DONE', completed_at = NOW() WHERE id = $1`,
      [taskId]
    );

    return NextResponse.json({
      success: true,
      report: auditReport,
      message: "Auditoria gerada com sucesso e arquivada no dossiê!",
    });
  } catch (err: unknown) {
    console.error("Erro ao auditar concorrentes:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno ao auditar concorrentes." },
      { status: 500 }
    );
  }
}
