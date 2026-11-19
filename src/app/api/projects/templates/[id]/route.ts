import { requireAdminUser } from "@/lib/auth/require-auth";
import { NextResponse } from "next/server";
import { query } from "@/lib/db/pool";
import {saveProjectTemplate,templateLifecycle} from "@/modules/projects/templates";
import {z} from "zod";

export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){
 try{await requireAdminUser();}catch{return NextResponse.json({error:"Acesso não autorizado."},{status:401});}
 try{const {id}=await params;return NextResponse.json({success:true,...await saveProjectTemplate(await request.json(),id)});}
 catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Não foi possível editar o modelo."},{status:400});}
}
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 try{await requireAdminUser();}catch{return NextResponse.json({error:"Acesso não autorizado."},{status:401});}
 try{const {id}=await params;const {action}=z.object({action:z.enum(["ARCHIVE","RESTORE"])}).parse(await request.json());await templateLifecycle(id,action);return NextResponse.json({success:true});}
 catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Não foi possível arquivar o modelo."},{status:400});}
}
export async function DELETE(_request:Request,{params}:{params:Promise<{id:string}>}){
 try{await requireAdminUser();}catch{return NextResponse.json({error:"Acesso não autorizado."},{status:401});}
 try{const {id}=await params;await templateLifecycle(id,"DELETE");return NextResponse.json({success:true});}
 catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Não foi possível excluir o modelo."},{status:409});}
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try { await requireAdminUser(); } catch { return Response.json({error: "Acesso não autorizado."},{status:401}); }

  try {
    const { id } = await params;

    const tmplRes = await query<{
      id: string;
      code: string;
      name: string;
      description: string | null;
      estimatedDays: number;
      estimatedHours: number;
      status: string;
    }>(
      `SELECT 
        id, code, name, description,
        estimated_days as "estimatedDays",
        estimated_hours as "estimatedHours",
        status
       FROM project_templates
       WHERE id = $1`,
      [id]
    );

    if (tmplRes.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Modelo não encontrado." }, { status: 404 });
    }

    const template = tmplRes.rows[0];

    // Buscar etapas
    const stagesRes = await query<{
      id: string;
      name: string;
      orderIndex: number;
    }>(
      `SELECT id, name, order_index as "orderIndex"
       FROM project_template_stages
       WHERE template_id = $1
       ORDER BY order_index ASC`,
      [id]
    );

    // Buscar tarefas
    const tasksRes = await query<{
      id: string;
      stageId: string | null;
      title: string;
      description: string | null;
      relativeDueDays: number;
      estimatedHours: number;
      orderIndex: number;
    }>(
      `SELECT 
        id, 
        stage_id as "stageId", 
        title, 
        description, 
        relative_due_days as "relativeDueDays", 
        estimated_hours as "estimatedHours", 
        order_index as "orderIndex"
       FROM project_template_tasks
       WHERE template_id = $1
       ORDER BY order_index ASC`,
      [id]
    );

    // Agrupar tarefas por etapa
    const stagesWithTasks = stagesRes.rows.map((stage) => {
      const stageTasks = tasksRes.rows.filter((t) => t.stageId === stage.id);
      const minDays = stageTasks.length > 0 ? Math.min(...stageTasks.map((t) => t.relativeDueDays || 0)) : 0;
      const maxDays = stageTasks.length > 0 ? Math.max(...stageTasks.map((t) => t.relativeDueDays || 0)) : 0;

      return {
        ...stage,
        minDays,
        maxDays,
        tasks: stageTasks,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        ...template,
        stages: stagesWithTasks,
        allTasks: tasksRes.rows,
      },
    });
  } catch (error: unknown) {
    console.error("Erro ao carregar detalhes do template:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao carregar modelo." },
      { status: 500 }
    );
  }
}

