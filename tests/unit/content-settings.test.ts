import {describe,it,expect} from "vitest";
import {contentSettingsSchema, normalizeFrequencyLevel} from "../../src/modules/clients/content-settings";
const clientId="00000000-0000-4000-8000-000000000001";
describe("Content configuration",()=>{
 it("rejects blank or duplicate custom field labels",()=>{
  const theme={clientId,action:"THEME_SAVE",pillarId:clientId,theme:"Tema",objective:"",notes:"",frequencyPerMonth:4,preferredFormats:[],customFields:[{label:"Foco",value:"A"},{label:"foco",value:"B"}]};
  expect(contentSettingsSchema.safeParse(theme).success).toBe(false);
  expect(contentSettingsSchema.safeParse({...theme,customFields:[{label:"",value:"A"}]}).success).toBe(false);
 });
 it("requires an explicit archive action and company scope",()=>{
  expect(contentSettingsSchema.safeParse({action:"PILLAR_VISIBILITY",id:clientId,archived:true}).success).toBe(false);
  expect(contentSettingsSchema.safeParse({clientId,action:"PILLAR_VISIBILITY",id:clientId,archived:true}).success).toBe(true);
 });
 it("normalizes and accepts planned monthly frequency as Alta, Média, Baixa",()=>{
  const base={clientId,action:"THEME_SAVE",pillarId:clientId,theme:"Tema",objective:"",notes:"",preferredFormats:[],customFields:[]};
  const parsedAlta = contentSettingsSchema.safeParse({...base,frequencyPerMonth:"Alta"});
  expect(parsedAlta.success).toBe(true);
  if(parsedAlta.success && parsedAlta.data.action === "THEME_SAVE"){
    expect(parsedAlta.data.frequencyPerMonth).toBe("Alta");
  }
  const parsedMedia = contentSettingsSchema.safeParse({...base,frequencyPerMonth:"Média"});
  expect(parsedMedia.success).toBe(true);
  if(parsedMedia.success && parsedMedia.data.action === "THEME_SAVE"){
    expect(parsedMedia.data.frequencyPerMonth).toBe("Média");
  }
  const parsedBaixa = contentSettingsSchema.safeParse({...base,frequencyPerMonth:"Baixa"});
  expect(parsedBaixa.success).toBe(true);
  if(parsedBaixa.success && parsedBaixa.data.action === "THEME_SAVE"){
    expect(parsedBaixa.data.frequencyPerMonth).toBe("Baixa");
  }
  expect(normalizeFrequencyLevel(8)).toBe("Alta");
  expect(normalizeFrequencyLevel(4)).toBe("Média");
  expect(normalizeFrequencyLevel(1)).toBe("Baixa");
  expect(normalizeFrequencyLevel("alta")).toBe("Alta");
  expect(normalizeFrequencyLevel("baixa")).toBe("Baixa");
  expect(normalizeFrequencyLevel("media")).toBe("Média");
 });
});
