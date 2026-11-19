import {archiveRecord} from "@/modules/records/archive";
import {z} from "zod";
import { requireAdminUser } from "@/lib/auth/require-auth";
import { NextResponse } from "next/server";
import { CrmService } from "@/modules/crm/service";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try { await requireAdminUser(); } catch { return Response.json({error: "Acesso não autorizado."},{status:401}); }

  try {
    const { id } = await params;
    const body = await request.json();
    const updated = await CrmService.updateActivity(id, body);
    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar atividade.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try { await requireAdminUser(); } catch { return Response.json({error: "Acesso não autorizado."},{status:401}); }

  try {
    const { id } = await params;
    await CrmService.deleteActivity(id);
    return NextResponse.json({ success: true, message: "Atividade excluída com sucesso." });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao excluir atividade.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 try{await requireAdminUser();}catch{return NextResponse.json({error:"Acesso não autorizado."},{status:401});}
 try{const {id}=await params;const {archived}=z.object({archived:z.boolean()}).parse(await request.json());await archiveRecord('activity',id,archived);return NextResponse.json({success:true});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Não foi possível alterar o arquivamento.'},{status:400});}
}
