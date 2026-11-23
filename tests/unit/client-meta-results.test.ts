import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import * as XLSX from "xlsx";
import {parseMeta} from "@/modules/client-results/import";
import {mergeRows,summary,level} from "@/modules/client-results/meta";

const sample=readFileSync("Relatorios/"+readdirSync("Relatorios").find(n=>n.includes("Cristo-Rei")&&n.endsWith(".xlsx")));
const rows=parseMeta(sample), row=rows[0];
describe("Meta Ads da Cristo Rei",()=>{
  it("ignora o total da conta e lê os indicadores reais",()=>{
    expect(rows).toHaveLength(1);
    expect(summary(rows)).toMatchObject({spend:71.74,results:8,impressions:2375,reach:1366,cost:8.9675});
  });
  it("aceita também o Excel binário XLS",()=>{
    const binary=XLSX.write(XLSX.read(sample),{type:"buffer",bookType:"biff8"});
    expect(parseMeta(binary)).toEqual(rows);
  });
  it("reimporta, atualiza e concilia IDs opcionais",()=>{
    expect(mergeRows(rows,rows)).toEqual(rows);
    expect(mergeRows(rows,[{...row,campaignId:"123",spend:80}])).toMatchObject([{spend:80}]);
  });
  it("bloqueia interseção parcial entre intervalos",()=>{
    expect(()=>mergeRows(rows,[{...row,end:"2026-11-24"}])).toThrow(/sobrepostos/);
  });
  it("separa o nível dos criativos e preserva o alcance por linha",()=>{
    const ad={...row,group:"Grupo",ad:"Criativo"};
    expect(level(ad)).toBe("Anúncios");
    expect(mergeRows(rows,[ad])).toHaveLength(2);
    expect(summary([row,{...row,indicator:"leads"}])).toMatchObject({results:null,reach:null,cost:null});
  });
});
