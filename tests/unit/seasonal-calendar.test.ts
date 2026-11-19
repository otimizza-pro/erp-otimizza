import {describe,it,expect} from "vitest";
import {seasonalDates} from "../../src/modules/clients/seasonal-calendar";
describe("Brazil editorial calendar",()=>{
 it("computes movable retail dates for the selected year",()=>{
  const dates=seasonalDates(2026);
  expect(dates.find(d=>d.name==="Black Friday")?.date).toBe("2026-11-27");
  expect(dates.find(d=>d.name==="Cyber Monday")?.date).toBe("2026-11-30");
  expect(dates.find(d=>d.name==="Páscoa")?.date).toBe("2026-04-05");
  expect(dates.find(d=>d.name==="Dia das Mães")?.date).toBe("2026-05-10");
  expect(dates.find(d=>d.name==="Dia dos Pais")?.date).toBe("2026-08-09");
 });
 it("handles Cyber Monday falling in December",()=>{
  expect(seasonalDates(2025).find(d=>d.name==="Cyber Monday")?.date).toBe("2025-12-01");
 });
});
