import {describe,it,expect} from "vitest";
import {contentSettingsSchema} from "../../src/modules/clients/content-settings";
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
});
