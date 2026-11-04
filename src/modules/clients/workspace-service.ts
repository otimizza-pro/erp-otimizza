import { query, withTransaction } from "@/lib/db/pool";
import { z } from "zod";
interface FolderRow { id: string; name: string }
interface FileRow { id: string; title: string; folder: string; href: string; document_id: string | null }
interface HistoryRow { id: string; category: string; action: string; title: string; date: Date; href: string }
export async function clientFiles(clientId: string) {
  const folders = (await query<FolderRow>("SELECT id,name FROM client_document_folders WHERE client_id=$1 ORDER BY name", [clientId])).rows;
  const files = (await query<FileRow>(`
    SELECT p.id,p.proposal_code||' — '||p.title AS title,'Propostas' AS folder,'/proposals/'||p.id AS href,NULL::uuid AS document_id
    FROM proposals p WHERE p.client_id=$1 AND p.archived_at IS NULL AND p.status <> 'DRAFT'
    UNION ALL SELECT c.id,c.contract_number,'Contratos','/contracts/'||c.id,NULL::uuid FROM contracts c WHERE c.client_id=$1
    UNION ALL SELECT s.id,'Recibo — '||r.receivable_number||CASE WHEN s.is_reversed THEN ' (estornado)' ELSE '' END,'Financeiro','/api/financial/settlements/'||s.id||'/receipt',NULL::uuid FROM financial_settlements s JOIN receivables r ON r.id=s.receivable_id WHERE r.client_id=$1 AND s.settlement_type='RECEIPT'
    UNION ALL SELECT d.id,d.title,COALESCE(f.name,CASE d.category_id WHEN 'PROPOSAL' THEN 'Propostas' WHEN 'CONTRACT' THEN 'Contratos' WHEN 'RECEIPT' THEN 'Financeiro' WHEN 'INVOICE' THEN 'Financeiro' ELSE 'Documentos' END),'/api/documents/'||d.id||'/download',d.id FROM documents d JOIN document_links l ON l.document_id=d.id AND l.entity_type='CLIENT' AND l.entity_id=$1 LEFT JOIN client_document_placements pl ON pl.document_id=d.id AND pl.client_id=$1 LEFT JOIN client_document_folders f ON f.id=pl.folder_id WHERE d.status='ACTIVE'
  `, [clientId])).rows;
  return { folders, files };
}
export async function organizeClientFiles(clientId: string, body: unknown) {
  const data = z.discriminatedUnion("action", [
    z.object({ action: z.literal("createFolder"), name: z.string().trim().min(1).max(100) }),
    z.object({ action: z.literal("move"), folderId: z.string().uuid(), documentId: z.string().uuid() })
  ]).parse(body);
  return withTransaction(async client => {
    if (data.action === "createFolder") {
      if (["Propostas", "Contratos", "Financeiro", "Documentos"].includes(data.name)) throw new Error("Esta pasta já existe.");
      return (await client.query("INSERT INTO client_document_folders(client_id,name) VALUES($1,$2) RETURNING id,name", [clientId, data.name])).rows[0];
    }
    const valid = await client.query(`SELECT 1 FROM client_document_folders f WHERE f.id=$1 AND f.client_id=$2 AND EXISTS(SELECT 1 FROM document_links WHERE document_id=$3 AND entity_type='CLIENT' AND entity_id=$2)`, [data.folderId, clientId, data.documentId]);
    if (!valid.rowCount) throw new Error("Pasta e documento devem pertencer ao cliente.");
    await client.query(`INSERT INTO client_document_placements(client_id,document_id,folder_id) VALUES($1,$2,$3) ON CONFLICT(client_id,document_id) DO UPDATE SET folder_id=EXCLUDED.folder_id`, [clientId, data.documentId, data.folderId]);
    return { success: true };
  });
}
export async function clientHistory(clientId: string, category?: string) {
  const result = await query<HistoryRow>(`SELECT * FROM (
    SELECT pe.id::text AS id,'Propostas' AS category,pe.event_type AS action,p.proposal_code AS title,pe.created_at AS date,'/proposals/'||p.id AS href FROM proposal_events pe JOIN proposals p ON p.id=pe.proposal_id WHERE p.client_id=$1
    UNION ALL SELECT a.id::text,'Contratos',a.action,c.contract_number,a.created_at,'/contracts/'||c.id FROM audit_logs a JOIN contracts c ON c.id::text=a.entity_id WHERE c.client_id=$1 AND a.entity_name='contracts'
    UNION ALL SELECT r.id::text,'Financeiro','Cobrança criada',r.description,r.created_at,'/financial/receivables/'||r.id FROM receivables r WHERE r.client_id=$1
    UNION ALL SELECT s.id::text,'Financeiro',CASE WHEN s.settlement_type='REVERSAL' THEN 'Estorno' ELSE 'Recebimento' END,r.receivable_number,s.created_at,'/financial/receivables/'||r.id FROM financial_settlements s JOIN receivables r ON r.id=s.receivable_id WHERE r.client_id=$1
    UNION ALL SELECT p.id::text,'Projetos','Projeto criado',p.name,p.created_at,'/projects/'||p.id FROM projects p WHERE p.client_id=$1
    UNION ALL SELECT t.id::text,'Projetos','Tarefa criada',t.title,t.created_at,'/projects/'||p.id FROM project_tasks t JOIN projects p ON p.id=t.project_id WHERE p.client_id=$1
    UNION ALL SELECT e.id::text,'Documentos',e.event_type,d.title,e.created_at,'/api/documents/'||d.id||'/download' FROM document_events e JOIN documents d ON d.id=e.document_id JOIN document_links l ON l.document_id=d.id WHERE l.entity_type='CLIENT' AND l.entity_id=$1
    UNION ALL SELECT a.id::text,'CRM',a.activity_type,a.title,a.created_at,'/crm/activities' FROM crm_activities a WHERE a.client_id=$1
    UNION ALL SELECT h.id::text,h.category,h.action,h.title,h.created_at,h.href FROM client_activity_history h WHERE h.client_id=$1
  ) history WHERE ($2::text IS NULL OR category=$2) ORDER BY date DESC`, [clientId, category || null]);
  return result.rows;
}
