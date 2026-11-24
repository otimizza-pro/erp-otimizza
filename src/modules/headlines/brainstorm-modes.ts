export const brainstormModes = {
  PILLARS: "Pilares e assuntos",
  NEWS: "Surfar na Onda",
  TRENDS: "Tendências",
  SEASONAL: "Datas Sazonais",
} as const;

export type BrainstormMode = keyof typeof brainstormModes;

export const BRAINSTORM_ANGLES = [
  { id: "PAIN", label: "Dor ou dificuldade do público", questionPrompt: "Qual dor ou dificuldade você quer focar?" },
  { id: "DESIRE", label: "Desejo ou resultado esperado", questionPrompt: "Qual desejo ou resultado esperado destacar?" },
  { id: "FAQ", label: "Dúvida frequente", questionPrompt: "Qual dúvida frequente você quer esclarecer?" },
  { id: "OBJECTION", label: "Objeção de compra", questionPrompt: "Qual objeção você quer trabalhar?" },
  { id: "SOLUTION", label: "Solução ou modo de fazer", questionPrompt: "Qual solução ou modo de fazer você quer apresentar?" },
  { id: "PROOF", label: "Prova, demonstração ou bastidores", questionPrompt: "O que temos para mostrar?" },
  { id: "EXPLORE", label: "Explorar ângulos diferentes", questionPrompt: "Qual foco ou tema você gostaria de explorar?" },
] as const;

export type BrainstormAngleId = typeof BRAINSTORM_ANGLES[number]["id"];

export interface FocusSuggestion {
  id: string;
  title: string;
  description: string;
  angleId: BrainstormAngleId;
  angleFocus: string;
  rationale: string;
}
