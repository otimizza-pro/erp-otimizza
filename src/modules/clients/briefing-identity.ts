import type {PoolClient} from "pg";
import {addIdentityAudiences} from "./identity-audiences";
import {sanitizeBriefingDifferentials} from "./dna-briefing-sync";

const text=(value:unknown)=>typeof value==="string"?value.trim():"";
const list=(value:unknown):string[]=>Array.isArray(value)?value.filter(v=>typeof v==="string"&&v.trim()).map(v=>v.trim()):text(value)?[text(value)]:[];

export function mapBriefingIdentity(extracted:Record<string,unknown>,extras:{instagram?:string;website?:string;notes?:string}={}){
  const rawDiffs = list(extracted.differentialsList).length ? list(extracted.differentialsList) : list(extracted.differentials);
  const cleanDiffs = sanitizeBriefingDifferentials(rawDiffs);

  return {
    valueProposition: text(extracted.valueProposition),
    marketNiche: text(extracted.marketNiche),
    archetype: text(extracted.archetype),
    toneOfVoice: list(extracted.toneOfVoice),
    brandContext: text(extracted.brandContext) || text(extracted.companyDescription),
    targetAudiences: list(extracted.targetAudiences).length ? list(extracted.targetAudiences) : list(extracted.targetAudience),
    painPoints: list(extracted.painPoints),
    differentials: cleanDiffs,
    forbiddenWords: list(extracted.forbiddenWords),
    mandatoryTerms: list(extracted.mandatoryTerms),
    defaultCtas: list(extracted.defaultCtas),
    instagramHandle: text(extracted.instagramHandle) || extras.instagram || "",
    websiteUrl: extras.website || text(extracted.websiteUrl),
    notes: extras.notes || "",
  };
}

export async function syncBriefingIdentity(client:PoolClient,clientId:string,ext:Record<string,unknown>,extras:{instagram?:string;website?:string;notes?:string}={}){
 const data=mapBriefingIdentity(ext,extras);
 await addIdentityAudiences(client,clientId,data.targetAudiences);
 const columns={valueProposition:"value_proposition",marketNiche:"market_niche",archetype:"archetype",toneOfVoice:"tone_of_voice",brandContext:"brand_context",painPoints:"pain_points",differentials:"differentials",forbiddenWords:"forbidden_words",mandatoryTerms:"mandatory_terms",defaultCtas:"default_ctas",instagramHandle:"instagram_handle",websiteUrl:"website_url",notes:"notes"};
 const keys=Object.keys(columns) as (keyof typeof columns)[];
 const updates=keys.map(key=>{
   const col=columns[key];
   return col+"=CASE WHEN "+(Array.isArray(data[key])?"COALESCE(array_length(EXCLUDED."+col+",1),0)>0":"COALESCE(EXCLUDED."+col+",'')!=''")+" THEN EXCLUDED."+col+" ELSE client_identities."+col+" END";
 });
 await client.query("INSERT INTO client_identities(client_id,"+keys.map(k=>columns[k]).join(",")+") VALUES($1,"+keys.map((_,i)=>"$"+(i+2)).join(",")+") ON CONFLICT(client_id) DO UPDATE SET "+updates.join(",")+",updated_at=NOW()",[clientId,...keys.map(k=>data[k])]);
}
