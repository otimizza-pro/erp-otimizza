import { z } from "zod";
const text = z.string().trim().max(10000).default("");
export const commercialDnaSchema = z.object({
  businessDescription: text, idealCustomer: text, commercialObjective: text,
  requestedScope: text, communicationGoal: text, spokesperson: text,
});
export const commercialDnaPatchSchema = z.object({
  businessDescription: text.removeDefault().optional(),
  idealCustomer: text.removeDefault().optional(),
  commercialObjective: text.removeDefault().optional(),
  requestedScope: text.removeDefault().optional(),
  communicationGoal: text.removeDefault().optional(),
  spokesperson: text.removeDefault().optional(),
});
export type CommercialDna = z.infer<typeof commercialDnaSchema>;
export const emptyCommercialDna: CommercialDna = commercialDnaSchema.parse({});
export const commercialDnaFields = [
  { key: "businessDescription", label: "O que o negócio faz", placeholder: "Atuação, produtos ou serviços e região atendida." },
  { key: "idealCustomer", label: "Cliente ideal / público prioritário", placeholder: "Quem compra ou deve ser alcançado? Perfil, região e necessidade principal.", required: true },
  { key: "commercialObjective", label: "Objetivo comercial", placeholder: "O que precisa melhorar no negócio? Ex.: apresentar melhor o serviço ou captar pacientes particulares.", required: true },
  { key: "requestedScope", label: "O que está sendo contratado nesta parceria", placeholder: "Descreva o escopo e os limites. Ex.: somente edição dos vídeos enviados, sem gravação, gestão de redes ou anúncios.", required: true },
  { key: "communicationGoal", label: "Objetivo da comunicação", placeholder: "O que o público deve entender ou fazer após ver os conteúdos?" },
  { key: "spokesperson", label: "Quem comunica / aparece", placeholder: "Ex.: a médica fala em nome do consultório; apenas imagens do produto; não se aplica." },
] as const;
export function missingCommercialDna(dna: Partial<CommercialDna>): string[] {
  return commercialDnaFields.filter(field => "required" in field && field.required && !dna[field.key]?.trim()).map(field => field.label);
}
