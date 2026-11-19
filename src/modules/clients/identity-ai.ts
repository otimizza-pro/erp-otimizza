import {z} from "zod";
export const identityFieldPrompts={
 marketNiche:{list:false,instruction:"Resuma o segmento, especialidades e área atendida em uma frase. Não invente localidade ou especialização."},
 valueProposition:{list:false,instruction:"Escreva uma proposta de valor clara: para quem, qual necessidade e qual entrega comprovada. Evite promessas de resultados e superlativos sem evidência."},
 brandContext:{list:false,instruction:"Organize contexto, história, serviços, valores e forma de atuação em até 3 parágrafos. Use apenas fatos informados; não invente fundação, estrutura ou experiência."},
 archetype:{list:false,instruction:"Sugira apenas um código entre SABIO, AMIGO, CRIADOR, HEROI, MAGO, GOVERNANTE, coerente com a comunicação registrada. Não trate a escolha como um fato histórico."},
 toneOfVoice:{list:true,instruction:"Sugira de 3 a 5 diretrizes concretas de tom de voz, próprias para este emissor e público, incluindo como falar e o que evitar."},
 targetAudiences:{list:true,instruction:"Descreva até 5 públicos específicos apoiados pelo briefing e perfil de comunicação. Diferencie pacientes, consumidores, empresas e decisores, sem presumir B2B ou inventar demografia."},
 painPoints:{list:true,instruction:"Organize até 6 dores, necessidades e objeções dos públicos informados. Não invente diagnósticos médicos, pesquisas ou afirmações quantitativas."},
 differentials:{list:true,instruction:"Liste somente diferenciais concretos registrados. Se não houver diferenciação documentada, informe dados insuficientes. Nunca crie certificações, garantia ou liderança fictícia."},
 forbiddenWords:{list:true,instruction:"Proponha até 8 expressões a evitar conforme tom, restrições e segmento. São sugestões editoriais, não regras legais inventadas."},
 mandatoryTerms:{list:true,instruction:"Selecione até 6 nomes e termos de marca que constam nos dados e merecem padronização. Não invente slogan, registro profissional ou assinatura."},
 defaultCtas:{list:true,instruction:"Sugira de 3 a 5 chamadas para ação alinhadas à oferta e canais cadastrados. Não invente URL, telefone, promoção, escassez ou agenda disponível."},
 notes:{list:false,instruction:"Sintetize orientações editoriais úteis ainda não cobertas, com base no briefing. Evite repetir todos os campos e não invente restrições."},
 communicationDetails:{list:false,instruction:"Escreva orientações sobre quem comunica, quem é o porta-voz e com quem fala. Diferencie voz institucional e pessoal e evite misturar públicos da mesma peça."}
} as const;
export type IdentityAiField=keyof typeof identityFieldPrompts;
export const identityAiFieldSchema=z.enum(Object.keys(identityFieldPrompts) as [IdentityAiField,...IdentityAiField[]]);
export const identityDraftSchema=z.object({marketNiche:z.string().max(10000).optional(),valueProposition:z.string().max(10000).optional(),brandContext:z.string().max(15000).optional(),archetype:z.string().max(200).optional(),toneOfVoice:z.array(z.string().max(1000)).max(30).optional(),targetAudiences:z.array(z.string().max(1500)).max(30).optional(),painPoints:z.array(z.string().max(1500)).max(30).optional(),differentials:z.array(z.string().max(1500)).max(30).optional(),forbiddenWords:z.array(z.string().max(1000)).max(50).optional(),mandatoryTerms:z.array(z.string().max(1000)).max(50).optional(),defaultCtas:z.array(z.string().max(1000)).max(30).optional(),notes:z.string().max(10000).optional(),communicationProfile:z.object({speakerTypes:z.array(z.string()).max(20),audienceTypes:z.array(z.string()).max(20),contentVoices:z.array(z.string()).max(20),details:z.string().max(5000)}).optional()});
