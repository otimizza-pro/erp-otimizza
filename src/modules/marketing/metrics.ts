import { z } from "zod";
import { query as databaseQuery } from "@/lib/db/pool";
export const metricFiltersSchema=z.object({
 companyId:z.union([z.literal("otimizza"),z.string().uuid()]).default("otimizza"),
 start:z.string().date(),end:z.string().date(),
 acquisitionType:z.enum(["ALL","INBOUND","OUTBOUND","NAO_INFORMADO"]).default("ALL"),
 source:z.string().max(100).default(""),channel:z.string().max(50).default("")
}).refine(v=>v.start<=v.end,{message:"O início deve ser anterior ao fim"});
export type MetricFilters=z.infer<typeof metricFiltersSchema>;
export function percentage(numerator:number,denominator:number):number|null{return denominator>0?Math.round(numerator/denominator*1000)/10:null;}
export interface CustomerRevenue {clientId:string;mrr:number;}
export function retentionMetrics(opening:CustomerRevenue[],closing:CustomerRevenue[]){
 const end=new Map(closing.map(c=>[c.clientId,c.mrr]));const start=new Map(opening.map(c=>[c.clientId,c.mrr]));
 const retained=opening.filter(c=>end.has(c.clientId)).length;
 return {openingClients:opening.length,closingClients:closing.length,retainedClients:retained,churnedClients:opening.length-retained,retentionRate:percentage(retained,opening.length),churnRate:percentage(opening.length-retained,opening.length),mrr:closing.reduce((n,c)=>n+c.mrr,0),expansionMrr:closing.reduce((n,c)=>n+(start.has(c.clientId)?Math.max(0,c.mrr-(start.get(c.clientId)||0)):0),0),lostMrr:opening.reduce((n,c)=>n+Math.max(0,c.mrr-(end.get(c.clientId)||0)),0)};
}
const numeric=(row:Record<string,unknown>)=>Object.fromEntries(Object.entries(row).map(([k,v])=>[k,v===null?null:Number(v)]));
export async function getFunnelMetrics(filters:MetricFilters){
 // Declare types for all bindings, including dates unused by stock queries.
 const query = (sql: string, parameters: (string | null)[]) => {
  const typed = "WITH metric_parameters AS (SELECT $1::uuid, $2::date, $3::date, $4::text, $5::text, $6::text)";
  return databaseQuery(typed + (/^WITH\s/i.test(sql) ? ", " + sql.replace(/^WITH\s/i, "") : " " + sql), parameters);
 };
 const values=[filters.companyId==="otimizza"?null:filters.companyId,filters.start,filters.end,filters.acquisitionType,filters.source,filters.channel];
 const scope=`l.owner_client_id IS NOT DISTINCT FROM $1::uuid
 AND ($4='ALL' OR (CASE WHEN l.acquisition_verified THEN l.acquisition_type ELSE 'NAO_INFORMADO' END)=$4)
 AND ($5='' OR COALESCE(l.lead_source,l.source)=$5)
 AND ($6='' OR (l.acquisition_verified AND l.first_contact_channel=$6))`;
 const cohort=`WITH scoped AS (SELECT l.* FROM crm_leads l WHERE ${scope}), cohort AS (SELECT * FROM scoped WHERE created_at >= $2::date AND created_at < $3::date + INTERVAL '1 day')`;
 const period=`>= $2::date AND h.created_at < $3::date + INTERVAL '1 day'`;
 const [leads,sources,events,opportunities,stages,proposals,nurture,customers,cancellations]=await Promise.all([
 query(`${cohort} SELECT count(*)::int AS captured,
 count(*) FILTER(WHERE acquisition_verified AND acquisition_type='INBOUND')::int AS inbound,
 count(*) FILTER(WHERE acquisition_verified AND acquisition_type='OUTBOUND')::int AS outbound,
 count(*) FILTER(WHERE NOT acquisition_verified OR acquisition_type='NAO_INFORMADO' OR acquisition_type IS NULL)::int AS unknown,
 count(*) FILTER(WHERE status NOT IN ('NEW','NOVO','ARCHIVED') OR qualified_at IS NOT NULL OR EXISTS(SELECT 1 FROM crm_lead_status_history h WHERE h.lead_id=cohort.id AND h.to_status NOT IN ('NEW','NOVO','ARCHIVED')))::int AS evaluated,
 count(*) FILTER(WHERE qualified_at IS NOT NULL OR status IN ('QUALIFIED','QUALIFICADO','OPORTUNIDADE','CONVERTED'))::int AS qualified,
 count(*) FILTER(WHERE EXISTS(SELECT 1 FROM crm_opportunities o WHERE o.lead_id=cohort.id))::int AS converted,
 avg(EXTRACT(EPOCH FROM (qualified_at-created_at))/86400) FILTER(WHERE qualified_at>=created_at) AS "daysToQualification",
 (SELECT count(*)::int FROM scoped WHERE status IN ('CONTACTED','QUALIFICANDO')) AS "qualifyingStock",
 (SELECT count(*)::int FROM scoped WHERE status='NUTRICAO') AS "nurtureStock",
 (SELECT count(*)::int FROM scoped WHERE status IN ('QUALIFIED','QUALIFICADO')) AS "qualifiedStock"
 FROM cohort`,values),
 query(`${cohort} SELECT COALESCE(NULLIF(lead_source,''),NULLIF(source,''),'Não informado') AS name,count(*)::int AS total,
 count(*) FILTER(WHERE qualified_at IS NOT NULL OR status IN ('QUALIFIED','QUALIFICADO','OPORTUNIDADE','CONVERTED'))::int AS qualified
 FROM cohort GROUP BY 1 ORDER BY total DESC`,values),
 query(`SELECT count(DISTINCT h.lead_id) FILTER(WHERE h.to_status IN ('QUALIFIED','QUALIFICADO'))::int AS qualified,
 count(DISTINCT h.lead_id) FILTER(WHERE h.to_status='NUTRICAO')::int AS nurtured,
 count(DISTINCT h.lead_id) FILTER(WHERE h.from_status='NUTRICAO' AND h.to_status IN ('CONTACTED','QUALIFICANDO','QUALIFIED','QUALIFICADO','OPORTUNIDADE'))::int AS reactivated,
 count(DISTINCT h.lead_id) FILTER(WHERE h.to_status IN ('DESQUALIFICADO','UNQUALIFIED'))::int AS disqualified
 FROM crm_lead_status_history h JOIN crm_leads l ON l.id=h.lead_id WHERE ${scope} AND h.created_at ${period}`,values),
 query(`SELECT count(*) FILTER(WHERE o.created_at >= $2::date AND o.created_at < $3::date+INTERVAL '1 day')::int AS created,
 count(*) FILTER(WHERE o.status='OPEN')::int AS "openStock",
 COALESCE(sum(o.amount) FILTER(WHERE o.status='OPEN'),0)::float AS "pipelineValue",
 count(*) FILTER(WHERE o.status='WON' AND o.closed_at >= $2::date AND o.closed_at < $3::date+INTERVAL '1 day')::int AS won,
 count(*) FILTER(WHERE o.status='LOST' AND o.closed_at >= $2::date AND o.closed_at < $3::date+INTERVAL '1 day')::int AS lost,
 COALESCE(sum(o.amount) FILTER(WHERE o.status='WON' AND o.closed_at >= $2::date AND o.closed_at < $3::date+INTERVAL '1 day'),0)::float AS "wonValue",
 avg(EXTRACT(EPOCH FROM (o.closed_at-o.created_at))/86400) FILTER(WHERE o.status IN ('WON','LOST') AND o.closed_at>=o.created_at AND o.closed_at >= $2::date AND o.closed_at < $3::date+INTERVAL '1 day')::float AS "salesCycleDays"
 FROM crm_opportunities o LEFT JOIN crm_leads l ON l.id=o.lead_id WHERE o.owner_client_id IS NOT DISTINCT FROM $1::uuid
 AND ($4='ALL' OR (CASE WHEN l.acquisition_verified THEN l.acquisition_type ELSE 'NAO_INFORMADO' END)=$4)
 AND ($5='' OR COALESCE(l.lead_source,l.source,o.source)=$5)
 AND ($6='' OR (l.acquisition_verified AND l.first_contact_channel=$6))`,values),
 query(`SELECT p.name AS pipeline,s.name AS stage,s.stage_type AS type,count(*)::int AS total,COALESCE(sum(o.amount),0)::float AS value
 FROM crm_opportunities o JOIN crm_pipelines p ON p.id=o.pipeline_id JOIN crm_pipeline_stages s ON s.id=o.stage_id LEFT JOIN crm_leads l ON l.id=o.lead_id
 WHERE o.owner_client_id IS NOT DISTINCT FROM $1::uuid AND o.status='OPEN'
 AND ($4='ALL' OR (CASE WHEN l.acquisition_verified THEN l.acquisition_type ELSE 'NAO_INFORMADO' END)=$4)
 AND ($5='' OR COALESCE(l.lead_source,l.source,o.source)=$5) AND ($6='' OR (l.acquisition_verified AND l.first_contact_channel=$6))
 GROUP BY p.id,p.name,s.id,s.name,s.stage_type,s.display_order ORDER BY p.name,s.display_order`,values),
 query(`SELECT count(DISTINCT p.id)::int AS sent FROM proposals p LEFT JOIN crm_opportunities o ON o.id=p.opportunity_id LEFT JOIN crm_leads l ON l.id=COALESCE(p.lead_id,o.lead_id)
 WHERE COALESCE(o.owner_client_id,l.owner_client_id) IS NOT DISTINCT FROM $1::uuid
 AND ($4='ALL' OR (CASE WHEN l.acquisition_verified THEN l.acquisition_type ELSE 'NAO_INFORMADO' END)=$4)
 AND ($5='' OR COALESCE(l.lead_source,l.source,o.source)=$5) AND ($6='' OR (l.acquisition_verified AND l.first_contact_channel=$6))
 AND EXISTS(SELECT 1 FROM proposal_events e WHERE e.proposal_id=p.id AND e.event_type='SENT' AND e.created_at >= $2::date AND e.created_at < $3::date+INTERVAL '1 day')`,values),
 query(`SELECT l.id,l.name,l.nurture_reason AS reason,l.nurture_next_action_date AS "nextContact",
 (SELECT min(a.due_date) FROM crm_activities a WHERE a.lead_id=l.id AND a.status='PENDING') AS "nextActivity"
 FROM crm_leads l WHERE ${scope} AND l.status='NUTRICAO' ORDER BY l.nurture_next_action_date NULLS LAST,l.created_at LIMIT 50`,values),
 // Snapshot opening and closing, using versions effective at each date. Distinct clients, not contracts.
 query(`WITH dates AS (SELECT 'opening' AS kind, $2::date-INTERVAL '1 microsecond' AS at UNION ALL SELECT 'closing',$3::date+INTERVAL '1 day'-INTERVAL '1 microsecond'),
 customers AS (SELECT DISTINCT o.client_id AS id FROM crm_opportunities o LEFT JOIN crm_leads l ON l.id=o.lead_id WHERE o.owner_client_id IS NOT DISTINCT FROM $1::uuid AND o.client_id IS NOT NULL AND ($4='ALL' OR (CASE WHEN l.acquisition_verified THEN l.acquisition_type ELSE 'NAO_INFORMADO' END)=$4) AND ($5='' OR COALESCE(l.lead_source,l.source,o.source)=$5) AND ($6='' OR (l.acquisition_verified AND l.first_contact_channel=$6))
 UNION SELECT l.converted_client_id FROM crm_leads l WHERE ${scope} AND l.converted_client_id IS NOT NULL
 UNION SELECT c.id FROM clients c WHERE $1::uuid IS NULL AND $4='ALL' AND $5='' AND $6=''),
 versions AS (SELECT d.kind,c.client_id,c.id,v.* FROM dates d JOIN contracts c ON c.client_id IN (SELECT id FROM customers)
 JOIN LATERAL(SELECT cv.billing_period,cv.total_amount,cv.id AS version_id,cv.start_date,cv.end_date FROM contract_versions cv WHERE cv.contract_id=c.id AND cv.effective_date<=d.at ORDER BY cv.version_number DESC LIMIT 1) v ON true
 WHERE v.start_date<=d.at AND (v.end_date IS NULL OR v.end_date>=d.at::date) AND c.created_at<=d.at
 AND (c.status='ACTIVE' OR (c.status='CANCELED' AND c.canceled_at>d.at)))
 SELECT kind,client_id AS "clientId",sum(CASE WHEN billing_period='MONTHLY' THEN total_amount WHEN billing_period='YEARLY' THEN total_amount/12 WHEN billing_period='MIXED' THEN (SELECT COALESCE(sum(CASE WHEN ci.periodicity='MONTHLY' THEN ci.total_price WHEN ci.periodicity='YEARLY' THEN ci.total_price/12 ELSE 0 END),0) FROM contract_items ci WHERE ci.contract_version_id=versions.version_id) ELSE 0 END)::float AS mrr,count(*)::int AS contracts
 FROM versions GROUP BY kind,client_id`,values),
 query(`SELECT count(*)::int AS canceled FROM contracts c WHERE c.status='CANCELED' AND c.canceled_at >= $2::date AND c.canceled_at < $3::date+INTERVAL '1 day'
 AND ($1::uuid IS NULL OR EXISTS(SELECT 1 FROM crm_opportunities o WHERE o.client_id=c.client_id AND o.owner_client_id=$1::uuid))
 AND ($4='ALL' AND $5='' AND $6='')`,values)
 ]);
 const lead=numeric(leads.rows[0]) as Record<"captured"|"inbound"|"outbound"|"unknown"|"evaluated"|"qualified"|"converted"|"daysToQualification"|"qualifyingStock"|"nurtureStock"|"qualifiedStock",number|null>;const opp=numeric(opportunities.rows[0]) as Record<"created"|"openStock"|"pipelineValue"|"won"|"lost"|"wonValue"|"salesCycleDays",number|null>;
 const revenue=(kind:string)=>customers.rows.filter(r=>r.kind===kind).map(r=>({clientId:String(r.clientId),mrr:Number(r.mrr)}));
 return {filters,asOf:new Date().toISOString(),cohort:{...lead,qualificationRate:percentage(Number(lead.qualified),Number(lead.evaluated)),opportunityRate:percentage(Number(lead.converted),Number(lead.captured))},events:numeric(events.rows[0]),commercial:{...opp,winRate:percentage(Number(opp.won),Number(opp.won)+Number(opp.lost)),proposalsSent:Number(proposals.rows[0].sent)},sources:sources.rows,stages:stages.rows,nurture:nurture.rows,retention:{...retentionMetrics(revenue("opening"),revenue("closing")),activeContracts:customers.rows.filter(r=>r.kind==="closing").reduce((n,r)=>n+Number(r.contracts),0),canceledContracts:filters.acquisitionType==="ALL"&&!filters.source&&!filters.channel?Number(cancellations.rows[0].canceled):null},unavailable:{outboundResponseRate:"Tentativas e respostas de prospecção ainda não são eventos estruturados.",cpl:"Investimento de mídia por canal ainda não registrado.",diagnostics:"As etapas comerciais são configuráveis. Veja a distribuição por funil e etapa."}};
}
