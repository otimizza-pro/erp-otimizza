import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth/require-auth";
import { query } from "@/lib/db/pool";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {    
await requireAdminUser(); const { id } = await context.params;
    const items = (await query(`SELECT ci.service_name AS name,ci.periodicity,ri.amount,ri.installment_number AS installment FROM receivable_items ri JOIN contract_items ci ON ci.id=ri.contract_item_id WHERE ri.receivable_id=$1 ORDER BY ci.service_name`, [id])).rows;
    const receipts = (await query("SELECT id,amount,is_reversed FROM financial_settlements WHERE receivable_id=$1 AND settlement_type='RECEIPT' ORDER BY created_at", [id])).rows;
    return NextResponse.json({ items, receipts });
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao consultar" }, { status: 400 }); }
}
