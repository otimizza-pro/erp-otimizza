import { z } from "zod";

export const projectMonthSchema = z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/);
export const socialMediaScheduleSchema = z.object({
  postsPerMonth: z.number().int().min(1).max(31),
  weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7)
    .refine(days => new Set(days).size === days.length),
  customDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
});

export type SocialMediaSchedule = z.infer<typeof socialMediaScheduleSchema>;

export function nextProjectMonth(month: string) {
  const [year, number] = month.split("-").map(Number);
  return new Date(Date.UTC(year, number, 1)).toISOString().slice(0, 7);
}

const DEFAULT_MAX_TITLE_LENGTH = 255;

export function buildProjectPostTitle(params: {
  postNumber: number | null | undefined;
  clientName: string;
  format?: string | null;
  headline?: string | null;
  centralIdea?: string | null;
}): string {
  const num = `#${String(Math.max(1, Number(params.postNumber || 1))).padStart(2, "0")}`;
  const rawClient = (params.clientName || "Cliente").trim().replace(/\s+/g, " ");
  const client = rawClient.slice(0, 60);
  const rawFmt = (params.format || "").trim();
  const fmt = rawFmt === "Estático" ? "Post estático" : rawFmt;
  const rawSubject = ((params.headline || "").trim() || (params.centralIdea || "").trim()).replace(/\s+/g, " ");

  const prefix = fmt ? `${num} ${client} | ${fmt}` : `${num} ${client}`;
  if (!rawSubject) return prefix.slice(0, DEFAULT_MAX_TITLE_LENGTH);

  const separator = " - ";
  const availableForSubject = DEFAULT_MAX_TITLE_LENGTH - prefix.length - separator.length;
  if (availableForSubject <= 4) return prefix.slice(0, DEFAULT_MAX_TITLE_LENGTH);
  if (rawSubject.length <= availableForSubject) return `${prefix}${separator}${rawSubject}`;
  return `${prefix}${separator}${rawSubject.slice(0, Math.max(1, availableForSubject - 3)).trimEnd()}...`;
}

export function projectPostSlots(month: string, schedule: SocialMediaSchedule, company: string) {
  const [year, number] = projectMonthSchema.parse(month).split("-").map(Number);

  if (schedule.customDates && schedule.customDates.length > 0) {
    const sortedDates = Array.from(new Set(schedule.customDates)).sort();
    return sortedDates.map((dateStr, index) => ({
      date: dateStr,
      title: buildProjectPostTitle({
        postNumber: index + 1,
        clientName: company,
        format: "Post estático",
      }),
      number: index + 1,
    }));
  }

  const lastDay = new Date(Date.UTC(year, number, 0)).getUTCDate();
  const dates = Array.from({ length: lastDay }, (_, index) => new Date(Date.UTC(year, number - 1, index + 1)))
    .filter(date => schedule.weekdays.includes(date.getUTCDay()));

  if (dates.length < schedule.postsPerMonth) {
    throw new Error(`Este mês tem ${dates.length} datas nos dias escolhidos. Reduza a quantidade de posts ou selecione mais dias.`);
  }

  return Array.from({ length: schedule.postsPerMonth }, (_, index) => {
    const dateIndex = schedule.postsPerMonth === 1
      ? 0
      : Math.round(index * (dates.length - 1) / (schedule.postsPerMonth - 1));
    const slot = dates[dateIndex];
    return {
      date: slot.toISOString().slice(0, 10),
      title: buildProjectPostTitle({
        postNumber: index + 1,
        clientName: company,
        format: "Post estático",
      }),
      number: index + 1,
    };
  });
}
