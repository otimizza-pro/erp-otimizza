import {readFile} from 'node:fs/promises';
import {describe,expect,it} from 'vitest';
import {getDbPool} from '@/lib/db/pool';

describe('Persistência do laboratório de headlines',()=>{
 it('preserva tentativas, autoria, seleção e conteúdo na mesma pauta, com rollback',async()=>{
  const db=await getDbPool().connect();
  await db.query('BEGIN');
  try {
   if(!(await db.query("SELECT to_regclass('public.headline_workspaces') AS t")).rows[0].t)await db.query(await readFile('database/migrations/043_headline_teams.sql','utf8'));
   const service=await readFile('src/modules/headlines/service.ts','utf8');
   const selection=service.match(/`(UPDATE content_calendar_items SET selected_headline[\s\S]*?)`/)?.[1];
   const route=await readFile('src/app/api/content-studio/posts/[id]/route.ts','utf8');
   const handoff=route.match(/const sql = `([\s\S]*?)`/)?.[1];
   expect(selection).toBeTruthy();expect(handoff).toBeTruthy();
   await db.query('PREPARE headline_selection_validation AS '+selection);
   await db.query('PREPARE headline_handoff_validation AS '+handoff);
   await db.query('DEALLOCATE headline_selection_validation');await db.query('DEALLOCATE headline_handoff_validation');
   const client=(await db.query("INSERT INTO clients(type,name) VALUES('PJ','[TEST] Headline') RETURNING id")).rows[0].id;
   const content=(await db.query("INSERT INTO content_calendar_items(client_id,title,central_idea,format,status,selected_reels) VALUES($1,'Teste','Ideia','Reels','PLANNED','Roteiro preservado') RETURNING id",[client])).rows[0].id;
   const workspace=(await db.query("INSERT INTO headline_workspaces(client_id,user_id,content_id) VALUES($1,'test-headline',$2) RETURNING id",[client,content])).rows[0].id;
   const round=(await db.query("INSERT INTO headline_rounds(workspace_id,brief,prompt,context,style) VALUES($1,'{}','Prompt','{}','{}') RETURNING id",[workspace])).rows[0].id;
   const run=(await db.query("INSERT INTO headline_runs(round_id,team,slot,mode,requested_model,status) VALUES($1,'A',1,'STYLE','modelo','ERROR') RETURNING id",[round])).rows[0].id;
   await db.query("INSERT INTO headline_runs(round_id,team,slot,mode,attempt,requested_model,style_snapshot) VALUES($1,'A',1,'STYLE',2,'modelo','{\"version\":2}')",[round]);
   const candidate=(await db.query("INSERT INTO headline_candidates(round_id,headline,subheadline,source,rating) VALUES($1,'Minha headline','Apoio','HUMAN',1) RETURNING id",[round])).rows[0].id;
   await db.query("UPDATE content_calendar_items SET headline_candidate_id=$2,selected_headline='Minha headline',selected_subheadline='Apoio',headline_content_stale=true WHERE id=$1",[content,candidate]);
   const saved=(await db.query('SELECT * FROM content_calendar_items WHERE id=$1',[content])).rows[0];
   expect(saved.selected_reels).toBe('Roteiro preservado');expect(saved.headline_content_stale).toBe(true);expect(saved.headline_candidate_id).toBe(candidate);
   expect((await db.query('SELECT status FROM headline_runs WHERE id=$1',[run])).rows[0].status).toBe('ERROR');
   expect((await db.query('SELECT count(*)::int AS n FROM headline_runs WHERE round_id=$1',[round])).rows[0].n).toBe(2);
   expect((await db.query('SELECT run_id,rating FROM headline_candidates WHERE id=$1',[candidate])).rows[0]).toEqual({run_id:null,rating:1});
   const secured=await db.query("SELECT relrowsecurity FROM pg_class WHERE oid='headline_candidates'::regclass");expect(secured.rows[0].relrowsecurity).toBe(true);
  }finally{await db.query('ROLLBACK');db.release();}
 });
});
