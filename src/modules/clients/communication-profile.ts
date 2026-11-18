import {z} from "zod";
export const COMMUNICATION_OPTIONS={
 speakerTypes:["Pessoa / marca pessoal","Profissional autônomo / especialista","Empresa / marca institucional","Clínica / instituição de saúde","Equipe / coletivo","Organização / associação","Outro"],
 audienceTypes:["Pacientes","Familiares / cuidadores","Consumidores / pessoas físicas","Potenciais clientes","Clientes atuais","Empresas / pessoas jurídicas","Empresários / gestores / decisores","Profissionais / colegas de área","Alunos / estudantes","Parceiros / fornecedores","Comunidade / público geral","Outro"],
 contentVoices:["Institucional, em nome da empresa","Pessoa falando em nome próprio","Fundador / proprietário como porta-voz","Profissional / especialista como porta-voz","Equipe / múltiplos porta-vozes","Narração sem apresentador","Depoimento de cliente / paciente autorizado"]
} as const;
const selections=z.array(z.string().trim().min(2).max(120)).max(25).transform(v=>Array.from(new Set(v)));
export const CommunicationProfileSchema=z.object({speakerTypes:selections.default([]),audienceTypes:selections.default([]),contentVoices:selections.default([]),details:z.string().trim().max(5000).default("")});
export type CommunicationProfile=z.infer<typeof CommunicationProfileSchema>;
export const emptyCommunicationProfile:CommunicationProfile={speakerTypes:[],audienceTypes:[],contentVoices:[],details:""};
export const ContentCommunicationChoiceSchema=z.object({speaker:z.string().max(120).optional(),audience:z.string().max(120).optional(),voice:z.string().max(120).optional()});
