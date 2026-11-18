import {NextResponse} from "next/server";
import {z} from "zod";
import {query} from "@/lib/db/pool";
import {requireAdminUser} from "@/lib/auth/require-auth";
export async function GET(){try{await requireAdminUser();}catch{return NextResponse.json({error:"Acesso não autorizado"},{status:401});}try{const r=await query<{name:string}>("SELECT name FROM crm_lead_sources ORDER BY lower(name)");return NextResponse.json({sources:r.rows.map(row=>row.name)});}catch{return NextResponse.json({error:"Não foi possível carregar as origens"},{status:500});}}
export async function POST(request:Request){try{await requireAdminUser();}catch{return NextResponse.json({error:"Acesso não autorizado"},{status:401});}try{const {name}=z.object({name:z.string().trim().min(2).max(100).transform(v=>v.replace(/\s+/g," "))}).parse(await request.json());await query("INSERT INTO crm_lead_sources(name) VALUES($1) ON CONFLICT DO NOTHING",[name]);const r=await query<{name:string}>("SELECT name FROM crm_lead_sources WHERE lower(btrim(name))=lower(btrim($1))",[name]);return NextResponse.json({name:r.rows[0].name});}catch{return NextResponse.json({error:"Informe uma origem válida"},{status:400});}}
