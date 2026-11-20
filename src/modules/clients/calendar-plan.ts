import {z} from "zod";
import {contentBriefSchema} from "./content-brief";
import type { AiClientContext } from "@/lib/ai/client-context";
import { normalizeBrainstormText, shiftBrainstormDay } from "@/modules/headlines/brainstorm-sources";
import { socialFormats } from "./content-delivery";
export const calendarPlanItemSchema=z.object({editorialBrief:contentBriefSchema,title:z.string().trim().min(1).max(255),centralIdea:z.string().trim().min(1).max(4000),scheduledDate:z.string().date(),scheduledTime:z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/),format:z.enum(socialFormats),editorialLineId:z.string().uuid().nullable().default(null),notes:z.string().max(3000).default(""),brainstormIdeaId:z.uuid().optional()});
export const calendarPlanSchema=z.array(calendarPlanItemSchema).min(1).max(31);
export function validateCalendarMonth(items:{scheduledDate:string}[],month:string){return items.every(item=>item.scheduledDate.slice(0,7)===month);}

type SavedIdea = {
  id: string; title: string; angle: string; target_audience: string; editorial_line_id: string;
  format: string; goal: string; rationale: string; source_date: string | null;
};

export function reuseCalendarIdeas(
  context: AiClientContext,
  ideas: SavedIdea[],
  existing: { title: string; scheduled_date: string }[],
  month: string,
  count: number,
  today: string,
) {
  const first = month + "-01";
  const days = Array.from({ length: 31 }, (_, index) => shiftBrainstormDay(first, index))
    .filter(day => day.startsWith(month) && (today.slice(0, 7) !== month || day >= today));
  const booked = new Set(existing.map(item => item.scheduled_date));
  const titles = new Set(existing.map(item => normalizeBrainstormText(item.title)));
  const results: z.infer<typeof calendarPlanItemSchema>[] = [];
  const firstText = (value: unknown) => Array.isArray(value) ? value.find(entry => typeof entry === "string" && entry.trim()) : value;
  const audienceOptions = new Set([
    ...context.audiences.map(audience => audience.name),
    ...(Array.isArray(context.identity.target_audiences) ? context.identity.target_audiences : []),
    ...(context.communicationProfile?.audienceTypes || []),
  ]);
  for (const idea of ideas) {
    if (results.length >= count) break;
    const title = idea.title.trim().slice(0, 255);
    const normalized = normalizeBrainstormText(title);
    const theme = context.editorialLines.find(line => line.id === idea.editorial_line_id);
    if (!theme || !normalized || titles.has(normalized) || !audienceOptions.has(idea.target_audience)) continue;
    const preferred = idea.source_date || days[Math.floor(results.length * days.length / count)];
    const date = days.filter(day => !booked.has(day) && (!idea.source_date || day <= idea.source_date))
      .sort((a, b) => Math.abs(Date.parse(a) - Date.parse(preferred)) - Math.abs(Date.parse(b) - Date.parse(preferred)))[0];
    if (!date) continue;
    const item = calendarPlanItemSchema.safeParse({
      brainstormIdeaId: idea.id, title, centralIdea: [idea.title, idea.angle].filter(Boolean).join("\n"),
      scheduledDate: date, scheduledTime: "18:00", format: idea.format, editorialLineId: theme.id,
      notes: idea.rationale,
      editorialBrief: {
        themeId: theme.id, speaker: context.communicationProfile?.speakerTypes[0], voice: context.communicationProfile?.contentVoices[0],
        audience: idea.target_audience, funnel: "TOP", journey: "DISCOVERY", goal: idea.goal,
        pain: "NOT_APPLICABLE", tone: firstText(context.identity.tone_of_voice) || "Tom da marca",
        cta: firstText(context.identity.default_ctas) || "Definir CTA na revisão",
      },
    });
    if (!item.success) continue;
    results.push(item.data);
    titles.add(normalized);
    booked.add(date);
  }
  return results;
}
