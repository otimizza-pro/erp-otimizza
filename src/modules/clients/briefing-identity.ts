import type {PoolClient} from "pg";
import {addIdentityAudiences} from "./identity-audiences";
import {sanitizeBriefingDifferentials} from "./dna-briefing-sync";
import {syncCatalogItems} from "./catalog-service";

const text=(value:unknown)=>typeof value==="string"?value.trim():"";
const splitList=(value:unknown,splitCommas=false):string[]=>{
  if(Array.isArray(value))return value.filter((v):v is string=>typeof v==="string"&&Boolean(v.trim())).map(v=>v.trim());
  const raw=text(value);
  if(!raw)return [];
  const pattern=splitCommas?/[\r\n,;]+/:/[\r\n]+/;
  return raw.split(pattern).map(v=>v.trim()).filter(Boolean);
};

export function mapBriefingIdentity(extracted:Record<string,unknown>,extras:{instagram?:string;website?:string;notes?:string}={}){
  const rawDiffs = splitList(extracted.differentialsList).length ? splitList(extracted.differentialsList) : splitList(extracted.differentials);
  const cleanDiffs = sanitizeBriefingDifferentials(rawDiffs);

  return {
    valueProposition: text(extracted.valueProposition),
    marketNiche: text(extracted.marketNiche),
    archetype: text(extracted.archetype),
    toneOfVoice: splitList(extracted.toneOfVoice, true),
    brandContext: text(extracted.brandContext) || text(extracted.companyDescription),
    targetAudiences: splitList(extracted.targetAudiences, true).length ? splitList(extracted.targetAudiences, true) : splitList(extracted.targetAudience),
    painPoints: splitList(extracted.painPoints),
    differentials: cleanDiffs,
    forbiddenWords: splitList(extracted.forbiddenWords, true),
    mandatoryTerms: splitList(extracted.mandatoryTerms, true),
    defaultCtas: splitList(extracted.defaultCtas, true),
    instagramHandle: text(extracted.instagramHandle) || extras.instagram || "",
    websiteUrl: extras.website || text(extracted.websiteUrl),
    notes: extras.notes || "",
    brandHistory: text(extracted.brandHistory),
    corePromise: text(extracted.corePromise),
    salesObjections: text(extracted.salesObjections),
  };
}

export async function syncBriefingIdentity(client:PoolClient,clientId:string,ext:Record<string,unknown>,extras:{instagram?:string;website?:string;notes?:string}={}){
 const data=mapBriefingIdentity(ext,extras);
 await addIdentityAudiences(client,clientId,data.targetAudiences);
 const columns={valueProposition:"value_proposition",marketNiche:"market_niche",archetype:"archetype",toneOfVoice:"tone_of_voice",brandContext:"brand_context",painPoints:"pain_points",differentials:"differentials",forbiddenWords:"forbidden_words",mandatoryTerms:"mandatory_terms",defaultCtas:"default_ctas",instagramHandle:"instagram_handle",websiteUrl:"website_url",notes:"notes",brandHistory:"brand_history",corePromise:"core_promise",salesObjections:"sales_objections"};
 const keys=Object.keys(columns) as (keyof typeof columns)[];
 const updates=keys.map(key=>{
   const col=columns[key];
   return col+"=CASE WHEN "+(Array.isArray(data[key])?"COALESCE(array_length(EXCLUDED."+col+",1),0)>0":"COALESCE(EXCLUDED."+col+",'')!=''")+" THEN EXCLUDED."+col+" ELSE client_identities."+col+" END";
 });
 await client.query("INSERT INTO client_identities(client_id,"+keys.map(k=>columns[k]).join(",")+") VALUES($1,"+keys.map((_,i)=>"$"+(i+2)).join(",")+") ON CONFLICT(client_id) DO UPDATE SET "+updates.join(",")+",updated_at=NOW()",[clientId,...keys.map(k=>data[k])]);

 if (Array.isArray(ext.catalogItems) && ext.catalogItems.length > 0) {
   try {
     await client.query("UPDATE client_identities SET catalog_items = $1::jsonb WHERE client_id = $2", [JSON.stringify(ext.catalogItems), clientId]);
     await syncCatalogItems(clientId, ext.catalogItems as Parameters<typeof syncCatalogItems>[1], client);
   } catch (catErr) {
     console.warn("Aviso ao sincronizar catálogo do briefing:", catErr);
   }
 }
}
