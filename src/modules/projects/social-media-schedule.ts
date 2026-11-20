import { z } from "zod";

export const projectMonthSchema = z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/);
export const socialMediaScheduleSchema = z.object({
  postsPerMonth: z.number().int().min(1).max(31),
  weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7)
    .refine(days => new Set(days).size === days.length),
});

export type SocialMediaSchedule = z.infer<typeof socialMediaScheduleSchema>;

const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function nextProjectMonth(month: string) {
  const [year, number] = month.split("-").map(Number);
  return new Date(Date.UTC(year, number, 1)).toISOString().slice(0, 7);
}

export function projectPostSlots(month: string, schedule: SocialMediaSchedule, company: string) {
  const [year, number] = projectMonthSchema.parse(month).split("-").map(Number);
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
    const suffix = ` ${monthNames[number - 1]} #${String(index + 1).padStart(2, "0")}`;
    return {
      date: slot.toISOString().slice(0, 10),
      title: `Post ${company.slice(0, 255 - 5 - suffix.length)}${suffix}`,
      number: index + 1,
    };
  });
}
