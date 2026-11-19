import { requireAdminUser } from "@/lib/auth/require-auth";
import { NextResponse } from "next/server";
import { SupplierService } from "@/modules/suppliers/service";
import {withTransaction} from "@/lib/db/pool";

export async function DELETE(_request:Request,{params}:{params:Promise<{id:string}>}){
 try{await requireAdminUser();}catch{return NextResponse.json({error:"Acesso não autorizado."},{status:401});}
 try{const {id}=await params;await withTransaction(async client=>{
  const supplier=await client.query("SELECT * FROM suppliers WHERE id=$1 FOR UPDATE",[id]);if(!supplier.rows.length)throw new Error("Fornecedor não encontrado.");
  const links=await client.query("SELECT (SELECT count(*) FROM contract_items WHERE supplier_id=$1)+(SELECT count(*) FROM payables WHERE supplier_id=$1)+(SELECT count(*) FROM cost_accruals WHERE supplier_id=$1)+(SELECT count(*) FROM services WHERE default_supplier_id=$1)+(SELECT count(*) FROM proposal_items WHERE supplier_id=$1) AS total",[id]);
  if(Number(links.rows[0]?.total)>0)throw new Error("Este fornecedor possui vínculos comerciais ou financeiros. Remova os vínculos permitidos ou use Arquivar para preservar o histórico.");
  await client.query("DELETE FROM suppliers WHERE id=$1",[id]);await client.query("INSERT INTO audit_logs(entity_name,entity_id,action,old_data) VALUES('suppliers',$1,'DELETE',$2)",[id,JSON.stringify(supplier.rows[0])]);
 });return NextResponse.json({success:true});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Não foi possível excluir o fornecedor."},{status:409});}
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try { await requireAdminUser(); } catch { return Response.json({error: "Acesso não autorizado."},{status:401}); }

  try {
    const { id } = await params;
    const supplier = await SupplierService.getSupplierById(id);
    if (!supplier) {
      return NextResponse.json({ error: "Fornecedor não encontrado." }, { status: 404 });
    }
    return NextResponse.json(supplier);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao consultar fornecedor.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try { await requireAdminUser(); } catch { return Response.json({error: "Acesso não autorizado."},{status:401}); }

  try {
    const { id } = await params;
    const body = await request.json();
    const updated = await SupplierService.updateSupplier(id, body);
    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar fornecedor.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try { await requireAdminUser(); } catch { return Response.json({error: "Acesso não autorizado."},{status:401}); }

  try {
    const { id } = await params;
    const body = await request.json();
    if (body.action === "archive") {
      const archived = await SupplierService.archiveSupplier(id);
      return NextResponse.json(archived);
    } else if (body.action === "reactivate") {
      const reactivated = await SupplierService.reactivateSupplier(id);
      return NextResponse.json(reactivated);
    }
    return NextResponse.json({ error: "Ação inválida. Utilize 'archive' ou 'reactivate'." }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro na operação de fornecedor.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
