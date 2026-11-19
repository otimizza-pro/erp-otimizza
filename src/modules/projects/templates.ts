import {z} from "zod";
import {withTransaction} from "@/lib/db/pool";
export const templateSchema=z.object({
 code:z.string().trim().min(1).max(20).regex(/^[A-Za-z0-9_-]+$/),name:z.string().trim().min(1).max(150),description:z.string().max(10000).default(""),estimatedDays:z.number().int().min(1).max(3660),estimatedHours:z.number().finite().min(0).max(999999),
 stages:z.array(z.object({name:z.string().trim().min(1).max(100),tasks:z.array(z.object({title:z.string().trim().min(1).max(200),description:z.string().max(6000).default(""),relativeDueDays:z.number().int().min(0).max(3660),estimatedHours:z.number().finite().min(0).max(9999)})).max(100)})).max(50)
});
export async function saveProjectTemplate(raw:unknown,id?:string){
 const input=templateSchema.parse(raw);
 return withTransaction(async client=>{
  let savedId=id;let old:unknown=null;
  if(id){const existing=await client.query("SELECT * FROM project_templates WHERE id=$1 FOR UPDATE",[id]);if(!existing.rows.length)throw new Error("Modelo não encontrado.");old=existing.rows[0];await client.query("UPDATE project_templates SET code=$2,name=$3,description=$4,estimated_days=$5,estimated_hours=$6,updated_at=NOW() WHERE id=$1",[id,input.code,input.name,input.description,input.estimatedDays,input.estimatedHours]);await client.query("DELETE FROM project_template_tasks WHERE template_id=$1",[id]);await client.query("DELETE FROM project_template_stages WHERE template_id=$1",[id]);}
  else{const created=await client.query("INSERT INTO project_templates(code,name,description,estimated_days,estimated_hours) VALUES($1,$2,$3,$4,$5) RETURNING id",[input.code,input.name,input.description,input.estimatedDays,input.estimatedHours]);savedId=String(created.rows[0].id);}
  for(const [index,stage] of input.stages.entries()){
   const saved=await client.query("INSERT INTO project_template_stages(template_id,name,order_index) VALUES($1,$2,$3) RETURNING id",[savedId,stage.name,index+1]);
   for(const [taskIndex,task] of stage.tasks.entries())await client.query("INSERT INTO project_template_tasks(template_id,stage_id,title,description,relative_due_days,estimated_hours,order_index) VALUES($1,$2,$3,$4,$5,$6,$7)",[savedId,saved.rows[0].id,task.title,task.description,task.relativeDueDays,task.estimatedHours,taskIndex+1]);
  }
  await client.query("INSERT INTO audit_logs(entity_name,entity_id,action,old_data,new_data) VALUES('project_templates',$1,$2,$3,$4)",[savedId,id?"UPDATE":"INSERT",old?JSON.stringify(old):null,JSON.stringify(input)]);
  return {id:savedId};
 });
}
export async function templateLifecycle(id:string,action:"ARCHIVE"|"RESTORE"|"DELETE"){
 await withTransaction(async client=>{
  const existing=await client.query("SELECT * FROM project_templates WHERE id=$1 FOR UPDATE",[id]);if(!existing.rows.length)throw new Error("Modelo não encontrado.");
  if(action==="DELETE"){
   const links=await client.query("SELECT (SELECT count(*) FROM projects WHERE template_id=$1)+(SELECT count(*) FROM contract_project_recurring_settings WHERE template_id=$1)+(SELECT count(*) FROM services WHERE onboarding_template_id=$1 OR delivery_template_id=$1) AS total",[id]);
   if(Number(links.rows[0]?.total)>0)throw new Error("Modelo vinculado a projetos ou recorrências. Use Arquivar para preservar os vínculos.");
   await client.query("DELETE FROM project_templates WHERE id=$1",[id]);
  }else await client.query("UPDATE project_templates SET status=$2,updated_at=NOW() WHERE id=$1",[id,action==="ARCHIVE"?"ARCHIVED":"ACTIVE"]);
  await client.query("INSERT INTO audit_logs(entity_name,entity_id,action,old_data,new_data) VALUES('project_templates',$1,$2,$3,$4)",[id,action==="DELETE"?"DELETE":"UPDATE",JSON.stringify(existing.rows[0]),JSON.stringify({action})]);
 });
}
