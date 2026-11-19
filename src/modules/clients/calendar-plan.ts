import {z} from "zod";
import {contentBriefSchema} from "./content-brief";
export const calendarPlanItemSchema=z.object({editorialBrief:contentBriefSchema,title:z.string().trim().min(1).max(255),centralIdea:z.string().trim().min(1).max(4000),scheduledDate:z.string().date(),scheduledTime:z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/),format:z.enum(["Post estático","Reels","Carrossel","Stories"]),editorialLineId:z.string().uuid().nullable().default(null),notes:z.string().max(3000).default("")});
export const calendarPlanSchema=z.array(calendarPlanItemSchema).min(1).max(31);
export function validateCalendarMonth(items:{scheduledDate:string}[],month:string){return items.every(item=>item.scheduledDate.slice(0,7)===month);}
