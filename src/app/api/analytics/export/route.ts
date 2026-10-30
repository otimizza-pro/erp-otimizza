import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth/require-auth";
import * as XLSX from "xlsx";
import {
  getServiceProfitabilityReport,
  getComboProfitabilityReport,
  getClientProfitabilityReport,
  getReceivablesDefaultReport,
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

    // Retorno JSON padrão
    return NextResponse.json(rows);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro na exportação de relatório.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
