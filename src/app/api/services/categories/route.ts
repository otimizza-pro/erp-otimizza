import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/auth/require-auth";
import { deleteServiceCategories } from "@/modules/catalog/service";
export async function DELETE(request:Request){
 try{await requireAdminUser();}catch{return NextResponse.json({error:"Acesso não autorizado"},{status:401});}
 try{const input=z.object({ids:z.array(z.string().uuid()).min(1).max(500)}).safeParse(await request.json());if(!input.success)return NextResponse.json({error:"Selecione de 1 a 500 categorias válidas."},{status:400});return NextResponse.json(await deleteServiceCategories(input.data.ids));}
 catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Erro ao excluir categorias."},{status:409});}
}
