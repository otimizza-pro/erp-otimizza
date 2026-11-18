import {NextResponse} from "next/server";
import {requireAdminUser} from "@/lib/auth/require-auth";
export const dynamic="force-dynamic";
export async function POST(){try{await requireAdminUser();}catch{return NextResponse.json({success:false,error:"Acesso não autorizado"},{status:401});}
 return NextResponse.json({success:false,code:"COMPETITOR_RESEARCH_NOT_CONFIGURED",error:"A pesquisa real de concorrentes ainda não está integrada. Nenhuma auditoria foi gerada e a tarefa não foi concluída automaticamente. Registre uma análise manual ou configure a pesquisa antes de concluir."},{status:501});}
