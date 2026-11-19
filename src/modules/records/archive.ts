import {withTransaction} from "@/lib/db/pool";
import {z} from "zod";
const tables={proposal:"proposals",project:"projects",opportunity:"crm_opportunities",activity:"crm_activities",post:"content_calendar_items"} as const;
export async function archiveRecord(kind:keyof typeof tables,id:string,archived:boolean){
 z.string().uuid().parse(id);z.boolean().parse(archived);
 await withTransaction(async client=>{
  const table=tables[kind];const result=await client.query(`SELECT id,archived_at FROM ${table} WHERE id=$1 FOR UPDATE`,[id]);
  if(!result.rows.length)throw new Error("Registro não encontrado.");
  await client.query(`UPDATE ${table} SET archived_at=CASE WHEN $2 THEN NOW() ELSE NULL END,updated_at=NOW() WHERE id=$1`,[id,archived]);
  await client.query("INSERT INTO audit_logs(entity_name,entity_id,action,old_data,new_data) VALUES($1,$2,'UPDATE',$3,$4)",[table,id,JSON.stringify({archivedAt:result.rows[0].archived_at}),JSON.stringify({archived})]);
 });
}
