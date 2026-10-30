import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth/require-auth";
import * as XLSX from "xlsx";
import {
  getServiceProfitabilityReport,
  getComboProfitabilityReport,
  getClientProfitabilityReport,
  getReceivablesDefaultReport,
  getPayablesReport,
  getCashflowComparisonReport,
  getMrrEvolutionReport,
  getMonthlyEvolution,
} from "@/modules/analytics/service";

function formatBRL(val: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(val);
}

function formatDateBR(dateStr: string): string {
  if (!dateStr) return "-";
  const [year, month, day] = dateStr.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

export async function GET(request: Request) {
  try {
    try {
      await requireAdminUser();
    } catch {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get("report") || "receivables_default";
    const format = searchParams.get("format") || "csv"; // csv, xlsx, json

    let rows: Record<string, unknown>[] = [];
    let fileName = `relatorio_${reportType}_${new Date().toISOString().slice(0, 10)}`;

    if (reportType === "receivables_default") {
      const data = await getReceivablesDefaultReport({ onlyOverdue: searchParams.get("onlyOverdue") === "true" });
      fileName = "relatorio_contas_receber_inadimplencia";
      rows = data.map((r) => ({
        "Número": r.receivableNumber,
        "Cliente": r.clientName,
        "Contrato": r.contractNumber || "Avulso",
        "Competência": r.competency,
        "Vencimento": formatDateBR(r.dueDate),
        "Valor Original (R$)": r.originalAmount.toFixed(2),
        "Total Recebido (R$)": r.paidAmount.toFixed(2),
        "Saldo em Aberto (R$)": r.balanceAmount.toFixed(2),
        "Status": r.status,
        "Dias de Atraso": r.daysOverdue,
      }));
    } else if (reportType === "service_profitability") {
      const data = await getServiceProfitabilityReport();
      fileName = "relatorio_rentabilidade_servicos";
      rows = data.map((s) => ({
        "Serviço": s.serviceName,
        "Categoria": s.categoryName,
        "Receita Contratada (R$)": s.contractedRevenue.toFixed(2),
        "Custo Estimado (R$)": s.estimatedCost.toFixed(2),
        "Despesa Direta Realizada (R$)": s.realizedExpenseAllocated.toFixed(2),
        "Margem Bruta Estimada (R$)": s.estimatedGrossMargin.toFixed(2),
        "Margem Bruta Estimada (%)": `${s.estimatedGrossMarginPercent}%`,
        "Contratos Ativos": s.activeContractsCount,
      }));
    } else if (reportType === "client_profitability") {
      const data = await getClientProfitabilityReport();
      fileName = "relatorio_receitas_por_cliente";
      rows = data.map((c) => ({
        "Cliente": c.clientName,
        "Documento": c.clientDocument || "-",
        "Total Contratado (R$)": c.totalContractedAmount.toFixed(2),
        "Total Recebido (R$)": c.totalReceivedAmount.toFixed(2),
        "Saldo em Aberto (R$)": c.openBalanceAmount.toFixed(2),
        "Saldo Vencido (R$)": c.overdueAmount.toFixed(2),
        "Contratos Ativos": c.activeContractsCount,
      }));
    } else if (reportType === "combo_profitability") {
      const data = await getComboProfitabilityReport();
      fileName = "relatorio_rentabilidade_combos";
      rows = data.map((cb) => ({
        "Combo": cb.comboName,
        "Receita Contratada (R$)": cb.contractedRevenue.toFixed(2),
        "Custo Estimado (R$)": cb.estimatedCost.toFixed(2),
        "Margem Estimada (R$)": cb.estimatedGrossMargin.toFixed(2),
        "Margem Estimada (%)": `${cb.estimatedGrossMarginPercent}%`,
        "Contratos Ativos": cb.activeContractsCount,
      }));
    } else if (reportType === "evolution") {
      const data = await getMonthlyEvolution(12);
      fileName = "relatorio_evolucao_mrr_resultado";
      rows = data.map((e) => ({
        "Mês": e.month,
        "Receita Recebida (R$)": e.receivedRevenue.toFixed(2),
        "Receita Prevista (R$)": e.projectedRevenue.toFixed(2),
        "Despesa Paga (R$)": e.paidExpenses.toFixed(2),
        "Despesa Prevista (R$)": e.projectedExpenses.toFixed(2),
        "Resultado Realizado (R$)": e.realizedResult.toFixed(2),
        "MRR (R$)": e.mrr.toFixed(2),
      }));
    } else if (reportType === "payables") {
      const data = await getPayablesReport({ onlyOverdue: searchParams.get("onlyOverdue") === "true" });
      fileName = "relatorio_contas_a_pagar";
      rows = data.map((p) => ({
        "Número": p.payableNumber,
        "Fornecedor": p.supplierName,
        "Categoria": p.categoryName || "Geral",
        "Competência": p.competency,
        "Vencimento": formatDateBR(p.dueDate),
        "Valor Original (R$)": p.originalAmount.toFixed(2),
        "Total Pago (R$)": p.paidAmount.toFixed(2),
        "Saldo em Aberto (R$)": p.balanceAmount.toFixed(2),
        "Status": p.status,
        "Dias de Atraso": p.daysOverdue,
      }));
    } else if (reportType === "cashflow_comparison") {
      const data = await getCashflowComparisonReport(12);
      fileName = "relatorio_fluxo_caixa_previsto_vs_realizado";
      rows = data.map((cf) => ({
        "Período": cf.period,
        "Receita Prevista (R$)": cf.projectedInflow.toFixed(2),
        "Receita Realizada (R$)": cf.realizedInflow.toFixed(2),
        "Variação Receita (R$)": cf.inflowVariance.toFixed(2),
        "Despesa Prevista (R$)": cf.projectedOutflow.toFixed(2),
        "Despesa Realizada (R$)": cf.realizedOutflow.toFixed(2),
        "Variação Despesa (R$)": cf.outflowVariance.toFixed(2),
        "Resultado Previsto (R$)": cf.projectedNet.toFixed(2),
        "Resultado Realizado (R$)": cf.realizedNet.toFixed(2),
        "Variação Líquida (R$)": cf.netVariance.toFixed(2),
      }));
    } else if (reportType === "mrr_evolution") {
      const data = await getMrrEvolutionReport(12);
      fileName = "relatorio_mrr_evolucao_contratacoes";
      rows = data.map((m) => ({
        "Período": m.period,
        "MRR (R$)": m.mrr.toFixed(2),
        "Contratos Ativos": m.activeContractsCount,
        "Novos Contratos": m.newContractsCount,
        "Cancelamentos": m.churnedContractsCount,
      }));
    } else {
      return NextResponse.json({ error: "Tipo de relatório não identificado para exportação." }, { status: 400 });
    }

    // Exportação em XLSX
    if (format === "xlsx") {
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório");
      const buf = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      return new Response(buf, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${fileName}.xlsx"`,
        },
      });
    }

    // Exportação em CSV (Padrão BR com delimitador ;)
    if (format === "csv") {
      if (rows.length === 0) {
        return new Response("Nenhum dado encontrado para o relatório selecionado.", {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${fileName}.csv"`,
          },
        });
      }

      const headers = Object.keys(rows[0]);
      const csvLines = [
        headers.join(";"),
        ...rows.map((row) =>
          headers
            .map((h) => {
              const val = row[h];
              if (val === null || val === undefined) return '""';
              const str = String(val).replace(/"/g, '""');
              return `"${str}"`;
            })
            .join(";")
        ),
      ];

      const csvContent = "\uFEFF" + csvLines.join("\r\n"); // UTF-8 BOM para Excel ler caracteres acentuados

      return new Response(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${fileName}.csv"`,
        },
      });
    }

    // Exportação em PDF (Visualização / Impressão formal de alta precisão)
    if (format === "pdf") {
      const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
      const title = fileName.replace(/_/g, " ").toUpperCase();
      const generatedAt = new Date().toLocaleString("pt-BR");

      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #18181b; font-size: 11px; margin: 0; padding: 20px; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #18181b; padding-bottom: 12px; margin-bottom: 16px; }
    .brand { font-size: 18px; font-weight: 800; letter-spacing: -0.5px; color: #09090b; }
    .title { font-size: 14px; font-weight: 700; color: #27272a; margin-top: 4px; }
    .meta { font-size: 10px; color: #71717a; text-align: right; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th { background: #f4f4f5; color: #3f3f46; font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 8px 10px; border: 1px solid #e4e4e7; text-align: left; }
    td { padding: 7px 10px; border: 1px solid #e4e4e7; font-size: 10px; color: #27272a; }
    tr:nth-child(even) { background: #fafafa; }
    .footer { margin-top: 24px; font-size: 9px; color: #a1a1aa; border-top: 1px solid #e4e4e7; padding-top: 8px; display: flex; justify-content: space-between; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 16px; padding: 12px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
    <span style="color: #166534; font-weight: 600;">Relatório pronto para exportação/impressão em PDF (A4 Paisagem).</span>
    <button onclick="window.print()" style="background: #18181b; color: #fff; border: none; padding: 6px 16px; border-radius: 6px; font-weight: 600; cursor: pointer;">Imprimir / Salvar como PDF</button>
  </div>
  <div class="header">
    <div>
      <div class="brand">OTIMIZZA ERP</div>
      <div class="title">${title}</div>
    </div>
    <div class="meta">
      <div><strong>Emissão:</strong> ${generatedAt}</div>
      <div><strong>Total de Registros:</strong> ${rows.length}</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        ${headers.map((h) => `<th>${h}</th>`).join("")}
      </tr>
    </thead>
    <tbody>
      ${rows
        .map(
          (r) => `<tr>${headers.map((h) => `<td>${r[h] ?? "-"}</td>`).join("")}</tr>`
        )
        .join("")}
    </tbody>
  </table>
  <div class="footer">
    <span>Otimizza ERP &bull; Relatório Gerencial de Conformidade</span>
    <span>Confidencial &bull; Uso Exclusivo da Administração</span>
  </div>
  <script>
    if (window.location.search.includes("autoprint=true")) {
      window.onload = () => window.print();
    }
  </script>
</body>
</html>`;

      return new Response(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    }

    // Retorno JSON padrão
    return NextResponse.json(rows);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro na exportação de relatório.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
