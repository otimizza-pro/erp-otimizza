import {z} from "zod";
import {CommunicationProfileSchema} from "./communication-profile";

export type FrequencyLevel = "Alta" | "Média" | "Baixa";

export function normalizeFrequencyLevel(val: unknown): FrequencyLevel {
  if (typeof val === "string") {
    const s = val.trim().toLowerCase();
    if (s === "alta" || s === "high") return "Alta";
    if (s === "baixa" || s === "low") return "Baixa";
    if (s === "média" || s === "media" || s === "medium") return "Média";
    const num = Number(val);
    if (!isNaN(num)) {
      if (num >= 6) return "Alta";
      if (num <= 2 && num > 0) return "Baixa";
      return "Média";
    }
  }
  if (typeof val === "number") {
    if (val >= 6) return "Alta";
    if (val <= 2) return "Baixa";
    return "Média";
  }
  return "Média";
}

const id=z.string().uuid(),text=z.string().trim(),list=z.array(text.min(1).max(2000)).max(50);
export const customEditorialFieldsSchema=z.array(z.object({label:text.min(1).max(100),value:text.max(3000)})).max(30).refine(fields=>new Set(fields.map(f=>f.label.toLowerCase())).size===fields.length,"Não repita o nome dos campos.");
export const contentSettingsSchema=z.intersection(z.object({clientId:id}),z.discriminatedUnion("action",[
 z.object({action:z.literal("PROFILE_SAVE"),profile:CommunicationProfileSchema.refine(p=>p.speakerTypes.length>0&&p.contentVoices.length>0,"Selecione quem comunica e como aparece.")}),
 z.object({action:z.literal("PILLAR_SAVE"),id:id.optional(),name:text.min(1).max(200)}),
 z.object({action:z.literal("PILLAR_VISIBILITY"),id,archived:z.boolean()}),
 z.object({action:z.literal("THEME_VISIBILITY"),id,archived:z.boolean()}),
 z.object({action:z.literal("AUDIENCE_VISIBILITY"),id,archived:z.boolean()}),
 z.object({action:z.literal("PILLAR_DELETE"),id}),
 z.object({action:z.literal("THEME_SAVE"),id:id.optional(),pillarId:id,theme:text.min(1).max(255),objective:text.max(4000),notes:text.max(5000),preferredFormats:list,frequencyPerMonth:z.union([z.enum(["Alta","Média","Baixa"]),z.string(),z.number()]).transform(normalizeFrequencyLevel).default("Média"),customFields:customEditorialFieldsSchema}),
 z.object({action:z.literal("THEME_DELETE"),id}),
 z.object({action:z.literal("AUDIENCE_SAVE"),id:id.optional(),name:text.min(1).max(200),description:text.max(6000),demographics:text.max(3000),painPoints:list,desires:list,objections:list,isDefault:z.boolean()}),
 z.object({action:z.literal("AUDIENCE_DELETE"),id}),
]));
