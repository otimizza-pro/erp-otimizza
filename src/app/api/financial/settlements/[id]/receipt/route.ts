import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import { query } from "@/lib/db/pool";
import { requireAdminUser } from "@/lib/auth/require-auth";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminUser(); const { id } = await context.params;
    const row = (await query(`SELECT s.id,s.amount,s.settlement_date::text,s.is_reversed,r.receivable_number,r.description,c.name,c.document,ct.contract_number,p.proposal_code FROM financial_settlements s JOIN receivables r ON r.id=s.receivable_id JOIN clients c ON c.id=r.client_id LEFT JOIN contracts ct ON ct.id=r.contract_id LEFT JOIN proposals p ON p.id=ct.proposal_id WHERE s.id=$1 AND s.settlement_type='RECEIPT'`, [id])).rows[0];
    if (!row) return NextResponse.json({ error: "Recebimento não encontrado" }, { status: 404 });
    const pdf = new jsPDF(); pdf.setFontSize(18); pdf.text(row.is_reversed ? "RECIBO ESTORNADO" : "RECIBO DE PAGAMENTO", 20, 25); pdf.setFontSize(11);
    const lines = [`Cliente: ${row.name}`, `Documento: ${row.document || "Não informado"}`, `Valor recebido: ${Number(row.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`, `Data: ${row.settlement_date}`, `Título: ${row.receivable_number}`, `Contrato: ${row.contract_number || "Avulso"}`, `Proposta: ${row.proposal_code || "—"}`, `Descrição: ${row.description}`, `Identificador: ${row.id}`, "Este recibo comprova somente o valor recebido acima e não substitui nota fiscal."];
    pdf.text(pdf.splitTextToSize(lines.join("\n\n"), 170), 20, 42);
    return new Response(pdf.output("arraybuffer"), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="recibo-${row.receivable_number}.pdf"` } });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao gerar recibo" }, { status: 400 }); }
}
