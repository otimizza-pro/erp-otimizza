import {describe,it,expect,vi,afterEach} from "vitest";
import {parseSeasonalSource,loadSeasonalMonth,seasonalSourceUrl} from "@/modules/clients/seasonal-source";
describe("Seasonal reference import",()=>{
 afterEach(()=>vi.unstubAllGlobals());
 it("reads calendar labels without executing or importing scripts",()=>{
  const html='<table><tr><td class="calendar-day"><span class="day-number">15</span><ul><li class="day-date"><span>Dia do Consumidor</span></li><li class="day-date">Dia do Consumidor</li></ul></td></tr></table><script>globalThis.compromised=true</script>';
  expect(parseSeasonalSource(html,2026,3)).toEqual([{date:"2026-03-15",name:"Dia do Consumidor",category:"cultural"}]);
 });
 it("rejects invalid days and unrelated page content",()=>{
  expect(parseSeasonalSource('<div>Login failed</div><td class="calendar-day"><span class="day-number">31</span><li class="day-date">Inválido</li></td>',2026,2)).toEqual([]);
 });
 it("reports source failure explicitly and keeps national commercial references",async()=>{
  vi.stubGlobal("fetch",vi.fn().mockRejectedValue(new Error("offline")));
  const result=await loadSeasonalMonth(2026,11);expect(result.sourceAvailable).toBe(false);expect(result.warning).toContain("Não foi possível");expect(result.events).toContainEqual({date:"2026-11-27",name:"Black Friday",category:"commercial"});
 });
 it("uses the selected year and month",()=>{expect(seasonalSourceUrl(2027,3)).toBe("https://www.datascomemorativas.me/2027/marco");});
});
