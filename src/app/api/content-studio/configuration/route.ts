import {NextResponse} from "next/server";
import {z} from "zod";
import {query,withTransaction} from "@/lib/db/pool";
import {requireAdminUser} from "@/lib/auth/require-auth";
import {contentSettingsSchema} from "@/modules/clients/content-settings";

function failure(error:unknown){
 const code=error&&typeof error==="object"&&"code" in error?String(error.code):"";
 if(code==="42P01"||code==="42703")return NextResponse.json({error:"A configuração editorial precisa da migração 033 no banco."},{status:503});
 if(code==="23505")return NextResponse.json({error:"Já existe um pilar com esse nome para esta empresa."},{status:409});
 console.error("Configuração de conteúdo",error);
 return NextResponse.json({error:error instanceof Error?error.message:"Não foi possível salvar a configuração."},{status:400});
}
export async function GET(request:Request){
 try{await requireAdminUser();}catch{return NextResponse.json({error:"Acesso não autorizado."},{status:401});}
 const parsed=z.string().uuid().safeParse(new URL(request.url).searchParams.get("clientId"));
 if(!parsed.success)return NextResponse.json({error:"Selecione uma empresa válida."},{status:400});
 try{
  const params=[parsed.data];
  const [identity,pillars,lines,audiences]=await Promise.all([
   query("SELECT communication_profile FROM client_identities WHERE client_id=$1",params),
   query("SELECT id,name,archived_at FROM client_editorial_pillars WHERE client_id=$1 ORDER BY name",params),
   query("SELECT * FROM client_editorial_lines WHERE client_id=$1 ORDER BY pillar_name,theme",params),
   query("SELECT * FROM client_audiences WHERE client_id=$1 ORDER BY is_default DESC,name",params),
  ]);
  return NextResponse.json({profile:identity.rows[0]?.communication_profile||{},pillars:pillars.rows,lines:lines.rows,audiences:audiences.rows});
 }catch(error){return failure(error);}
}
export async function POST(request:Request){
 try{await requireAdminUser();}catch{return NextResponse.json({error:"Acesso não autorizado."},{status:401});}
 try{
  const parsed=contentSettingsSchema.safeParse(await request.json());
  if(!parsed.success)return NextResponse.json({error:parsed.error.issues.map(i=>i.message).join(" ")},{status:400});
  const body=parsed.data;
  const result=await withTransaction(async client=>{
   const company=await client.query("SELECT id FROM clients WHERE id=$1 FOR UPDATE",[body.clientId]);
   if(!company.rows.length)throw new Error("Empresa não encontrada.");
   let savedId=body.clientId;
   if(body.action==="PROFILE_SAVE"){
    await client.query("INSERT INTO client_identities(client_id,communication_profile) VALUES($1,$2::jsonb) ON CONFLICT(client_id) DO UPDATE SET communication_profile=EXCLUDED.communication_profile,updated_at=NOW()",[body.clientId,JSON.stringify(body.profile)]);
   }else if(body.action==="PILLAR_SAVE"){
    const saved=body.id?await client.query("UPDATE client_editorial_pillars SET name=$3 WHERE id=$1 AND client_id=$2 RETURNING id",[body.id,body.clientId,body.name]):await client.query("INSERT INTO client_editorial_pillars(client_id,name) VALUES($1,$2) RETURNING id",[body.clientId,body.name]);
    if(!saved.rows.length)throw new Error("Pilar não encontrado nesta empresa.");
    savedId=String(saved.rows[0].id);
    if(body.id)await client.query("UPDATE client_editorial_lines SET pillar_name=$3,updated_at=NOW() WHERE pillar_id=$1 AND client_id=$2",[body.id,body.clientId,body.name]);
   }else if(body.action==="THEME_SAVE"){
    const pillar=await client.query("SELECT name,archived_at FROM client_editorial_pillars WHERE id=$1 AND client_id=$2",[body.pillarId,body.clientId]);
    if(!pillar.rows.length)throw new Error("Pilar não pertence à empresa selecionada.");
    if(pillar.rows[0].archived_at)throw new Error("Restaure o pilar antes de cadastrar ou editar seus temas.");
    const values=[body.clientId,pillar.rows[0].name,body.theme,body.objective,body.preferredFormats,body.frequencyPerMonth,body.notes,JSON.stringify(body.customFields)];
    const saved=body.id?await client.query("UPDATE client_editorial_lines SET pillar_name=$2,theme=$3,objective=$4,preferred_formats=$5,frequency_per_month=$6,notes=$7,custom_fields=$8::jsonb,updated_at=NOW() WHERE client_id=$1 AND id=$9 RETURNING id",[...values,body.id]):await client.query("INSERT INTO client_editorial_lines(client_id,pillar_name,theme,objective,preferred_formats,frequency_per_month,notes,custom_fields) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb) RETURNING id",values);
    if(!saved.rows.length)throw new Error("Tema não encontrado nesta empresa.");savedId=String(saved.rows[0].id);
   }else if(body.action==="AUDIENCE_SAVE"){
    const duplicate=await client.query("SELECT id FROM client_audiences WHERE client_id=$1 AND lower(trim(name))=lower(trim($2)) AND ($3::uuid IS NULL OR id<>$3)",[body.clientId,body.name,body.id||null]);
    if(duplicate.rows.length)throw new Error("Já existe um público com esse nome. Edite ou restaure o cadastro existente.");
    if(body.id){const exists=await client.query("SELECT id FROM client_audiences WHERE id=$1 AND client_id=$2",[body.id,body.clientId]);if(!exists.rows.length)throw new Error("Público não encontrado nesta empresa.");}
    if(body.isDefault)await client.query("UPDATE client_audiences SET is_default=false WHERE client_id=$1",[body.clientId]);
    const values=[body.clientId,body.name,body.description,body.demographics,body.digitalBehavior || null,body.painPoints,body.desires,body.objections,body.isDefault];
    const saved=body.id?await client.query("UPDATE client_audiences SET name=$2,description=$3,demographics=$4,digital_behavior=$5,pain_points=$6,desires=$7,objections=$8,is_default=$9,updated_at=NOW() WHERE client_id=$1 AND id=$10 RETURNING id",[...values,body.id]):await client.query("INSERT INTO client_audiences(client_id,name,description,demographics,digital_behavior,pain_points,desires,objections,is_default) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id",values);
    if(!saved.rows.length)throw new Error("Público não encontrado nesta empresa.");savedId=String(saved.rows[0].id);
    if (body.catalogItemIds) {
      await client.query("DELETE FROM client_audience_catalog_items WHERE audience_id=$1", [savedId]);
      if (body.catalogItemIds.length > 0) {
        await client.query(
          `INSERT INTO client_audience_catalog_items(audience_id, catalog_item_id)
           SELECT $1, cid FROM unnest($2::uuid[]) AS cid ON CONFLICT DO NOTHING`,
          [savedId, body.catalogItemIds]
        );
      }
    }
   }else if(body.action==="PILLAR_VISIBILITY"||body.action==="THEME_VISIBILITY"||body.action==="AUDIENCE_VISIBILITY"){
    const tables={PILLAR_VISIBILITY:"client_editorial_pillars",THEME_VISIBILITY:"client_editorial_lines",AUDIENCE_VISIBILITY:"client_audiences"} as const;
    const extra=body.action==="THEME_VISIBILITY"?",is_active=NOT $3,updated_at=NOW()":body.action==="AUDIENCE_VISIBILITY"?",updated_at=NOW()":"";
    const changed=await client.query(`UPDATE ${tables[body.action]} SET archived_at=CASE WHEN $3 THEN NOW() ELSE NULL END${extra} WHERE id=$1 AND client_id=$2 RETURNING id`,[body.id,body.clientId,body.archived]);
    if(!changed.rows.length)throw new Error("Registro não encontrado nesta empresa.");savedId=body.id;
   }else{
    const tables={PILLAR_DELETE:"client_editorial_pillars",THEME_DELETE:"client_editorial_lines",AUDIENCE_DELETE:"client_audiences"} as const;
    const removed=await client.query(`DELETE FROM ${tables[body.action]} WHERE id=$1 AND client_id=$2 RETURNING id`,[body.id,body.clientId]);
    if(!removed.rows.length)throw new Error("Registro não encontrado nesta empresa.");savedId=body.id;
   }
   await client.query("INSERT INTO audit_logs(entity_name,entity_id,action,new_data) VALUES('content_configuration',$1,$2,$3)",[savedId,body.action.endsWith("DELETE")?"DELETE":"UPDATE",JSON.stringify(body)]);
   return {success:true,id:savedId};
  });
  return NextResponse.json(result);
 }catch(error){return failure(error);}
}
