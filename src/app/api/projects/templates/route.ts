import { requireAdminUser } from "@/lib/auth/require-auth";
import { NextResponse } from "next/server";
import { listProjectTemplates } from "@/modules/projects/service";
import {query} from "@/lib/db/pool";
import {saveProjectTemplate} from "@/modules/projects/templates";

export async function GET(request:Request) {
  try { await requireAdminUser(); } catch { return Response.json({error: "Acesso não autorizado."},{status:401}); }

  try {
    const templates = new URL(request.url).searchParams.get("status")==="ALL"?(await query('SELECT id,code,name,description,estimated_days AS "estimatedDays",estimated_hours::float AS "estimatedHours",status FROM project_templates ORDER BY name')).rows:await listProjectTemplates();
    return NextResponse.json({ success: true, data: templates });
  } catch (error: unknown) {
    console.error("Erro ao listar modelos de projeto:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao listar templates." },
      { status: 500 }
    );
  }
}

export async function POST(request:Request){
 try{await requireAdminUser();}catch{return NextResponse.json({error:"Acesso não autorizado."},{status:401});}
 try{return NextResponse.json({success:true,...await saveProjectTemplate(await request.json())},{status:201});}
 catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Não foi possível criar o modelo."},{status:400});}
}
