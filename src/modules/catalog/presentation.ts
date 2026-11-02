import { z } from "zod";
export const serviceIcons = { target: "Estratégia", megaphone: "Marketing", chart: "Resultados", globe: "Digital", palette: "Design", code: "Tecnologia" } as const;
export const ServicePresentationSchema = z.object({
  headline: z.string().trim().max(180).default(""),
  overview: z.string().trim().max(12000).default(""),
  objectives: z.string().trim().max(12000).default(""),
  deliverables: z.string().trim().max(12000).default(""),
  methodology: z.string().trim().max(12000).default(""),
  setup: z.string().trim().max(12000).default(""),
  timeline: z.string().trim().max(12000).default(""),
  responsibilities: z.string().trim().max(12000).default(""),
  exclusions: z.string().trim().max(12000).default(""),
  icon: z.enum(["target", "megaphone", "chart", "globe", "palette", "code"]).default("target"),
  image: z.string().max(1500000).refine((s) => !s || /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(s), "Use uma imagem PNG ou JPEG.").default(""),
}).strict();
export type ServicePresentation = z.infer<typeof ServicePresentationSchema>;
export const emptyPresentation: ServicePresentation = ServicePresentationSchema.parse({});
