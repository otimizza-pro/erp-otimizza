import {describe,it,expect} from "vitest";
import {getDbPool} from "@/lib/db/pool";
describe("Integridade transacional da jornada CRM (banco de teste isolado)",()=>{
 it("exige qualificação, preserva origem, permite múltiplas negociações e desfaz conversão em caso de erro",async()=>{
 const db=await getDbPool().connect();await db.query("BEGIN");try{
 const pipeline=(await db.query("INSERT INTO crm_pipelines(name) VALUES('[TEST-JOURNEY] Funil') RETURNING id")).rows[0].id;
 const stage=(await db.query("INSERT INTO crm_pipeline_stages(pipeline_id,name,display_order,win_probability,stage_type) VALUES($1,'Diagnóstico próprio',0,20,'NORMAL') RETURNING id",[pipeline])).rows[0].id;
 const lead=(await db.query("INSERT INTO crm_leads(person_type,name,acquisition_type,acquisition_verified,lead_source,first_contact_channel) VALUES('PJ','[TEST-JOURNEY] Lead','INBOUND',true,'Google Ads','WhatsApp') RETURNING id",[])).rows[0].id;
 const insert="INSERT INTO crm_opportunities(title,lead_id,pipeline_id,stage_id,amount) VALUES('[TEST-JOURNEY] Negociação',$1,$2,$3,100) RETURNING *";
 await db.query("SAVEPOINT unqualified");await expect(db.query(insert,[lead,pipeline,stage])).rejects.toThrow(/Qualifique/);await db.query("ROLLBACK TO SAVEPOINT unqualified");
 expect((await db.query("SELECT status FROM crm_leads WHERE id=$1",[lead])).rows[0].status).toBe("NEW");
 await db.query("UPDATE crm_leads SET status='QUALIFICADO' WHERE id=$1",[lead]);
 const opp=(await db.query(insert,[lead,pipeline,stage])).rows[0];expect(opp.acquisition_snapshot.leadSource).toBe("Google Ads");expect(opp.acquisition_snapshot.firstContactChannel).toBe("WhatsApp");
 expect((await db.query("SELECT status FROM crm_leads WHERE id=$1",[lead])).rows[0].status).toBe("OPORTUNIDADE");
 await db.query(insert,[lead,pipeline,stage]);expect((await db.query("SELECT count(*)::int AS n FROM crm_opportunities WHERE lead_id=$1",[lead])).rows[0].n).toBe(2);
 const another=(await db.query("INSERT INTO crm_leads(person_type,name,status) VALUES('PJ','[TEST-JOURNEY] Atomicidade','QUALIFICADO') RETURNING id")).rows[0].id;
 await db.query("SAVEPOINT failed_insert");await expect(db.query("INSERT INTO crm_opportunities(opportunity_code,title,lead_id,pipeline_id,stage_id,amount) VALUES($1,'[TEST-JOURNEY] Falha',$2,$3,$4,100)",[opp.opportunity_code,another,pipeline,stage])).rejects.toThrow();await db.query("ROLLBACK TO SAVEPOINT failed_insert");
 expect((await db.query("SELECT status FROM crm_leads WHERE id=$1",[another])).rows[0].status).toBe("QUALIFICADO");
 expect((await db.query("SELECT count(*)::int AS n FROM crm_lead_status_history WHERE lead_id=$1 AND to_status='OPORTUNIDADE'",[another])).rows[0].n).toBe(0);
 await db.query("UPDATE crm_leads SET status='NUTRICAO',nurture_reason='Contato futuro',nurture_next_action_date=CURRENT_DATE+1 WHERE id=$1",[another]);expect((await db.query("SELECT count(*)::int AS n FROM crm_activities WHERE lead_id=$1 AND activity_type='FOLLOW_UP'",[another])).rows[0].n).toBe(1);
 }finally{await db.query("ROLLBACK");db.release();}
 });
});
