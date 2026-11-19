import {archiveRecord} from "@/modules/records/archive";
import {z} from "zod";
import { requireAdminUser } from "@/lib/auth/require-auth";
import { NextRequest, NextResponse } from "next/server";
import { getProjectById, updateProject, archiveProject, deleteProject } from "@/modules/projects/service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try { await requireAdminUser(); } catch { return Response.json({error: "Acesso não autorizado."},{status:401}); }

  try {
    const { id } = await params;
    const project = await getProjectById(id,true);
    if (!project) {
      return NextResponse.json({ success: false, error: "Projeto não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: project });
  } catch (error: unknown) {
    console.error("Erro ao buscar projeto:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao buscar projeto." },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try { await requireAdminUser(); } catch { return Response.json({error: "Acesso não autorizado."},{status:401}); }

  try {
    const { id } = await params;
    const body = await req.json();
    const updated = await updateProject(id, body);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    console.error("Erro ao atualizar projeto:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao atualizar projeto." },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try { await requireAdminUser(); } catch { return Response.json({error: "Acesso não autorizado."},{status:401}); }

  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const archiveOnly = searchParams.get("archive") === "true";

    if (archiveOnly) {
      await archiveProject(id);
      return NextResponse.json({ success: true, message: "Projeto arquivado com sucesso." });
    } else {
      await deleteProject(id);
      return NextResponse.json({ success: true, message: "Projeto excluído com sucesso." });
    }
  } catch (error: unknown) {
    console.error("Erro ao excluir/arquivar projeto:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Erro ao excluir/arquivar projeto." },
      { status: 400 }
    );
  }
}

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 try{await requireAdminUser();}catch{return NextResponse.json({error:"Acesso não autorizado."},{status:401});}
 try{const {id}=await params;const {archived}=z.object({archived:z.boolean()}).parse(await request.json());await archiveRecord('project',id,archived);return NextResponse.json({success:true});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Não foi possível alterar o arquivamento.'},{status:400});}
}
