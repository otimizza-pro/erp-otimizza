import {beforeEach,describe,expect,it,vi} from 'vitest';
const {sql}=vi.hoisted(()=>({sql:vi.fn()}));
vi.mock('@/lib/db/pool',()=>({query:sql,withTransaction:(fn:(db:unknown)=>unknown)=>fn({query:sql})}));
vi.mock('@/lib/auth/require-auth',()=>({requireAdminUser:vi.fn().mockResolvedValue({id:'admin'})}));
import {PUT} from '@/app/api/content-studio/posts/[id]/route';
beforeEach(()=>{vi.clearAllMocks();sql.mockResolvedValue({rowCount:1,rows:[{id:'content'}]});});
describe('Continuidade entre laboratório e criação',()=>{
 it('atualiza a mesma pauta e compartilha as edições, preservando campos avançados',async()=>{
  const result=await PUT(new Request('http://localhost/api/content-studio/posts/content',{method:'PUT',body:JSON.stringify({centralIdea:'Nova ideia',format:'Estático',toneOfVoice:'Direto',selectedCaption:'Legenda revisada'})}),{params:Promise.resolve({id:'content'})});
  expect(result.status).toBe(200);
  const update=sql.mock.calls.find(([s])=>s.includes('UPDATE content_calendar_items SET'));
  expect(update?.[1]).toHaveLength(16);expect(update?.[1][10]).toBe('Post estático');
  expect(JSON.parse(update?.[1][15])).toEqual({bigIdea:'Nova ideia',format:'Estático',tone:'Direto'});
  const sync=sql.mock.calls.find(([s])=>s.startsWith('UPDATE headline_workspaces'));
  expect(sync?.[0]).toContain('brief=brief ||');expect(sync?.[0]).toContain('revision=revision+1');expect(sync?.[1][0]).toBe('content');
  expect(update?.[0]).toContain('THEN false');expect(sql.mock.calls.some(([s])=>s.startsWith('INSERT INTO content_calendar_items'))).toBe(false);
 });
});
