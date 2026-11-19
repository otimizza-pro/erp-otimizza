import {parse,type DefaultTreeAdapterMap} from "parse5";
import {seasonalDates,type SeasonalDate} from "./seasonal-calendar";
type Node=DefaultTreeAdapterMap["node"];
const months=["janeiro","fevereiro","marco","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
export function seasonalSourceUrl(year:number,month:number){return `https://www.datascomemorativas.me/${year}/${months[month-1]}`;}
function children(node:Node):Node[]{return "childNodes" in node?node.childNodes:[];}
function classes(node:Node){return "attrs" in node?node.attrs.find(a=>a.name==="class")?.value.split(/\s+/)||[]:[];}
function text(node:Node):string{return "value" in node?node.value:children(node).map(text).join("");}
function find(node:Node,cls:string):Node[]{return [...(classes(node).includes(cls)?[node]:[]),...children(node).flatMap(n=>find(n,cls))];}
/** Parse inert HTML only. No external scripts, styles or embedded instructions are executed. */
export function parseSeasonalSource(html:string,year:number,month:number):SeasonalDate[]{
 const root=parse(html);const max=new Date(year,month,0).getDate();const results:SeasonalDate[]=[];
 for(const cell of find(root,"calendar-day")){
  const day=Number(text(find(cell,"day-number")[0]||cell).trim());if(!Number.isInteger(day)||day<1||day>max)continue;
  for(const item of find(cell,"day-date")){
   const name=text(item).replace(/\s+/g," ").trim();if(!name||name.length>300)continue;
   results.push({date:`${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`,name,category:"cultural"});
  }
 }
 return Array.from(new Map(results.map(item=>[item.date+"|"+item.name.toLocaleLowerCase("pt-BR"),item])).values());
}
export async function loadSeasonalMonth(year:number,month:number){
 const url=seasonalSourceUrl(year,month);const curated=seasonalDates(year).filter(d=>Number(d.date.slice(5,7))===month);
 let imported:SeasonalDate[]=[];let warning:string|null=null;
 try{
  const response=await fetch(url,{signal:AbortSignal.timeout(8000),next:{revalidate:86400},headers:{Accept:"text/html"}});
  if(!response.ok)throw new Error("Fonte indisponível");const html=await response.text();
  if(html.length>2_000_000)throw new Error("Resposta fora do limite");
  imported=parseSeasonalSource(html,year,month);if(!imported.length)throw new Error("Calendário sem dados reconhecíveis");
 }catch{warning="Não foi possível consultar o calendário externo. Exibindo somente a base nacional selecionada e suas datas próprias.";}
 const key=(item:SeasonalDate)=>item.date+"|"+item.name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\b(dia|nacional|mundial|internacional|dos|das|de|do|da)\b/g,"").replace(/[^a-z0-9]/g,"");
 const combined=new Map<string,SeasonalDate>();for(const item of [...imported,...curated])combined.set(key(item),item);
 return {events:[...combined.values()].sort((a,b)=>a.date.localeCompare(b.date)),sourceUrl:url,warning,sourceAvailable:imported.length>0};
}
