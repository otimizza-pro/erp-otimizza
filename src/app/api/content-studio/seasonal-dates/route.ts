import {NextResponse} from "next/server";
import {z} from "zod";
import {requireAdminUser} from "@/lib/auth/require-auth";
import {query} from "@/lib/db/pool";
import {loadSeasonalMonth} from "@/modules/clients/seasonal-source";
const scope=z.object({clientId:z.string().uuid(),month:z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/)});
export async function GET(request:Request){
 try{await requireAdminUser();}catch{return NextResponse.json({error:"Acesso não autorizado."},{status:401});}
 const input=scope.safeParse(Object.fromEntries(new URL(request.url).searchParams));if(!input.success)return NextResponse.json({error:"Empresa ou mês inválido."},{status:400});
 try{const {clientId,month}=input.data;const [year,monthNumber]=month.split("-").map(Number);const [source,custom]=await Promise.all([loadSeasonalMonth(year,monthNumber),query("SELECT id,event_date::text AS date,name,category,notes,archived_at FROM content_seasonal_dates WHERE client_id=$1 AND event_date >= $2::date AND event_date < ($2::date + INTERVAL '1 month') ORDER BY event_date,name",[clientId,month+"-01"])]);return NextResponse.json({...source,custom:custom.rows});}
 catch{return NextResponse.json({error:"Não foi possível consultar as datas próprias. Confira a conexão e a migração 034."},{status:503});}
}
const date=z.iso.date();
const mutation=z.discriminatedUnion("action",[
 z.object({action:z.literal("SAVE"),clientId:z.string().uuid(),id:z.string().uuid().optional(),date,name:z.string().trim().min(1).max(200),category:z.enum(["commercial","holiday","cultural"]),notes:z.string().max(3000).default("")}),
 z.object({action:z.enum(["ARCHIVE","RESTORE","DELETE"]),clientId:z.string().uuid(),id:z.string().uuid()})
]);
export async function POST(request:Request){
 try{await requireAdminUser();}catch{return NextResponse.json({error:"Acesso não autorizado."},{status:401});}
 try{
  const body=mutation.parse(await request.json());let result;
  if(body.action==="SAVE"){
   const values=[body.clientId,body.date,body.name,body.category,body.notes];
   result=body.id?await query("UPDATE content_seasonal_dates SET event_date=$2,name=$3,category=$4,notes=$5 WHERE client_id=$1 AND id=$6 RETURNING id",[...values,body.id]):await query("INSERT INTO content_seasonal_dates(client_id,event_date,name,category,notes) VALUES($1,$2,$3,$4,$5) RETURNING id",values);
  }else if(body.action==="DELETE")result=await query("DELETE FROM content_seasonal_dates WHERE id=$1 AND client_id=$2 RETURNING id",[body.id,body.clientId]);
  else result=await query("UPDATE content_seasonal_dates SET archived_at=CASE WHEN $3 THEN NOW() ELSE NULL END WHERE id=$1 AND client_id=$2 RETURNING id",[body.id,body.clientId,body.action==="ARCHIVE"]);
  if(!result.rows.length)return NextResponse.json({error:"Data não encontrada nesta empresa."},{status:404});return NextResponse.json({success:true,id:result.rows[0].id});
 }catch{return NextResponse.json({error:"Não foi possível salvar a data. Confira os campos e a conexão."},{status:400});}
}
